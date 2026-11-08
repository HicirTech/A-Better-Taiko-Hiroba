import { afterAll, afterEach, beforeEach, describe, expect, setSystemTime, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createDesktopPort, handlePortCalls } from "../electron/port-handlers";
import { createCostumeEditor, type MockSession } from "../scripts/mock-costume";
import { createFavoritesEditor } from "../scripts/mock-favorites";
import { createProfileEditor, INITIAL_PROFILE, OWNED_TITLES } from "../scripts/mock-profile";
import { BRIDGE_CHANNELS, type HirobaSessionPort } from "../src/shared/session-port";
import { native } from "./capacitor-fakes";
import { CLOSE_LABEL, HIROBA, memoryFlag, profilePage, until } from "./capacitor-port-fixtures";
import {
  hirobaStandIn,
  START_SET,
  type StandIn,
  type StandInOptions,
  standIn,
} from "./hiroba-stand-in";
import { fakeIndexedDbs } from "./indexeddb-fake";

const { createCapacitorPort } = await import("../src/platform/capacitor");
const { CAPACITOR_ENDPOINTS, CAPACITOR_SITES } = await import("../src/platform/capacitor-sites");

const NOON_JST = () => new Date("2026-09-27T03:00:00Z");
const USER_AGENT =
  "Mozilla/5.0 (test) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36";
const TARGET = { ...START_SET, colorFace: 3 };
const FEWER = ["1001", "1008"];
/** A pipeline keeps its history a second after a change, so a data folder goes after that. */
const PIPELINE_SAVE_MS = 1_100;

interface Frame {
  readonly trusted: boolean;
}
const APP_FRAME: Frame = { trusted: true };
type Answer = (frame: Frame, ...args: unknown[]) => unknown;

const folders: string[] = [];
afterAll(async () => {
  await Bun.sleep(PIPELINE_SAVE_MS);
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
});

/** A title the stand-in's player owns besides the one worn. */
function otherTitle() {
  const [, other] = OWNED_TITLES;
  if (other === undefined) {
    throw new Error("The stand-in owns one title only");
  }
  return { id: other.id, title: other.label };
}

function hirobaWorld(): StandInOptions {
  const editor = createCostumeEditor();
  const profile = createProfileEditor({ issue: editor.issueTicket });
  const favorites = createFavoritesEditor({ issue: editor.issueTicket });
  const session: MockSession = { cardChosen: true };
  return { editor, profile, favorites, session, myPage: profilePage(profile) };
}

/** A shell's port as its window calls it, its own way to sign in, and a launch on what it kept. */
interface Shell {
  port(): HirobaSessionPort;
  signIn(): Promise<unknown>;
  relaunch(): Promise<void>;
  readonly hiroba: StandIn;
}

/** The desktop's main process on a data folder of its own, its calls heard on their channels. */
function desktopMain(hiroba: StandIn, sent: string[] = []) {
  const dataFolder = mkdtempSync(join(tmpdir(), "abth-shell-ports-"));
  folders.push(dataFolder);
  return () => {
    const answers = new Map<string, Answer>();
    const port = createDesktopPort({
      endpoints: CAPACITOR_ENDPOINTS,
      sites: CAPACITOR_SITES,
      now: NOON_JST,
      userAgent: USER_AGENT,
      dataFolder,
      savedReads: undefined,
      openSignIn: () => ({
        result: Promise.resolve({ kind: "captured", cookie: "sample-session" }),
        cancel: () => undefined,
      }),
      fetch: (url, init) => {
        sent.push(`${init.method} ${new URL(url).pathname}`);
        return hiroba.answer(new Request(url, init));
      },
    });
    handlePortCalls(
      port,
      { handle: (channel, answer) => void answers.set(channel, answer) },
      (frame: Frame) => frame.trusted,
    );
    return answers;
  };
}

/** The desktop's port as the preload reaches it: each call on its channel, from the app's page. */
function overChannels(answers: ReadonlyMap<string, Answer>): HirobaSessionPort {
  const calls = Object.entries(BRIDGE_CHANNELS).map(([verb, channel]) => [
    verb,
    async (...args: unknown[]) => answers.get(channel)?.(APP_FRAME, ...args),
  ]);
  return Object.fromEntries(calls) as HirobaSessionPort;
}

function desktopShell(): Shell {
  const hiroba = hirobaStandIn(hirobaWorld());
  const launch = desktopMain(hiroba);
  let port = overChannels(launch());
  return {
    port: () => port,
    signIn: () => port.signIn(),
    relaunch: async () => {
      port = overChannels(launch());
    },
    hiroba,
  };
}

async function androidShell(): Promise<Shell> {
  const hiroba = standIn(hirobaWorld());
  const signedInFlag = memoryFlag();
  const indexedDb = fakeIndexedDbs();
  const launch = () =>
    createCapacitorPort({ closeLabel: () => CLOSE_LABEL, signedInFlag, indexedDb, now: NOON_JST });
  let port = await launch();
  return {
    port: () => port,
    signIn: async () => {
      const opened = native.openedWith.length;
      const outcome = port.signIn();
      await until(() => native.openedWith.length > opened);
      native.emit("browserPageNavigationCompleted", { url: `${HIROBA}/index.php` });
      return outcome;
    },
    relaunch: async () => {
      port = await launch();
    },
    hiroba,
  };
}

