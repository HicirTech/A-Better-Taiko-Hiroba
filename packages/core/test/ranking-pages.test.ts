/**
 * Excerpts, not captured pages — see README.md for why. Two shapes matter here and both are
 * reproduced faithfully: a row keeps the player's name and their score in the *same* block, and the
 * list page packs the prefecture into the same hidden value that carries the scope.
 */
import { describe, expect, test } from "bun:test";

import { isErr, parseRankDetailPage, parseRankListPage } from "../src/index";

const TAIKO_NO = "000000000000";
const STALENESS = "前日までのランキングです。本日のプレイ結果は明日反映されるよ。";

interface RowOptions {
  position: number;
  name: string;
  score: number;
  /** The anchor appears exactly when that player's profile is open. */
  withDetailLink?: boolean;
}

function entry({ position, name, score, withDetailLink = false }: RowOptions): string {
  const more = withDetailLink
    ? `<a href="./score_detail.php?song_no=1061&level=5&taiko_no=${TAIKO_NO}">more</a>`
    : "";
  return `<li class="rankingDetailChild">
    <div class="rankingDetailRank"><span>${position}位</span></div>
    <div class="rankingDetailMydon">
      <a href="./user_profile.php?taiko_no=${TAIKO_NO}">
        <img src="https://img.taiko-p.jp/imgsrc.php?v=&kind=mydon&fn=mydon_${TAIKO_NO}">
      </a>
    </div>
    <div class="rankingDetailScore"><span> ${name} </span><br>${score}点<br></div>
    <div class="rankingDetailMore">${more}</div>
  </li>`;
}

interface DetailOptions {
  rank?: string;
  rows?: string[];
  /** Both arrows are always emitted; the anchor is dropped from the one leading nowhere. */
  previous?: number | null;
  next?: number | null;
  empty?: boolean;
}

function detail(options: DetailOptions = {}): string {
  const { rank = "1", rows = [entry({ position: 1, name: "サンプル一", score: 1015360 })] } =
    options;
  const { previous = null, next = 2, empty = false } = options;
  const arrow = (page: number | null, label: string) =>
    page === null
      ? `<li class="arrow ${label}"></li>`
      : `<li class="arrow ${label}"><a href="rank_detail.php?rank=${rank}&area=26&song_no=1061&level=5&page=${page}">${label}</a></li>`;

  return `<!DOCTYPE html><html><body>
    <input type="hidden" id="rank" value="${rank}">
    <div class="songNameBoxjpop"><h2 class="songNameFontjpop">サンプル曲アルファ</h2></div>
    <img src="image/sp/640/icon_course02_5_640.png"><img src="image/sp/640/icon_ura_640.png">
    <p>${STALENESS}</p>
    ${
      empty
        ? `<div id="error" class="contentBox errorArea">ランキングデータがありません</div>`
        : `<ul class="rankingDetailArea">${rows.join("")}</ul>`
    }
    <ul class="pager">${arrow(previous, "left")}${arrow(next, "right")}</ul>
  </body></html>`;
}

function list(rank: string): string {
  const song = (title: string, songNo: number, levels: number[]) => `
    <li class="contentBox songLisrAreajpop devil">
      <div class="songNameArea"><span class="songName songNameFontjpop">${title}</span></div>
      <div class="buttonArea levelSelect"><ul class="buttonList">
        ${levels
          .map((level) => {
            return `<li><a href="rank_detail.php?song_no=${songNo}&level=${level}&genre=1&taiko_no=${TAIKO_NO}&rank=${rank}"><img class="crown" src="status_10_b4_640.png"></a></li>`;
          })
          .join("")}
      </ul></div>
    </li>`;
  return `<!DOCTYPE html><html><body>
    <input type="hidden" id="rank" value="${rank}">
    <ul>${song("サンプル曲アルファ", 1515, [1, 2, 3, 4])}${song("サンプル曲ベータ", 1516, [4, 5])}</ul>
  </body></html>`;
}

function detailOrThrow(html: string) {
  const result = parseRankDetailPage(html);
  if (isErr(result)) {
    throw new Error(`expected a reading, got ${JSON.stringify(result.error)}`);
  }
  return result.value;
}

function listOrThrow(html: string) {
  const result = parseRankListPage(html);
  if (isErr(result)) {
    throw new Error(`expected a reading, got ${JSON.stringify(result.error)}`);
  }
  return result.value;
}

