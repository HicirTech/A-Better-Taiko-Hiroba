/**
 * Android's platform layer against stand-ins for the in-app browser and the cookie store: how the
 * browser is opened, when a sign-in counts, when the cookie store is wiped, and that a finished
 * sign-in is remembered across launches.
 */
import { beforeEach, describe, expect, test } from "bun:test";

import { native, nativeBase64 } from "./capacitor-fakes";

const { createAndroidPort } = await import("../src/platform/android");

const HIROBA = "https://donderhiroba.jp";
const CLOSE_LABEL = "Close sign-in";

/** A signed-in flag in memory, in place of the page's localStorage. */
function memoryFlag(initial = false) {
  let value = initial;
  return {
    get: () => value,
    set: (next: boolean) => {
      value = next;
    },
  };
}

async function until(condition: () => boolean): Promise<void> {
  for (let tries = 0; tries < 100 && !condition(); tries++) {
    await Bun.sleep(1);
  }
  expect(condition()).toBe(true);
}

/** Starts a sign-in and waits until the in-app browser is open. */
async function startSignIn(signedInFlag = memoryFlag()) {
  const port = await createAndroidPort({ closeLabel: CLOSE_LABEL, signedInFlag });
  const outcome = port.signIn();
  await until(() => native.openedWith.length === 1);
  return { port, outcome };
}

describe("createAndroidPort", () => {
  beforeEach(() => native.reset());

  test("opens signed in after an earlier sign-in, and wipes nothing as it starts", async () => {
    const port = await createAndroidPort({
      closeLabel: CLOSE_LABEL,
      signedInFlag: memoryFlag(true),
    });
    expect(await port.isSignedIn()).toBe(true);
    expect(native.cookieCalls).toEqual([]);
  });

  test("opens signed out when no sign-in was remembered", async () => {
    const port = await createAndroidPort({ closeLabel: CLOSE_LABEL, signedInFlag: memoryFlag() });
    expect(await port.isSignedIn()).toBe(false);
    expect(await port.readProfile()).toEqual({ ok: false, error: { kind: "notSignedIn" } });
  });

  test("a landed sign-in whose browser stays open still counts when the user closes it", async () => {
    native.closeIgnored = true;
    const flag = memoryFlag();
    const { outcome } = await startSignIn(flag);
    native.emit("browserPageNavigationCompleted", { url: `${HIROBA}/index.php` });
    expect(native.closeCalls).toBe(1);
    native.emit("browserClosed");
    expect(await outcome).toEqual({ kind: "signedIn" });
    expect(flag.get()).toBe(true);
  });

  test("opens Hiroba's sign-in in a shared view that closes on the back key", async () => {
    await startSignIn();
    const opened = native.openedWith[0];
    expect(opened?.url).toBe(`${HIROBA}/login.php`);
    expect(opened?.options).toMatchObject({
      closeButtonText: CLOSE_LABEL,
      showNavigationButtons: false,
      android: { isIsolated: false, hardwareBack: false },
    });
  });

  test("closes the browser on landing, then counts as signed in and drops the ID host's cookies", async () => {
    const { outcome } = await startSignIn();
    native.emit("browserPageNavigationCompleted", { url: "https://account.bandainamcoid.com/x" });
    native.emit("browserPageNavigationCompleted", { url: `${HIROBA}/login_select.php` });
    expect(native.closeCalls).toBe(0);
    native.emit("browserPageNavigationCompleted", { url: `${HIROBA}/index.php` });
    expect(await outcome).toEqual({ kind: "signedIn" });
    expect(native.closeCalls).toBe(1);
    // The last call writes the store to disk, so the session outlives an app swiped away.
    expect(native.cookieCalls).toEqual([
      "clearAllCookies",
      "clearCookies https://account.bandainamcoid.com/",
      "deleteCookie abth-save",
    ]);
  });

  test("a browser closed before landing is a cancel, and wipes what the attempt left", async () => {
    const { port, outcome } = await startSignIn();
    native.emit("browserPageNavigationCompleted", { url: "https://account.bandainamcoid.com/x" });
    native.emit("browserClosed");
    expect(await outcome).toEqual({ kind: "cancelled" });
    expect(native.cookieCalls.at(-1)).toBe("clearAllCookies");
    expect(await port.readProfile()).toEqual({ ok: false, error: { kind: "notSignedIn" } });
    expect(native.httpRequests).toHaveLength(0);
  });

  test("a browser that cannot open ends the attempt instead of hanging", async () => {
    native.openFails = true;
    const port = await createAndroidPort({ closeLabel: CLOSE_LABEL });
    expect(await port.signIn()).toEqual({ kind: "unavailable" });
    expect(native.listeners.size).toBe(0);
  });

  test("a read that finds the session gone wipes the cookie store and forgets the sign-in", async () => {
    const flag = memoryFlag();
    const { port, outcome } = await startSignIn(flag);
    native.emit("browserPageNavigationCompleted", { url: `${HIROBA}/index.php` });
    await outcome;
    native.cookieCalls.length = 0;
    native.httpAnswer = async () => ({
      status: 200,
      url: `${HIROBA}/login.php`,
      headers: {},
      data: nativeBase64("<form id=login_form></form>"),
    });
    expect(await port.readProfile()).toEqual({ ok: false, error: { kind: "loggedOut" } });
    expect(native.httpRequests).toHaveLength(1);
    expect(native.cookieCalls).toEqual(["clearAllCookies"]);
    expect(flag.get()).toBe(false);
    expect(await port.readProfile()).toEqual({ ok: false, error: { kind: "notSignedIn" } });
  });

  test("sign-out wipes the cookie store and forgets the sign-in", async () => {
    const flag = memoryFlag();
    const { port, outcome } = await startSignIn(flag);
    native.emit("browserPageNavigationCompleted", { url: `${HIROBA}/index.php` });
    await outcome;
    native.cookieCalls.length = 0;
    expect(flag.get()).toBe(true);
    await port.signOut();
    expect(native.cookieCalls).toEqual(["clearAllCookies"]);
    expect(flag.get()).toBe(false);
    expect(await port.readProfile()).toEqual({ ok: false, error: { kind: "notSignedIn" } });
  });
});

