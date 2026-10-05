/** Stateful stand-in for the two favourite editors, their ajax saves and my page's favourites. */
import { FOLDER_SLOT_COUNT } from "@abth/core";

import { type MockSession, type PostRecord, postRecordOf } from "./mock-costume";
import { escapeHtml } from "./mock-profile";
import { WIKI_SONGS, type WikiGenre, type WikiSong } from "./mock-song-catalogue";

/** The songs Hiroba has: a console-only song and a deleted one are not among them. */
const HIROBA_SONGS: ReadonlyMap<string, WikiSong> = new Map(
  WIKI_SONGS.filter(({ songNo, isDeleted }) => /^\d+$/.test(songNo) && isDeleted === 0).map(
    (song) => [song.songNo, song] as const,
  ),
);

/** The suffix of the `songNameFont` class that Hiroba gives each genre. */
const GENRE_CLASS: Readonly<Record<WikiGenre, string>> = {
  pops: "jpop",
  anime: "anime",
  kids: "kids",
  vocaloid: "vocaloid",
  game: "game",
  namco: "namco",
  variety: "variety",
  classic: "classic",
};

/** A song Hiroba knows but has not unlocked for this player: its own picker leaves it out. */
export const LOCKED_SONG = "1035";

/** The songs Hiroba's own picker offers, each with its 裏 entry where it has an inner chart. */
const PICKABLE_SONGS: readonly WikiSong[] = [...HIROBA_SONGS.values()].filter(
  ({ songNo }) => songNo !== LOCKED_SONG,
);
const hasUra = (song: WikiSong) => song.courses.ura !== null;

/** The picker's genre numbers, and its tabs in its own order by the name in their pictures. */
const GENRE_NUMBER: Readonly<Record<WikiGenre, number>> = {
  pops: 1,
  anime: 2,
  kids: 3,
  vocaloid: 4,
  game: 5,
  namco: 6,
  variety: 7,
  classic: 8,
};
const PICKER_TABS: readonly (readonly [number, string])[] = [
  [1, "jpop"],
  [3, "kids"],
  [2, "anime"],
  [4, "vocaloid"],
  [5, "game"],
  [7, "variety"],
  [8, "classic"],
  [6, "namco"],
];

/** The songs in slots 1 to 6 of the saved folder at the start; two of them share a title. */
const START_FOLDER = ["1001", "1008", "1014", "1020", "1031", "1026"];
const START_FAVORITE_SONG = "1008";
/** Invented: the shape of a 705 here has not been seen, so it has the costume's words. */
const STALE_MESSAGE = "更新に失敗しました。再度画面の読み込みを行ってください。";
const SLOT_PARAMETER = /^song_no_([1-9]\d?)$/;
const UNSET_SPAN = `<span class="songName songNameFont">未設定</span>`;

type Slots = (string | null)[];

export interface FavoritesState {
  /** The saved お気に入り folder: a song number or null for each of its slots. */
  folder: Slots;
  /** The saved 大好きな曲, and whether it is the song's 裏 entry. */
  favoriteSong: string | null;
  favoriteSongUra: boolean;
  /** What the editor holds and the save posts; Hiroba keeps it for the session. */
  staging: Slots;
  /** Whether `init=1` loads the saved folder into the staging. */
  initStages: boolean;
  /** Whether staging an empty value empties that slot. */
  emptyClears: boolean;
}

const emptySlots = (): Slots => Array.from({ length: FOLDER_SLOT_COUNT }, () => null);

const startState = (): FavoritesState => ({
  folder: emptySlots().map((_, index) => START_FOLDER[index] ?? null),
  favoriteSong: START_FAVORITE_SONG,
  favoriteSongUra: false,
  staging: emptySlots(),
  initStages: true,
  emptyClears: true,
});

const songOf = (songNo: string | null): WikiSong | undefined =>
  songNo === null ? undefined : HIROBA_SONGS.get(songNo);

