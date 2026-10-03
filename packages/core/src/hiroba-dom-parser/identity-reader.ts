import type { HTMLElement } from "node-html-parser";

import { err, ok, type Result } from "../operation-results";
import { elementChildren } from "./element-readers";
import type { ParseFailure } from "./types";

const PAGE = "mypage_top.php";

export interface Identity {
  readonly title: string;
  readonly nickname: string;
}

export function readIdentity(area: HTMLElement): Result<Identity, ParseFailure> {
  // Title and nickname carry no class or id; position is the only contract: the first div child
  // is the title line, the second the name row.
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
  // Check that position holds: without a title line, the name row would be read as the title
  // and the details block as the name.
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
  // With a dan label the name row is two divs (nickname, label); without one the nickname sits
  // directly in the row, as on user_profile.php (inferred for my page: no dan-less capture).
  const nickDiv = elementChildren(nameRow).find((el) => el.rawTagName.toLowerCase() === "div");
  const nickname = (nickDiv ?? nameRow).text.trim();
  if (nickname === "") {
    return err({ kind: "unreadableValue", page: PAGE, marker: "#mydon_area name row", raw: "" });
  }
  return ok({ title, nickname });
}
