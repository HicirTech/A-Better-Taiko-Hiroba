/**
 * Excerpts, not captured pages — see README.md for why. The shapes below mirror what
 * `user_profile.php` really serves, including the site's `silver_crown_coun` misspelling and the
 * nickname block whose inner structure differs between profiles.
 */
import { describe, expect, test } from "bun:test";

import { isErr, isOk, parsePublicProfilePage } from "../src/index";

const TAIKO_NO = "000000000000";
const FETCHED_AT = "2026-08-09T00:00:00.000Z";

interface ExcerptOptions {
  /** `closed` swaps the whole details block for the site's notice, as the real page does. */
  visibility?: "open" | "achievementsHidden" | "closed";
  /** The label the page puts above the region — it varies with the player, not with the page. */
  regionLabel?: string;
  regionValue?: string;
  favoriteTitle?: string | null;
  /** The nickname sits in a bare div on some profiles and in two nested ones on others. */
  nestedNickname?: boolean;
  taikoNoOnPage?: string;
  /** My page's wrapper, which the real page never renders — used to prove the redirect check. */
  withMyPageFavoriteBlock?: boolean;
}

/** `total_score_image_5.png` plus the ten counts beside it, spelled the way the site spells them. */
function panelBlock(): string {
  const ranks = [2, 3, 4, 5, 6, 7, 8]
    .map((rank, index) => `<div class="best_rank_score_${rank} total_panel_display">${index}</div>`)
    .join("\n      ");
  return `
    <div class="total_panel_area">
      <img src="image/sp/640/total_score_image_5.png" style="width: 100%;">
      <div class="silver_crown_coun total_panel_crown_display">11</div>
      <div class="gold_crown_count total_panel_crown_display">22</div>
      <div class="donderful_crown_count total_panel_crown_display">33</div>
      ${ranks}
    </div>`;
}

function excerpt(options: ExcerptOptions = {}): string {
  const {
    visibility = "open",
    regionLabel = "都道府県",
    regionValue = "サンプル県",
    favoriteTitle = "サンプル曲アルファ",
    nestedNickname = true,
    taikoNoOnPage = TAIKO_NO,
    withMyPageFavoriteBlock = false,
  } = options;

  const nickname = nestedNickname
    ? `<div style="width:135px;"><div><span></span></div><div>サンプルどんだー</div></div>`
    : `<div style="height:24px;">サンプルどんだー</div>`;

  const detail =
    visibility === "closed"
      ? `<p style="white-space: nowrap;">※プロフィール非公開</p>`
      : `<p style="white-space: nowrap;">${regionLabel} ：${regionValue}</p>
         <p style="white-space: nowrap;">太鼓番：${taikoNoOnPage}</p>`;

  // The real page renders one bare list — no div.favoriteSong wrapper, no h2, no song_no input.
  const favorite =
    visibility === "closed" || favoriteTitle === null
      ? ""
      : `<ul id="songList">
           <li class="contentBox songLisrAreagame">
             <div class="songNameArea clearfix">
               <div class="name"><span class="songName songNameFontgame">${favoriteTitle}</span></div>
             </div>
           </li>
         </ul>`;

  return `<!DOCTYPE html><html><body>
    <div id="mydon_area" class="mydon_area">
      <img src="imgsrc_titleplate.php?taiko_no=${taikoNoOnPage}">
      <div style="height: 20px;">サンプル称号</div>
      ${nickname}
      <div class="detail">${detail}</div>
      <div class="mydon_image">
        <img class="customd_mydon" src="https://img.taiko-p.jp/imgsrc.php?fn=mydon_${taikoNoOnPage}">
      </div>
      <img src="imgsrc_danlabel.php?taiko_no=${taikoNoOnPage}">
      ${visibility === "open" ? panelBlock() : ""}
    </div>
    ${withMyPageFavoriteBlock ? `<div class="favoriteSong"><h2>お気に入りの曲</h2></div>` : ""}
    ${favorite}
  </body></html>`;
}

function parseOrThrow(html: string, taikoNo = TAIKO_NO) {
  const result = parsePublicProfilePage(html, taikoNo, FETCHED_AT);
  if (isErr(result)) {
    throw new Error(`expected a reading, got ${JSON.stringify(result.error)}`);
  }
  return result.value;
}

