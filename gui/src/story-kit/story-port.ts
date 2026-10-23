import { type ChartDensity, err, ok, tjaDensities } from "@abth/core";

import { MISSING_CHART, standInTja } from "../../scripts/mock-ese";
import { chartPicturePng } from "../../scripts/mock-pictures";
import { CHART_PICTURE_PATHS, WIKI_SONGS, type WikiSong } from "../../scripts/mock-song-catalogue";
import { LEVEL_DIFFICULTY } from "../favorites/genre-look";
import type { PipelineView } from "../pipelines/pipeline-view";
import type {
  HirobaSessionPort,
  PictureView,
  PipelinesView,
  TitleEditorView,
  WriteOutcomeView,
} from "../session-port";
import { DIFFICULTIES, type Difficulty, type SongDensityRead } from "../song-catalogue/types";
import { portraitOf, STORY_EDITOR, STORY_HISTORY } from "./costume";
import { STORY_PICKABLE, storyFavorites } from "./favorites";
import { packData, packView } from "./pack";
import { pictureOf } from "./picture-of";
import { PAGE_PLAYS } from "./plays";
import { PAGE_PROFILE, STORY_PROFILE } from "./profile";
import { PAGE_LISTED, PAGE_RATING_DATA, PAGE_SCORES } from "./scores";
import { PAGE_SONGS } from "./songs";
import { storyView } from "./story-pictures";

/** Titles the made-up player owns: two share a name, as some of Hiroba's do. */
export const STORY_TITLES: TitleEditorView = {
  state: { title: STORY_PROFILE.title },
  options: [
    { id: 101, label: STORY_PROFILE.title },
    { id: 102, label: "太鼓の達人" },
    { id: 103, label: "ドンだー見習い" },
    { id: 104, label: "フルコンボの鬼" },
    { id: 105, label: "フルコンボの鬼" },
    { id: 106, label: "全良 マスター" },
  ],
};

const SAVE = { answer: "json", code: 0, message: null, report: "status=200 code=0" } as const;

/** A write Hiroba took: the set read back is the one wanted. */
const applied = <S>(before: S, after: S): WriteOutcomeView<S> => ({
  kind: "applied",
  before,
  after,
  save: SAVE,
  cross: "off",
});

const NEVER = new Promise<never>(() => {});

/** An answer that comes after a short while, as one over a network does. */
const later = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), 300));

// The resource pack's taiko.wiki list as it came: the stand-in draws its charts' TJA from it.
const PACK_WIKI_SONGS: readonly WikiSong[] = JSON.parse(packData("songCatalogue") ?? "[]");

/** A song as taiko.wiki lists it: the stand-in's, else the pack's. */
const wikiSong = (songNo: string) =>
  WIKI_SONGS.find((song) => song.songNo === songNo) ??
  PACK_WIKI_SONGS.find((song) => song.songNo === songNo);

interface PictureAt {
  readonly songNo: string;
  readonly difficulty: Difficulty;
  readonly at: number;
}

let pagePictures: ReadonlyMap<string, PictureAt> | null = null;

/** Where a page's song list names a chart picture's address: song, difficulty and place. */
function pagePictureAt(url: string): PictureAt | undefined {
  pagePictures ??= new Map(
    PAGE_SONGS.flatMap((song) =>
      DIFFICULTIES.flatMap((difficulty) =>
        (song.charts[difficulty]?.images ?? []).map((image, at): [string, PictureAt] => [
          image,
          { songNo: song.songNo, difficulty, at },
        ]),
      ),
    ),
  );
  return pagePictures.get(url);
}

function densities(text: string): SongDensityRead {
  const read: Partial<Record<Difficulty, ChartDensity>> = {};
  for (const [level, density] of tjaDensities(text)) {
    read[LEVEL_DIFFICULTY[level]] = density;
  }
  return read;
}

/** The density of each chart of a stand-in song, as its details read it from the stand-in's TJA. */
export function storyDensity(songNo: string): SongDensityRead {
  const song = wikiSong(songNo);
  return song === undefined ? {} : densities(standInTja(song));
}

const group = (operation: string, ago: number, now: number, subject?: string) => ({
  operation,
  ...(subject === undefined ? {} : { subject }),
  kind: "read" as const,
  startedAt: now - ago - 400,
  endedAt: now - ago,
  requests: 1,
});

/** What each pipeline runs and has run, as of `now`. */
function pipelinesAt(now: number): PipelinesView {
  const running = (id: number, operation: string, path: string, subject?: string) => ({
    id,
    operation,
    ...(subject === undefined ? {} : { subject }),
    kind: "read" as const,
    askedAt: now - 900,
    startedAt: now - 600,
    sent: [{ method: "GET" as const, path }],
    expectedRequests: 1,
  });
  const quiet: PipelineView = { running: [], waiting: [], ended: [] };
  return {
    io: {
      running: [running(1, "openFavorites", "/favorite_song_select.php")],
      waiting: [{ ...running(2, "openTitleEditor", "/title_edit.php"), startedAt: null, sent: [] }],
      ended: [
        { ...group("readProfile", 4_000, now), outcome: "succeeded" },
        {
          ...group("refreshHiroba", 6_000, now),
          outcome: "failed",
          code: "maintenance",
          at: { index: 1, request: { method: "POST", path: "/ajax/update_score.php" } },
        },
      ],
    },
    pictures: {
      ...quiet,
      ended: [
        { ...group("picture", 3_000, now, "myDon"), outcome: "succeeded" },
        { ...group("picture", 3_200, now, "costumeItem"), outcome: "succeeded" },
      ],
    },
    history: {
      ...quiet,
      running: [running(3, "recentPlaysPage", "/history_recent_score.php", "2")],
    },
    scores: {
      ...quiet,
      ended: [{ ...group("scoreDetail", 9_000, now, "1005/4"), outcome: "succeeded" }],
    },
    external: {
      ...quiet,
      ended: [
        { ...group("readSongCatalogue", 12_000, now), outcome: "succeeded" },
        {
          ...group("chartDensity", 15_000, now, "1003"),
          outcome: "failed",
          code: "noChart",
          at: null,
        },
      ],
    },
  };
}

