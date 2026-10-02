/** The title and the name off my page's header. Internal to this domain — not in the index. */
import type { HTMLElement } from "node-html-parser";

import { err, ok, type Result } from "../operation-results";
import { elementChildren } from "./element-readers";
import type { ParseFailure } from "./types";

const PAGE = "mypage_top.php";

/** The title a player wears and the name they go by, as my page's header prints them. */
export interface Identity {
  readonly title: string;
  readonly nickname: string;
}

/**
 * Reads the title and the nickname off `#mydon_area`, the header of my page. Both the profile and
 * the rename form read them here, so a page that tells one from the other tells the other the same.
 */
export function readIdentity(area: HTMLElement): Result<Identity, ParseFailure> {
  // Title and nickname carry no class or id; their position is the only contract the page
  // offers. The first div child of #mydon_area is the title line, the second is the name row.
  const divs = elementChildren(area).filter((el) => el.rawTagName.toLowerCase() === "div");
  const titleDiv = divs[0];
  const nameRow = divs[1];
  if (titleDiv === undefined || nameRow === undefined) {
    return err({
      kind: "missingMarker",
      page: PAGE,
      marker: "#mydon_area > div (title, name row)",
    });
  }
  // Position is the only thing telling the title from the name, so check that it holds: on every
  // capture the div after the name row is the one holding .detail. A page that dropped its title
  // line would otherwise hand the name row in as the title and the details block as the name.
  const detailBlock = divs[2];
  if (detailBlock === undefined || detailBlock.querySelector(".detail") === null) {
    return err({
      kind: "missingMarker",
      page: PAGE,
      marker: "#mydon_area > div (.detail after the name row)",
    });
  }
  // An empty title line is a player wearing no title, not a page that failed to render one.
  const title = titleDiv.text.trim();
  // The name row takes one of two shapes, decided by the dan. With a dan label it is a flex row of
  // two divs, the nickname in the first and the label in the second. Without one, the nickname
  // sits directly in the row: that is how user_profile.php, whose name row is the same markup,
  // writes all eight dan-less players on disk. No dan-less my page has been captured, so the flat
  // form here is inferred from theirs.
  const nickDiv = elementChildren(nameRow).find((el) => el.rawTagName.toLowerCase() === "div");
  const nickname = (nickDiv ?? nameRow).text.trim();
  if (nickname === "") {
    return err({ kind: "unreadableValue", page: PAGE, marker: "#mydon_area name row", raw: "" });
  }
  return ok({ title, nickname });
}
