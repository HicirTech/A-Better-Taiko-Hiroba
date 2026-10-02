/**
 * Android's platform layer against stand-ins for the in-app browser and the cookie store: how the
 * browser is opened, when a sign-in counts, when the cookie store is wiped, and that a finished
 * sign-in is remembered across launches.
 */
import { beforeEach, describe, expect, test } from "bun:test";

import { createCostumeEditor } from "../scripts/mock-costume";
import { medalPlatePng, myDonPng, thumbnailPng, titlePlatePng } from "../scripts/mock-pictures";
import {
  CLOSE_LABEL,
  HIROBA,
  memoryFlag,
  MY_PAGE,
  myPageAnswer,
  until,
} from "./android-port-fixtures";
import { native, nativeBase64 } from "./capacitor-fakes";
import { createFakeIndexedDb } from "./indexeddb-fake";

const { createAndroidPort } = await import("../src/platform/android");

/** Starts a sign-in and waits until the in-app browser is open. */
async function startSignIn(signedInFlag = memoryFlag()) {
  const port = await createAndroidPort({ closeLabel: () => CLOSE_LABEL, signedInFlag });
  const outcome = port.signIn();
  await until(() => native.openedWith.length === 1);
  return { port, outcome };
}

describe("createAndroidPort", () => {
  beforeEach(() => native.reset());

  test("opens signed in after an earlier sign-in, and wipes nothing as it starts", async () => {
    const port = await createAndroidPort({
      closeLabel: () => CLOSE_LABEL,
      signedInFlag: memoryFlag(true),
    });
    expect(await port.isSignedIn()).toBe(true);
    expect(native.cookieCalls).toEqual([]);
  });

  test("a read hands the window the view alone: no taiko number and no picture's source", async () => {
    native.httpAnswer = myPageAnswer;
    const port = await createAndroidPort({
      closeLabel: () => CLOSE_LABEL,
      signedInFlag: memoryFlag(true),
    });
    const read = await port.readProfile();
    expect(read.ok && read.value.nickname).toBe("サンプルどん");
    expect(read.ok && Object.keys(read.value)).not.toContain("taikoNo");
    expect(read.ok && Object.keys(read.value)).not.toContain("pictures");
    const shown = JSON.stringify(read);
    expect(shown).not.toContain("000000000000");
    expect(shown).not.toContain("titleplate");
    expect(native.httpRequests.map(({ url }) => url)).toEqual([`${HIROBA}/mypage_top.php`]);
  });

  test("opens signed out when no sign-in was remembered", async () => {
    const port = await createAndroidPort({
      closeLabel: () => CLOSE_LABEL,
      signedInFlag: memoryFlag(),
    });
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
    const port = await createAndroidPort({ closeLabel: () => CLOSE_LABEL });
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
    const port = await createAndroidPort({
      closeLabel: () => CLOSE_LABEL,
      signedInFlag: memoryFlag(),
    });
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
      closeLabel: () => CLOSE_LABEL,
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

  test("asks Hiroba one thing at a time: a preview waits for a read already on its way", async () => {
    const answers: (() => void)[] = [];
    native.httpAnswer = () =>
      new Promise((resolve) => {
        answers.push(() =>
          resolve({ status: 200, url: PREVIEW_URL, headers: {}, data: nativeBase64("") }),
        );
      });
    const port = await createAndroidPort({
      closeLabel: () => CLOSE_LABEL,
      signedInFlag: memoryFlag(true),
    });
    const reading = port.readProfile();
    const opening = port.openCostumeEditor();
    const previewing = port.previewCostume(SET);
    await until(() => native.httpRequests.length === 1);
    await Bun.sleep(5);
    expect(native.httpRequests).toHaveLength(1);
    answers.shift()?.();
    await until(() => native.httpRequests.length === 2);
    await Bun.sleep(5);
    expect(native.httpRequests).toHaveLength(2);
    answers.shift()?.();
    await until(() => native.httpRequests.length === 3);
    answers.shift()?.();
    await Promise.all([reading, opening, previewing]);
    expect(native.httpRequests.map(({ url }) => new URL(url).pathname)).toEqual([
      "/mypage_top.php",
      "/mypage_kisekae.php",
      "/imgsrc_mydon.php",
    ]);
  });

  test("a no-session GIF is a failure with codes, and forgets nothing", async () => {
    const flag = memoryFlag(true);
    native.httpAnswer = async () => ({
      status: 200,
      url: PREVIEW_URL,
      headers: { "Content-Type": "image/gif" },
      data: nativeBase64(new Uint8Array(43)),
    });
    const port = await createAndroidPort({ closeLabel: () => CLOSE_LABEL, signedInFlag: flag });
    expect(await port.previewCostume(SET)).toEqual({
      ok: false,
      error: { code: "preview=notPng status=200 type=image/gif bytes=43" },
    });
    expect(native.cookieCalls).toEqual([]);
    expect(flag.get()).toBe(true);
  });
});

describe("createAndroidPort's pictures", () => {
  beforeEach(() => native.reset());

  const THUMB = { kind: "costumeItem", slot: 1, id: 36 } as const;
  const PLATE = { kind: "titlePlate" } as const;
  const MEDAL = { kind: "medalPlate" } as const;
  const MY_DON = { kind: "myDon" } as const;

  /** Answers the editor with the mock's page and a thumbnail with the mock's picture. */
  function answerAsHiroba() {
    const editor = createCostumeEditor();
    native.httpAnswer = async () => {
      const asked = native.httpRequests.at(-1)?.url ?? "";
      const { pathname, searchParams } = new URL(asked);
      if (pathname === "/mypage_kisekae.php") {
        return {
          status: 200,
          url: asked,
          headers: { "Content-Type": "text/html; charset=utf-8" },
          data: nativeBase64(`<html><body>${editor.page({ cardChosen: true })}</body></html>`),
        };
      }
      if (pathname === "/mypage_top.php") {
        return myPageAnswer();
      }
      if (pathname === "/imgsrc_titleplate.php") {
        return {
          status: 200,
          url: asked,
          headers: { "Content-Type": "image/png" },
          data: nativeBase64(titlePlatePng("サンプルの称号")),
        };
      }
      return {
        status: 200,
        url: asked,
        headers: { "Content-Type": "image/png" },
        data: nativeBase64(
          thumbnailPng(Number(searchParams.get("type")), Number(searchParams.get("cos"))),
        ),
      };
    };
  }

  test("asks nothing while signed out", async () => {
    const port = await createAndroidPort({
      closeLabel: () => CLOSE_LABEL,
      signedInFlag: memoryFlag(),
    });
    expect(await port.readPicture(THUMB)).toEqual({
      ok: false,
      error: { code: "costumeItem=notSignedIn" },
    });
    expect(native.httpRequests).toEqual([]);
  });

  test("asks only for items the last editor read offered, once each, as a browser's picture", async () => {
    answerAsHiroba();
    const port = await createAndroidPort({
      closeLabel: () => CLOSE_LABEL,
      signedInFlag: memoryFlag(true),
    });
    expect(await port.readPicture(THUMB)).toEqual({
      ok: false,
      error: { code: "costumeItem=notOffered" },
    });
    expect(native.httpRequests).toEqual([]);
    expect((await port.openCostumeEditor()).ok).toBe(true);
    const picture = await port.readPicture(THUMB);
    expect(picture.ok && picture.value.src.startsWith("data:image/png;base64,")).toBe(true);
    expect(await port.readPicture(THUMB)).toEqual(picture);
    expect(await port.readPicture({ ...THUMB, id: 999 })).toEqual({
      ok: false,
      error: { code: "costumeItem=notOffered" },
    });
    expect(native.httpRequests.map(({ url }) => url)).toEqual([
      `${HIROBA}/mypage_kisekae.php`,
      `${HIROBA}/imgsrc_kisekae.php?cos=36&type=1`,
    ]);
    expect(native.httpRequests[1]?.headers).toMatchObject({
      Referer: `${HIROBA}/mypage_kisekae.php`,
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    });
    expect(native.httpRequests[1]?.headers).not.toHaveProperty("Cookie");
  });

  test("a picture's fetch waits for a read already on its way", async () => {
    answerAsHiroba();
    const port = await createAndroidPort({
      closeLabel: () => CLOSE_LABEL,
      signedInFlag: memoryFlag(true),
    });
    await port.openCostumeEditor();
    const answer = native.httpAnswer;
    let release: () => void = () => undefined;
    native.httpAnswer = () =>
      new Promise((resolve) => {
        release = () => resolve(answer());
      });
    const reading = port.openCostumeEditor();
    const picture = port.readPicture(THUMB);
    await Bun.sleep(150);
    expect(native.httpRequests).toHaveLength(2);
    native.httpAnswer = answer;
    release();
    await reading;
    expect((await picture).ok).toBe(true);
    expect(native.httpRequests.map(({ url }) => new URL(url).pathname)).toEqual([
      "/mypage_kisekae.php",
      "/mypage_kisekae.php",
      "/imgsrc_kisekae.php",
    ]);
  });

  test("asks for the title plate only once my page is read, as my page does, and once", async () => {
    answerAsHiroba();
    const port = await createAndroidPort({
      closeLabel: () => CLOSE_LABEL,
      signedInFlag: memoryFlag(true),
    });
    expect(await port.readPicture(PLATE)).toEqual({
      ok: false,
      error: { code: "titlePlate=notRead" },
    });
    expect(native.httpRequests).toEqual([]);
    expect((await port.readProfile()).ok).toBe(true);
    const plate = await port.readPicture(PLATE);
    expect(plate.ok && [plate.value.width, plate.value.height]).toEqual([600, 100]);
    expect(await port.readPicture(PLATE)).toEqual(plate);
    expect(native.httpRequests.map(({ url }) => url)).toEqual([
      `${HIROBA}/mypage_top.php`,
      `${HIROBA}/imgsrc_titleplate.php`,
    ]);
    expect(native.httpRequests[1]?.headers).toMatchObject({
      Referer: `${HIROBA}/mypage_top.php`,
    });
  });

  /** Signs out, then in again through the stand-in's sign-in page. */
  async function signOutAndIn(port: Awaited<ReturnType<typeof createAndroidPort>>) {
    await port.signOut();
    const outcome = port.signIn();
    await until(() => native.openedWith.length === 1);
    native.emit("browserPageNavigationCompleted", { url: `${HIROBA}/index.php` });
    expect(await outcome).toEqual({ kind: "signedIn" });
  }

  test("forgets whose page it read when the session goes, and keeps the plate", async () => {
    answerAsHiroba();
    const port = await createAndroidPort({
      closeLabel: () => CLOSE_LABEL,
      signedInFlag: memoryFlag(true),
    });
    await port.readProfile();
    const plate = await port.readPicture(PLATE);
    // A later read finds the session good: the plate is the player's own, and kept.
    await port.readProfile();
    await signOutAndIn(port);
    expect(await port.readPicture(PLATE)).toEqual({
      ok: false,
      error: { code: "titlePlate=notRead" },
    });
    // The same player read again: the plate kept from before, asked of no one.
    await port.readProfile();
    expect(await port.readPicture(PLATE)).toEqual(plate);
    expect(native.httpRequests.map(({ url }) => new URL(url).pathname)).toEqual([
      "/mypage_top.php",
      "/imgsrc_titleplate.php",
      "/mypage_top.php",
      "/mypage_top.php",
    ]);
  });

  test("asks again after a sign-in for a plate no later read confirmed", async () => {
    answerAsHiroba();
    const port = await createAndroidPort({
      closeLabel: () => CLOSE_LABEL,
      signedInFlag: memoryFlag(true),
    });
    await port.readProfile();
    await port.readPicture(PLATE);
    await signOutAndIn(port);
    await port.readProfile();
    expect((await port.readPicture(PLATE)).ok).toBe(true);
    expect(native.httpRequests.map(({ url }) => new URL(url).pathname)).toEqual([
      "/mypage_top.php",
      "/imgsrc_titleplate.php",
      "/mypage_top.php",
      "/imgsrc_titleplate.php",
    ]);
  });

  test("asks nothing after a relaunch for the plate and thumbnails already kept", async () => {
    answerAsHiroba();
    const indexedDb = createFakeIndexedDb();
    const launch = () =>
      createAndroidPort({
        closeLabel: () => CLOSE_LABEL,
        signedInFlag: memoryFlag(true),
        indexedDb: indexedDb.factory,
      });
    const first = await launch();
    await first.readProfile();
    const plate = await first.readPicture(PLATE);
    // A later read finds the session good: the plate is the player's own, and kept.
    await first.readProfile();
    await first.openCostumeEditor();
    const thumbnail = await first.readPicture(THUMB);
    await first.signOut();

    const relaunched = await launch();
    await relaunched.readProfile();
    expect(await relaunched.readPicture(PLATE)).toEqual(plate);
    await relaunched.openCostumeEditor();
    expect(await relaunched.readPicture(THUMB)).toEqual(thumbnail);
    expect(native.httpRequests.map(({ url }) => new URL(url).pathname)).toEqual([
      "/mypage_top.php",
      "/imgsrc_titleplate.php",
      "/mypage_top.php",
      "/mypage_kisekae.php",
      "/imgsrc_kisekae.php",
      "/mypage_top.php",
      "/mypage_kisekae.php",
    ]);
  });

  test("asks for the どんメダル plate by the id my page shows, once, and keeps it for good", async () => {
    const id = "0123456789abcdef0123456789abcdef0123456789abcdef";
    const withMedal = MY_PAGE.replace(
      `<div class="favoriteSong">`,
      `<div><img src="imgsrc_tokenplate.php?id=${id}" style="width: 100%;">
  <div class="token_name">どんメダル2026秋</div><div class="token_count">12</div></div>
<div class="favoriteSong">`,
    );
    native.httpAnswer = async () => {
      const asked = native.httpRequests.at(-1)?.url ?? "";
      const plate = new URL(asked).pathname === "/imgsrc_tokenplate.php";
      return {
        status: 200,
        url: asked,
        headers: { "Content-Type": plate ? "image/png" : "text/html; charset=UTF-8" },
        data: nativeBase64(plate ? medalPlatePng(id, false) : withMedal),
      };
    };
    const indexedDb = createFakeIndexedDb();
    const launch = () =>
      createAndroidPort({
        closeLabel: () => CLOSE_LABEL,
        signedInFlag: memoryFlag(true),
        indexedDb: indexedDb.factory,
      });
    const first = await launch();
    const read = await first.readProfile();
    const plate = await first.readPicture(MEDAL);
    expect(plate.ok && [plate.value.width, plate.value.height]).toEqual([600, 100]);
    expect(await first.readPicture(MEDAL)).toEqual(plate);
    // The id is the platform's alone: the view names neither it nor the plate's address.
    expect(JSON.stringify(read)).not.toMatch(new RegExp(`${id}|tokenplate`));

    const relaunched = await launch();
    await relaunched.readProfile();
    expect(await relaunched.readPicture(MEDAL)).toEqual(plate);
    expect(native.httpRequests.map(({ url }) => url)).toEqual([
      `${HIROBA}/mypage_top.php`,
      `${HIROBA}/imgsrc_tokenplate.php?id=${id}`,
      `${HIROBA}/mypage_top.php`,
    ]);
    expect(native.httpRequests[1]?.headers).toMatchObject({ Referer: `${HIROBA}/mypage_top.php` });
  });

  const PORTRAIT = "https://img.taiko-p.jp/imgsrc.php?v=&kind=mydon&fn=mydon_000000000000";

  /** My page showing the portrait, and a Hiroba that draws it wearing what `wear` was last given. */
  function myDonOnMyPage() {
    const withPortrait = MY_PAGE.replace(
      "<p>太鼓番：000000000000</p></div></div>",
      `<p>太鼓番：000000000000</p></div>
    <div class="mydon_image"><img class="customd_mydon" src="${PORTRAIT}"></div></div>`,
    );
    let wearing = [12, 12, 5, 0, 0, 68, 0, 0];
    native.httpAnswer = async () => {
      const asked = native.httpRequests.at(-1)?.url ?? "";
      const drawn = asked === PORTRAIT;
      return {
        status: 200,
        url: asked,
        headers: { "Content-Type": drawn ? "image/png" : "text/html; charset=UTF-8" },
        data: nativeBase64(drawn ? myDonPng(wearing) : withPortrait),
      };
    };
    const indexedDb = createFakeIndexedDb();
    return {
      wear: (next: number[]) => {
        wearing = next;
      },
      launch: () =>
        createAndroidPort({
          closeLabel: () => CLOSE_LABEL,
          signedInFlag: memoryFlag(true),
          indexedDb: indexedDb.factory,
        }),
    };
  }

  test("asks for the My Don off Hiroba once, keeps it across launches, and anew after Read again", async () => {
    const { wear, launch } = myDonOnMyPage();
    const first = await launch();
    const read = await first.readProfile();
    const before = await first.readPicture(MY_DON);
    expect(before.ok && [before.value.width, before.value.height]).toEqual([290, 290]);
    expect(await first.readPicture(MY_DON)).toEqual(before);
    // The address names the taiko number: the platform's alone.
    expect(JSON.stringify(read)).not.toMatch(/mydon|taiko-p/);
    // Changed elsewhere, then the user's Read again: fetched anew, once.
    wear([12, 12, 3, 0, 0, 68, 0, 0]);
    await first.readProfile();
    const after = await first.readPicture(MY_DON);
    expect(after).not.toEqual(before);
    expect(await first.readPicture(MY_DON)).toEqual(after);

    const relaunched = await launch();
    await relaunched.readProfile();
    expect(await relaunched.readPicture(MY_DON)).toEqual(after);
    expect(native.httpRequests.map(({ url }) => url)).toEqual([
      `${HIROBA}/mypage_top.php`,
      PORTRAIT,
      `${HIROBA}/mypage_top.php`,
      PORTRAIT,
      `${HIROBA}/mypage_top.php`,
    ]);
    expect(native.httpRequests[1]?.headers).toMatchObject({ Referer: `${HIROBA}/` });
    expect(native.httpRequests[1]?.headers).not.toHaveProperty("Cookie");
  });

  test("a read of my page that renews no portrait leaves the My Don kept, whatever was changed elsewhere", async () => {
    const { wear, launch } = myDonOnMyPage();
    const port = await launch();
    await port.readProfile();
    const before = await port.readPicture(MY_DON);
    expect(before.ok).toBe(true);

    // The window's own read, after a title write: nothing of the costume is asked for again.
    wear([12, 12, 3, 0, 0, 68, 0, 0]);
    await port.readProfile({ renewsPortrait: false });
    await port.readProfile({ renewsPortrait: false });
    expect(await port.readPicture(MY_DON)).toEqual(before);
    expect(native.httpRequests.map(({ url }) => url)).toEqual([
      `${HIROBA}/mypage_top.php`,
      PORTRAIT,
      `${HIROBA}/mypage_top.php`,
      `${HIROBA}/mypage_top.php`,
    ]);

    // The user's Read again is the next of its reads: the portrait is fetched anew, once.
    await port.readProfile();
    const after = await port.readPicture(MY_DON);
    expect(after).not.toEqual(before);
    expect(await port.readPicture(MY_DON)).toEqual(after);
    expect(native.httpRequests.filter(({ url }) => url === PORTRAIT)).toHaveLength(2);
  });

  test("forgets what the editor offered when the session goes", async () => {
    answerAsHiroba();
    const port = await createAndroidPort({
      closeLabel: () => CLOSE_LABEL,
      signedInFlag: memoryFlag(true),
    });
    await port.openCostumeEditor();
    await port.signOut();
    const outcome = port.signIn();
    await until(() => native.openedWith.length === 1);
    native.emit("browserPageNavigationCompleted", { url: `${HIROBA}/index.php` });
    expect(await outcome).toEqual({ kind: "signedIn" });
    expect(await port.readPicture(THUMB)).toEqual({
      ok: false,
      error: { code: "costumeItem=notOffered" },
    });
    expect(native.httpRequests.map(({ url }) => new URL(url).pathname)).toEqual([
      "/mypage_kisekae.php",
    ]);
  });
});
