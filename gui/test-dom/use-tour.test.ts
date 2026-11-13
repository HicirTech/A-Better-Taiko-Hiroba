import { describe, expect, mock, test } from "bun:test";
import { act, renderHook } from "@testing-library/react/pure";

import { type TipStep, useTour } from "../src/ui/tip-tour-state";
import { inADocument } from "./document";

inADocument();

const tip = (id: string): TipStep => ({ id, at: [], words: id });
const A = tip("a");
const B = tip("b");
const C = tip("c");

describe("a tour's Next and Skip", () => {
  test("Next marks the tip shown seen and shows the next one", () => {
    const onSeen = mock((_ids: readonly string[]) => undefined);
    const { result } = renderHook(() => useTour([A, B, C], onSeen));
    expect(result.current).toMatchObject({ shown: { step: A, at: 0 }, count: 3 });

    act(() => result.current.next());
    expect(onSeen).toHaveBeenLastCalledWith(["a"]);
    expect(result.current.shown).toEqual({ step: B, at: 1 });
  });

  test("Skip marks the tip shown and the rest seen, and ends the tour", () => {
    const onSeen = mock((_ids: readonly string[]) => undefined);
    const { result } = renderHook(() => useTour([A, B, C], onSeen));
    act(() => result.current.next());

    act(() => result.current.skip());
    expect(onSeen).toHaveBeenLastCalledWith(["b", "c"]);
    expect(result.current.shown).toBeNull();
  });

  test("keeps its place and its count as the tips seen leave the steps", () => {
    const { result, rerender } = renderHook(({ steps }) => useTour(steps, () => undefined), {
      initialProps: { steps: [A, B, C] },
    });
    act(() => result.current.next());

    rerender({ steps: [B, C] });
    expect(result.current).toMatchObject({ shown: { step: B, at: 1 }, count: 3 });
  });

  test("starts again from the first tip when a tip it lacks comes", () => {
    const { result, rerender } = renderHook(({ steps }) => useTour(steps, () => undefined), {
      initialProps: { steps: [A, B] },
    });
    act(() => result.current.next());

    rerender({ steps: [B, C] });
    expect(result.current).toMatchObject({ shown: { step: B, at: 0 }, count: 2 });
  });
});
