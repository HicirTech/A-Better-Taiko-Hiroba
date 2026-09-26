/**
 * Android's platform layer against stand-ins for the in-app browser and the cookie store: how the
 * browser is opened, when a sign-in counts, and when the cookie store is wiped.
 */
import { beforeEach, describe, expect, test } from "bun:test";

import { native } from "./capacitor-fakes";

const { createAndroidPort } = await import("../src/platform/android");

const HIROBA = "https://donderhiroba.jp";
const CLOSE_LABEL = "Close sign-in";

async function until(condition: () => boolean): Promise<void> {
  for (let tries = 0; tries < 100 && !condition(); tries++) {
    await Bun.sleep(1);
  }
  expect(condition()).toBe(true);
}

/** Starts a sign-in and waits until the in-app browser is open. */
async function startSignIn() {
  const port = await createAndroidPort({ closeLabel: CLOSE_LABEL });
  const outcome = port.signIn();
  await until(() => native.openedWith.length === 1);
  return { port, outcome };
}

describe("createAndroidPort", () => {
  beforeEach(() => native.reset());

  test("wipes the cookie store as it starts", async () => {
    await createAndroidPort({ closeLabel: CLOSE_LABEL });
    expect(native.cookieCalls).toEqual(["clearAllCookies"]);
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
    expect(native.cookieCalls).toEqual([
      "clearAllCookies",
      "clearAllCookies",
      "clearCookies https://account.bandainamcoid.com/",
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

  test("a read that finds the session gone wipes the cookie store", async () => {
    const { port, outcome } = await startSignIn();
    native.emit("browserPageNavigationCompleted", { url: `${HIROBA}/index.php` });
    await outcome;
    native.cookieCalls.length = 0;
    native.httpAnswer = async () => ({
      status: 200,
      url: `${HIROBA}/login.php`,
      headers: {},
      data: "<form id=login_form></form>",
    });
    expect(await port.readProfile()).toEqual({ ok: false, error: { kind: "loggedOut" } });
    expect(native.httpRequests).toHaveLength(1);
    expect(native.cookieCalls).toEqual(["clearAllCookies"]);
    expect(await port.readProfile()).toEqual({ ok: false, error: { kind: "notSignedIn" } });
  });

  test("sign-out wipes the cookie store", async () => {
    const { port, outcome } = await startSignIn();
    native.emit("browserPageNavigationCompleted", { url: `${HIROBA}/index.php` });
    await outcome;
    native.cookieCalls.length = 0;
    await port.signOut();
    expect(native.cookieCalls).toEqual(["clearAllCookies"]);
    expect(await port.readProfile()).toEqual({ ok: false, error: { kind: "notSignedIn" } });
  });
});
