import type { Costume } from "../hiroba-models";
import { err, isErr, ok, type Result } from "../operation-results";
import { parsePage, requireMarker } from "./parser";
import type { ParseFailure } from "./types";

const PAGE = "mypage_kisekae.php";

/** The hidden fields the costume lives in. `0` is a legitimate value — an empty slot. */
const FIELDS = [
  "color_body",
  "color_limb",
  "color_face",
  "costume_1",
  "costume_2",
  "costume_3",
  "costume_4",
  "costume_5",
] as const;

type FieldName = (typeof FIELDS)[number];

/**
 * Parses `mypage_kisekae.php` into a Costume.
 *
 * `taikoNo` comes from the caller: unlike the profile page, this page never prints the taiko
 * number, so the caller who fetched it is the only one who knows whose costume this is.
 * No default is ever substituted — a value is read from its hidden field or the parse fails.
 */
export function parseCostumePage(
  html: string,
  taikoNo: string,
  fetchedAt: string,
): Result<Costume, ParseFailure> {
  const page = parsePage(html, PAGE);
  if (isErr(page)) {
    return page;
  }
  const root = page.value;

  const values = {} as Record<FieldName, number>;
  for (const field of FIELDS) {
    const marker = `#${field}`;
    const input = requireMarker(root, marker, PAGE);
    if (isErr(input)) {
      return input;
    }
    const raw = input.value.getAttribute("value") ?? "";
    if (!/^\d+$/.test(raw)) {
      return err({ kind: "unreadableValue", page: PAGE, marker, raw });
    }
    values[field] = Number(raw);
  }

  return ok({
    taikoNo,
    colorBody: values.color_body,
    colorLimb: values.color_limb,
    colorFace: values.color_face,
    costume1: values.costume_1,
    costume2: values.costume_2,
    costume3: values.costume_3,
    costume4: values.costume_4,
    costume5: values.costume_5,
    fetchedAt,
  });
}
