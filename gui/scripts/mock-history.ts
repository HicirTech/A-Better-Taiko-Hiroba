/** Stateful stand-in for the play history and the ↻: what is played shows after a refresh. */
import type { MockSession } from "./mock-costume";

/** Five rows a page; past its last page, Hiroba answers page 1 again. */
const PAGE_SIZE = 5;
const LAST_PAGE = 200;

/** The counts each row prints, by the name of their label picture; every value is invented. */
export const COUNTS = [
  ["good", 400],
  ["ok", 30],
  ["ng", 2],
  ["pound", 9],
  ["combo", 120],
  ["stage", 3],
  ["clear", 2],
  ["full_combo", 0],
  ["dondaful_combo", 0],
] as const;

/** The title fonts, in Hiroba's genre numbering: index 0 is genre 1. */
export const GENRE_FONTS = [
  "jpop",
  "anime",
  "kids",
  "vocaloid",
  "game",
  "namco",
  "variety",
  "classic",
];

export interface MockPlay {
  readonly title: string;
  readonly score: number;
  /** 1 to 5, the course. */
  readonly level: number;
  /** The title's font class, which names the genre. */
  readonly font: string;
  /** The page's crown number: 1 none, 2 gold, 3 silver, 4 donderful. */
  readonly crown: number;
  readonly rank: number;
  /** The codes of the random, abekobe, doron and speed cells, "" for an empty one. */
  readonly options: readonly [string, string, string, string];
  readonly support: boolean;
}

export const mockTitle = (n: number) => `サンプル曲 ${n}`;

/** The `n`th chart played in the stand-in's life; some with options, as Hiroba draws them. */
export const mockPlay = (n: number): MockPlay => ({
  title: mockTitle(n),
  score: 800000 + n,
  level: 1 + (n % 5),
  font: GENRE_FONTS[n % GENRE_FONTS.length] ?? "namco",
  crown: n % 7 === 0 ? 1 : 2 + (n % 3),
  rank: 2 + (n % 7),
  options: [n % 6 === 0 ? "a6" : "", "", n % 4 === 0 ? "a1" : "", n % 4 === 0 ? "a15" : ""],
  support: n % 10 === 3,
});

// Hiroba's picture of the support chart was never captured: any but the blank one reads as on.
const SUPPORT_ON = "image/sp/640/support_640.png";

function rowOf(play: MockPlay): string {
  const option = (inner: string) => `<div class="playDataArea option">${inner}</div>`;
  const status = (code: string) =>
    option(code === "" ? "&nbsp;" : `<img src="image/sp/640/status_10_${code}_640.png" />`);
  const support = play.support ? SUPPORT_ON : "image/sp/640/blank_640.gif";
  const counts = COUNTS.map(
    ([key, value]) => `<div class="playDataArea scoreElement">
      <div class="playDataText"><img class="score_name" src="image/sp/640/score_name_${key}_640.png"></div>
      <div class="playDataScore">${value}回</div></div>`,
  ).join("");
  return `<div class="scoreUser">
  <div class="contentBox songLisrAreanamco"><ul>
    <li class="songNameTitleScore"><h2 class="songNameFont${play.font}">${play.title}</h2></li>
  </ul></div>
  <div class="scoreDetailArea">
    <div>${option(`<img src="${support}" />`)}${play.options.map(status).join("")}</div>
    <div class="playDataArea scoreElement">
      <img class="levelIcon" src="image/sp/640/icon_course02_${play.level}_640.png">
      <img class="crownIcon" src="image/sp/640/crown_0${play.crown}_640.png">
      <img class="crownIcon" src="image/sp/640/best_score_rank_${play.rank}_640.png">
      <div class="scoreScore">${play.score}点</div>
    </div>
    <div class="playDataArea scoreDataArea"><div>${counts}</div></div>
  </div>
</div>`;
}

