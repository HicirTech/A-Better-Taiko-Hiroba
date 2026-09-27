/**
 * Excerpts, not captured pages — see README.md for why. The list excerpt mirrors the real block
 * shape (`li.contentBox` → `.songName` + one detail anchor per chart), the detail excerpt the real
 * named count blocks, both taken from the captured pages' structure with no real account data.
 * The public detail excerpt mirrors another player's `score_detail.php?taiko_no=`: the same blocks
 * minus the four play counts and the sections, with the subject's number on the My Don link.
 *
 * Image names are the **site's**, not the model's, spelling included: `crown_button_donderfull`
 * with two l's is the file the site actually serves. The list excerpt names every state-and-suffix
 * combination a real genre page has been seen to serve.
 */
import { describe, expect, test } from "bun:test";

import {
  isErr,
  isOk,
  parsePublicScoreDetailPage,
  parseScoreDetailPage,
  parseScoreListPage,
} from "../src/index";

const T = "2026-07-26T12:00:00.000Z";

function songBlock(
  songNo: string,
  title: string,
  crowns: readonly (readonly [number, string])[],
  ura = false,
): string {
  const anchors = crowns
    .map(
      ([level, crown]) =>
        `<li><a href="score_detail.php?song_no=${songNo}&level=${level}&genre=1">` +
        `<img class="crown oni" src="image/sp/640/crown_button_${crown}_640.png"></a></li>`,
    )
    .join("");
  return `<li class="contentBox songLisrAreajpop">
    <div class="songNameArea${ura ? " ura" : ""} clearfix"><span class="songName">${title}</span></div>
    <div class="buttonArea levelSelect"><ul class="buttonList">${anchors}</ul></div>
  </li>`;
}

const LIST_EXCERPT = `<html><body><ul>
  ${songBlock("1001", "最初の歌", [
    [1, "none"],
    [2, "played_0"],
    [3, "played_2"],
    [4, "played_3"],
  ])}
  ${songBlock("1002", "二番目の歌", [
    [1, "silver_2"],
    [2, "silver_3"],
    [3, "silver_4"],
    [4, "silver_5"],
  ])}
  ${songBlock("1002", "二番目の歌", [[5, "silver_6"]], true)}
  ${songBlock("1003", "三番目の歌", [
    [1, "silver_7"],
    [2, "silver_8"],
    [3, "gold_0"],
    [4, "gold_5"],
  ])}
  ${songBlock("1004", "四番目の歌", [
    [1, "gold_6"],
    [2, "gold_7"],
    [3, "gold_8"],
    [4, "donderfull_8"],
  ])}
</ul></body></html>`;

function listScores(html: string) {
  const result = parseScoreListPage(html, "000000000000", 1, T);
  if (!isOk(result)) {
    throw new Error(`expected a reading, got ${JSON.stringify(result.error)}`);
  }
  return result.value;
}

