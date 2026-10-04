// Made-up favourite pages in the shape of the real ones: a filled slot keeps its input inside the
// title's span, an empty one beside a 未設定 span.
import { FOLDER_SLOT_COUNT } from "../src/index";

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
