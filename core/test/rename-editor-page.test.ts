import { describe, expect, test } from "bun:test";

import { isErr, isOk, type ParseFailure, parseRenameEditorPage } from "../src/index";

const TOKEN = "0123456789abcdef0123456789abcdef";
/** An earlier token on the page, in no form, that the form's own must not be mistaken for. */
const OTHER_TOKEN = "fedcba9876543210fedcba9876543210";

interface Page {
  /** The name row's markup; the default is the flat one, a dan-less player's. */
  readonly nameRow?: string;
  /** The flag the script call carries, or `null` for a page with no such call. */
  readonly flag?: string | null;
  /** The flag the second button's call carries, when it is not the first's. */
  readonly labelFlag?: string;
  /** The name literal in that call, as the page's script writes it. */
  readonly literal?: string;
  readonly action?: string;
  readonly mode?: string;
  readonly token?: string;
  readonly maxlength?: string;
  readonly formCount?: number;
  /** Leaves `#oldName` out of the form. */
  readonly noOldName?: boolean;
}

function myPage({
  nameRow = `<div style="height:24px;">サンプルどん</div>`,
  flag = "0",
  labelFlag = flag ?? "0",
  literal = "サンプルどん",
  action = "ajax/change_mydon_profile.php",
  mode = "name",
  token = TOKEN,
  maxlength = "10",
  formCount = 1,
  noOldName = false,
}: Page = {}): string {
  const call =
    flag === null
      ? ""
      : `$( '#rename_img' ).rename( '#dialog', '${literal}', $( '#_tckt' ).val(),  '${flag}' );
	$( '.rename_label' ).rename( '#dialog', '${literal}', $( '#_tckt' ).val(),  '${labelFlag}' );`;
  const form = `<form name="renameForm" id="renameForm" method="post" action="${action}">
      <input type="hidden" id="_tckt" name="_tckt" value="${token}" />
      <input type="hidden" id="mode"    name="mode" value="${mode}">
      ${noOldName ? "" : `<input type="hidden" id="oldName" name="oldName" value="">`}
      <input type="text"   id="newName" name="newName" value="" maxlength="${maxlength}"><br />
    </form>`;
  return `<html><head><script type="text/javascript">
jQuery(function($){
	${call}
});
</script></head><body>
<div id="mydon_area" class="mydon_area">
  <img src="imgsrc_titleplate.php">
  <div style="height: 20px;text-align: center;">サンプルの称号</div>
  ${nameRow}
  <div style="background-color:#FC0;">
    <div class="detail"><p>国・地域 ：サンプル</p><p>太鼓番：000000000000</p></div>
  </div>
</div>
<input type="hidden" id="_tckt" name="_tckt" value="${OTHER_TOKEN}" />
<div id="dialog">
  <div id="renameFormArea" class="formArea">
    ${Array.from({ length: formCount }, () => form).join("\n")}
  </div>
</div>
</body></html>`;
}

function readOf(page: string) {
  const result = parseRenameEditorPage(page);
  if (!isOk(result)) {
    throw new Error(`expected an editor, got ${JSON.stringify(result.error)}`);
  }
  return result.value;
}

describe("parseRenameEditorPage", () => {
  test("reads the name, the token inside the form, how long a name the form takes, and that renames are open", () => {
    const editor = readOf(myPage());
    expect(editor.state).toEqual({ nickname: "サンプルどん" });
    expect(editor.token.reveal()).toBe(TOKEN);
    expect(editor.maxLength).toBe(10);
    expect(editor.rename).toBe("open");
  });

  test("takes the token from inside the form, though an earlier one outside it differs", () => {
    expect(readOf(myPage()).token.reveal()).not.toBe(OTHER_TOKEN);
  });

  test("reads the name from a name row with a dan, and from the flat one", () => {
    const withDan = `<div style="display:flex"><div style="width:135px;">サンプルどん</div><div><img src="imgsrc_danlabel.php?taiko_no=000000000000"></div></div>`;
    expect(readOf(myPage({ nameRow: withDan })).state).toEqual({ nickname: "サンプルどん" });
    expect(readOf(myPage()).state).toEqual({ nickname: "サンプルどん" });
  });

  test("reads a form that takes a longer name than ten", () => {
    expect(readOf(myPage({ maxlength: "16" })).maxLength).toBe(16);
  });

  test("keeps the token out of anything serialised", () => {
    const result = JSON.stringify(parseRenameEditorPage(myPage()));
    expect(result).not.toContain(TOKEN);
    expect(result).not.toContain(OTHER_TOKEN);
  });
});