describe("createAndroidPort's writes", () => {
  beforeEach(() => native.reset());

  test("enables no write, offers no undo, and a costume change sends nothing", async () => {
    const port = await createAndroidPort({
      closeLabel: CLOSE_LABEL,
      signedInFlag: memoryFlag(true),
    });
    expect(await port.enabledWrites()).toEqual([]);
    const set = {
      colorBody: 1,
      colorLimb: 1,
      colorFace: 1,
      costume1: 0,
      costume2: 0,
      costume3: 0,
      costume4: 0,
      costume5: 0,
    };
    expect(await port.changeCostume({ expected: set, target: { ...set, colorFace: 2 } })).toEqual({
      kind: "notEnabled",
    });
    expect(await port.pendingUndo()).toEqual([]);
    expect(await port.undo("costume")).toEqual({ kind: "notEnabled" });
    expect(native.httpRequests).toEqual([]);
  });

  test("reads no costume editor while signed out", async () => {
    const port = await createAndroidPort({ closeLabel: CLOSE_LABEL, signedInFlag: memoryFlag() });
    expect(await port.openCostumeEditor()).toEqual({ ok: false, error: { kind: "notSignedIn" } });
    expect(native.httpRequests).toEqual([]);
  });
});

describe("createAndroidPort's costume preview", () => {
  beforeEach(() => native.reset());

  const SET = {
    colorBody: 12,
    colorLimb: 13,
    colorFace: 5,
    costume1: 0,
    costume2: 21,
    costume3: 68,
    costume4: 37,
    costume5: 140,
  };
  const PREVIEW_URL = `${HIROBA}/imgsrc_mydon.php?face=5&body=12&limb=13&cos1=0&cos2=21&cos3=68&cos4=37&cos5=140`;

  test("asks nothing while signed out", async () => {
    const port = await createAndroidPort({ closeLabel: CLOSE_LABEL, signedInFlag: memoryFlag() });
    expect(await port.previewCostume(SET)).toEqual({
      ok: false,
      error: { code: "preview=notSignedIn" },
    });
    expect(native.httpRequests).toEqual([]);
  });

  test("signed in, one GET through the WebView's cookie store, answered as a data: URL", async () => {
    const picture = new Uint8Array(2048);
    picture.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    native.httpAnswer = async () => ({
      status: 200,
      url: PREVIEW_URL,
      headers: { "Content-Type": "image/png" },
      data: nativeBase64(picture),
    });
    const port = await createAndroidPort({
      closeLabel: CLOSE_LABEL,
      signedInFlag: memoryFlag(true),
    });
    const preview = await port.previewCostume(SET);
    expect(preview.ok && preview.value.startsWith("data:image/png;base64,iVBORw0KGgo")).toBe(true);
    expect(native.httpRequests.map(({ url, method }) => ({ url, method }))).toEqual([
      { url: PREVIEW_URL, method: "GET" },
    ]);
    expect(native.httpRequests[0]?.headers).not.toHaveProperty("Cookie");
    // A preview is not a read of the session: it neither saves nor wipes the cookie store.
    expect(native.cookieCalls).toEqual([]);
  });

  test("a no-session GIF is a failure with codes, and forgets nothing", async () => {
    const flag = memoryFlag(true);
    native.httpAnswer = async () => ({
      status: 200,
      url: PREVIEW_URL,
      headers: { "Content-Type": "image/gif" },
      data: nativeBase64(new Uint8Array(43)),
    });
    const port = await createAndroidPort({ closeLabel: CLOSE_LABEL, signedInFlag: flag });
    expect(await port.previewCostume(SET)).toEqual({
      ok: false,
      error: { code: "preview=notPng status=200 type=image/gif bytes=43" },
    });
    expect(native.cookieCalls).toEqual([]);
    expect(flag.get()).toBe(true);
  });
});
