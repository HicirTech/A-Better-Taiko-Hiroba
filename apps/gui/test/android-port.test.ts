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

  test("enables no write, and a costume change sends nothing", async () => {
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
    expect(native.httpRequests).toEqual([]);
  });

  test("reads no costume editor while signed out", async () => {
    const port = await createAndroidPort({ closeLabel: CLOSE_LABEL, signedInFlag: memoryFlag() });
    expect(await port.openCostumeEditor()).toEqual({ ok: false, error: { kind: "notSignedIn" } });
    expect(native.httpRequests).toEqual([]);
  });
});
