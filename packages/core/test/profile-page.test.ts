/**
 * Excerpts, not captured pages — see README.md for why. The excerpt mirrors the real page's
 * structure: the title and nickname carry no class or id, only their position under #mydon_area.
 */
import { describe, expect, test } from "bun:test";

import { isErr, isOk, parseProfilePage, type Profile } from "../src/index";

function profileExcerpt(options: { withDan: boolean }): string {
  const dan = options.withDan
    ? `<img src="imgsrc_danlabel.php?taiko_no=000000000000" style="height:21px;">`
    : "";
  return `
<html><body>
<div id="mydon_area" class="mydon_area">
  <img src="imgsrc_titleplate.php">
  <div style="height: 20px;text-align: center;">黒薔薇の使徒</div>
  <div style="display:flex">
    <div style="width:135px;">Donder</div>
    <div style="width:135px;text-align:center">${dan}</div>
  </div>
  <div style="background-color:#FC0;">
    <div class="detail">
      <p>国・地域 ：香港</p>
      <p>太鼓番：000000000000</p>
    </div>
    <div class="mydon_image">
      <img class="customd_mydon" src="https://img.example/imgsrc.php?kind=mydon&fn=mydon_000000000000">
    </div>
  </div>
  <div class="total_score">
    <img src="image/sp/640/total_score_image_5.png">
    <div class="best_rank_score_8 total_panel_display">5</div>
    <div class="best_rank_score_7 total_panel_display">30</div>
    <div class="best_rank_score_6 total_panel_display">52</div>
    <div class="best_rank_score_5 total_panel_display">40</div>
    <div class="best_rank_score_4 total_panel_display">25</div>
    <div class="best_rank_score_3 total_panel_display">11</div>
    <div class="best_rank_score_2 total_panel_display">4</div>
    <div class="silver_crown_count total_panel_crown_display">464</div>
    <div class="gold_crown_count total_panel_crown_display">316</div>
    <div class="donderful_crown_count total_panel_crown_display">0</div>
  </div>
  <div>
    <img src="imgsrc_tokenplate.php?id=placeholder">
    <div class="token_name token_info_display">どんメダル2026夏</div>
    <div class="token_count token_info_display">0</div>
  </div>
</div>
</body></html>`;
}

const FETCHED_AT = "2026-07-26T12:00:00.000Z";

describe("parseProfilePage", () => {
  test("parses a complete profile, summary counts as Hiroba's own numbers", () => {
    const result = parseProfilePage(profileExcerpt({ withDan: true }), FETCHED_AT);

    if (!isOk(result)) {
      throw new Error(`expected a profile, got ${JSON.stringify(result.error)}`);
    }
    const expected: Profile = {
      taikoNo: "000000000000",
      nickname: "Donder",
      title: "黒薔薇の使徒",
      region: "香港",
      danLabelImageUrl: "imgsrc_danlabel.php?taiko_no=000000000000",
      medal: { name: "どんメダル2026夏", count: 0 },
      myDonImageUrl: "https://img.example/imgsrc.php?kind=mydon&fn=mydon_000000000000",
      summary: {
        countLevel: 5,
        crownCounts: { silver: 464, gold: 316, donderful: 0 },
        rankCounts: { 2: 4, 3: 11, 4: 25, 5: 40, 6: 52, 7: 30, 8: 5 },
      },
      fetchedAt: FETCHED_AT,
    };
    expect(result.value).toEqual(expected);
  });

  test("no dan is a normal state, not a failure", () => {
    const result = parseProfilePage(profileExcerpt({ withDan: false }), FETCHED_AT);

    if (!isOk(result)) {
      throw new Error(`expected a profile, got ${JSON.stringify(result.error)}`);
    }
    expect(result.value.danLabelImageUrl).toBeNull();
  });

  test("a page without #mydon_area fails naming that marker", () => {
    const result = parseProfilePage("<html><body><p>maintenance</p></body></html>", FETCHED_AT);

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }
    expect(result.error).toEqual({
      kind: "missingMarker",
      page: "mypage_top.php",
      marker: "#mydon_area",
    });
  });

  test("a crown count that is not a number fails as unreadable, carrying the raw text", () => {
    const broken = profileExcerpt({ withDan: true }).replace(
      `<div class="gold_crown_count total_panel_crown_display">316</div>`,
      `<div class="gold_crown_count total_panel_crown_display">—</div>`,
    );

    const result = parseProfilePage(broken, FETCHED_AT);

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }
    expect(result.error).toEqual({
      kind: "unreadableValue",
      page: "mypage_top.php",
      marker: ".gold_crown_count",
      raw: "—",
    });
  });

  test("a logged-out answer fails as loggedOut, not as missing fields", () => {
    const loginPage = `<html><body>
      <form name="login_form" id="login_form" method="get" action="./login_process.php"></form>
    </body></html>`;

    const result = parseProfilePage(loginPage, FETCHED_AT);

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }
    expect(result.error.kind).toBe("loggedOut");
  });
});
