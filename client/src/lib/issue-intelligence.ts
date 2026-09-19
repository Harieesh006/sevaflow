export type Priority = "High" | "Medium" | "Low";

export type Assessment = {
  category: string;
  shortCategory: string;
  priority: Priority;
  confidence: number;
  summary: string;
  evidence: string[];
  department: string;
  suggestedAction: string;
};