/** The charts the page drew and kept, as a device keeps them until a song is read again. */
const drawn = new Map<string, PictureView>();

/** The pictures and charts a song's details read: the stand-in's, with no session and no site. */
export const STORY_CHART_PORT = {
  readChartPicture: (url: string) => {
    const at = CHART_PICTURE_PATHS.indexOf(new URL(url).pathname);
    if (at >= 0) {
      return later(ok(pictureOf(chartPicturePng(at))));
    }
    // A chart of the pack's song list: the pack's picture of it, else one the stand-in draws.
    const page = pagePictureAt(url);
    return later(
      page === undefined
        ? err({ code: "chartPicture=notFound status=404" })
        : ok(
            packView(`chartPicture/${page.songNo}/${page.difficulty}/${page.at}`) ??
              pictureOf(chartPicturePng(page.at % CHART_PICTURE_PATHS.length)),
          ),
    );
  },
  readChartDensity: (songNo: string) => {
    const song = wikiSong(songNo);
    return later(
      song === undefined || songNo === MISSING_CHART
        ? err({ code: "noChart" as const })
        : ok(densities(standInTja(song))),
    );
  },
  readChartTja: (songNo: string) => {
    const song = wikiSong(songNo);
    return later(
      song === undefined || songNo === MISSING_CHART
        ? err({ code: "noChart" as const })
        : ok(standInTja(song)),
    );
  },
  readDrawnChart: (songNo: string, difficulty: Difficulty): Promise<PictureView | null> =>
    Promise.resolve(drawn.get(`${songNo}/${difficulty}`) ?? null),
  keepDrawnChart: (songNo: string, difficulty: Difficulty, png: Uint8Array) => {
    drawn.set(`${songNo}/${difficulty}`, pictureOf(png));
    return Promise.resolve();
  },
} satisfies Pick<
  HirobaSessionPort,
  "readChartPicture" | "readChartDensity" | "readChartTja" | "readDrawnChart" | "keepDrawnChart"
>;

/** A port answering every verb from story data, taking every write; `changes` replace verbs. */
export function createStoryPort(changes: Partial<HirobaSessionPort> = {}): HirobaSessionPort {
  let signedIn = true;
  const port: HirobaSessionPort = {
    isSignedIn: () => Promise.resolve(signedIn),
    signIn: () => {
      signedIn = true;
      return later({ kind: "signedIn" });
    },
    cancelSignIn: () => Promise.resolve(),
    readProfile: () => later(ok(PAGE_PROFILE)),
    refreshHiroba: () => later(ok(undefined)),
    signOut: () => {
      signedIn = false;
      return Promise.resolve();
    },
    openCostumeEditor: () => later(ok(STORY_EDITOR)),
    openTitleEditor: () => later(ok(packData("titleEditor") ?? STORY_TITLES)),
    previewCostume: (set) => later(ok(portraitOf(set))),
    readPicture: (want) => Promise.resolve(ok(storyView(want))),
    changeCostume: ({ expected, target }) => later(applied(expected, target)),
    changeTitle: ({ expected, target }) => later(applied(expected, { title: target.title })),
    changeName: ({ expected, target }) => later(applied(expected, target)),
    costumeHistory: () => Promise.resolve(STORY_HISTORY),
    readUpdateFeed: () => Promise.resolve(err({ code: "notConfigured" })),
    openFavorites: () => later(ok(packData("favorites") ?? storyFavorites())),
    changeFolder: ({ expected, target }) =>
      later(
        applied(expected, {
          slots: expected.slots.map((_, at) => target[at] ?? null),
        }),
      ),
    changeFavoriteSong: ({ expected, target }) => later(applied(expected, target)),
    readSongPicker: () =>
      later(
        ok({
          songs: [...(STORY_PICKABLE.offered?.songs ?? [])],
          ura: [...(STORY_PICKABLE.offered?.ura ?? [])],
        }),
      ),
    recentPlays: () => Promise.resolve(PAGE_PLAYS),
    readRecentPlays: () =>
      later(ok({ plays: PAGE_PLAYS, fresh: [], pagesFetched: 1, stop: "known" })),
    readEveryRecentPlay: () =>
      later(ok({ plays: PAGE_PLAYS, fresh: [], pagesFetched: 10, stop: "short" })),
    recentPlaysProgress: () => Promise.resolve(null),
    scores: () => Promise.resolve(PAGE_SCORES),
    listedCharts: () => Promise.resolve(PAGE_LISTED),
    readScores: () => later(ok({ ...PAGE_SCORES, detailed: 0 })),
    readEveryScore: () => later(ok({ ...PAGE_SCORES, detailed: PAGE_SCORES.scores.length })),
    readSongScores: () => later(ok({ ...PAGE_SCORES, detailed: 1 })),
    scoresProgress: () => Promise.resolve(null),
    readSongCatalogue: () => later(ok({ songs: PAGE_SONGS, removed: [], sentAt: Date.now() })),
    readChineseNames: () => later(ok({ pages: [], sentAt: Date.now() })),
    readRatingData: () => later(ok({ text: PAGE_RATING_DATA, sentAt: Date.now() })),
    ...STORY_CHART_PORT,
    readPipelines: () => Promise.resolve(pipelinesAt(Date.now())),
    ...changes,
  };
  return port;
}

/** A verb that never answers, for a page that waits. */
export const neverAnswers = () => NEVER;