describe("parseScoreListPage", () => {
  test("the site's donderfull, with two l's, is the model's donderful", () => {
    expect(listScores(LIST_EXCERPT).scores.filter((s) => s.crown === "donderful")).toHaveLength(1);
  });

  test("one Score per chart, every crown state kept — the old silver-and-above filter is gone", () => {
    const { scores } = listScores(LIST_EXCERPT);

    expect(scores).toHaveLength(17);
    expect(scores.map((s) => s.crown)).toEqual([
      "none",
      "played",
      "played",
      "played",
      "silver",
      "silver",
      "silver",
      "silver",
      "silver",
      "silver",
      "silver",
      "gold",
      "gold",
      "gold",
      "gold",
      "gold",
      "donderful",
    ]);
    for (const score of scores) {
      expect(score.fidelity).toBe("list");
      expect(score.record).toBeNull();
    }
  });

  test("the crown image's suffix is the score rank, so the list already knows it", () => {
    const { scores } = listScores(LIST_EXCERPT);

    expect(scores.map((s) => s.scoreRank)).toEqual([
      null,
      null,
      2,
      3,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      null,
      5,
      6,
      7,
      8,
      8,
    ]);
  });

  test("crown and rank are independent axes: gold_0 has no rank and played_2 has one", () => {
    const byImage = new Map(
      listScores(LIST_EXCERPT).scores.map((s) => [`${s.crown}/${s.scoreRank}`, s]),
    );

    expect(byImage.has("gold/null")).toBe(true);
    expect(byImage.has("played/2")).toBe(true);
  });

  test("crown_button_none names no suffix at all, and that is data rather than a failure", () => {
    const none = listScores(LIST_EXCERPT).scores[0];

    expect(none?.crown).toBe("none");
    expect(none?.scoreRank).toBeNull();
  });

  test("ura is level 5 of the same song: one Song, two blocks, shared songNo", () => {
    const { songs, scores } = listScores(LIST_EXCERPT);

    expect(songs.map((s) => s.songNo)).toEqual(["1001", "1002", "1003", "1004"]);
    const ura = scores.find((s) => s.level === 5);
    expect(ura?.songNo).toBe("1002");
  });

  test("an anchor naming a different genre than the request is a failure, not data", () => {
    const result = parseScoreListPage(LIST_EXCERPT, "000000000000", 2, T);

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }
    expect(result.error.kind).toBe("unreadableValue");
  });

  test("an unknown crown image is refused with its src, never guessed", () => {
    const broken = LIST_EXCERPT.replace("crown_button_played_0_640", "crown_button_platinum_0_640");

    const result = parseScoreListPage(broken, "000000000000", 1, T);

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }
    expect(result.error).toEqual({
      kind: "unreadableValue",
      page: "score_list.php",
      marker: "img (crown_button)",
      raw: "image/sp/640/crown_button_platinum_0_640.png",
    });
  });

  test.each(["crown_button_silver_1_640", "crown_button_silver_9_640", "crown_button_silver_640"])(
    "%s is a rank the vocabulary does not have, so it fails carrying the src",
    (replacement) => {
      const broken = LIST_EXCERPT.replace("crown_button_silver_2_640", replacement);

      const result = parseScoreListPage(broken, "000000000000", 1, T);

      if (!isErr(result)) {
        throw new Error("expected a failure");
      }
      expect(result.error).toEqual({
        kind: "unreadableValue",
        page: "score_list.php",
        marker: "img (crown_button rank)",
        raw: `image/sp/640/${replacement}.png`,
      });
    },
  );

  test("a page with no chart anchors at all fails naming the marker", () => {
    const result = parseScoreListPage("<html><body><p>empty</p></body></html>", "0", 1, T);

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }
    expect(result.error.kind).toBe("missingMarker");
  });
});

function detailExcerpt(options: {
  crown: number;
  rank: number | null;
  stage: number;
  optionCodes: readonly string[];
  withSections?: boolean;
}): string {
  const rank =
    options.rank === null
      ? ""
      : `<img src="image/sp/640/best_score_rank_${options.rank}_640.png" />`;
  const optionImages = options.optionCodes
    .map((code) => `<img src="image/sp/640/status_10_${code}_640.png" />`)
    .concat(['<img src="image/sp/640/blank_640.gif" />'])
    .join("");
  // 区間毎詳細成績, as the real page shapes it: each section repeats the main record's
  // markers — its own crown_large image and the same count classes with other numbers.
  const sections = !options.withSections
    ? ""
    : [1, 2, 3]
        .map(
          (n) => `<div>
            <div class="section_lavel"><span>区間${n}</span></div>
            <div class="section_crown"><img class="crown" src="image/sp/640/crown_large_3_640.png"></div>
            <div class="high_score"><span>272,440点</span></div>
            <div class="good_cnt"><span>93回</span></div>
            <div class="ng_cnt"><span>0回</span></div>
            <div class="ok_cnt"><span>10回</span></div>
            <div class="pound_cnt"><span>0回</span></div>
          </div>`,
        )
        .join("");
  return `<html><body>
    <h2 class="songNameFontjpop">テスト曲</h2>
    <img src="image/sp/640/crown_large_${options.crown}_640.png" />${rank}
    <div class="scoreDetailTable">
      <div class="high_score"><img src="x.png" /><span>933,050点</span></div>
      <div class="good_cnt"><img src="x.png" /><span>308回</span></div>
      <div class="combo_cnt"><img src="x.png" /><span>357回</span></div>
      <div class="ok_cnt"><img src="x.png" /><span>49回</span></div>
      <div class="pound_cnt"><img src="x.png" /><span>87回</span></div>
      <div class="ng_cnt"><img src="x.png" /><span>0回</span></div>
      <div class="optionImage">${optionImages}</div>
      <div class="stage_cnt"><img src="x.png" /><span>${options.stage}回</span></div>
      <div class="clear_cnt"><img src="x.png" /><span>3回</span></div>
      <div class="full_combo_cnt"><img src="x.png" /><span>2回</span></div>
      <div class="dondaful_combo_cnt"><img src="x.png" /><span>1回</span></div>
    </div>
    ${sections}
  </body></html>`;
}

