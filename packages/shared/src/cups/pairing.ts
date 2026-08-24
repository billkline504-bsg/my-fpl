export interface CupPairing {
  userAId: string;
  /** null means userAId drew a bye this round and auto-advances. */
  userBId: string | null;
}

/**
 * Shuffles entrants and pairs them up two at a time. An odd entrant out
 * gets a bye rather than being left unpaired.
 */
export function pairRandomly(userIds: string[]): CupPairing[] {
  const shuffled = [...userIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }

  const pairings: CupPairing[] = [];
  for (let i = 0; i + 1 < shuffled.length; i += 2) {
    pairings.push({ userAId: shuffled[i]!, userBId: shuffled[i + 1]! });
  }
  if (shuffled.length % 2 !== 0) {
    pairings.push({ userAId: shuffled[shuffled.length - 1]!, userBId: null });
  }

  return pairings;
}
