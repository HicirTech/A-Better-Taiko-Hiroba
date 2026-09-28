/**
 * What the platform keeps of my page's pictures: each source checked again against its pattern,
 * never corrected, and none of it the view's.
 */
import { describe, expect, test } from "bun:test";
import type { Medal, Profile } from "@abth/core";

import { pictureSourcesOf } from "../src/hiroba-session";

const ENDPOINTS = { hirobaOrigin: "https://hiroba.test", idpHost: "id.test", idpDomain: "id.test" };

/**
 * A my page as the parser reads one, placeholders throughout; only the plates, the title and the
 * medal vary.
 */
const profile = (
  titlePlateImageUrl: string | null,
  title = "サンプルの称号",
  medal: Medal | null = null,
): Profile => ({
  taikoNo: "000000000000",
  nickname: "サンプルどん",
  title,
  region: null,
  titlePlateImageUrl,
  danLabelImageUrl: null,
  medal,
  myDonImageUrl: null,
  favoriteSong: null,
  favoriteFolderTitles: [],
  summary: {
    countLevel: 5,
    crownCounts: { silver: 0, gold: 0, donderful: 0 },
    rankCounts: { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 },
  },
  fetchedAt: "2026-09-28T00:00:00.000Z",
});

describe("pictureSourcesOf, the title plate", () => {
  test("takes the bare plate my page writes, with the title shown over it", () => {
    expect(pictureSourcesOf(profile("imgsrc_titleplate.php"), ENDPOINTS).titlePlate).toEqual({
      form: "bare",
      title: "サンプルの称号",
    });
    expect(
      pictureSourcesOf(profile("https://hiroba.test/imgsrc_titleplate.php"), ENDPOINTS).titlePlate,
    ).toEqual({ form: "bare", title: "サンプルの称号" });
  });

  test("keeps no title as the empty title, a plate of its own", () => {
    expect(pictureSourcesOf(profile("imgsrc_titleplate.php", ""), ENDPOINTS).titlePlate).toEqual({
      form: "bare",
      title: "",
    });
  });

  test("takes the public form only for the page's own taiko number, as the only query", () => {
    expect(
      pictureSourcesOf(profile("imgsrc_titleplate.php?taiko_no=000000000000"), ENDPOINTS)
        .titlePlate,
    ).toEqual({ form: "byTaikoNo", title: "サンプルの称号" });
  });

  test("a page that shows no plate has none", () => {
    expect(pictureSourcesOf(profile(null), ENDPOINTS).titlePlate).toBe("notShown");
  });

  test("refuses any other source, rather than correct it", () => {
    for (const src of [
      "imgsrc_titleplate.php?",
      "imgsrc_titleplate.php?x=1",
      "imgsrc_titleplate.php?taiko_no=111111111111",
      "imgsrc_titleplate.php?taiko_no=000000000000&x=1",
      "imgsrc_titleplate.php#top",
      "imgsrc_titleplate.phpx",
      "/other/imgsrc_titleplate.php",
      "https://elsewhere.test/imgsrc_titleplate.php",
      "http://hiroba.test/imgsrc_titleplate.php",
      "https://user@hiroba.test/imgsrc_titleplate.php",
      "data:image/png;base64,AAAA",
      "imgsrc_danlabel.php?taiko_no=000000000000",
      "http://[",
    ]) {
      expect([src, pictureSourcesOf(profile(src), ENDPOINTS).titlePlate]).toEqual([
        src,
        "unexpectedSrc",
      ]);
    }
  });
});

describe("pictureSourcesOf, the どんメダル plate", () => {
  const ID = "0123456789abcdef0123456789abcdef0123456789abcdef";
  const COLLECTING = { kind: "collecting", count: 12 } as const;
  /** A page showing a plate whose picture is `src`, collecting unless `progress` says otherwise. */
  const withPlate = (src: string | null, progress: Medal["progress"] = COLLECTING) =>
    profile("imgsrc_titleplate.php", "サンプルの称号", {
      name: "どんメダル2026秋",
      progress,
      plateImageUrl: src,
    });

  test("takes the id my page asks for, and where the season stands", () => {
    expect(
      pictureSourcesOf(withPlate(`imgsrc_tokenplate.php?id=${ID}`), ENDPOINTS).medalPlate,
    ).toEqual({ id: ID, progress: "collecting" });
    expect(
      pictureSourcesOf(
        withPlate(`https://hiroba.test/imgsrc_tokenplate.php?id=${ID}`, { kind: "complete" }),
        ENDPOINTS,
      ).medalPlate,
    ).toEqual({ id: ID, progress: "complete" });
  });

  test("a page with no plate, or a plate with no picture, has none", () => {
    expect(pictureSourcesOf(profile("imgsrc_titleplate.php"), ENDPOINTS).medalPlate).toBe(
      "notShown",
    );
    expect(pictureSourcesOf(withPlate(null), ENDPOINTS).medalPlate).toBe("notShown");
  });

  test("refuses any other source, rather than correct it", () => {
    for (const src of [
      "imgsrc_tokenplate.php",
      "imgsrc_tokenplate.php?id=",
      `imgsrc_tokenplate.php?id=${ID.toUpperCase()}`,
      `imgsrc_tokenplate.php?id=${ID}&x=1`,
      `imgsrc_tokenplate.php?x=1&id=${ID}`,
      `imgsrc_tokenplate.php?id=${ID}#top`,
      "imgsrc_tokenplate.php?id=0123456789abcde",
      `imgsrc_tokenplate.php?id=${"0".repeat(129)}`,
      "imgsrc_tokenplate.php?id=../mypage_top.php",
      `/other/imgsrc_tokenplate.php?id=${ID}`,
      `https://elsewhere.test/imgsrc_tokenplate.php?id=${ID}`,
      `http://hiroba.test/imgsrc_tokenplate.php?id=${ID}`,
      `https://user@hiroba.test/imgsrc_tokenplate.php?id=${ID}`,
      "data:image/png;base64,AAAA",
      "http://[",
    ]) {
      expect([src, pictureSourcesOf(withPlate(src), ENDPOINTS).medalPlate]).toEqual([
        src,
        "unexpectedSrc",
      ]);
    }
  });
});
