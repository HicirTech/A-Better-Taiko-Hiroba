import { describe, expect, test } from "bun:test";
import { renderHook } from "@testing-library/react/pure";

import type { WriteOutcomeView } from "../src/shared/session-port";
import { useWriteSession } from "../src/shared/writes/use-write-session";
import { inADocument } from "./document";
import { answeredByHand, writeLane } from "./write-fakes";

inADocument();

const BUSY: WriteOutcomeView<string> = { kind: "busy" };

function writeSession() {
  const { lane, held } = writeLane();
  const write = answeredByHand<WriteOutcomeView<string>>();
  const { result, rerender } = renderHook(() => useWriteSession(lane));
  return { result, rerender, held, write };
}

describe("a write session", () => {
  test("gives how a write ended, the lane held and a write on its way until then", async () => {
    const { result, held, write } = writeSession();
    const sent = result.current.send(write.call);
    expect(result.current.writing()).toBe(true);
    expect(held()).toBe(1);

    write.answer(BUSY);

    expect(await sent).toEqual(BUSY);
    expect(result.current.writing()).toBe(false);
    expect(held()).toBe(0);
  });

  test("lets go of the answer of a write bumped on its way", async () => {
    const { result, held, write } = writeSession();
    const sent = result.current.send(write.call);
    result.current.bump();

    write.answer(BUSY);

    expect(await sent).toBeNull();
    expect(result.current.writing()).toBe(false);
    expect(held()).toBe(0);
  });

  test("keeps the answer of a write sent after a bump", async () => {
    const { result, write } = writeSession();
    result.current.bump();
    const sent = result.current.send(write.call);

    write.answer(BUSY);

    expect(await sent).toEqual(BUSY);
  });

  test("ends a call that is refused as interrupted, the lane let go", async () => {
    const { result, held } = writeSession();
    const refused = () => Promise.reject<WriteOutcomeView<string>>(new Error("refused"));

    expect(await result.current.send(refused)).toEqual({ kind: "interrupted" });
    expect(result.current.writing()).toBe(false);
    expect(held()).toBe(0);
  });

  test("counts one more with each bump, for the reads it lets go too", () => {
    const { result } = writeSession();
    const before = result.current.generation.current;
    result.current.bump();
    result.current.bump();
    expect(result.current.generation.current).toBe(before + 2);
  });

  test("stays the same session from render to render", () => {
    const { result, rerender } = writeSession();
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