describe("parseScoreDetailPage", () => {
  test("the wiki's anchor example: crown 2, rank 6 and option a3 read as gold, 6, double speed", () => {
    const result = parseScoreDetailPage(
      detailExcerpt({ crown: 2, rank: 6, stage: 3, optionCodes: ["a3"] }),
      "000000000000",
      "1178",
      4,
      T,
    );

    if (!isOk(result)) {
      throw new Error(`expected a reading, got ${JSON.stringify(result.error)}`);
    }
    expect(result.value.crown).toBe("gold");
    expect(result.value.scoreRank).toBe(6);
    expect(result.value.record?.options.speed).toBe(2);
  });

  test("my page's record carries all four play counts, each from its own block", () => {
    // The type lets these four be null, for another player's page. On mine, only this pins them.
    const result = parseScoreDetailPage(
      detailExcerpt({ crown: 2, rank: 6, stage: 4, optionCodes: ["a3"] }),
      "000000000000",
      "1178",
      4,
      T,
    );

    if (!isOk(result)) {
      throw new Error(`expected a reading, got ${JSON.stringify(result.error)}`);
    }
    expect(result.value).toEqual({
      taikoNo: "000000000000",
      songNo: "1178",
      level: 4,
      crown: "gold",
      scoreRank: 6,
      fidelity: "detail",
      record: {
        highScore: 933050,
        good: 308,
        ok: 49,
        bad: 0,
        drumroll: 87,
        maxCombo: 357,
        stageCount: 4,
        clearCount: 3,
        fullComboCount: 2,
        donderfulComboCount: 1,
        options: { speed: 2, doron: false, abekobe: false, random: "none", supportChart: null },
      },
      fetchedAt: T,
    });
  });

  test("the per-section blocks repeat the record's markers and must not bleed into it", () => {
    const result = parseScoreDetailPage(
      detailExcerpt({ crown: 2, rank: 6, stage: 3, optionCodes: [], withSections: true }),
      "000000000000",
      "1178",
      4,
      T,
    );

    if (!isOk(result) || result.value.record === null) {
      throw new Error("expected a record");
    }
    // The sections carry crown_large_3 and other numbers; the record is the main block's.
    expect(result.value.crown).toBe("gold");
    expect(result.value.record.highScore).toBe(933050);
    expect(result.value.record.good).toBe(308);
    expect(result.value.record.ok).toBe(49);
    expect(result.value.record.bad).toBe(0);
    expect(result.value.record.drumroll).toBe(87);
  });

  test("可 is read apart from 不可 — distinct blocks, distinct numbers", () => {
    const result = parseScoreDetailPage(
      detailExcerpt({ crown: 2, rank: 6, stage: 3, optionCodes: [] }),
      "0",
      "1",
      4,
      T,
    );

    if (!isOk(result) || result.value.record === null) {
      throw new Error("expected a record");
    }
    expect(result.value.record.ok).toBe(49);
    expect(result.value.record.bad).toBe(0);
    expect(result.value.record.highScore).toBe(933050);
  });

  test("crown 0 with plays is the detail page's own shape of played", () => {
    const result = parseScoreDetailPage(
      detailExcerpt({ crown: 0, rank: null, stage: 2, optionCodes: [] }),
      "0",
      "1",
      4,
      T,
    );

    if (!isOk(result)) {
      throw new Error("expected a reading");
    }
    expect(result.value.crown).toBe("played");
    expect(result.value.scoreRank).toBeNull();
  });

  test("crown 0 with zero plays stays none", () => {
    const result = parseScoreDetailPage(
      detailExcerpt({ crown: 0, rank: null, stage: 0, optionCodes: [] }),
      "0",
      "1",
      4,
      T,
    );

    if (!isOk(result)) {
      throw new Error("expected a reading");
    }
    expect(result.value.crown).toBe("none");
  });

  test("a never-played chart parses into a Score that says so", () => {
    const page = `<html><body><div class="songNameTitleScore">未プレイまたは同期中です。</div></body></html>`;

    const result = parseScoreDetailPage(page, "000000000000", "1515", 4, T);

    if (!isOk(result)) {
      throw new Error("expected a reading");
    }
    expect(result.value).toEqual({
      taikoNo: "000000000000",
      songNo: "1515",
      level: 4,
      crown: "none",
      scoreRank: null,
      fidelity: "detail",
      record: null,
      fetchedAt: T,
    });
  });

  test("several option codes decode together", () => {
    const result = parseScoreDetailPage(
      detailExcerpt({ crown: 1, rank: 8, stage: 1, optionCodes: ["a15", "a2", "a6"] }),
      "0",
      "1",
      4,
      T,
    );

    if (!isOk(result) || result.value.record === null) {
      throw new Error("expected a record");
    }
    expect(result.value.record.options).toEqual({
      speed: 1.5,
      doron: false,
      abekobe: true,
      random: "kimagure",
      supportChart: null,
    });
  });

  test("an option code outside the vocabulary is new knowledge, so it fails carrying the src", () => {
    const result = parseScoreDetailPage(
      detailExcerpt({ crown: 1, rank: 8, stage: 1, optionCodes: ["z9"] }),
      "0",
      "1",
      4,
      T,
    );

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }
    expect(result.error).toEqual({
      kind: "unreadableValue",
      page: "score_detail.php",
      marker: ".optionImage img",
      raw: "image/sp/640/status_10_z9_640.png",
    });
  });

  test("a missing count block fails naming its class", () => {
    const broken = detailExcerpt({ crown: 2, rank: 6, stage: 3, optionCodes: [] }).replace(
      "pound_cnt",
      "pound_gone",
    );

    const result = parseScoreDetailPage(broken, "0", "1", 4, T);

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }
    expect(result.error).toEqual({
      kind: "missingMarker",
      page: "score_detail.php",
      marker: ".pound_cnt",
    });
  });

  test.each([".stage_cnt", ".clear_cnt", ".full_combo_cnt", ".dondaful_combo_cnt"])(
    "my page always prints %s, so a page without it is refused rather than read as null",
    (marker) => {
      const broken = detailExcerpt({ crown: 2, rank: 6, stage: 4, optionCodes: [] }).replace(
        marker.slice(1),
        "gone",
      );

      const result = parseScoreDetailPage(broken, "0", "1", 4, T);

      if (!isErr(result)) {
        throw new Error("expected a failure");
      }
      expect(result.error).toEqual({ kind: "missingMarker", page: "score_detail.php", marker });
    },
  );

  test("another player's page is still refused here, naming the first play count it lacks", () => {
    const result = parseScoreDetailPage(
      publicDetailExcerpt({ crown: 3, rank: 8 }),
      "000000000000",
      "1061",
      5,
      T,
    );

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }
    expect(result.error).toEqual({
      kind: "missingMarker",
      page: "score_detail.php",
      marker: ".stage_cnt",
    });
  });
});

