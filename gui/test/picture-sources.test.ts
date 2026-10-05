import { describe, expect, test } from "bun:test";
import type { Medal, Profile, ScoreRank } from "@abth/core";

import { pictureSourcesOf } from "../src/hiroba-session";
import { courseIconPath, crownIconPath, rankIconPath } from "../src/hiroba-session/picture-sources";

const ENDPOINTS = {
  hirobaOrigin: "https://hiroba.test",
  idpHost: "id.test",
  idpDomain: "id.test",
  imgOrigin: null,
};

const profile = (
  titlePlateImageUrl: string | null,
  title = "サンプルの称号",
  medal: Medal | null = null,
): Profile => ({
  taikoNo: "000000000000",
  nickname: "サンプルどん",
  rename: "open",
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

describe("pictureSourcesOf, the score panel's art", () => {
  const withLevel = (countLevel: number): Profile => {
    const page = profile("imgsrc_titleplate.php");
    return { ...page, summary: { ...page.summary, countLevel } };
  };

  test("takes the level the art is named for, from 1 to 99", () => {
    for (const level of [1, 5, 99]) {
      expect(pictureSourcesOf(withLevel(level), ENDPOINTS).scorePanel).toEqual({ level });
    }
  });

  test("refuses a level that is not a whole number from 1 to 99", () => {
    for (const level of [0, 100, 1.5, -5, Number.NaN]) {
      expect([level, pictureSourcesOf(withLevel(level), ENDPOINTS).scorePanel]).toEqual([
        level,
        "unexpectedSrc",
      ]);
    }
  });
});

describe("pictureSourcesOf, the どんメダル plate", () => {
  const ID = "0123456789abcdef0123456789abcdef0123456789abcdef";
  const COLLECTING = { kind: "collecting", count: 12 } as const;
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

describe("pictureSourcesOf, the My Don portrait", () => {
  const WITH_HOST = { ...ENDPOINTS, imgOrigin: "https://img.test" };
  const PORTRAIT = "https://img.test/imgsrc.php?v=&kind=mydon&fn=mydon_000000000000";
  const withPortrait = (src: string | null): Profile => ({
    ...profile("imgsrc_titleplate.php"),
    myDonImageUrl: src,
  });

  test("takes the portrait my page shows, on the picture host, by the page's own number", () => {
    expect(pictureSourcesOf(withPortrait(PORTRAIT), WITH_HOST).myDon).toEqual({ v: "" });
    expect(
      pictureSourcesOf(withPortrait(PORTRAIT.replace("v=", "v=2026.09-a")), WITH_HOST).myDon,
    ).toEqual({ v: "2026.09-a" });
  });

  test("a page that shows none has none", () => {
    expect(pictureSourcesOf(withPortrait(null), WITH_HOST).myDon).toBe("notShown");
  });

  test("holds no source to a picture host there is none of", () => {
    expect(pictureSourcesOf(withPortrait(PORTRAIT), ENDPOINTS).myDon).toBe("unexpectedSrc");
  });

  test("refuses any other source, rather than correct it", () => {
    for (const src of [
      "https://img.test/imgsrc.php?v=&kind=mydon&fn=mydon_111111111111",
      "https://img.test/imgsrc.php?v=&kind=mydon&fn=mydon_000000000000&x=1",
      "https://img.test/imgsrc.php?kind=mydon&v=&fn=mydon_000000000000",
      "https://img.test/imgsrc.php?v=&kind=mydon&fn=mydon_000000000000#top",
      "https://img.test/imgsrc.php?v=a%2Fb&kind=mydon&fn=mydon_000000000000",
      `https://img.test/imgsrc.php?v=${"a".repeat(33)}&kind=mydon&fn=mydon_000000000000`,
      "https://img.test/imgsrc.php?v=&kind=other&fn=mydon_000000000000",
      "https://img.test/imgsrc.phpx?v=&kind=mydon&fn=mydon_000000000000",
      "https://img.test/other/imgsrc.php?v=&kind=mydon&fn=mydon_000000000000",
      "http://img.test/imgsrc.php?v=&kind=mydon&fn=mydon_000000000000",
      "https://user@img.test/imgsrc.php?v=&kind=mydon&fn=mydon_000000000000",
      "https://elsewhere.test/imgsrc.php?v=&kind=mydon&fn=mydon_000000000000",
      "imgsrc.php?v=&kind=mydon&fn=mydon_000000000000",
      "https://hiroba.test/imgsrc.php?v=&kind=mydon&fn=mydon_000000000000",
      "data:image/png;base64,AAAA",
      "http://[",
    ]) {
      expect([src, pictureSourcesOf(withPortrait(src), WITH_HOST).myDon]).toEqual([
        src,
        "unexpectedSrc",
      ]);
    }
  });
});

describe("rankIconPath and crownIconPath", () => {
  test("name a rank's icon by its image number", () => {
    expect([2, 3, 4, 5, 6, 7, 8].map((rank) => rankIconPath(rank as ScoreRank))).toEqual([
      "/image/sp/640/best_score_rank_2_640.png",
      "/image/sp/640/best_score_rank_3_640.png",
      "/image/sp/640/best_score_rank_4_640.png",
      "/image/sp/640/best_score_rank_5_640.png",
      "/image/sp/640/best_score_rank_6_640.png",
      "/image/sp/640/best_score_rank_7_640.png",
      "/image/sp/640/best_score_rank_8_640.png",
    ]);
  });

  test("name a crown's icon by the recent-plays numbering, where gold is 02 and silver 03", () => {
    expect([crownIconPath("silver"), crownIconPath("gold"), crownIconPath("donderful")]).toEqual([
      "/image/sp/640/crown_03_640.png",
      "/image/sp/640/crown_02_640.png",
      "/image/sp/640/crown_04_640.png",
    ]);
  });
});

describe("courseIconPath", () => {
  test("names a chart's icon by Hiroba's numbering, from かんたん at 1 to the inner おに at 5", () => {
    const paths = (["easy", "normal", "hard", "oni", "ura"] as const).map(courseIconPath);
    expect(paths).toEqual([1, 2, 3, 4, 5].map((n) => `/image/sp/640/icon_course02_${n}_640.png`));
  });
});
