/** Excerpts, not captured pages — see README.md for why. */
import { describe, expect, test } from "bun:test";

import { isErr, isOk, parseCostumeEditorPage } from "../src/index";

const TOKEN = "0123456789abcdef0123456789abcdef";

/** Two swatches, as each colour tab lists them. */
const PALETTE = `<ul><li class="row clearfix"><ul>
<li><span class="color" title="0" style="background-color: #F84828;"></span></li>
<li><span class="color" title="1" style="background-color: #68c0c0;"></span></li>
</ul></li></ul>`;

const item = (id: number, type: number) =>
  `<li><a name="${id}"><img src="image/sp/640/ajax-loader_640.gif" srctmp="imgsrc_kisekae.php?cos=${id}&type=${type}"></a></li>`;

/**
 * The page's shape, cut down: the form and its token, the def_* twins outside it — sharing the live
 * fields' names, as on the page — three colour tabs and five slot tabs. Item 21 sits in slots 2
 * and 3, as ids repeat across slots on the real page.
 */
const EDITOR_EXCERPT = `<html><body>
<form id="kisekae" name="kisekae" action="ajax/change_mydon.php" method="post">
  <span class="button purple changeButton">決定</span>
  <input type="hidden" id="_tckt" name="_tckt" value="${TOKEN}" />
  <input type="hidden" id="color_body" name="color_body" value="12">
  <input type="hidden" id="color_limb" name="color_limb" value="12">
  <input type="hidden" id="color_face" name="color_face" value="1">
  <input type="hidden" id="costume_1" name="costume_1" value="0">
  <input type="hidden" id="costume_2" name="costume_2" value="21">
  <input type="hidden" id="costume_3" name="costume_3" value="68">
  <input type="hidden" id="costume_4" name="costume_4" value="37">
  <input type="hidden" id="costume_5" name="costume_5" value="0">
</form>
<input type="hidden" id="def_body" name="body" value="12">
<input type="hidden" id="def_limb" name="limb" value="12">
<input type="hidden" id="def_face" name="face" value="1">
<input type="hidden" id="def_costume_1" name="costume_1" value="0">
<input type="hidden" id="def_costume_2" name="costume_2" value="21">
<input type="hidden" id="def_costume_3" name="costume_3" value="68">
<input type="hidden" id="def_costume_4" name="costume_4" value="37">
<input type="hidden" id="def_costume_5" name="costume_5" value="0">
<div class="element">
<div id="tab-face">${PALETTE}</div>
<div id="tab-body">${PALETTE}</div>
<div id="tab-limb">${PALETTE}</div>
<div id="tab-cos-kigu"><div class="costumeThumbArea"><ul>${item(4, 1)}${item(36, 1)}</ul></div>
<div class="buttonArea removeBtn"><span class="button purple remove">はずす</span></div></div>
<div id="tab-cos-head"><div class="costumeThumbArea"><ul>${item(59, 2)}${item(21, 2)}</ul></div></div>
<div id="tab-cos-body"><div class="costumeThumbArea"><ul>${item(68, 3)}${item(21, 3)}</ul></div></div>
<div id="tab-cos-make"><div class="costumeThumbArea"><ul>${item(37, 4)}</ul></div></div>
<div id="tab-cos-acce"><div class="costumeThumbArea"><ul></ul></div></div>
</div>
</body></html>`;

describe("parseCostumeEditorPage", () => {
  test("reads the set, the token, the palette and each slot's owned items", () => {
    const result = parseCostumeEditorPage(EDITOR_EXCERPT);
    if (!isOk(result)) {
      throw new Error(`expected an editor, got ${JSON.stringify(result.error)}`);
    }
    const { state, token, palette, slots } = result.value;
    expect(state).toEqual({
      colorBody: 12,
      colorLimb: 12,
      colorFace: 1,
      costume1: 0,
      costume2: 21,
      costume3: 68,
      costume4: 37,
      costume5: 0,
    });
    expect(token.reveal()).toBe(TOKEN);
    expect(palette).toEqual([
      { id: 0, hex: "#F84828" },
      { id: 1, hex: "#68C0C0" },
    ]);
    expect(slots).toEqual([[4, 36], [59, 21], [68, 21], [37], []]);
  });

  test("keeps the token out of anything serialised", () => {
    const result = parseCostumeEditorPage(EDITOR_EXCERPT);
    expect(JSON.stringify(result)).not.toContain(TOKEN);
  });

  test("reads every value by its id, never by a name other inputs share", () => {
    // The twins share the live fields' names, and here a stray input with one comes first, so a
    // lookup by name would find the wrong one.
    const twinsFirst = EDITOR_EXCERPT.replace(
      `<form id="kisekae"`,
      `<input type="hidden" id="stray" name="costume_2" value="99"><form id="kisekae"`,
    );
    const result = parseCostumeEditorPage(twinsFirst);
    expect(isOk(result) && result.value.state.costume2).toBe(21);
  });

  test("refuses a form that differs from its twins: a choice staged, not saved", () => {
    const staged = EDITOR_EXCERPT.replace(
      `id="costume_2" name="costume_2" value="21">
  <input type="hidden" id="costume_3"`,
      `id="costume_2" name="costume_2" value="59">
  <input type="hidden" id="costume_3"`,
    );
    const result = parseCostumeEditorPage(staged);
    if (!isErr(result)) {
      throw new Error("expected a refusal");
    }
    expect(result.error).toEqual({
      kind: "unreadableValue",
      page: "mypage_kisekae.php",
      marker: "#def_costume_2",
      raw: "21, but the form holds 59",
    });
  });

  test("refuses an item whose thumbnail names another slot", () => {
    const misfiled = EDITOR_EXCERPT.replace(item(37, 4), item(37, 5));
    const result = parseCostumeEditorPage(misfiled);
    expect(isErr(result) && result.error.kind).toBe("unreadableValue");
    expect(isErr(result) && "marker" in result.error && result.error.marker).toBe(
      "#tab-cos-make a[name]",
    );
  });

  test("refuses colour tabs whose palettes differ", () => {
    const [before, after] = EDITOR_EXCERPT.split(`<div id="tab-limb">`);
    const differing = `${before}<div id="tab-limb">${(after ?? "").replace("#68c0c0", "#000000")}`;
    const result = parseCostumeEditorPage(differing);
    expect(isErr(result) && "marker" in result.error && result.error.marker).toBe(
      "#tab-limb span.color",
    );
  });

  test("refuses a page without the form that writes, or one posting elsewhere", () => {
    const noForm = parseCostumeEditorPage("<html><body><p>not the editor</p></body></html>");
    expect(isErr(noForm) && noForm.error).toEqual({
      kind: "missingMarker",
      page: "mypage_kisekae.php",
      marker: "form#kisekae",
    });
    const elsewhere = parseCostumeEditorPage(
      EDITOR_EXCERPT.replace(`action="ajax/change_mydon.php"`, `action="ajax/other.php"`),
    );
    expect(isErr(elsewhere) && elsewhere.error.kind).toBe("unreadableValue");
  });

  test("refuses an empty token without repeating it", () => {
    const result = parseCostumeEditorPage(EDITOR_EXCERPT.replace(`value="${TOKEN}"`, `value=""`));
    expect(isErr(result) && result.error).toEqual({
      kind: "unreadableValue",
      page: "mypage_kisekae.php",
      marker: `form#kisekae [name="_tckt"]`,
      raw: "",
    });
  });
});
