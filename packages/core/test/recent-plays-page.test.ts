/**
 * Excerpts, not captured pages — see README.md for why. The row mirrors the real shape: the title
 * in `li.songNameTitleScore`, five option cells with サポート譜面 first, the level/crown/rank icons
 * beside `.scoreScore`, and one count cell per `score_name_*` label. No real account data.
 */
import { describe, expect, test } from "bun:test";

import { isErr, isOk, parseRecentPlaysPage, scoreFromRecentPlay } from "../src/index";

const COUNTS = {
  good: 618,
  combo: 196,
  ok: 159,
  pound: 9,
  ng: 45,
  stage: 75,
  clear: 23,
  full_combo: 0,
  dondaful_combo: 0,
} as const;

function row(options: {
  title?: string;
  level?: number;
  crown?: number;
  rank?: number | null;
  score?: string;
  support?: string;
  optionCodes?: readonly string[];
  counts?: Readonly<Record<string, number>>;
}): string {
  const rank =
    options.rank === null
      ? ""
      : `<img class="crownIcon" src="image/sp/640/best_score_rank_${options.rank ?? 5}_640.png">`;
  const codeCells = ["a6", "a2", "a1"]
    .map((code) =>
      (options.optionCodes ?? []).includes(code)
        ? `<div class="playDataArea option"><img src="image/sp/640/status_10_${code}_640.png" /></div>`
        : `<div class="playDataArea option">&nbsp;</div>`,
    )
    .join("");
  const speed = (options.optionCodes ?? []).find((code) => !["a6", "a2", "a1"].includes(code));
  const speedCell = `<div class="playDataArea option">${
    speed === undefined ? "&nbsp;" : `<img src="image/sp/640/status_10_${speed}_640.png" />`
  }</div>`;
  const countCells = Object.entries(options.counts ?? COUNTS)
    .map(
      ([key, value]) =>
        `<div class="playDataArea scoreElement">
          <div class="playDataText"><img class="score_name" src="image/sp/640/score_name_${key}_640.png"></div>
          <div class="playDataScore">${value}回</div>
        </div>`,
    )
    .join("");
  return `<div class="scoreUser">
    <div class="contentBox songLisrAreanamco"><ul>
      <li class="songNameTitleScore"><h2 class="songNameFontnamco">${options.title ?? "テスト曲"}</h2></li>
    </ul></div>
    <div class="scoreDetailArea">
      <div>
        <div class="playDataArea option"><!-- #サポート譜面 -->
          <img src="image/sp/640/${options.support ?? "blank_640.gif"}" />
        </div>
        ${codeCells}${speedCell}
        <div class="modeArea"></div>
      </div>
      <div class="playDataArea scoreElement">
        <img class="levelIcon" src="image/sp/640/icon_course02_${options.level ?? 4}_640.png">
        <img class="crownIcon" src="image/sp/640/crown_0${options.crown ?? 3}_640.png">
        ${rank}
        <div class="scoreScore">${options.score ?? "851850点"}</div>
      </div>
      <div class="playDataArea scoreDataArea"><div>
        ${countCells}
        <div style="float: left;"><div class="playDataText"><img class="score_name" src="image/sp/640/blank_640.gif"></div></div>
      </div></div>
    </div>
  </div>`;
}

function page(rows: readonly string[]): string {
  return `<html><body><div id="recentScoreList"><div class="recentScoreThumbList">
    ${rows.join("")}
  </div></div></body></html>`;
}

function firstPlay(html: string) {
  const result = parseRecentPlaysPage(html);
  if (!isOk(result)) {
    throw new Error(`expected a reading, got ${JSON.stringify(result.error)}`);
  }
  const play = result.value[0];
  if (play === undefined) {
    throw new Error("expected a row");
  }
  return play;
}

