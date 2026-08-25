/** D13 — rumus damage murni (shared client/server, tanpa dependensi engine). */
export function playerDamage(basePower: number): number {
  return 8 + Math.floor(basePower * 0.8);
}