describe("parseRankDetailPage", () => {
  test("reads position, player name and score out of a row", () => {
    const reading = detailOrThrow(
      detail({
        rows: [
          entry({ position: 1, name: "サンプル一", score: 1015360, withDetailLink: true }),
          entry({ position: 2, name: "サンプル二", score: 1008420 }),
        ],
      }),
    );

    expect(reading.entries).toHaveLength(2);
    expect(reading.entries[0]).toMatchObject({
      position: 1,
      playerName: "サンプル一",
      score: 1015360,
      taikoNo: TAIKO_NO,
    });
    // The name and the score share one block; reading it whole would give "サンプル一 1015360点".
    expect(reading.entries[1]?.playerName).toBe("サンプル二");
    expect(reading.entries[1]?.score).toBe(1008420);
  });

  test("the more-link is present only for a player whose profile is open", () => {
    const reading = detailOrThrow(
      detail({
        rows: [
          entry({ position: 1, name: "サンプル一", score: 1, withDetailLink: true }),
          entry({ position: 2, name: "サンプル二", score: 1 }),
        ],
      }),
    );

    expect(reading.entries[0]?.detailUrl).toContain("score_detail.php");
    // The div is always emitted; only the anchor inside it is optional.
    expect(reading.entries[1]?.detailUrl).toBeNull();
  });

  test("the three tables are told apart, and cannot be conflated", () => {
    expect(detailOrThrow(detail({ rank: "1" })).scope).toBe("japan");
    expect(detailOrThrow(detail({ rank: "2" })).scope).toBe("prefecture");
    expect(detailOrThrow(detail({ rank: "3" })).scope).toBe("world");
  });

  test("carries the site's daily-staleness warning out of the parser", () => {
    expect(detailOrThrow(detail()).stalenessNotice).toBe(STALENESS);
  });

  test("says which chart the table is for, which the rows never do", () => {
    const reading = detailOrThrow(detail());

    // `.songName` does not exist on this page — the title is an h2 in div.songNameBox<genre>.
    expect(reading.songTitle).toBe("サンプル曲アルファ");
    expect(reading.level).toBe(5);
  });

  test("reads the pager in both directions, and the missing anchor is the end", () => {
    const first = detailOrThrow(detail({ previous: null, next: 2 }));
    const middle = detailOrThrow(detail({ previous: 895, next: 897 }));
    const last = detailOrThrow(detail({ previous: 3, next: null }));

    expect(first).toMatchObject({ previousPage: null, nextPage: 2 });
    expect(middle).toMatchObject({ previousPage: 895, nextPage: 897 });
    expect(last).toMatchObject({ previousPage: 3, nextPage: null });
  });

  test("a chart nobody has ranked is a reading, not the error page", () => {
    const reading = detailOrThrow(detail({ empty: true, next: null }));

    expect(reading.entries).toHaveLength(0);
    expect(reading.notice).toBe("ランキングデータがありません");
    // Still a ranking page: the scope and the warning survive.
    expect(reading.scope).toBe("japan");
    expect(reading.stalenessNotice).toBe(STALENESS);
  });

  test("a bad parameter is the site's error page, not a missing marker", () => {
    const shell = `<html><body><h1>エラー</h1><table><tr><td>パラメータが不正です。</td></tr></table></body></html>`;
    const result = parseRankDetailPage(shell);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("siteError");
    }
  });

  test("reads the prefecture back from the page rather than trusting the request", () => {
    // `area=0` is rewritten by the server to the caller's own prefecture, so what was asked for is
    // not what was served.
    expect(detailOrThrow(detail({ rank: "2" })).area).toBe(26);
  });
});

describe("parseRankListPage", () => {
  test("offers each chart's ranking link so a caller builds no URLs", () => {
    const reading = listOrThrow(list("1"));

    expect(reading.songs).toHaveLength(2);
    expect(reading.songs[0]?.title).toBe("サンプル曲アルファ");
    expect(Object.keys(reading.songs[0]?.chartUrls ?? {})).toEqual(["1", "2", "3", "4"]);
    expect(reading.songs[0]?.chartUrls[3]).toContain("song_no=1515&level=3");
    // An ura chart is level 5 and gets its own link.
    expect(reading.songs[1]?.chartUrls[5]).toContain("level=5");
  });

  test("the list packs the prefecture into the same value that carries the scope", () => {
    // `rank_detail.php` writes `2`; `rank_list.php` writes `226` — scope 2, area 26. A straight
    // lookup of the whole string finds nothing and refuses a page that is perfectly readable.
    const reading = listOrThrow(list("226"));

    expect(reading.scope).toBe("prefecture");
    expect(listOrThrow(list("1")).scope).toBe("japan");
  });

  test("refuses a value whose first character is not a scope", () => {
    const result = parseRankListPage(list("9"));

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("unreadableValue");
    }
  });
});