const TAIKO_NO = "000000000000";

const BLANK_OPTION_SLOT = '<img src="image/sp/640/blank_640.gif" />';

interface PublicDetailOptions {
  /**
   * `crown_large_<N>`, or null for no crown image at all — what my never-played page serves. The
   * one capture of this page carries 3.
   */
  crown: number | null;
  /** `best_score_rank_<N>`, or null for no rank image at all. */
  rank: number | null;
  /** Whose chart the My Don link names. */
  subject?: string;
  /**
   * `status_10_<code>` images, padded with blanks to four slots. The one capture of this page
   * carries four blanks, which is also what the reader makes of no codes at all.
   */
  optionCodes?: readonly string[];
  /**
   * The four play-count blocks, which the one capture of this page does not carry. Given here
   * only to show what the reader does if another player's page ever prints them.
   */
  playCounts?: {
    readonly stage: number;
    readonly clear: number;
    readonly fullCombo: number;
    readonly donderfulCombo: number;
  };
}

function publicDetailExcerpt(options: PublicDetailOptions): string {
  const { crown, rank, subject = TAIKO_NO, playCounts, optionCodes = [] } = options;
  const crownImage =
    crown === null ? "" : `<img class="crown" src="image/sp/640/crown_large_${crown}_640.png" />`;
  const optionSlots = optionCodes
    .map((code) => `<img src="image/sp/640/status_10_${code}_640.png" />`)
    .concat(Array.from({ length: 4 - optionCodes.length }, () => BLANK_OPTION_SLOT))
    .join("");
  const rankImage =
    rank === null
      ? ""
      : `<img class="best_score_icon" src="image/sp/640/best_score_rank_${rank}_640.png" />`;
  const playCountBlocks =
    playCounts === undefined
      ? ""
      : `<div class="stage_cnt"><img src="image/sp/640/score_name_stage_640.png" /><span>${playCounts.stage}回</span></div>
        <div class="clear_cnt"><img src="image/sp/640/score_name_clear_640.png" /><span>${playCounts.clear}回</span></div>
        <div class="full_combo_cnt"><img src="image/sp/640/score_name_full_combo_640.png" /><span>${playCounts.fullCombo}回</span></div>
        <div class="dondaful_combo_cnt"><img src="image/sp/640/score_name_dondaful_combo_640.png" /><span>${playCounts.donderfulCombo}回</span></div>`;
  // div.ranking is populated on this page, and a shape-based scan would take it for a count.
  return `<html><body>
    <div class="scoreDetail">
      <div class="scoreDetailMydonImage">
        <a href="user_profile.php?taiko_no=${subject}"><img src="https://img.taiko-p.jp/imgsrc.php?v=&kind=mydon&fn=mydon_${subject}"></a>
      </div>
      <div class="scoreDetailStatus">
        ${crownImage}${rankImage}
      </div>
      <div class="scoreDetailTable">
        <div class="ranking"><img src="image/sp/640/ranking_all_back_640.png" /><span>3位</span></div>
        <div class="high_score"><img src="image/sp/640/score_back_0_640.png" /><span>1001230点</span></div>
        <div class="good_cnt"><img src="image/sp/640/score_name_good_640.png" /><span>512回</span></div>
        <div class="combo_cnt"><img src="image/sp/640/score_name_combo_640.png" /><span>498回</span></div>
        <div class="ok_cnt"><img src="image/sp/640/score_name_ok_640.png" /><span>3回</span></div>
        <div class="pound_cnt"><img src="image/sp/640/score_name_pound_640.png" /><span>27回</span></div>
        <div class="ng_cnt"><img src="image/sp/640/score_name_ng_640.png" /><span>1回</span></div>
        <div class="optionImage">${optionSlots}</div>
        ${playCountBlocks}
      </div>
    </div>
  </body></html>`;
}

