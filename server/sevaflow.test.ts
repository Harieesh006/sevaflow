import { describe, expect, it } from "vitest";
import { normalizeAssessment } from "./issue-intelligence";

describe("SevaFlow structured assessment", () => {
  it("normalizes strict model JSON into the UI contract", () => {
    const result = normalizeAssessment({
      category: "Waste management",
      short_category: "Waste",
      priority: "high",
      confidence: 0.91,
      summary: "Accumulated waste near a public bus stop.",
      evidence: ["Visible waste accumulation", "Public roadside location"],
      department: "Municipal sanitation",
      suggested_action: "Schedule waste collection and inspect the location.",
    });

    expect(result).toEqual({
      category: "Waste management",
      shortCategory: "Waste",
      priority: "High",
      confidence: 91,
      summary: "Accumulated waste near a public bus stop.",
      evidence: ["Visible waste accumulation", "Public roadside location"],
      department: "Municipal sanitation",
      suggestedAction: "Schedule waste collection and inspect the location.",
    });
  });

  it("clamps invalid confidence values before they reach the UI", () => {
    const low = normalizeAssessment({
      category: "Road maintenance",
      short_category: "Roads",
      priority: "medium",
      confidence: -0.2,
      summary: "Road surface damage.",
      evidence: ["Visible road damage"],
      department: "Roads & infrastructure",
      suggested_action: "Schedule inspection.",
    });
    const high = normalizeAssessment({
      category: "Road maintenance",
      short_category: "Roads",
      priority: "high",
      confidence: 1.4,
      summary: "Road surface damage.",
      evidence: ["Visible road damage"],
      department: "Roads & infrastructure",
      suggested_action: "Schedule inspection.",
    });

    expect(low.confidence).toBe(0);
    expect(high.confidence).toBe(100);
    expect(high.priority).toBe("High");
  });
});
