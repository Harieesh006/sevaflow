export type Priority = "High" | "Medium" | "Low";

export type Assessment = {
  category: string;
  shortCategory: string;
  priority: Priority;
  summary: string;
  department: string;
  suggestedAction: string;
  confidence: number;
  observed: string[];
};

export function analyzeDescription(description: string): Assessment {
  const normalized = description.toLowerCase();
  if (normalized.includes("street") || normalized.includes("light") || normalized.includes("lamp")) {
    return {
      category: "Street lighting",
      shortCategory: "Light",
      priority: normalized.includes("danger") || normalized.includes("night") ? "High" : "Medium",
      summary: "Streetlight outage affecting visibility near a public access point.",
      department: "Electrical services",
      suggestedAction: "Inspect the fixture, test the power line, and replace the lamp if required.",
      confidence: 94,
      observed: ["Public lighting issue", "Night-time visibility risk", "Fixed infrastructure asset"],
    };
  }
  if (normalized.includes("pothole") || normalized.includes("road") || normalized.includes("crack")) {
    return {
      category: "Road maintenance",
      shortCategory: "Roads",
      priority: normalized.includes("crash") || normalized.includes("deep") ? "High" : "Medium",
      summary: "Road surface damage creating a potential safety hazard for commuters.",
      department: "Roads & infrastructure",
      suggestedAction: "Mark the damaged section and schedule a patch repair inspection.",
      confidence: 88,
      observed: ["Road-surface damage", "Commuter route", "Repair inspection recommended"],
    };
  }
  if (normalized.includes("water") || normalized.includes("flood") || normalized.includes("leak") || normalized.includes("drain")) {
    return {
      category: "Water & drainage",
      shortCategory: "Water",
      priority: normalized.includes("flood") || normalized.includes("blocked") ? "High" : "Medium",
      summary: "Water or drainage disruption affecting a public route or property edge.",
      department: "Water works",
      suggestedAction: "Dispatch a field check to clear the obstruction and stop the leak.",
      confidence: 86,
      observed: ["Water-related disruption", "Possible drainage constraint", "Field inspection recommended"],
    };
  }
  return {
    category: "Waste management",
    shortCategory: "Waste",
    priority: normalized.includes("days") || normalized.includes("overflow") || normalized.includes("smell") ? "High" : "Medium",
    summary: "Accumulated waste beside a public route, requiring sanitation attention.",
    department: "Municipal sanitation",
    suggestedAction: "Schedule waste collection and inspect the location for recurring accumulation.",
    confidence: 91,
    observed: ["Accumulated waste", "Public-roadside location", "Possible recurring sanitation issue"],
  };
}
