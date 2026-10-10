/** Stand-in for the score lists and detail pages, drawn from the play history's copy of each chart. */
import { COUNTS, GENRE_FONTS, type MockPlay, mockPlay, mockTitle } from "./mock-history";

/** Songs past the last one played, so every list has charts never played. */
const UNPLAYED_SONGS = 3;
/** Song `n` is song number 1000 + n. */
const SONG_NO_BASE = 1000;
const OPTION_SLOTS = 4;

/** The play history's copy, as the score pages read it. */
export interface PlayedCharts {
  songCount(): number;
  bestOf(n: number, level: number): MockPlay | undefined;
}

const genreOf = (n: number) => (n % GENRE_FONTS.length) + 1;
const fontOf = (n: number) => GENRE_FONTS[n % GENRE_FONTS.length] ?? "namco";
/** A song's 裏 is the chart its play is at, when that is level 5. */
const hasUra = (n: number) => mockPlay(n).level === 5;

/** The list's crown and rank picture names, from the history page's crown numbering. */
const LIST_CROWNS: Readonly<Record<number, string>> = {
  1: "played",
  2: "gold",
  3: "silver",
  4: "donderfull",
};
const DETAIL_CROWNS: Readonly<Record<number, number>> = { 1: 0, 2: 2, 3: 1, 4: 3 };

function crownButton(best: MockPlay | undefined): string {
  const name = best === undefined ? "none" : `${LIST_CROWNS[best.crown] ?? "played"}_${best.rank}`;
  return `image/sp/640/crown_button_${name}_640.png`;
}

function songBlocks(n: number, genre: number, played: PlayedCharts): string {
  const songNo = SONG_NO_BASE + n;
  const anchor = (level: number) =>
    `<li><a href="score_detail.php?song_no=${songNo}&level=${level}&genre=${genre}"><img class="crown" src="${crownButton(played.bestOf(n, level))}"></a></li>`;
  const block = (ura: boolean, anchors: string) => `<li class="contentBox songLisrArea${fontOf(n)}">
  <div class="songNameArea${ura ? " ura" : ""} clearfix"><span class="songName songNameFont${fontOf(n)}">${mockTitle(n)}</span></div>
  <div class="buttonArea"><ul>${anchors}</ul></div>
</li>`;
  const own = block(false, [1, 2, 3, 4].map(anchor).join(""));
  return hasUra(n) ? own + block(true, `<li></li><li></li><li></li>${anchor(5)}`) : own;
}

/** Song `n`'s Japan place, none for every fourth song, as for an account that holds none. */
const rankingOf = (n: number) => (n % 4 === 0 ? "---" : String(1000 + n));

/** Every third song has three AI battle sections; an odd one's second, not cleared, has no crown. */
function sectionBlocks(n: number, best: MockPlay): string {
  if (n % 3 !== 0) {
    return "";
  }
  const section = (number: number, crown: number) => `
    <div class="section_lavel"><span>区間${number}</span></div>
    <div class="section_crown">${crown === 0 ? "" : `<img class="crown" src="image/sp/640/crown_large_${crown}_640.png" />`}</div>
    <div class="high_score"><img src="image/sp/640/score_back_0_640.png" /><span>${Math.floor(best.score / 3) + number}点</span></div>
    <div class="good_cnt"><img src="image/sp/640/score_name_good_640.png" /><span>${100 + number}回</span></div>
    <div class="ng_cnt"><img src="image/sp/640/score_name_ng_640.png" /><span>${number - 1}回</span></div>
    <div class="ok_cnt"><img src="image/sp/640/score_name_ok_640.png" /><span>${10 + number}回</span></div>
    <div class="pound_cnt"><img src="image/sp/640/score_name_pound_640.png" /><span>${3 * number}回</span></div>`;
  return `<div class="scoreDetail"><h2 class="subtitleMypage">区間毎詳細成績</h2>
  <div class="scoreDetailTable">${section(1, 2)}${section(2, n % 2 === 0 ? 1 : 0)}${section(3, 2)}</div></div>`;
}

function detailPage(n: number, best: MockPlay): string {
  const counts = COUNTS.map(
    ([key, value]) => `<div class="${key}_cnt"><span>${value}回</span></div>`,
  );
  const codes = best.options.filter((code) => code !== "");
  const images = Array.from({ length: OPTION_SLOTS }, (_, slot) => {
    const code = codes[slot];
    return code === undefined
      ? '<img src="image/sp/640/blank_640.gif">'
      : `<img src="image/sp/640/status_10_${code}_640.png">`;
  });
  return `<div class="scoreDetailArea">
  <img class="crown" src="image/sp/640/crown_large_${DETAIL_CROWNS[best.crown] ?? 0}_640.png">
  <img class="best_score_icon" src="image/sp/640/best_score_rank_${best.rank}_640.png">
  <div class="ranking"><img src="image/sp/640/ranking_all_back_640.png" /><span>${rankingOf(n)}位</span></div>
  <div class="high_score"><span>${best.score}点</span></div>
  ${counts.join("")}
  <div class="optionImage">${images.join("")}</div>
</div>${sectionBlocks(n, best)}`;
}

const NOT_PLAYED = `<div class="error"><div id="error" class="contentBox errorArea">未プレイまたは同期中です。<br>プレイ済みの場合は同期して下さい。</div></div>`;

export function createScorePages(played: PlayedCharts) {
  let failing = "";
  const asked: string[] = [];
  const songs = () =>
    Array.from(
      { length: Math.max(played.songCount() + UNPLAYED_SONGS, 2 * GENRE_FONTS.length) },
      (_, index) => index + 1,
    );

  return {
    /** One genre's `score_list.php`, carrying a form token as Hiroba's does. */
    list(genre: number, ticket: string): string {
      const blocks = songs()
        .filter((n) => genreOf(n) === genre)
        .map((n) => songBlocks(n, genre, played))
        .join("");
      return `<div id="content"><input type="hidden" id="_tckt" name="_tckt" value="${ticket}"><ul>${blocks}</ul></div>`;
    },

    /** One chart's `score_detail.php`, or null for the site's error shell: no such chart, or the
     * one set to fail. */
    detail(songNo: string, level: number): string | null {
      const chart = `${songNo}/${level}`;
      asked.push(chart);
      const n = Number(songNo) - SONG_NO_BASE;
      const listed = songs().includes(n) && (level <= 4 || (level === 5 && hasUra(n)));
      if (chart === failing || !listed) {
        return null;
      }
      const best = played.bestOf(n, level);
      return best === undefined ? NOT_PLAYED : detailPage(n, best);
    },

    /** `/__scores`: a chart whose details fail (`fail=1012/3`, `fail=` for none), and the charts
     * asked so far. */
    control(params: URLSearchParams): unknown {
      if (params.has("fail")) {
        failing = params.get("fail") ?? "";
      }
      if (params.get("forget") === "1") {
        asked.length = 0;
      }
      return { asked: [...asked] };
    },
  };
}
