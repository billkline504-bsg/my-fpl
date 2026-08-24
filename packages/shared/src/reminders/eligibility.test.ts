import { describe, expect, it } from "vitest";
import { shouldSendReminder } from "./eligibility.js";

const now = new Date("2026-08-24T12:00:00Z");
const oneHourMs = 60 * 60 * 1000;

describe("shouldSendReminder", () => {
  it("returns true when the deadline is within the offset and nothing sent yet", () => {
    expect(
      shouldSendReminder({
        now,
        deadlineTime: new Date(now.getTime() + 30 * 60 * 1000),
        offsetMs: oneHourMs,
        alreadySent: false,
      }),
    ).toBe(true);
  });

  it("returns false once a reminder of this type has already been sent", () => {
    expect(
      shouldSendReminder({
        now,
        deadlineTime: new Date(now.getTime() + 30 * 60 * 1000),
        offsetMs: oneHourMs,
        alreadySent: true,
      }),
    ).toBe(false);
  });

  it("returns false when the deadline has already passed", () => {
    expect(
      shouldSendReminder({
        now,
        deadlineTime: new Date(now.getTime() - 1000),
        offsetMs: oneHourMs,
        alreadySent: false,
      }),
    ).toBe(false);
  });

  it("returns false when the deadline is further away than the offset", () => {
    expect(
      shouldSendReminder({
        now,
        deadlineTime: new Date(now.getTime() + 2 * oneHourMs),
        offsetMs: oneHourMs,
        alreadySent: false,
      }),
    ).toBe(false);
  });

  it("is inclusive of the exact offset boundary", () => {
    expect(
      shouldSendReminder({
        now,
        deadlineTime: new Date(now.getTime() + oneHourMs),
        offsetMs: oneHourMs,
        alreadySent: false,
      }),
    ).toBe(true);
  });

  it("treats a deadline exactly at now as not eligible (must be strictly in the future)", () => {
    expect(
      shouldSendReminder({
        now,
        deadlineTime: now,
        offsetMs: oneHourMs,
        alreadySent: false,
      }),
    ).toBe(false);
  });
});