function songSpan(song: WikiSong | undefined, inside = ""): string {
  if (song === undefined) {
    return UNSET_SPAN;
  }
  const genre = song.genre[0];
  const suffix = genre === undefined ? "" : GENRE_CLASS[genre];
  return `<span class="songName songNameFont${suffix}">${escapeHtml(song.title)}${inside}</span>`;
}

const slotInput = (slot: number, songNo: string) =>
  `<input type="hidden" id="song_no_${slot}" name="song_no_${slot}" value="${songNo}">`;

function slotMarkup(slot: number, song: WikiSong | undefined): string {
  return song === undefined
    ? `${UNSET_SPAN}${slotInput(slot, "")}`
    : songSpan(song, slotInput(slot, song.songNo));
}

function slotOf(parameter: string): number | null {
  const slot = Number(SLOT_PARAMETER.exec(parameter)?.[1]);
  return slot >= 1 && slot <= FOLDER_SLOT_COUNT ? slot : null;
}

function flagOf(value: string | null): boolean | undefined {
  return value === "1" || value === "0" ? value === "1" : undefined;
}

export interface FavoritesEditorOptions {
  /** The costume editor's issuer: one token per session serves every page. */
  readonly issue: (session: MockSession) => string;
}

export function createFavoritesEditor({ issue }: FavoritesEditorOptions) {
  let state = startState();
  const posts: PostRecord[] = [];
  /** The sessions whose picker the handoff opened. */
  const pickerOpen = new WeakSet<MockSession>();
  const offers = (songNo: string, ura: boolean) =>
    PICKABLE_SONGS.some((song) => song.songNo === songNo && (!ura || hasUra(song)));

  const isStale = (session: MockSession, form: URLSearchParams) =>
    session.ticket === undefined || form.get("_tckt") !== session.ticket;
  const stale = () => Response.json({ result: 705, errmsg: STALE_MESSAGE });

  /** Before it answers, a GET of the folder editor loads the saved folder or stages a lone slot. */
  function stage(params: URLSearchParams): void {
    if (params.get("init") === "1") {
      if (state.initStages) {
        state.staging = [...state.folder];
      }
      return;
    }
    const [only, ...others] = [...params].flatMap(([name, value]) => {
      const slot = slotOf(name);
      return slot === null ? [] : [{ slot, value }];
    });
    if (only === undefined || others.length > 0 || params.get("session_flg") !== "1") {
      return;
    }
    if (only.value === "") {
      if (state.emptyClears) {
        state.staging[only.slot - 1] = null;
      }
    } else if (HIROBA_SONGS.has(only.value)) {
      state.staging[only.slot - 1] = only.value;
    }
  }

  return {
    myPageBlocks(ticket: string): string {
      const { favoriteSong, folder } = state;
      const titles = folder.flatMap((songNo) => {
        const song = songOf(songNo);
        return song === undefined ? [] : [`<li>${songSpan(song)}</li>`];
      });
      return `<div class="favoriteSong"><h2 class="subtitleMypage">大好きな曲</h2><div class="mypageInfoArea">
  <ul id="songList"><li><div class="name">${songSpan(songOf(favoriteSong))}</div></li></ul>
  <input type="hidden" name="song_no" id="song_no" value="${favoriteSong ?? ""}">
  <input type="hidden" id="_tckt" name="_tckt" value="${ticket}" /></div></div>
<div class="favoriteSong"><h2 class="subtitleMypage">お気に入りの曲</h2><div class="mypageInfoArea">
  <ul id="songList">${titles.join("")}</ul></div></div>`;
    },

    folderPage(session: MockSession, params: URLSearchParams): string {
      stage(params);
      // `init=1` shows the saved folder whether or not it staged it: that page is what is captured.
      const shown = params.get("init") === "1" ? state.folder : state.staging;
      const slots = shown.map((songNo, index) => slotMarkup(index + 1, songOf(songNo)));
      return `<h2 class="subtitleMypage">「お気に入り」フォルダの設定</h2>
${slots.join("\n")}
<input type="hidden" id="_tckt" name="_tckt" value="${issue(session)}">`;
    },

    favoriteSongPage(session: MockSession): string {
      const { favoriteSong } = state;
      return `<h2 class="subtitleMypage">「大好きな曲」の設定</h2>
${songSpan(songOf(favoriteSong))}
<input type="hidden" name="song_no" id="song_no" value="${favoriteSong ?? ""}">
<input type="hidden" name="bsf" id="bsf" value="${favoriteSong === null ? "" : state.favoriteSongUra ? 1 : 0}">
<input type="hidden" id="_tckt" name="_tckt" value="${issue(session)}">`;
    },

    /** The handoff the 大好きな曲 editor's button sends; it opens the picker for the session. */
    enterPicker(session: MockSession, params: URLSearchParams): boolean {
      const opens =
        params.get("from") === "/portal_favorite_song_select.php" &&
        params.get("list_type") === "song" &&
        params.get("_tckt") === session.ticket;
      if (opens) {
        pickerOpen.add(session);
      } else {
        pickerOpen.delete(session);
      }
      return opens;
    },

    /** One genre of the picker, or null when no handoff opened it for the session. */
    pickerPage(session: MockSession, genre: number): string | null {
      if (!pickerOpen.has(session)) {
        return null;
      }
      const tabs = PICKER_TABS.map(
        ([tab, name]) =>
          `<li><a href="/select_song.php?genre=${tab}"><img src="image/sp/640/genre_tab_new_${name}_${tab === genre ? "on" : "off"}_640.png" alt="" /></a></li>`,
      );
      const rows = PICKABLE_SONGS.filter((song) =>
        song.genre.some((one) => GENRE_NUMBER[one] === genre),
      ).flatMap((song) => {
        const row = (ura: boolean) =>
          `<li class="contentBox clearfix"><div class="songNameArea${ura ? " ura" : ""}"><a href="/portal_favorite_song_select.php?song_no=${song.songNo}&session_flg=1&bsf=${ura ? 1 : 0}">${songSpan(song)}</a></div></li>`;
        return hasUra(song) ? [row(false), row(true)] : [row(false)];
      });
      return `<ul class="tabList clearfix tabMenu" id="tabList">${tabs.join("")}</ul>
<ul id="songList"><div id="tab-genre" class="clearfix">${rows.join("")}</div></ul>`;
    },

    record(
      path: string,
      request: Request,
      form: URLSearchParams,
      session: MockSession | undefined,
    ) {
      posts.push(postRecordOf(path, request, form, session));
    },

    /** Saves what the editor holds; the body counts only for its token, as Hiroba seems to do. */
    saveFolder(session: MockSession, form: URLSearchParams): Response {
      if (isStale(session, form)) {
        return stale();
      }
      session.ticket = undefined;
      state.folder = [...state.staging];
      state.staging = emptySlots();
      return Response.json({ result: 0, errmsg: "更新しました。" });
    },

    saveFavoriteSong(session: MockSession, form: URLSearchParams): Response {
      if (isStale(session, form)) {
        return stale();
      }
      session.ticket = undefined;
      const songNo = form.get("song_no");
      const ura = form.get("bsf") === "1";
      if (songNo === "") {
        state.favoriteSong = null;
        state.favoriteSongUra = false;
      } else if (songNo !== null && offers(songNo, ura)) {
        state.favoriteSong = songNo;
        state.favoriteSongUra = ura;
      } else {
        return Response.json({ result: 1 });
      }
      return Response.json({ result: 0 });
    },

    /** A test hook's answer, or null when the path is none of the favourites' hooks. */
    hook(pathname: string, params: URLSearchParams): Response | null {
      switch (pathname) {
        case "/__favorites":
          if (params.get("reset") === "1") {
            state = startState();
          }
          state.initStages = flagOf(params.get("initStages")) ?? state.initStages;
          state.emptyClears = flagOf(params.get("emptyClears")) ?? state.emptyClears;
          return Response.json(state);
        case "/__favorites-posts":
          if (params.get("reset") === "1") {
            posts.length = 0;
          }
          return Response.json(posts);
        default:
          return null;
      }
    },
  };
}

export type FavoritesEditor = ReturnType<typeof createFavoritesEditor>;
