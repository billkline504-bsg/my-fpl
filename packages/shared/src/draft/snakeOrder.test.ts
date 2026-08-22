import { describe, expect, it } from "vitest";
import { getSnakeDraftTurnUserId } from "./snakeOrder.js";

describe("getSnakeDraftTurnUserId", () => {
  const order = ["a", "b", "c"];

  it("goes forward through round 0", () => {
    expect(getSnakeDraftTurnUserId(order, 0)).toBe("a");
    expect(getSnakeDraftTurnUserId(order, 1)).toBe("b");
    expect(getSnakeDraftTurnUserId(order, 2)).toBe("c");
  });

  it("reverses for round 1", () => {
    expect(getSnakeDraftTurnUserId(order, 3)).toBe("c");
    expect(getSnakeDraftTurnUserId(order, 4)).toBe("b");
    expect(getSnakeDraftTurnUserId(order, 5)).toBe("a");
  });

  it("goes forward again for round 2", () => {
    expect(getSnakeDraftTurnUserId(order, 6)).toBe("a");
  });

  it("returns null for an empty pick order", () => {
    expect(getSnakeDraftTurnUserId([], 0)).toBeNull();
  });
});
