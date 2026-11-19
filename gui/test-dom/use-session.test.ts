import { describe, expect, mock, test } from "bun:test";
import { err, ok, type Result } from "@abth/core";
import { act, renderHook, waitFor } from "@testing-library/react/pure";

import { useSession } from "../src/app/use-session";
import type { HirobaSessionPort, ProfileView, ReadFailure } from "../src/shared/session-port";
import { inADocument } from "./document";
import { portAnswering, writeLane } from "./write-fakes";

inADocument();

const KEPT: ProfileView = {
  nickname: "サンプルどん",
  title: "サンプルの称号",
  rename: "open",
  region: null,
  dan: null,
  crowns: { silver: 11, gold: 2, donderful: 1 },
  panel: { countLevel: 5, ranks: { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7 } },
  medal: null,
  favoriteSong: null,
  favoriteFolder: [],
  fetchedAt: "2026-11-19T05:30:00.000Z",
};
const FRESH: ProfileView = {
  ...KEPT,
  nickname: "あたらしい",
  fetchedAt: "2026-11-20T05:30:00.000Z",
};
const UNREACHABLE = err<ReadFailure>({ kind: "unreachable" });

/** The session of a window opened signed in, on a port answering `calls`. */
function openedWith(calls: Partial<HirobaSessionPort>) {
  const port = portAnswering({ isSignedIn: async () => true, ...calls });
  const { lane, renewed } = writeLane();
  const { result } = renderHook(() =>
    useSession({ port, lane, page: "overview", onNavigate: () => undefined }),
  );
  return { result, renewed };
}

describe("useSession with my page kept from an earlier read", () => {
  test("shows it as kept, the failure standing over it, when the first read fails", async () => {
    const { result, renewed } = openedWith({
      readProfile: async () => UNREACHABLE,
      keptProfile: async () => KEPT,
    });

    await waitFor(() => expect(result.current.screen.name).toBe("profile"));
    expect(result.current.screen).toEqual({ name: "profile", profile: KEPT, kept: true });
    expect(result.current.myPage.failure).toEqual({ kind: "unreachable" });
    expect(renewed).toEqual([]);
  });

  test("shows the failure alone when nothing is kept", async () => {
    const { result } = openedWith({
      readProfile: async () => UNREACHABLE,
      keptProfile: async () => null,
    });

    await waitFor(() => expect(result.current.screen.name).toBe("readFailed"));
    expect(result.current.screen).toEqual({ name: "readFailed", kind: "unreachable" });
  });

  test("asks for nothing kept when the read finds the session ended", async () => {
    const keptProfile = mock(async () => KEPT);
    const { result } = openedWith({
      readProfile: async () => err({ kind: "loggedOut" }),
      keptProfile,
    });

    await waitFor(() => expect(result.current.screen.name).toBe("signedOut"));
    expect(keptProfile).not.toHaveBeenCalled();
  });

  test("puts a good read in the kept one's place", async () => {
    let answer: Result<ProfileView, ReadFailure> = UNREACHABLE;
    const { result, renewed } = openedWith({
      readProfile: async () => answer,
      keptProfile: async () => KEPT,
    });
    await waitFor(() => expect(result.current.screen.name).toBe("profile"));
    answer = ok(FRESH);

    await act(async () => {
      await result.current.read();
    });

    expect(result.current.screen).toEqual({ name: "profile", profile: FRESH, kept: false });
    expect(renewed).toContain("myDon");
  });

  test("stays kept once its failure is let go of as another page opens", async () => {
    const { result } = openedWith({
      readProfile: async () => UNREACHABLE,
      keptProfile: async () => KEPT,
    });
    await waitFor(() => expect(result.current.screen.name).toBe("profile"));

    act(() => result.current.settle());

    expect(result.current.myPage.failure).toBeNull();
    expect(result.current.screen).toEqual({ name: "profile", profile: KEPT, kept: true });
  });
});
