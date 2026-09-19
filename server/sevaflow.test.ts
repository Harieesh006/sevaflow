import { describe, expect, it } from "vitest";
import { analyzeDescription } from "../client/src/lib/issue-intelligence";

describe("SevaFlow demo assessment", () => {
  it("routes a repeated garbage complaint to sanitation with high priority", () => {
    const result = analyzeDescription("Garbage has been overflowing beside the bus stop for 4 days.");

    expect(result.category).toBe("Waste management");
    expect(result.department).toBe("Municipal sanitation");
    expect(result.priority).toBe("High");
    expect(result.confidence).toBeGreaterThan(90);
  });

  it("routes a night streetlight issue to electrical services", () => {
    const result = analyzeDescription("The street light near our college is dead at night.");

    expect(result.category).toBe("Street lighting");
    expect(result.department).toBe("Electrical services");
    expect(result.priority).toBe("High");
  });

  it("routes a pothole report to roads and infrastructure", () => {
    const result = analyzeDescription("There is a deep pothole across the road near the bus stop.");

    expect(result.category).toBe("Road maintenance");
    expect(result.department).toBe("Roads & infrastructure");
    expect(result.priority).toBe("High");
  });
});
