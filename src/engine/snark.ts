/**
 * A 32-bit mix of (seed, turn, n): multiply-xor the inputs together, then the murmur3/splitmix finalizer, so every
 * output bit depends on every input bit. The old `Math.imul(seed ^ k, turn + 1) % n` kept the low bits of a plain
 * product, which for an even `n` left most lines of a pool unreachable on most turns (F12).
 */
export function mix32(seed: number, turn: number, n: number): number {
  let h = (Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul((turn + 1) | 0, 0x85ebca77) ^ Math.imul(n | 0, 0xc2b2ae3d)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}

/** The order of a pool of `n` lines for one bag of `n` turns: a Fisher-Yates shuffle driven by mix32(seed, bag, n). */
function bag(seed: number, b: number, n: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  let h = mix32(seed, b, n);
  for (let i = n - 1; i > 0; i--) {
    h = mix32(h, i, n);
    const j = h % (i + 1);
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}

/**
 * The index for this turn. Turns are dealt from shuffled bags of `n`: every line comes up once in each `n` turns
 * (all of them reachable, from any seed), and two consecutive turns never get the same line — at a bag seam the
 * new bag's first two swap when its first would repeat the old bag's last (the swap never touches a bag's last, n ≥ 3).
 */
export function pickIndex(seed: number, turn: number, n: number): number {
  if (n <= 1) return 0;
  const t = Math.max(0, Math.floor(turn));
  if (n === 2) return (mix32(seed, 0, 2) + t) % 2;
  const b = Math.floor(t / n);
  const i = t % n;
  const order = bag(seed, b, n);
  if (b > 0 && order[0] === bag(seed, b - 1, n)[n - 1]) [order[0], order[1]] = [order[1]!, order[0]!];
  return order[i]!;
}

/** Deterministic pick from the snark pool: same seed + turn always yields the same line, and every line is reachable. */
export function pickSnark(seed: number, turn: number, pool: string[]): string {
  if (pool.length === 0) return "I don't understand.";
  return pool[pickIndex(seed, turn, pool.length)]!;
}
