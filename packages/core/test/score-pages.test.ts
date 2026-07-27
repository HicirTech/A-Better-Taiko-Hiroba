/**
 * Excerpts, not captured pages — see README.md for why. The list excerpt mirrors the real block
 * shape (`li.contentBox` → `.songName` + one detail anchor per chart), the detail excerpt the real
 * named count blocks, both taken from the captured pages' structure with no real account data.
 *
 * Image names are the **site's**, not the model's, spelling included: `crown_button_donderfull`
 * with two l's is the file the site actually serves. The list excerpt names every state-and-suffix
 * combination a real genre page has been seen to serve.
 */
import { describe, expect, test } from "bun:test";

import { isErr, isOk, parseScoreDetailPage, parseScoreListPage } from "../src/index";

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
      <div class="full_combo_cnt"><img src="x.png" /><span>1回</span></div>
      <div class="dondaful_combo_cnt"><img src="x.png" /><span>0回</span></div>
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
});