/** One page of `history_recent_score.php` showing `plays`, the newest first. */
export function recentPlaysPage(plays: readonly MockPlay[]): string {
  const rows = plays.map(rowOf).join("");
  return `<div id="recentScoreList"><div class="recentScoreThumbList">${rows}</div></div>`;
}

export function createPlayHistory() {
  /** Hiroba's copy, newest first. */
  const shown: MockPlay[] = [];
  /** Played since Hiroba's last refresh, newest first: Hiroba shows none of it yet. */
  const pending: MockPlay[] = [];
  let made = 0;
  let refreshAnswer = 0;
  let refreshes = 0;
  let failingPage = 0;
  let releasePages: (() => void) | null = null;
  let pagesHeld: Promise<void> = Promise.resolve();
  const asked: number[] = [];
  const replays = new Map<number, number>();

  const playAt = (into: MockPlay[], count: number) => {
    for (let one = 0; one < count; one += 1) {
      made += 1;
      into.unshift(mockPlay(made));
    }
  };
  // A replay scores higher and clears gold, so the chart's record moves.
  const playAgain = (n: number): MockPlay => {
    const times = (replays.get(n) ?? 0) + 1;
    replays.set(n, times);
    const first = mockPlay(n);
    return { ...first, score: first.score + 1000 * times, crown: 2 };
  };
  // Hiroba lists each chart once, at its newest play.
  const keepNewest = () => {
    const seen = new Set<string>();
    const newest = shown.filter((play) => {
      const chart = `${play.title}/${play.level}`;
      const first = !seen.has(chart);
      seen.add(chart);
      return first;
    });
    shown.splice(0, shown.length, ...newest);
  };

  return {
    /** One page's rows, or null for the page set to fail; held while `/__history?hold=1`. */
    async page(asking: number): Promise<string | null> {
      asked.push(asking);
      await pagesHeld;
      if (asking === failingPage) {
        return null;
      }
      const page = asking > LAST_PAGE ? 1 : asking;
      const start = (page - 1) * PAGE_SIZE;
      return recentPlaysPage(shown.slice(start, start + PAGE_SIZE));
    },

    /** The ↻: only with the last token issued does Hiroba take in what was played since. */
    refresh(session: MockSession, form: URLSearchParams, backUrl: string): unknown {
      if (session.ticket === undefined || form.get("_tckt") !== session.ticket) {
        return { result: 705 };
      }
      if (refreshAnswer !== 0) {
        return { result: refreshAnswer };
      }
      refreshes += 1;
      shown.unshift(...pending.splice(0));
      keepNewest();
      return { result: 0, back_url: backUrl };
    },

    /** How many songs the plays have named so far: `サンプル曲 1` up. */
    songCount: () => made,

    /** Hiroba's copy of song `n`'s chart at `level`: its newest play, or none. */
    bestOf: (n: number, level: number): MockPlay | undefined =>
      shown.find((play) => play.title === mockTitle(n) && play.level === level),

    /** `/__history`: plays shown at once or after a refresh, the refresh's answer, a page to fail. */
    control(params: URLSearchParams): unknown {
      const count = (name: string) => Number(params.get(name) ?? "0");
      playAt(shown, count("shown"));
      playAt(pending, count("play"));
      if (params.has("replay")) {
        pending.unshift(playAgain(count("replay")));
      }
      if (params.has("refresh")) {
        refreshAnswer = count("refresh");
      }
      if (params.has("fail")) {
        failingPage = count("fail");
      }
      if (params.get("hold") === "1" && releasePages === null) {
        pagesHeld = new Promise((resolve) => {
          releasePages = resolve;
        });
      } else if (params.get("hold") === "0") {
        releasePages?.();
        releasePages = null;
        pagesHeld = Promise.resolve();
      }
      if (params.get("forget") === "1") {
        asked.length = 0;
      }
      return { shown: shown.length, pending: pending.length, refreshes, asked: [...asked] };
    },
  };
}
