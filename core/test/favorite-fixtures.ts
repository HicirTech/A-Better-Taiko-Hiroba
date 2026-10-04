// Made-up favourite pages in the shape of the real ones: a filled slot keeps its input inside the
// title's span, an empty one beside a 未設定 span.
import {
  FOLDER_SLOT_COUNT,
  type Transport,
  type TransportPost,
  type TransportRequest,
} from "../src/index";
import { type Answer, answer, type SaveBehaviour } from "./profile-fixtures";

export const TOKEN = "0123456789abcdef0123456789abcdef";
export const FOLDER_HEADING = "「お気に入り」フォルダの設定";
export const SONG_HEADING = "「大好きな曲」の設定";

export interface FixtureSong {
  readonly title: string;
  /** The suffix of the title's `songNameFont` class; empty is the bare class. */
  readonly font: string;
}

/** A number that is not listed gets a title of its own and the bare class. */
export const SONGS: Readonly<Record<string, FixtureSong>> = {
  "1001": { title: "サンプル曲A", font: "namco" },
  "1002": { title: "サンプル曲B", font: "classic" },
  "1003": { title: "サンプル曲C", font: "jpop" },
  "1004": { title: "サンプル曲D", font: "anime" },
};

type Songs = Readonly<Record<string, FixtureSong>>;

const songOf = (songNo: string, songs: Songs): FixtureSong =>
  songs[songNo] ?? { title: `サンプル曲${songNo}`, font: "" };

export interface FolderPageOptions {
  /** The slots in order; those past the end are empty. */
  readonly slots?: readonly (string | null)[];
  readonly songs?: Songs;
  readonly token?: string;
  readonly heading?: string;
}

export function folderSlot(slot: number, songNo: string | null, songs: Songs = SONGS): string {
  const input = (value: string) =>
    `<input type="hidden" id="song_no_${slot}" name="song_no_${slot}" value="${value}">`;
  if (songNo === null) {
    return `<ul id="songList"><li class="contentBox"><div class="songNameArea clearfix">
<div class="name"><span class="songName songNameFont">未設定</span></div>
${input("")}
</div></li></ul>`;
  }
  const { title, font } = songOf(songNo, songs);
  return `<ul id="songList"><li class="contentBox"><div class="songNameArea clearfix">
<div class="name"><span class="songName songNameFont${font}">
${title}${input(songNo)}
</span></div>
</div></li></ul>`;
}

export function folderPage({
  slots = [],
  songs = SONGS,
  token = TOKEN,
  heading = FOLDER_HEADING,
}: FolderPageOptions = {}): string {
  const rows = Array.from({ length: FOLDER_SLOT_COUNT }, (_, index) =>
    folderSlot(index + 1, slots[index] ?? null, songs),
  );
  return `<html><body>
<header><h1>お気に入りの曲</h1></header>
<div id="content">
<form name="favorite_song" method="GET" action="mypage_top.php">
<input type="hidden" name="from" value="/favorite_song_select.php">
<h2 class="subtitleMypage">${heading}</h2>
<div class="mypageInfoArea">
${rows.join("\n")}
</div>
<input type="hidden" id="_tckt" name="_tckt" value="${token}" />
<div class="buttonLabel shadowLabel songChangeButton">設定</div>
</form>
</div>
</body></html>`;
}

export interface SongPageOptions {
  /** The song number the form holds; null is no song. */
  readonly songNo?: string | null;
  /** The form's `bsf`; null leaves the input out. */
  readonly bsf?: string | null;
  readonly songs?: Songs;
  readonly token?: string;
  readonly heading?: string;
}

function songSpan(songNo: string | null, songs: Songs): string {
  if (songNo === null) {
    return `<span class="songName songNameFont">未設定</span>`;
  }
  const { title, font } = songOf(songNo, songs);
  return `<span class="songName songNameFont${font}">\n${title}\t</span>`;
}

export function songPage({
  songNo = "1001",
  bsf = "0",
  songs = SONGS,
  token = TOKEN,
  heading = SONG_HEADING,
}: SongPageOptions = {}): string {
  return `<html><body>
<header><h1>大好きな曲</h1></header>
<div id="content">
<form name="favorite_song" method="GET" action="mypage_top.php">
<input type="hidden" name="from" value="/portal_favorite_song_select.php">
<h2 class="subtitleMypage">${heading}</h2>
<div class="mypageInfoArea"><ul id="songList"><li class="contentBox">
<div class="songNameArea clearfix"><div class="name">${songSpan(songNo, songs)}</div></div>
</li></ul></div>
<input type="hidden" id="_tckt" name="_tckt" value="${token}" />
<input type="hidden" name="song_no" id="song_no"
  value="${songNo ?? ""}">
${bsf === null ? "" : `<input type="hidden" name="bsf" id="bsf" value="${bsf}">`}
<div class="buttonLabel shadowLabel songChangeButton">設定</div>
</form>
</div>
</body></html>`;
}

