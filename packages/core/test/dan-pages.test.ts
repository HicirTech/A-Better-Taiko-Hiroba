/**
 * Excerpts, not captured pages — see README.md for why. The board's panels carry no classes at all,
 * only inline styles, and the detail page's two condition blocks are separated by nothing but a
 * sentence; both excerpts reproduce that faithfully because both are what the parsers rely on.
 */
import { describe, expect, test } from "bun:test";

import { isErr, parseDanBoardPage, parseDanDetailPage } from "../src/index";

const TAIKO_NO = "000000000000";
const FETCHED_AT = "2026-08-09T00:00:00.000Z";

function boardPanel(dan: number, name: string, linked: boolean): string {
  const image = linked
    ? `<a href="dan_detail.php?dan=${dan}"><img style="width:280px;" src="imgsrc_dani.php?taiko_no=${TAIKO_NO}&dan=${dan}&img=0"></a>`
    : `<img style="width:280px;" src="image/sp/640/dani/dani_plate_${dan}_no_640.png">`;
  return `<div style="width:280px;margin:0 auto; border: 5px solid #FF7F00;">
    ${image}
    <div style="margin-top: -12px;font-weight: bold;text-align: center;">${name}</div>
  </div>`;
}

function board(): string {
  const numbered = [
    "FIFTH KYU",
    "FOURTH KYU",
    "THIRD KYU",
    "SECOND KYU",
    "FIRST KYU",
    "FIRST DAN",
    "SECOND DAN",
    "THIRD DAN",
    "FOURTH DAN",
    "FIFTH DAN",
    "SIXTH DAN",
    "SEVENTH DAN",
    "EIGHTH DAN",
    "NINTH DAN",
    "TENTH DAN",
  ].map((name, index) => boardPanel(index + 1, name, true));
  const named = ["KUROTO", "MEIJIN", "CHOJIN", "TATSUJIN"].map((name, index) =>
    boardPanel(16 + index, name, false),
  );
  return `<!DOCTYPE html><html><body><div id="dan_detail">${[...numbered, ...named].join("")}</div></body></html>`;
}

/** The whole-run condition shape: three spans, the middle one a spacer. */
function courseCondition(name: string, requirement: string, achieved: string): string {
  return `<div class="odai_total_song_wrap"><img src="odai_total_song_plate_640.png"><div>
    <div class="odai_total_song">
      <div class="odai_total_song_border"><span>${name}</span><span> </span><span>${requirement}</span></div>
      <div class="odai_total_song_result"><span>${achieved}</span></div>
    </div>
  </div></div>`;
}

/** The per-song shape: one name, then one (requirement, achieved) pair per 課題曲. */
function perSongCondition(name: string, steps: [string, string][]): string {
  const borders = steps
    .map(([requirement, achieved]) => {
      return `<div class="odai_song_border_border"><span>${requirement}</span><span>${achieved}</span></div>`;
    })
    .join("");
  return `<div class="odai_song_wrap"><img src="odai_song_plate_640.png"><div>
    <div class="odai_song">
      <div class="odai_song_border_name"><span>${name}</span></div>
      ${borders}
    </div>
  </div></div>`;
}

interface SongOptions {
  title: string;
  genreSuffix: string;
  level?: number | null;
  counts?: [number, number, number, number, number, number] | null;
}

function song({ title, genreSuffix, level = 4, counts = null }: SongOptions): string {
  const [good, pound, ok, combo, ng, hit] = counts ?? [0, 0, 0, 0, 0, 0];
  const table =
    counts === null
      ? ""
      : `<div class="scoreDetailTable">
           <div class="good_cnt"><img src="image/sp/640/score_name_good_640.png"><span>${good}回</span></div>
           <div class="pound_cnt"><img src="image/sp/640/score_name_pound_640.png"><span>${pound}回</span></div>
           <div class="ok_cnt"><img src="image/sp/640/score_name_ok_640.png"><span>${ok}回</span></div>
           <div class="combo_cnt"><img src="image/sp/640/score_name_combo_640.png"><span>${combo}回</span></div>
           <div class="ng_cnt"><img src="image/sp/640/score_name_ng_640.png"><span>${ng}回</span></div>
           <div class="hit_cnt"><img src="image/sp/640/score_name_hit_640.png"><span>${hit}回</span></div>
         </div>`;
  const levelIcon =
    level === null
      ? ""
      : `<img src="image/sp/640/level_icon_${level}_640.png" style="width:40px;">`;
  return `<div class="board contentBox songLisrArea${genreSuffix}">
    <div class="score_open">
      <div><span class="songName songNameFont${genreSuffix}">${title}</span></div>
      <div>${levelIcon}</div>
    </div>
    <div class="hidden_board">${table}</div>
  </div>`;
}

