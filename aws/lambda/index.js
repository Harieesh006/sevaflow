const { randomUUID } = require("node:crypto");
const { BedrockRuntimeClient, ConverseCommand } = require("@aws-sdk/client-bedrock-runtime");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand } = require("@aws-sdk/client-transcribe");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const region = process.env.AWS_REGION;
const tableName = process.env.REPORTS_TABLE;
const mediaBucket = process.env.MEDIA_BUCKET;
const modelId = process.env.BEDROCK_MODEL_ID;
const bedrock = new BedrockRuntimeClient({ region });
const s3 = new S3Client({ region });
const transcribe = new TranscribeClient({ region });
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

const assessmentSchema = {
  type: "object",
  properties: {
    category: { type: "string" },
    short_category: { type: "string" },
    priority: { type: "string", enum: ["high", "medium", "low"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    summary: { type: "string" },
    evidence: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
    department: { type: "string" },
    suggested_action: { type: "string" },
  },
  required: ["category", "short_category", "priority", "confidence", "summary", "evidence", "department", "suggested_action"],
  additionalProperties: false,
};

const json = (statusCode, body) => ({
  statusCode,
  headers: { "content-type": "application/json", "access-control-allow-origin": "*", "access-control-allow-headers": "content-type", "access-control-allow-methods": "GET,POST,OPTIONS" },
  body: JSON.stringify(body),
});

const parseBody = (event) => {
  if (!event.body) return {};
  return typeof event.body === "string" ? JSON.parse(event.body) : event.body;
};

const normalizeAssessment = (raw) => ({
  category: String(raw.category),
  shortCategory: String(raw.short_category),
  priority: `${String(raw.priority).charAt(0).toUpperCase()}${String(raw.priority).slice(1)}`,
  confidence: Math.max(0, Math.min(100, Math.round(Number(raw.confidence) * 100))),
  summary: String(raw.summary),
  evidence: Array.isArray(raw.evidence) ? raw.evidence.map(String) : [],
  department: String(raw.department),
  suggestedAction: String(raw.suggested_action),
});

async function getMediaBlock(mediaKey) {
  if (!mediaKey) return null;
  const object = await s3.send(new GetObjectCommand({ Bucket: mediaBucket, Key: mediaKey }));
  const bytes = Buffer.from(await object.Body.transformToByteArray());
  const extension = mediaKey.split(".").pop().toLowerCase();
  const format = ["png", "gif", "webp", "jpeg", "jpg"].includes(extension) ? (extension === "jpg" ? "jpeg" : extension) : "jpeg";
  return { image: { format, source: { bytes } } };
}

async function assess(input) {
  if (!modelId) throw new Error("BEDROCK_MODEL_ID is required");
  const media = input.source === "Photo" ? await getMediaBlock(input.mediaKey) : null;
  const content = [{ text: `Resident description:\n${input.description}\n\nReported location:\n${input.location || "Location not provided"}` }];
  if (media) content.push(media);
  const response = await bedrock.send(new ConverseCommand({
    modelId,
    system: [{ text: "You are SevaFlow's issue intelligence engine. Convert a resident complaint into an operational service request. Use the requested tool only. Be conservative, distinguish evidence from assumptions, and never invent a government integration." }],
    messages: [{ role: "user", content }],
    toolConfig: {
      tools: [{ toolSpec: { name: "sevaflow_issue_assessment", description: "Return a strict structured issue assessment for routing and operations.", inputSchema: { json: assessmentSchema } } }],
      toolChoice: { tool: { name: "sevaflow_issue_assessment" } },
    },
  }));
  const toolUse = (response.output?.message?.content || []).find((block) => block.toolUse)?.toolUse;
  if (!toolUse?.input) throw new Error("Bedrock returned no structured assessment");
  return normalizeAssessment(toolUse.input);
}

async function scanReports() {
  const result = await dynamo.send(new ScanCommand({ TableName: tableName }));
  return (result.Items || []).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function dashboard() {
  const reports = await scanReports();
  const categoryCounts = new Map();
  const locationCounts = new Map();
  for (const report of reports) {
    categoryCounts.set(report.shortCategory, (categoryCounts.get(report.shortCategory) || 0) + 1);
    const key = `${report.shortCategory}::${report.location}`;
    locationCounts.set(key, (locationCounts.get(key) || 0) + 1);
  }
  const hotspot = [...locationCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    total: reports.length,
    highPriority: reports.filter((report) => report.priority === "High").length,
    open: reports.filter((report) => report.status !== "Resolved").length,
    resolved: reports.filter((report) => report.status === "Resolved").length,
    categoryDistribution: [...categoryCounts.entries()].map(([label, value]) => ({ label, value })),
    hotspot: hotspot ? { category: hotspot[0].split("::")[0], location: hotspot[0].split("::")[1], reportCount: hotspot[1] } : null,
  };
}

async function startTranscription(mediaKey) {
  const jobName = `sevaflow-${randomUUID()}`;
  await transcribe.send(new StartTranscriptionJobCommand({
    TranscriptionJobName: jobName,
    Media: { MediaFileUri: `s3://${mediaBucket}/${mediaKey}` },
    OutputBucketName: mediaBucket,
    OutputKey: `transcripts/${jobName}.json`,
    IdentifyLanguage: true,
  }));
  return { jobName, status: "IN_PROGRESS" };
}

exports.handler = async (event) => {
  try {
    const method = event.requestContext?.http?.method || event.httpMethod || "GET";
    const path = event.rawPath || event.path || "/";
    if (method === "OPTIONS") return json(204, {});
    if (method === "GET" && path.endsWith("/reports")) return json(200, { reports: await scanReports() });
    if (method === "GET" && path.endsWith("/dashboard")) return json(200, await dashboard());
    if (method === "POST" && path.endsWith("/reports/analyze")) return json(200, { assessment: await assess(parseBody(event)) });
    if (method === "POST" && path.endsWith("/reports")) {
      const input = parseBody(event);
      const assessment = input.assessment || await assess(input);
      const item = { id: `SF-${randomUUID().slice(0, 8).toUpperCase()}`, description: input.description, location: input.location || "Location pending", source: input.source || "Text", mediaKey: input.mediaKey || null, ...assessment, evidence: JSON.stringify(assessment.evidence), status: "New", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      await dynamo.send(new PutCommand({ TableName: tableName, Item: item }));
      return json(201, { report: item });
    }
    if (method === "POST" && path.endsWith("/voice/transcribe")) return json(202, await startTranscription(parseBody(event).mediaKey));
    if (method === "GET" && path.includes("/voice/transcribe/")) {
      const jobName = path.split("/voice/transcribe/")[1];
      const result = await transcribe.send(new GetTranscriptionJobCommand({ TranscriptionJobName: jobName }));
      return json(200, result.TranscriptionJob);
    }
    return json(404, { error: "Not found" });
  } catch (error) {
    console.error(error);
    return json(500, { error: error instanceof Error ? error.message : "Internal server error" });
  }
};
