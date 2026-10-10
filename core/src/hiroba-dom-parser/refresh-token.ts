import type { FormToken } from "../hiroba-models";
import { isErr, type Result } from "../operation-results";
import { readEditorToken } from "./favorite-fields";
import { parsePage } from "./parser";
import type { ParseFailure } from "./types";

const PAGE = "mypage_top.php";

/** The form token the site's ↻ posts: my page's first `#_tckt`, as its script reads it. */
export function parseRefreshToken(html: string): Result<FormToken, ParseFailure> {
  const root = parsePage(html, PAGE);
  return isErr(root) ? root : readEditorToken(root.value, PAGE);
}