function totalCountCell(id: string, value: string): string {
  return `<td class="total_status"><img class="dan_txt" src="image/sp/640/txt_score_${id}_640.png">${value}</td>`;
}

interface DetailOptions {
  attempted?: boolean;
}

function detail({ attempted = true }: DetailOptions = {}): string {
  const dash = "-";
  const cells = attempted
    ? [
        ["001", "1710"],
        ["002", "400"],
        ["003", "25"],
        ["004", "1219"],
        ["005", "146"],
        ["006", "2256"],
      ]
    : [
        ["001", dash],
        ["002", dash],
        ["003", dash],
        ["004", dash],
        ["005", dash],
        ["006", dash],
      ];

  const songs = attempted
    ? [
        song({
          title: "サンプル曲アルファ",
          genreSuffix: "namco",
          counts: [681, 146, 84, 765, 0, 911],
        }),
        song({
          title: "サンプル曲ベータ",
          genreSuffix: "namco",
          counts: [441, 0, 163, 454, 1, 604],
        }),
        // A dan course may set an ura chart.
        song({
          title: "サンプル曲ガンマ",
          genreSuffix: "namco",
          level: 5,
          counts: [588, 0, 153, 252, 24, 741],
        }),
      ]
    : [
        song({ title: "サンプル曲アルファ", genreSuffix: "classicoff" }),
        // 十段 masks its later songs: no title, no level icon, no counts table.
        song({ title: "？？？", genreSuffix: "noclear", level: null }),
        song({ title: "？？？", genreSuffix: "noclear", level: null }),
      ];

  return `<!DOCTYPE html><html><body><div id="dan_detail">
    <img class="dani_plate" src="imgsrc_dani.php?taiko_no=${TAIKO_NO}&dan=15&img=0">
    <div class="total_score_area"><div class="total_score_score">${attempted ? "2691580" : "0"}</div></div>
    <table><tr>${cells.map(([id, value]) => totalCountCell(id ?? "", value ?? "")).join("")}</tr></table>
    ${courseCondition("魂ゲージ", "98%以上", attempted ? "100%" : "-%")}
    ${perSongCondition("可", [
      ["18未満", attempted ? "14回" : "-回"],
      ["25未満", attempted ? "22回" : "-回"],
      ["30未満", attempted ? "9回" : "-回"],
    ])}
    <div style="font-size:12px;">条件毎の成績が最も良いものを記録、表示します。</div>
    ${courseCondition("魂ゲージ", "98%以上", attempted ? "100%" : "-%")}
    ${perSongCondition("可", [
      ["18未満", attempted ? "12回" : "-回"],
      ["25未満", attempted ? "20回" : "-回"],
      ["30未満", attempted ? "8回" : "-回"],
    ])}
    <p class="head_update_day">スコア更新日時：${attempted ? "2026/06/15 16:20:59" : "----/--/-- --:--:--"}</p>
    <div id="songlist">${songs.join("")}</div>
  </div></body></html>`;
}

function boardOrThrow(html: string) {
  const result = parseDanBoardPage(html);
  if (isErr(result)) {
    throw new Error(`expected a reading, got ${JSON.stringify(result.error)}`);
  }
  return result.value;
}

function detailOrThrow(html: string, dan = 15) {
  const result = parseDanDetailPage(html, dan, TAIKO_NO, FETCHED_AT, "none");
  if (isErr(result)) {
    throw new Error(`expected a reading, got ${JSON.stringify(result.error)}`);
  }
  return result.value;
}

describe("parseDanBoardPage", () => {
  test("reads nineteen panels in board order, naming each", () => {
    const reading = boardOrThrow(board());

    expect(reading.panels).toHaveLength(19);
    expect(reading.panels.map((panel) => panel.dan)).toEqual(
      Array.from({ length: 19 }, (_, index) => index + 1),
    );
    expect(reading.panels[0]?.name).toBe("FIFTH KYU");
    expect(reading.panels[14]?.name).toBe("TENTH DAN");
    expect(reading.panels[15]?.name).toBe("KUROTO");
    expect(reading.panels[18]?.name).toBe("TATSUJIN");
  });

  test("only the fifteen numbered dan have a detail page", () => {
    const reading = boardOrThrow(board());

    const linked = reading.panels.filter((panel) => panel.detailUrl !== null);
    expect(linked).toHaveLength(15);
    expect(linked.at(-1)?.detailUrl).toContain("dan=15");
    expect(reading.panels[15]?.detailUrl).toBeNull();
  });

  test("the named ranks serving static art is a reading, not a failure", () => {
    const reading = boardOrThrow(board());

    expect(reading.panels.filter((panel) => panel.plateIsRendered)).toHaveLength(15);
    expect(reading.panels[16]?.plateIsRendered).toBe(false);
    expect(reading.panels[16]?.plateImageUrl).toContain("dani_plate_17_no");
  });

  test("does not look for a pass state anywhere in the markup", () => {
    const reading = boardOrThrow(board());

    // Every panel offers its plate and nothing that claims to be a verdict.
    for (const panel of reading.panels) {
      expect(panel.plateImageUrl).not.toBe("");
      expect(Object.keys(panel)).toEqual([
        "dan",
        "name",
        "plateImageUrl",
        "plateIsRendered",
        "detailUrl",
      ]);
    }
  });
});

