import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { ENV } from "./_core/env";
import { assessmentSchema, type StructuredAssessment } from "./issue-intelligence";

const client = new BedrockRuntimeClient({
  region: ENV.awsRegion,
  credentials: ENV.awsAccessKeyId && ENV.awsSecretAccessKey
    ? { accessKeyId: ENV.awsAccessKeyId, secretAccessKey: ENV.awsSecretAccessKey }
    : undefined,
});

export async function assessIssueWithBedrock(input: { description: string; location: string }): Promise<StructuredAssessment> {
  if (!ENV.bedrockModelId) {
    throw new Error("BEDROCK_MODEL_ID is required when SEVAFLOW_AI_PROVIDER=bedrock");
  }
  const command = new ConverseCommand({
    modelId: ENV.bedrockModelId,
    system: [{ text: "You are SevaFlow's issue intelligence engine. Convert a resident complaint into an operational service request. Use the requested tool only. Be conservative, separate evidence from assumptions, and never invent a government integration." }],
    messages: [{
      role: "user",
      content: [{ text: `Resident description:\n${input.description}\n\nReported location:\n${input.location || "Location not provided"}` }],
    }],
    toolConfig: {
      tools: [{
        toolSpec: {
          name: "sevaflow_issue_assessment",
          description: "Return a strict structured issue assessment for routing and operations.",
          inputSchema: { json: assessmentSchema },
        },
      }],
      toolChoice: { tool: { name: "sevaflow_issue_assessment" } },
    },
  });

  const response = await client.send(command);
  const blocks = response.output?.message?.content ?? [];
  const toolUse = blocks.find((block) => block.toolUse)?.toolUse;
  if (!toolUse?.input || typeof toolUse.input !== "object") {
    throw new Error("Bedrock returned no structured issue assessment");
  }
  return toolUse.input as StructuredAssessment;
}