/** The thirty slots, the given songs first and the rest empty. */
export function slotsOf(...songNos: string[]): (string | null)[] {
  return Array.from({ length: FOLDER_SLOT_COUNT }, (_, index) => songNos[index] ?? null);
}

// Every page with a form issues the session a new token, and a save carrying any but the newest
// answers 705 and changes nothing, as on the real site.
export function fakeFavorites() {
  const hiroba = {
    /** The folder Hiroba has saved. */
    folder: slotsOf("1001", "1002", "1003"),
    /** The folder the session is building, which the staging requests change. */
    staged: slotsOf(),
    /** Whether `init=1` copies the saved folder into the session; if not, the session is empty. */
    initStages: true,
    /** Whether a staging request with an empty value leaves its slot as it was. */
    ignoresEmpty: false,
    /** The 大好きな曲 Hiroba has saved, and the `bsf` its page holds. */
    song: "1001" as string | null,
    bsf: "0",
    token: "",
    tokens: 0,
    requests: [] as TransportRequest[],
    /** The answer to a save; `message` goes into `errmsg`. */
    save: { code: 0, stores: true, message: "" } as SaveBehaviour,
    /** Run just after a save is handled, as a change made at that moment elsewhere. */
    afterSave: () => {},
  };
  const issue = () => {
    hiroba.token = `${++hiroba.tokens}`.padStart(32, "0");
    return hiroba.token;
  };
  const json = (path: string, value: unknown) =>
    answer(path, JSON.stringify(value), "application/json");

  const folderPageFor = (params: URLSearchParams): string => {
    if (params.get("init") === "1") {
      if (hiroba.initStages) {
        hiroba.staged = [...hiroba.folder];
      }
      return folderPage({ slots: hiroba.folder, token: issue() });
    }
    for (const [name, value] of params) {
      const slot = /^song_no_(\d+)$/.exec(name)?.[1];
      if (slot !== undefined && !(value === "" && hiroba.ignoresEmpty)) {
        hiroba.staged[Number(slot) - 1] = value === "" ? null : value;
      }
    }
    return folderPage({ slots: hiroba.staged, token: issue() });
  };

  const saveFolder = (request: TransportPost): Answer => {
    const path = "ajax/myfavorite_song.php";
    const form = new Map(request.form);
    if (form.get("_tckt") !== hiroba.token) {
      issue();
      return json(path, { result: 705, errmsg: "" });
    }
    hiroba.token = "";
    const { code, stores, message } = hiroba.save;
    const posted = Array.from(
      { length: FOLDER_SLOT_COUNT },
      (_, index) => form.get(`song_no_${index + 1}`) || null,
    );
    // The handler takes the posted slots only when they are the ones the session holds.
    if (stores && posted.every((slot, index) => slot === hiroba.staged[index])) {
      hiroba.folder = posted;
    }
    hiroba.afterSave();
    return json(path, { result: code, errmsg: message });
  };

  const saveSong = (request: TransportPost): Answer => {
    const path = "ajax/mypage_song.php";
    const form = new Map(request.form);
    if (form.get("_tckt") !== hiroba.token) {
      issue();
      return json(path, { result: 705 });
    }
    hiroba.token = "";
    const { code, stores, message } = hiroba.save;
    if (stores) {
      hiroba.song = form.get("song_no") || null;
    }
    hiroba.afterSave();
    return json(path, { result: code, errmsg: message });
  };

  const transport: Transport = {
    async send(request) {
      hiroba.requests.push(request);
      const url = new URL(request.url);
      const path = url.pathname.slice(1);
      if (request.method === "GET" && path === "favorite_song_select.php") {
        return answer(path, folderPageFor(url.searchParams), "text/html");
      }
      if (request.method === "GET" && path === "portal_favorite_song_select.php") {
        const page = songPage({ songNo: hiroba.song, bsf: hiroba.bsf, token: issue() });
        return answer(path, page, "text/html");
      }
      if (request.method === "POST" && path === "ajax/myfavorite_song.php") {
        return saveFolder(request);
      }
      if (request.method === "POST" && path === "ajax/mypage_song.php") {
        return saveSong(request);
      }
      return answer(path, "not found", "text/plain");
    },
  };
  /** Every request so far, as "METHOD path?query". */
  const routes = () =>
    hiroba.requests.map((request) => {
      const url = new URL(request.url);
      return `${request.method} ${url.pathname.slice(1)}${url.search}`;
    });
  const postsTo = (path: string) =>
    hiroba.requests.filter(
      (request): request is TransportPost =>
        request.method === "POST" && new URL(request.url).pathname === `/${path}`,
    );
  return { hiroba, transport, routes, postsTo };
}
