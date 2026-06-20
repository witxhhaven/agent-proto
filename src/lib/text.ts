/** Short, human-readable title from a longer string (e.g. the first chat message). */
export function summariseTitle(text: string, maxWords = 6): string {
  const clean = text.trim().replace(/\s+/g, " ");
  if (!clean) return "Untitled";
  const words = clean.split(" ");
  const short = words.slice(0, maxWords).join(" ");
  return short + (words.length > maxWords ? "…" : "");
}