describe("parseDanDetailPage", () => {
  test("fills a record from an attempted dan", () => {
    const record = detailOrThrow(detail(), 9);

    expect(record.dan).toBe(9);
    expect(record.totalScore).toBe(2691580);
    expect(record.totalCounts).toEqual({
      good: 1710,
      ok: 400,
      bad: 25,
      drumroll: 146,
      maxCombo: 1219,
      hits: 2256,
    });
    expect(record.updatedAt).toBe("2026/06/15 16:20:59");
    expect(record.fetchedAt).toBe(FETCHED_AT);
  });

  test("keeps the per-condition bests as their own block", () => {
    const record = detailOrThrow(detail());

    expect(record.conditions).toHaveLength(2);
    expect(record.conditionBests).toHaveLength(2);
    // The two blocks hold the same conditions with different achieved values.
    expect(record.conditions[0]?.name).toBe("魂ゲージ");
    expect(record.conditionBests[0]?.name).toBe("魂ゲージ");
  });

  test("a per-song condition carries one threshold per 課題曲, not one for the run", () => {
    const record = detailOrThrow(detail());

    const perSong = record.conditions.find((condition) => condition.kind === "perSong");
    expect(perSong).toEqual({
      kind: "perSong",
      name: "可",
      songs: [
        { requirement: "18未満", achieved: "14回" },
        { requirement: "25未満", achieved: "22回" },
        { requirement: "30未満", achieved: "9回" },
      ],
    });
  });

  test("reads the whole-course condition from the third span, not the second", () => {
    const record = detailOrThrow(detail());

    // The middle span is a spacer; reading it yields a blank on every condition on the site.
    expect(record.conditions[0]).toEqual({
      kind: "course",
      name: "魂ゲージ",
      requirement: "98%以上",
      achieved: "100%",
    });
  });

  test("a 課題曲 can be an ura chart", () => {
    const record = detailOrThrow(detail());

    expect(record.songs.map((entry) => entry.level)).toEqual([4, 4, 5]);
  });

  test("each song carries its own six counts", () => {
    const record = detailOrThrow(detail());

    expect(record.songs[0]?.record).toEqual({
      good: 681,
      drumroll: 146,
      ok: 84,
      maxCombo: 765,
      bad: 0,
      hits: 911,
    });
  });

  test("an unattempted dan is a reading, not a failure", () => {
    const record = detailOrThrow(detail({ attempted: false }));

    expect(record.totalScore).toBe(0);
    expect(record.totalCounts).toBeNull();
    expect(record.updatedAt).toBeNull();
    // The conditions are still printed, with nothing achieved against them.
    expect(record.conditions).toHaveLength(2);
    expect(record.songs.every((entry) => entry.record === null)).toBe(true);
  });

  test("a masked song has no title and no level, and that is the page speaking", () => {
    const record = detailOrThrow(detail({ attempted: false }));

    expect(record.songs[0]?.title).toBe("サンプル曲アルファ");
    expect(record.songs[1]).toEqual({ title: null, level: null, record: null });
    expect(record.songs[2]).toEqual({ title: null, level: null, record: null });
  });

  test("the site's error page is recognised as such, not as a missing marker", () => {
    const shell = `<html><body><h1>エラー</h1><table><tr><td>指定されたページは存在しません。</td></tr></table></body></html>`;
    const result = parseDanDetailPage(shell, 16, TAIKO_NO, FETCHED_AT, "none");

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("siteError");
      if (result.error.kind === "siteError") {
        expect(result.error.message).toContain("指定されたページは存在しません。");
      }
    }
  });

  test("a bad parameter is the same shape with a different message", () => {
    const shell = `<html><body><h1>エラー</h1><table><tr><td>パラメータが不正です。</td></tr></table></body></html>`;
    const result = parseDanDetailPage(shell, 0, TAIKO_NO, FETCHED_AT, "none");

    expect(isErr(result)).toBe(true);
    if (isErr(result) && result.error.kind === "siteError") {
      expect(result.error.message).toContain("パラメータが不正です。");
    }
  });
});
