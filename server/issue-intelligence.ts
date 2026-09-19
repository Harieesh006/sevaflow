import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";

export type IssueAssessment = {
  category: string;
  shortCategory: string;
  priority: "High" | "Medium" | "Low";
  confidence: number;
  summary: string;
  evidence: string[];
  department: string;
  suggestedAction: string;
};

export type StructuredAssessment = {
  category: string;
  short_category: string;
  priority: "high" | "medium" | "low";
  confidence: number;
  summary: string;
  evidence: string[];
  department: string;
  suggested_action: string;
};

export function normalizeAssessment(parsed: StructuredAssessment): IssueAssessment {
  return {
    category: parsed.category,
    shortCategory: parsed.short_category,
    priority: parsed.priority.charAt(0).toUpperCase() + parsed.priority.slice(1) as IssueAssessment["priority"],
    confidence: Math.max(0, Math.min(100, Math.round(parsed.confidence * 100))),
    summary: parsed.summary,
    evidence: parsed.evidence,
    department: parsed.department,
    suggestedAction: parsed.suggested_action,
  };
}

export const assessmentSchema = {
  type: "object",
  properties: {
    category: { type: "string", description: "Human-readable issue category" },
    short_category: { type: "string", description: "Short label, e.g. Waste, Roads, Water, Light" },
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

async function assessIssueWithPlatform(input: { description: string; location: string }) {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are SevaFlow's issue intelligence engine. Convert a resident's rough complaint into an operational service request. Return only the requested JSON object. Be conservative: separate what is directly described from assumptions, use the location only for routing context, and never invent a government integration. Use one of these department families when relevant: Municipal sanitation, Roads & infrastructure, Electrical services, Water works, Drainage, Traffic operations. Priority should reflect likely public impact and urgency.`,
      },
      {
        role: "user",
        content: `Resident description:\n${input.description}\n\nReported location:\n${input.location || "Location not provided"}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "sevaflow_issue_assessment",
        strict: true,
        schema: assessmentSchema,
      },
    },
    max_tokens: 500,
  });

  const content = response.choices[0]?.message.content;
  if (typeof content !== "string") throw new Error("Structured assessment returned no content");
  return normalizeAssessment(JSON.parse(content) as StructuredAssessment);
}

export async function assessIssue(input: { description: string; location: string }) {
  if (ENV.aiProvider.toLowerCase() === "bedrock") {
    const { assessIssueWithBedrock } = await import("./bedrock-provider");
    return normalizeAssessment(await assessIssueWithBedrock(input));
  }
  return assessIssueWithPlatform(input);
}
