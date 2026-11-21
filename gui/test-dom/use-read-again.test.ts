import { describe, expect, mock, test } from "bun:test";
import { createTranslator } from "@abth/i18n";
import { act, renderHook } from "@testing-library/react/pure";

import { useReadAgain } from "../src/app/use-read-again";
import type { PageData, PageEntry } from "../src/pages/page";
import type { Screen } from "../src/pages/page-model";
import type { ProfileView } from "../src/shared/session-port";
import { inADocument } from "./document";

inADocument();

const PROFILE = { nickname: "サンプルどん" } as ProfileView;

/** Read again on a page with reads of its own, such as Scores, with the profile `kept` or not. */
function onAPageOfItsOwn(kept: boolean) {
  const readMyPage = mock(async () => true);
  const readItsOwn = mock(() => undefined);
  const screen: Screen = { name: "profile", profile: PROFILE, kept };
  const entry = {
    namesSongs: false,
    readAgain: readItsOwn,
    follows: () => ({ reading: false, canRead: true }),
    readsEvery: () => ({ can: () => true, asks: false, read: () => undefined }),
  } as unknown as PageEntry;
  const data = {
    session: {
      screen,
      myPage: { phase: "failed", failure: null, progress: null },
      read: readMyPage,
    },
    writing: false,
    catalogue: { readIfStale: () => undefined },
    scores: { reading: false, progress: null, song: null },
    i18n: createTranslator("en"),
  } as unknown as PageData;
  const { result } = renderHook(() => useReadAgain(entry, data));
  return { result, readMyPage, readItsOwn };
}

describe("useReadAgain with my page kept from an earlier read", () => {
  test("reads my page, not the page's own data, and offers no long hold", async () => {
    const page = onAPageOfItsOwn(true);

    await act(() => page.result.current.read());

    expect(page.readMyPage).toHaveBeenCalledWith(false, true);
    expect(page.readItsOwn).not.toHaveBeenCalled();
    expect(page.result.current.readEvery).toBeUndefined();
  });

  test("reads the page's own data once my page has been read", async () => {
    const page = onAPageOfItsOwn(false);

    await act(() => page.result.current.read());

    expect(page.readItsOwn).toHaveBeenCalled();
    expect(page.readMyPage).not.toHaveBeenCalled();
    expect(page.result.current.readEvery).toBeDefined();
  });
});