describe("whether Hiroba takes a rename", () => {
  type FlagCase = [label: string, page: Page, expected: "open" | "closed" | "unknown"];
  test.each<FlagCase>([
    ["flag 0", { flag: "0" }, "open"],
    ["flag 1, for which the site opens nothing", { flag: "1" }, "closed"],
    ["no call at all", { flag: null }, "unknown"],
    ["a flag of another value", { flag: "2" }, "unknown"],
    ["an empty flag", { flag: "" }, "unknown"],
    ["a name literal holding an escaped quote", { literal: "O\\'Brien" }, "open"],
    ["a name literal holding a backslash, and flag 1", { literal: "a\\\\b", flag: "1" }, "closed"],
    ["two buttons that disagree", { flag: "0", labelFlag: "1" }, "unknown"],
  ])("a page with %s is %s", (_label, page, expected) => {
    expect(readOf(myPage(page)).rename).toBe(expected);
  });
});

describe("parseRenameEditorPage refuses a page that is not the rename editor", () => {
  type Case = [label: string, page: string, expected: ParseFailure];
  const PAGE = "mypage_top.php";

  test.each<Case>([
    [
      "no rename form",
      myPage().replace(`id="renameForm"`, `id="otherForm"`),
      { kind: "missingMarker", page: PAGE, marker: "form#renameForm" },
    ],
    [
      "two rename forms",
      myPage({ formCount: 2 }),
      { kind: "unreadableValue", page: PAGE, marker: "form#renameForm", raw: "2 forms" },
    ],
    [
      "a form that posts elsewhere",
      myPage({ action: "ajax/change_mydon.php" }),
      {
        kind: "unreadableValue",
        page: PAGE,
        marker: "form#renameForm[action]",
        raw: "ajax/change_mydon.php",
      },
    ],
    [
      "a mode that is not name",
      myPage({ mode: "title" }),
      {
        kind: "unreadableValue",
        page: PAGE,
        marker: `form#renameForm [name="mode"]`,
        raw: "title",
      },
    ],
    [
      "an empty token, without repeating it",
      myPage({ token: "" }),
      { kind: "unreadableValue", page: PAGE, marker: `form#renameForm [name="_tckt"]`, raw: "" },
    ],
    [
      "no token in the form",
      myPage().replace(`id="_tckt" name="_tckt" value="${TOKEN}"`, `id="x" name="x" value="1"`),
      { kind: "missingMarker", page: PAGE, marker: `[name="_tckt"]` },
    ],
    [
      "no oldName",
      myPage({ noOldName: true }),
      { kind: "missingMarker", page: PAGE, marker: "#oldName" },
    ],
    [
      "no name field",
      myPage().replace(`id="newName"`, `id="other"`),
      { kind: "missingMarker", page: PAGE, marker: "#newName" },
    ],
    [
      "a maxlength that is no number",
      myPage({ maxlength: "ten" }),
      {
        kind: "unreadableValue",
        page: PAGE,
        marker: "form#renameForm #newName[maxlength]",
        raw: "ten",
      },
    ],
    [
      "no maxlength",
      myPage().replace(` maxlength="10"`, ""),
      {
        kind: "unreadableValue",
        page: PAGE,
        marker: "form#renameForm #newName[maxlength]",
        raw: "",
      },
    ],
    [
      "a header that has lost its title line",
      myPage().replace(`<div style="height: 20px;text-align: center;">サンプルの称号</div>`, ""),
      {
        kind: "missingMarker",
        page: PAGE,
        marker: "#mydon_area > div (.detail after the name row)",
      },
    ],
  ])("%s", (_label, page, expected) => {
    const result = parseRenameEditorPage(page);
    if (!isErr(result)) {
      throw new Error("expected a refusal");
    }
    expect(result.error).toEqual(expected);
    expect(JSON.stringify(result.error)).not.toContain(TOKEN);
  });

  test("a logged-out page is a logged-out page", () => {
    const result = parseRenameEditorPage(
      `<form id="login_form" action="./login_process.php"></form>`,
    );
    expect(isErr(result) && result.error).toEqual({ kind: "loggedOut", page: PAGE });
  });
});
