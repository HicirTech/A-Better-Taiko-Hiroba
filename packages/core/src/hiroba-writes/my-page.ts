import { parseProfilePage } from "../hiroba-dom-parser";
import type { Profile } from "../hiroba-models";
import type { Result } from "../operation-results";
import { readHirobaPage } from "./read-page";
import type { HirobaReadFailure, ReadDeps } from "./types";

export const MY_PAGE_PATH = "mypage_top.php";

/** Parsed with no fetch time: callers only read the title and name. */
export const readMyPage = (deps: ReadDeps): Promise<Result<Profile, HirobaReadFailure>> =>
  readHirobaPage(deps, MY_PAGE_PATH, (html) => parseProfilePage(html, ""));