/** A player's first launches: a sign-in, each kind of write, a launch again, then a sign-out. */
async function firstLaunches({ port, signIn, relaunch }: Shell) {
  const signedInAtFirst = await port().isSignedIn();
  const signedIn = await signIn();
  const profile = await port().readProfile();
  const costume = await port().openCostumeEditor();
  const preview = await port().previewCostume(TARGET);
  const costumeChange = await port().changeCostume({ expected: START_SET, target: TARGET });
  const titles = await port().openTitleEditor();
  const titleChange = await port().changeTitle({
    expected: { title: INITIAL_PROFILE.title },
    target: otherTitle(),
  });
  const nameChange = await port().changeName({
    expected: { nickname: INITIAL_PROFILE.nickname },
    target: { nickname: "あたらしい" },
  });
  const favorites = await port().openFavorites();
  const folder = favorites.ok ? favorites.value.folder.state : { slots: [] };
  const folderChange = await port().changeFolder({ expected: folder, target: FEWER });
  const song = favorites.ok ? favorites.value.song.state : { songNo: null, ura: false };
  const songChange = await port().changeFavoriteSong({
    expected: song,
    target: { songNo: "1001", ura: false },
  });
  const songPicker = await port().readSongPicker();
  const scores = await port().scores();
  await relaunch();
  const signedInOnRelaunch = await port().isSignedIn();
  const profileOnRelaunch = await port().readProfile();
  const costumeHistory = await port().costumeHistory();
  const folderHistory = await port().folderHistory();
  const signOut = await port().signOut();
  const signedOut = await port().isSignedIn();
  const profileSignedOut = await port().readProfile();
  await relaunch();
  const signedInAfterSignOut = await port().isSignedIn();
  return {
    signedInAtFirst,
    signedIn,
    profile,
    costume,
    preview,
    costumeChange,
    titles,
    titleChange,
    nameChange,
    favorites,
    folderChange,
    songChange,
    songPicker,
    scores,
    signedInOnRelaunch,
    profileOnRelaunch,
    costumeHistory,
    folderHistory,
    signOut,
    signedOut,
    profileSignedOut,
    signedInAfterSignOut,
  };
}

/** A session Hiroba ends under a read of my page, then a launch again. */
async function endedByHiroba({ port, signIn, relaunch, hiroba }: Shell) {
  await signIn();
  const profile = await port().readProfile();
  hiroba.end();
  const profileEnded = await port().readProfile();
  const signedIn = await port().isSignedIn();
  hiroba.restore();
  await relaunch();
  const signedInOnRelaunch = await port().isSignedIn();
  return { profile, profileEnded, signedIn, signedInOnRelaunch };
}

describe("both shells' ports", () => {
  beforeEach(() => {
    native.reset();
    // A read notes when it was made: both shells read at the same moment.
    setSystemTime(NOON_JST());
  });
  afterEach(() => setSystemTime());

  test("answer a player's first launches alike: the sign-in, each write, the sign-out", async () => {
    const { costumeChange: desktopCostume, ...desktop } = await firstLaunches(desktopShell());
    const { costumeChange: androidCostume, ...android } = await firstLaunches(await androidShell());

    expect(desktop).toEqual(android);
    // A costume write from the desktop is checked live, so it reads no other page around it.
    expect(desktopCostume).toMatchObject({ kind: "applied", cross: "off" });
    expect(androidCostume).toMatchObject({ kind: "applied", cross: "unchanged" });
    expect({ ...desktopCostume, cross: null }).toEqual({ ...androidCostume, cross: null });
    expect(android).toMatchObject({
      signedInAtFirst: false,
      signedIn: { kind: "signedIn" },
      profile: { ok: true, value: { nickname: INITIAL_PROFILE.nickname } },
      titleChange: { kind: "applied" },
      nameChange: { kind: "applied" },
      folderChange: { kind: "applied" },
      songChange: { kind: "applied" },
      songPicker: { ok: true },
      signedInOnRelaunch: true,
      profileOnRelaunch: { ok: true, value: { nickname: "あたらしい" } },
      signedOut: false,
      profileSignedOut: { ok: false, error: { kind: "notSignedIn" } },
      signedInAfterSignOut: false,
    });
    expect(android.costumeHistory).toHaveLength(2);
    expect(android.folderHistory).toHaveLength(2);
  });

  test("answer alike when Hiroba ends the session under a read, and launch again signed out", async () => {
    const desktop = await endedByHiroba(desktopShell());
    const android = await endedByHiroba(await androidShell());

    expect(desktop).toEqual(android);
    expect(android).toMatchObject({
      profile: { ok: true },
      profileEnded: { ok: false },
      signedIn: false,
      signedInOnRelaunch: false,
    });
  });

  test("answer every call of the port, the desktop each on a channel of its own", async () => {
    const answers = desktopMain(hirobaStandIn(hirobaWorld()))();
    const android = await createCapacitorPort({ closeLabel: () => CLOSE_LABEL });

    expect([...answers.keys()].sort()).toEqual(Object.values(BRIDGE_CHANNELS).sort());
    expect(Object.keys(android).sort()).toEqual(Object.keys(BRIDGE_CHANNELS).sort());
  });
});

describe("the desktop's port channels", () => {
  test("refuse a frame the app does not trust, or arguments a call does not take, unasked", async () => {
    const sent: string[] = [];
    const answers = desktopMain(hirobaStandIn(hirobaWorld()), sent)();
    const answer = (verb: keyof HirobaSessionPort) => answers.get(BRIDGE_CHANNELS[verb]);
    await answer("signIn")?.(APP_FRAME);
    sent.length = 0;

    expect(() => answer("readProfile")?.({ trusted: false })).toThrow("untrusted frame");
    expect(() => answer("readProfile")?.(APP_FRAME, "renew")).toThrow("arguments it does not take");
    expect(sent).toEqual([]);
    expect(await answer("readProfile")?.(APP_FRAME)).toMatchObject({ ok: true });
    expect(sent).toEqual(["GET /mypage_top.php"]);
  });
});