describe("parsePublicProfilePage", () => {
  test("reads an open profile, panel and all", () => {
    const profile = parseOrThrow(excerpt());

    expect(profile.visibility).toBe("open");
    expect(profile.taikoNo).toBe(TAIKO_NO);
    expect(profile.title).toBe("サンプル称号");
    expect(profile.nickname).toBe("サンプルどんだー");
    expect(profile.region).toBe("サンプル県");
    expect(profile.favoriteSong).toEqual({ songNo: null, title: "サンプル曲アルファ" });
    expect(profile.danLabelImageUrl).toContain("imgsrc_danlabel");
    expect(profile.myDonImageUrl).toContain("img.taiko-p.jp");
    expect(profile.fetchedAt).toBe(FETCHED_AT);
  });

  test("finds the silver count despite the site's silver_crown_coun spelling", () => {
    const profile = parseOrThrow(excerpt());

    expect(profile.summary?.crownCounts).toEqual({ silver: 11, gold: 22, donderful: 33 });
    expect(profile.summary?.countLevel).toBe(5);
  });

  test("a rank count of 0 is data, not absence", () => {
    const profile = parseOrThrow(excerpt());

    expect(profile.summary?.rankCounts).toEqual({ 2: 0, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6 });
  });

  test("a profile with achievements hidden is a reading, not a failure", () => {
    const profile = parseOrThrow(excerpt({ visibility: "achievementsHidden" }));

    expect(profile.visibility).toBe("achievementsHidden");
    expect(profile.summary).toBeNull();
    // The player is still named and still shows a favourite: this is not a private profile.
    expect(profile.nickname).toBe("サンプルどんだー");
    expect(profile.region).toBe("サンプル県");
    expect(profile.favoriteSong?.title).toBe("サンプル曲アルファ");
  });

  test("an open profile with no favourite keeps the block and writes 未設定 in it", () => {
    // The block does not disappear — it renders one row holding the site's word for "none",
    // exactly as my page does. Reading that back as a song title is the bug this pins.
    const profile = parseOrThrow(excerpt({ favoriteTitle: "未設定" }));

    expect(profile.visibility).toBe("open");
    expect(profile.favoriteSong).toBeNull();
  });

  test("a closed profile reads as little rather than failing", () => {
    const profile = parseOrThrow(excerpt({ visibility: "closed" }));

    expect(profile.visibility).toBe("closed");
    expect(profile.region).toBeNull();
    expect(profile.summary).toBeNull();
    expect(profile.favoriteSong).toBeNull();
    // What survives: the title, the nickname and the My Don.
    expect(profile.title).toBe("サンプル称号");
    expect(profile.nickname).toBe("サンプルどんだー");
    expect(profile.taikoNo).toBe(TAIKO_NO);
  });

  test("reads the nickname whether or not it sits in nested divs", () => {
    expect(parseOrThrow(excerpt({ nestedNickname: false })).nickname).toBe("サンプルどんだー");
    expect(parseOrThrow(excerpt({ nestedNickname: true })).nickname).toBe("サンプルどんだー");
  });

  test("takes the region's value whichever label the page put above it", () => {
    const overseas = parseOrThrow(
      excerpt({ regionLabel: "国・地域", regionValue: "オーストラリア" }),
    );

    expect(overseas.region).toBe("オーストラリア");
  });

  test("recognises my page instead of reading it as a stranger's profile", () => {
    const result = parsePublicProfilePage(
      excerpt({ withMyPageFavoriteBlock: true }),
      TAIKO_NO,
      FETCHED_AT,
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("wrongPage");
    }
  });

  test("refuses a page printing a different taiko number than the one requested", () => {
    const result = parsePublicProfilePage(
      excerpt({ taikoNoOnPage: "111111111111" }),
      TAIKO_NO,
      FETCHED_AT,
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("unreadableValue");
    }
  });

  test("refuses the logged-out page", () => {
    const loggedOut = `<html><body><form id="login_form" action="login_process.php"></form></body></html>`;
    const result = parsePublicProfilePage(loggedOut, TAIKO_NO, FETCHED_AT);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("loggedOut");
    }
  });

  test("refuses a page with no #mydon_area at all", () => {
    const result = parsePublicProfilePage(`<html><body></body></html>`, TAIKO_NO, FETCHED_AT);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("missingMarker");
    }
  });

  test("a reading is a plain object the caller can serialise", () => {
    const profile = parseOrThrow(excerpt());

    expect(isOk(parsePublicProfilePage(excerpt(), TAIKO_NO, FETCHED_AT))).toBe(true);
    expect(JSON.parse(JSON.stringify(profile)).nickname).toBe("サンプルどんだー");
  });
});
