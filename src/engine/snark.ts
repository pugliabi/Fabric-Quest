/** Deterministic pick from the snark pool: same seed + turn always yields the same line. */
export function pickSnark(seed: number, turn: number, pool: string[]): string {
  if (pool.length === 0) return "I don't understand.";
  const x = Math.abs(Math.imul(seed ^ 0x9e3779b9, turn + 1) >>> 0) % pool.length;
  return pool[x]!;
}
