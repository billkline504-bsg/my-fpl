/**
 * Snake draft order: round 0 goes pickOrder[0..N-1], round 1 goes reversed
 * (pickOrder[N-1..0]), alternating every round, so nobody gets two picks in
 * a row at a round boundary.
 */
export function getSnakeDraftTurnUserId(pickOrder: string[], pickIndex: number): string | null {
  if (pickOrder.length === 0) return null;

  const round = Math.floor(pickIndex / pickOrder.length);
  const indexInRound = pickIndex % pickOrder.length;
  const userIndex = round % 2 === 0 ? indexInRound : pickOrder.length - 1 - indexInRound;

  return pickOrder[userIndex] ?? null;
}
