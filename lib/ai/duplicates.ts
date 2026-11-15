/** Deterministic near-duplicate detection (no AI): Jaccard similarity of word trigrams. */
const normalise = (text: string) => text.toLocaleLowerCase("tr").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);

function shingles(text: string) {
  const words = normalise(text);
  const set = new Set<string>();
  if (words.length < 3) { if (words.length) set.add(words.join(" ")); return set; }
  for (let i = 0; i + 3 <= words.length; i++) set.add(words.slice(i, i + 3).join(" "));
  return set;
}

export function similarity(a: string, b: string) {
  const x = shingles(a), y = shingles(b);
  if (!x.size || !y.size) return 0;
  let shared = 0;
  for (const item of x) if (y.has(item)) shared++;
  return shared / (x.size + y.size - shared);
}

export function findDuplicates(text: string, others: Array<{ id: string; text: string }>, threshold = 0.35) {
  return others
    .map((other) => ({ id: other.id, score: Math.round(similarity(text, other.text) * 100) / 100 }))
    .filter((match) => match.score >= threshold)
    .sort((a, b) => b.score - a.score);
}
