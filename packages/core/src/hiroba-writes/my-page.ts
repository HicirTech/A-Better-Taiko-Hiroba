import { parseProfilePage } from "../hiroba-dom-parser";
import type { Profile } from "../hiroba-models";
import type { Result } from "../operation-results";
import { readHirobaPage } from "./read-page";
import type { HirobaReadFailure, ReadDeps } from "./types";

/**
 * My page: where what is saved of the player's title and name is shown, and the page whose dialog
 * writes the name.
 */
export const MY_PAGE_PATH = "mypage_top.php";

/**
 * My page, read once and parsed as the profile it is, for a write that checks what it shows: the
 * title a title write reads back, and the title a rename checks stayed.
 */
export const readMyPage = (deps: ReadDeps): Promise<Result<Profile, HirobaReadFailure>> =>
  readHirobaPage(deps, MY_PAGE_PATH, (html) => parseProfilePage(html, ""));
