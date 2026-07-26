/** Excerpts, not captured pages — see README.md for why. */
import { describe, expect, test } from "bun:test";

import { type Costume, isErr, isOk, parseCostumePage } from "../src/index";

const COSTUME_EXCERPT = `
<html><body>
<form>
  <input type="hidden" id="_tckt" name="_tckt" value="00000000000000000000000000000000" />
  <input type="hidden" id="color_body" name="color_body" value="8">
  <input type="hidden" id="color_limb" name="color_limb" value="8">
  <input type="hidden" id="color_face" name="color_face" value="8">
  <input type="hidden" id="costume_1" name="costume_1" value="0">
  <input type="hidden" id="costume_2" name="costume_2" value="59">
  <input type="hidden" id="costume_3" name="costume_3" value="68">
  <input type="hidden" id="costume_4" name="costume_4" value="37">
  <input type="hidden" id="costume_5" name="costume_5" value="126">
  <input type="hidden" id="def_body" name="body" value="8">
</form>
</body></html>`;

const FETCHED_AT = "2026-07-26T12:00:00.000Z";

describe("parseCostumePage", () => {
  test("reads every colour and slot from the hidden fields, keeping a legitimate 0", () => {
    const result = parseCostumePage(COSTUME_EXCERPT, "000000000000", FETCHED_AT);

    if (!isOk(result)) {
      throw new Error(`expected a costume, got ${JSON.stringify(result.error)}`);
    }
    const expected: Costume = {
      taikoNo: "000000000000",
      colorBody: 8,
      colorLimb: 8,
      colorFace: 8,
      costume1: 0,
      costume2: 59,
      costume3: 68,
      costume4: 37,
      costume5: 126,
      fetchedAt: FETCHED_AT,
    };
    expect(result.value).toEqual(expected);
  });

  test("a page with no costume field at all fails naming the first missing field", () => {
    const result = parseCostumePage("<html><body><p>empty</p></body></html>", "0", FETCHED_AT);

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }
    expect(result.error).toEqual({
      kind: "missingMarker",
      page: "mypage_kisekae.php",
      marker: "#color_body",
    });
  });

  test("a field whose value is not a number fails as unreadable — no default is substituted", () => {
    const broken = COSTUME_EXCERPT.replace(
      `id="costume_2" name="costume_2" value="59"`,
      `id="costume_2" name="costume_2" value=""`,
    );

    const result = parseCostumePage(broken, "000000000000", FETCHED_AT);

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }
    expect(result.error).toEqual({
      kind: "unreadableValue",
      page: "mypage_kisekae.php",
      marker: "#costume_2",
      raw: "",
    });
  });
});