/** The site's error page as a closed profile answers it: the shell, the caution image, one line. */
const CLOSED_PROFILE_PAGE = `<html><body>
  <header><h1>エラー</h1><ul class="left "><li class="boxLink"><a href="index.php"></a></li></ul></header>
  <div id="content"><div><table><tr>
    <td><img src="image/sp/640/caution_640.png"></td>
    <td>※プロフィール非公開のため閲覧できません</td>
  </tr></table></div></div>
</body></html>`;

function readPublic(html: string, taikoNo = TAIKO_NO) {
  const result = parsePublicScoreDetailPage(html, taikoNo, "1061", 5, T);
  if (!isOk(result)) {
    throw new Error(`expected a reading, got ${JSON.stringify(result.error)}`);
  }
  return result.value;
}

describe("parsePublicScoreDetailPage", () => {
  test("reads into the same Score as my page, with no 区間 sections to need", () => {
    expect(readPublic(publicDetailExcerpt({ crown: 3, rank: 8 }))).toEqual({
      taikoNo: TAIKO_NO,
      songNo: "1061",
      level: 5,
      crown: "donderful",
      scoreRank: 8,
      fidelity: "detail",
      record: {
        highScore: 1001230,
        good: 512,
        ok: 3,
        bad: 1,
        drumroll: 27,
        maxCombo: 498,
        stageCount: null,
        clearCount: null,
        fullComboCount: null,
        donderfulComboCount: null,
        options: { speed: 1, doron: false, abekobe: false, random: "none", supportChart: null },
      },
      fetchedAt: T,
    });
  });

  test("the play counts the page does not print are null, never an invented 0", () => {
    const { record } = readPublic(publicDetailExcerpt({ crown: 2, rank: 6 }));

    expect(record?.stageCount).toBeNull();
    expect(record?.clearCount).toBeNull();
    expect(record?.fullComboCount).toBeNull();
    expect(record?.donderfulComboCount).toBeNull();
  });

  test("option slots the page fills are decoded, not taken as the blank default", () => {
    const { record } = readPublic(publicDetailExcerpt({ crown: 3, rank: 8, optionCodes: ["a3"] }));

    expect(record?.options).toEqual({
      speed: 2,
      doron: false,
      abekobe: false,
      random: "none",
      supportChart: null,
    });
  });

  test("crown 0 reads as played: there is no play count to ask, and the crown image is there", () => {
    const score = readPublic(publicDetailExcerpt({ crown: 0, rank: null }));

    expect(score.crown).toBe("played");
    expect(score.scoreRank).toBeNull();
  });

  test("play counts the page does print are read, not thrown away", () => {
    const score = readPublic(
      publicDetailExcerpt({
        crown: 0,
        rank: null,
        playCounts: { stage: 7, clear: 5, fullCombo: 2, donderfulCombo: 1 },
      }),
    );

    expect(score.crown).toBe("played");
    expect(score.record?.stageCount).toBe(7);
    expect(score.record?.clearCount).toBe(5);
    expect(score.record?.fullComboCount).toBe(2);
    expect(score.record?.donderfulComboCount).toBe(1);
  });

  test("a printed play count decides crown 0, as on my page: zero plays stay none", () => {
    const score = readPublic(
      publicDetailExcerpt({
        crown: 0,
        rank: null,
        playCounts: { stage: 0, clear: 0, fullCombo: 0, donderfulCombo: 0 },
      }),
    );

    expect(score.crown).toBe("none");
    expect(score.record?.stageCount).toBe(0);
  });

  test("a page with no crown image is refused, not read as played or as never played", () => {
    // My never-played page serves no crown image. Another player's never-played chart has never
    // been captured, and this refusal is what keeps crown 0's "played" from being guessed at.
    const result = parsePublicScoreDetailPage(
      publicDetailExcerpt({ crown: null, rank: null }),
      TAIKO_NO,
      "1061",
      5,
      T,
    );

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }
    expect(result.error).toEqual({
      kind: "missingMarker",
      page: "score_detail.php",
      marker: 'img[src*="crown_large_"]',
    });
  });

  test("some play counts without the rest is a shape nobody has seen, so it fails naming the gap", () => {
    const broken = publicDetailExcerpt({
      crown: 1,
      rank: 5,
      playCounts: { stage: 7, clear: 5, fullCombo: 2, donderfulCombo: 1 },
    }).replace("clear_cnt", "clear_gone");

    const result = parsePublicScoreDetailPage(broken, TAIKO_NO, "1061", 5, T);

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }
    expect(result.error).toEqual({
      kind: "missingMarker",
      page: "score_detail.php",
      marker: ".clear_cnt",
    });
  });

  test("a count block the page does carry is still required", () => {
    const broken = publicDetailExcerpt({ crown: 3, rank: 8 }).replace("pound_cnt", "pound_gone");

    const result = parsePublicScoreDetailPage(broken, TAIKO_NO, "1061", 5, T);

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }
    expect(result.error).toEqual({
      kind: "missingMarker",
      page: "score_detail.php",
      marker: ".pound_cnt",
    });
  });

  test("a page naming a different player than the one requested is refused", () => {
    const result = parsePublicScoreDetailPage(
      publicDetailExcerpt({ crown: 3, rank: 8, subject: "111111111111" }),
      TAIKO_NO,
      "1061",
      5,
      T,
    );

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }
    expect(result.error).toEqual({
      kind: "unreadableValue",
      page: "score_detail.php",
      marker: ".scoreDetailMydonImage a (taiko_no)",
      raw: "111111111111",
    });
  });

  test("a page with no My Don link names nobody, so it is refused", () => {
    const broken = publicDetailExcerpt({ crown: 3, rank: 8 }).replace(
      "scoreDetailMydonImage",
      "scoreDetailMydonGone",
    );

    const result = parsePublicScoreDetailPage(broken, TAIKO_NO, "1061", 5, T);

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }
    expect(result.error).toEqual({
      kind: "missingMarker",
      page: "score_detail.php",
      marker: ".scoreDetailMydonImage a",
    });
  });

  test("a logged-out answer fails as loggedOut, not as missing fields", () => {
    const loggedOut = `<html><body>
      <form name="login_form" id="login_form" method="get" action="./login_process.php"></form>
    </body></html>`;

    const result = parsePublicScoreDetailPage(loggedOut, TAIKO_NO, "1061", 5, T);

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }
    expect(result.error).toEqual({ kind: "loggedOut", page: "score_detail.php" });
  });

  test("a closed profile's answer is the site's error page, not a missing marker", () => {
    const result = parsePublicScoreDetailPage(CLOSED_PROFILE_PAGE, TAIKO_NO, "1061", 5, T);

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }
    expect(result.error).toEqual({
      kind: "siteError",
      page: "score_detail.php",
      message: "※プロフィール非公開のため閲覧できません",
    });
  });
});
