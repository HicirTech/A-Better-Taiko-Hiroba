import { describe, expect, test } from "bun:test";

import { FormToken } from "../src/index";

const VALUE = "0123456789abcdef0123456789abcdef";

describe("FormToken", () => {
  test("gives its value back through reveal() alone", () => {
    expect(new FormToken(VALUE).reveal()).toBe(VALUE);
  });

  test("serialises, converts and inspects as [token]", () => {
    const token = new FormToken(VALUE);
    expect(JSON.stringify({ token })).toBe(`{"token":"[token]"}`);
    expect(`${token}`).toBe("[token]");
    expect(String(token)).toBe("[token]");
    expect(Bun.inspect(token)).not.toContain(VALUE);
    expect(Bun.inspect({ nested: [token] })).not.toContain(VALUE);
  });

  test("holds nothing a structured clone or a key walk can reach", () => {
    const token = new FormToken(VALUE);
    expect(Object.keys(token)).toEqual([]);
    expect(JSON.stringify(structuredClone({ token }))).not.toContain(VALUE);
  });
});
