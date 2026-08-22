export interface RoundRobinPairing {
  userAId: string;
  userBId: string;
}

const BYE = "__BYE__";

/**
 * Standard circle-method round robin: fixes the first id in place and
 * rotates the rest each round, pairing from the outside in. Odd counts get
 * a phantom BYE seat spliced in — whoever draws it sits out that round —
 * so every real pair still meets exactly once per full cycle.
 */
export function generateRoundRobin(userIds: string[]): RoundRobinPairing[][] {
  if (userIds.length < 2) return [];

  const ids = [...userIds];
  if (ids.length % 2 !== 0) ids.push(BYE);

  const size = ids.length;
  const fixed = ids[0]!;
  let rest = ids.slice(1);
  const rounds: RoundRobinPairing[][] = [];

  for (let round = 0; round < size - 1; round++) {
    const current = [fixed, ...rest];
    const pairs: RoundRobinPairing[] = [];

    for (let i = 0; i < size / 2; i++) {
      const a = current[i]!;
      const b = current[size - 1 - i]!;
      if (a !== BYE && b !== BYE) pairs.push({ userAId: a, userBId: b });
    }

    rounds.push(pairs);
    rest = [rest[rest.length - 1]!, ...rest.slice(0, -1)];
  }

  return rounds;
}
