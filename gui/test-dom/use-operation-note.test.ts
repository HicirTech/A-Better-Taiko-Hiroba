import { describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react/pure";

import { useOperationNote } from "../src/ui/use-operation-note";
import { inADocument } from "./document";

inADocument();

const DONE = { done: true };
const FAILED = { done: false };

describe("a note at the window's foot", () => {
  test("is said, stays while it slides away, and goes once it has left", () => {
    const { result } = renderHook(() => useOperationNote<string>());
    expect(result.current.said).toBeNull();
    expect(result.current.snackbar.open).toBe(false);

    act(() => result.current.say("saved"));
    expect(result.current.said).toBe("saved");
    expect(result.current.snackbar.open).toBe(true);

    act(() => result.current.snackbar.onClose());
    expect(result.current.said).toBe("saved");
    expect(result.current.snackbar.open).toBe(false);

    act(() => result.current.snackbar.onExited());
    expect(result.current.said).toBeNull();
  });

  test("said again while one stands takes its place, under a new key", () => {
    const { result } = renderHook(() => useOperationNote<string>());
    act(() => result.current.say("copied"));
    const first = result.current.key;

    act(() => result.current.snackbar.onClose());
    act(() => result.current.say("saved"));
    expect(result.current).toMatchObject({ said: "saved", snackbar: { open: true } });
    expect(result.current.key).toBe(first + 1);
  });

  test("goes at once when cleared", () => {
    const { result } = renderHook(() => useOperationNote<string>());
    act(() => result.current.say("saved"));
    act(() => result.current.clear());
    expect(result.current.said).toBeNull();
  });

  test("says each new value it follows, but not the one it starts with or none", () => {
    const { result, rerender } = renderHook(({ ended }) => useOperationNote(ended), {
      initialProps: { ended: DONE as { done: boolean } | null },
    });
    expect(result.current.said).toBeNull();

    rerender({ ended: FAILED });
    expect(result.current.said).toBe(FAILED);
    expect(result.current.snackbar.open).toBe(true);

    rerender({ ended: null });
    expect(result.current.said).toBe(FAILED);
  });

  test("says, clears and closes through the same functions at every render", () => {
    const { result, rerender } = renderHook(() => useOperationNote<string>());
    const { say, clear, snackbar } = result.current;

    act(() => say("saved"));
    rerender();
    expect(result.current.say).toBe(say);
    expect(result.current.clear).toBe(clear);
    expect(result.current.snackbar.onClose).toBe(snackbar.onClose);
  });
});
