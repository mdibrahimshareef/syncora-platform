export type AIIntent =
  | "read"
  | "search"
  | "summary"
  | "analysis"
  | "planning"
  | "action"
  | "mixed"
  | "unknown";

export function classifyIntent(message: string): AIIntent {
  const msg = message.toLowerCase();
  
  if (/create|add|new|update|assign|change|modify/i.test(msg)) {
    if (/why|how|what/i.test(msg)) return "mixed";
    return "action";
  }
  
  if (/why|reason|cause|explain|analyze/i.test(msg)) return "analysis";
  if (/plan|organize|schedule|roadmap/i.test(msg)) return "planning";
  if (/summarize|summary|overview/i.test(msg)) return "summary";
  if (/find|search|where/i.test(msg)) return "search";
  if (/what|which|who|when/i.test(msg)) return "read";

  return "unknown";
}