describe("parseRecentPlaysPage", () => {
  test("a full row carries everything the detail page would", () => {
    const play = firstPlay(page([row({ optionCodes: ["a18"] })]));

    expect(play).toEqual({
      songTitle: "テスト曲",
      level: 4,
      crown: "silver",
      record: {
        scoreRank: 5,
        highScore: 851850,
        good: 618,
        ok: 159,
        bad: 45,
        drumroll: 9,
        maxCombo: 196,
        stageCount: 75,
        clearCount: 23,
        fullComboCount: 0,
        donderfulComboCount: 0,
        options: {
          speed: 1.8,
          doron: false,
          abekobe: false,
          random: "none",
          supportChart: false,
        },
      },
    });
  });

  test("this page numbers its crowns its own way: 02 is gold and 03 is silver", () => {
    expect(firstPlay(page([row({ crown: 2 })])).crown).toBe("gold");
    expect(firstPlay(page([row({ crown: 3 })])).crown).toBe("silver");
    expect(firstPlay(page([row({ crown: 4 })])).crown).toBe("donderful");
  });

  test("no crown on a row that has plays is played, the same shape the detail page has", () => {
    expect(firstPlay(page([row({ crown: 1 })])).crown).toBe("played");
  });

  test("サポート譜面 is read here — the one page that shows it", () => {
    const off = firstPlay(page([row({})]));
    const on = firstPlay(page([row({ support: "status_10_a8_640.png" })]));

    expect(off.record.options.supportChart).toBe(false);
    expect(on.record.options.supportChart).toBe(true);
  });

  test("an ura row is level 5: the level icon says so, the ura badge is decoration", () => {
    expect(firstPlay(page([row({ level: 5 })])).level).toBe(5);
  });

  test("the rows keep the page's order and carry no time of their own", () => {
    const result = parseRecentPlaysPage(
      page([row({ title: "一番新しい" }), row({ title: "その次" })]),
    );

    if (!isOk(result)) {
      throw new Error("expected a reading");
    }
    expect(result.value.map((play) => play.songTitle)).toEqual(["一番新しい", "その次"]);
    // Order is the only recency there is: nothing dated may appear on a play.
    for (const play of result.value) {
      expect(Object.keys(play).sort()).toEqual(["crown", "level", "record", "songTitle"]);
    }
  });

  test("fewer than five rows is a quiet account, not a failure", () => {
    const two = parseRecentPlaysPage(page([row({}), row({})]));
    const none = parseRecentPlaysPage(page([]));

    if (!isOk(two) || !isOk(none)) {
      throw new Error("expected readings");
    }
    expect(two.value).toHaveLength(2);
    expect(none.value).toHaveLength(0);
  });

  test("a page without the list container fails naming it", () => {
    const result = parseRecentPlaysPage("<html><body><p>empty</p></body></html>");

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }
    expect(result.error).toEqual({
      kind: "missingMarker",
      page: "history_recent_score.php",
      marker: "#recentScoreList",
    });
  });

  test("a missing count cell fails naming the label image it looked for", () => {
    const { dondaful_combo: _dropped, ...rest } = COUNTS;

    const result = parseRecentPlaysPage(page([row({ counts: rest })]));

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }
    expect(result.error).toEqual({
      kind: "missingMarker",
      page: "history_recent_score.php",
      marker: 'img[src*="score_name_dondaful_combo"]',
    });
  });

  test("an option code outside the vocabulary fails carrying the src", () => {
    const result = parseRecentPlaysPage(page([row({ optionCodes: ["z9"] })]));

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }
    expect(result.error).toEqual({
      kind: "unreadableValue",
      page: "history_recent_score.php",
      marker: ".playDataArea.option img",
      raw: "image/sp/640/status_10_z9_640.png",
    });
  });

  test("a row with an unranked chart reads no rank rather than guessing one", () => {
    expect(firstPlay(page([row({ rank: null })])).record.scoreRank).toBeNull();
  });

  test("a count cell holding something that is not a count fails carrying the text", () => {
    const broken = page([row({})]).replace(">45回<", ">ー<");

    const result = parseRecentPlaysPage(broken);

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }
    expect(result.error).toEqual({
      kind: "unreadableValue",
      page: "history_recent_score.php",
      marker: ".playDataScore (ng)",
      raw: "ー",
    });
  });

  test("an option row that is no longer five cells fails rather than reading them by position", () => {
    const broken = page([row({})]).replace('<div class="playDataArea option">&nbsp;</div>', "");

    const result = parseRecentPlaysPage(broken);

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }
    expect(result.error).toEqual({
      kind: "unreadableValue",
      page: "history_recent_score.php",
      marker: ".playDataArea.option",
      raw: "4 cells",
    });
  });

  test("a count written with a thousands separator is still a number", () => {
    const withComma = page([row({ score: "1,234,567点" })]);

    expect(firstPlay(withComma).record.highScore).toBe(1234567);
  });
});

describe("scoreFromRecentPlay", () => {
  test("a row becomes a Score once a song number is known", () => {
    const play = firstPlay(page([row({ optionCodes: ["a3"] })]));

    const score = scoreFromRecentPlay(play, "000000000000", "1061", "2026-07-27T00:00:00.000Z");

    expect(score).toEqual({
      taikoNo: "000000000000",
      songNo: "1061",
      level: 4,
      crown: "silver",
      fidelity: "recent",
      record: play.record,
      fetchedAt: "2026-07-27T00:00:00.000Z",
    });
  });
});
