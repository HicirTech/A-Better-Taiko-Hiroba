import type { Genre } from "../hiroba-models";
import { err, isErr, ok, type Result } from "../operation-results";
import { parsePage, requireMarker } from "./parser";
import type { ParseFailure, SongPickerRow } from "./types";

const PAGE = "select_song.php";
const LIST = "#songList";
const ROW = `${LIST} a[href]`;
/** A row links back to the 大好きな曲 editor, staging the pick; bsf 1 is the song's 裏 entry. */
const ROW_LINK = /^\/portal_favorite_song_select\.php\?song_no=(\d{1,5})&session_flg=1&bsf=([01])$/;
/** The genre tab drawn as the one shown, as opposed to `_off_`. */
const SHOWN_TAB = "_on_";

/** Reads one genre of the 大好きな曲 picker, which must be the genre the page shows. */
export function parseSongPickerPage(
  html: string,
  genre: Genre,
): Result<readonly SongPickerRow[], ParseFailure> {
  const page = parsePage(html, PAGE);
  if (isErr(page)) {
    return page;
  }
  const root = page.value;
  const tabMarker = `#tabList a[href="/select_song.php?genre=${genre}"] img`;
  const tab = requireMarker(root, tabMarker, PAGE);
  if (isErr(tab)) {
    return tab;
  }
  const tabSource = tab.value.getAttribute("src") ?? "";
  if (!tabSource.includes(SHOWN_TAB)) {
    return err({ kind: "unreadableValue", page: PAGE, marker: tabMarker, raw: tabSource });
  }
  const list = requireMarker(root, LIST, PAGE);
  if (isErr(list)) {
    return list;
  }
  const rows: SongPickerRow[] = [];
  for (const anchor of list.value.querySelectorAll("a[href]")) {
    const href = anchor.getAttribute("href") ?? "";
    const [, songNo, bsf] = href.match(ROW_LINK) ?? [];
    if (songNo === undefined || bsf === undefined) {
      return err({ kind: "unreadableValue", page: PAGE, marker: ROW, raw: href });
    }
    const ura = bsf === "1";
    // The site draws a 裏 row in its own style: a row whose style and link disagree is not read.
    const area = anchor.closest(".songNameArea");
    if (area === null || area.classList.contains("ura") !== ura) {
      return err({ kind: "unreadableValue", page: PAGE, marker: `${ROW} (ura)`, raw: href });
    }
    rows.push({ songNo, ura });
  }
  return ok(rows);
}
