import { describe, expect, test } from "bun:test";
import { parse } from "node-html-parser";

import {
  isErr,
  isOk,
  type ParseFailure,
  parsePage,
  parseTitleEditorPage,
  type Result,
} from "../src/index";

const TOKEN = "0123456789abcdef0123456789abcdef";

const option = (id: number | string, label: string) => `<option value="${id}">${label}</option>`;

const OWNED = [
  option(106, "サンプル称号A"),
  option(39, "サンプル称号B"),
  option(40, "サンプル 称号"),
  option(41, "サンプル 称号"),
].join("\n");

interface Page {
  /** The list's entries after the two leading ones. */
  readonly owned?: string;
  readonly leading?: string;
  readonly action?: string;
  readonly mode?: string;
  readonly getStatus?: string;
  readonly setTitle?: string;
  readonly token?: string;
  /** The heading's markup; `null` leaves it out. */
  readonly heading?: string | null;
}

/** The title page, cut down, with the one `<div>` it never closes left unclosed. */
function titlePage({
  owned = OWNED,
  leading = `<option selected value="">(称号を選択してください)</option>
        <option value="-">(称号をはずす)</option>`,
  action = "ajax/change_mydon_profile.php",
  mode = "title",
  getStatus = "1",
  setTitle = "on",
  token = TOKEN,
  heading = "サンプル&nbsp;称号",
}: Page = {}): string {
  return `<html><body>
<header style="color:#ffffff;"><h1>称号編集</h1></header>
<div id="content" style="padding-bottom: 45px;">
<form name="titlepartsForm" id="titlepartsForm" method="post" action="${action}">
<div id="titleFormArea" class="formArea" style="width:300px;margin:0 auto;padding:0;">
  <input type="hidden" id="mode" name="mode" value="${mode}">
  <input type="hidden" id="_tckt" name="_tckt" value="${token}" />
  <img style="height: 70px;width: 300px;" src="image/sp/640/now_titleimage_640.png">
  <div style="margin-top:-28px;text-align: center;position:relative;font-size:12px;">
    <img width="280px" src="image/sp/640/titleparts_complete_640.png">
    ${heading === null ? "" : `<div style="position:absolute; top:42px;width:290px;" id="title_parts_comp">${heading}</div>`}
  </div>
  <div style="background: #FFCC00; padding: 5px;">
    <h2 class="subtitleMypage">称号パーツを組み合わせる</h2>
    <div style="padding:0px;width:120px;margin-left:77px;">
      <label><a href="mypage_titleparts_edit_sp.php"><div class="buttonLabel shadowLabel">設定画面へ</div></a></label>
    </div>
    <h2 class="subtitleMypage">称号を選ぶ</h2>
    <div style="text-align:center;margin:10px">
      <select id="newTitle">
        ${leading}
        ${owned}
      </select>
    </div>
    <div class="radio title_chk" style="padding:0px;width:130px;margin-left:70px;">
      <ul><li class="clearfix"><label>
        <div class="buttonLabel shadowLabel">称号を設定する</div>
        <input type="hidden" name="getStatus" class="getStatus" value="${getStatus}">
        <input type="hidden" name="setTitle" class="setTitle" value="${setTitle}">
      </label></li></ul>
    </div>
  </div>
</form>
</div>
<div class="button_area clearfix"><a href="mypage_top.php">マイページ</a></div>
</body></html>`;
}

function readOf(page: string) {
  const result = parseTitleEditorPage(page);
  if (!isOk(result)) {
    throw new Error(`expected an editor, got ${JSON.stringify(result.error)}`);
  }
  return result.value;
}

function failureOf(result: Result<unknown, ParseFailure>): ParseFailure {
  if (!isErr(result)) {
    throw new Error("expected a refusal");
  }
  return result.error;
}

describe("the title page's unclosed div", () => {
  test("costs a default parse its form, and a parse that keeps unclosed tags has it", () => {
    // Precondition of this file: were the excerpt balanced, every test below would pass with or
    // without the option and prove nothing.
    expect(parse(titlePage()).querySelectorAll("form")).toHaveLength(0);
    expect(parse(titlePage()).querySelectorAll("select#newTitle")).toHaveLength(1);

    const kept = parsePage(titlePage(), "mypage_title_edit.php", { keepUnclosedTags: true });
    if (!isOk(kept)) {
      throw new Error("expected the page");
    }
    expect(kept.value.querySelectorAll("form")).toHaveLength(1);
    expect(
      kept.value.querySelector("select#newTitle")?.closest("form")?.getAttribute("action"),
    ).toBe("ajax/change_mydon_profile.php");
  });

  test("changes no other page: without the option, parsePage parses as it always has", () => {
    const plain = parsePage(titlePage(), "mypage_title_edit.php");
    if (!isOk(plain)) {
      throw new Error("expected the page");
    }
    expect(plain.value.querySelectorAll("form")).toHaveLength(0);
  });
});

describe("parseTitleEditorPage", () => {
  test("reads the worn title, the token and every owned title in page order", () => {
    const { state, token, options } = readOf(titlePage());
    expect(state).toEqual({ title: "サンプル\u{a0}称号" });
    expect(token.reveal()).toBe(TOKEN);
    expect(options).toEqual([
      { id: 106, label: "サンプル称号A" },
      { id: 39, label: "サンプル称号B" },
      { id: 40, label: "サンプル 称号" },
      { id: 41, label: "サンプル 称号" },
    ]);
  });

  test("leaves out the list's two leading entries, and which one is selected", () => {
    const wearing = readOf(
      titlePage({
        leading: `<option value="">(称号を選択してください)</option>
        <option value="-">(称号をはずす)</option>`,
        owned: `<option value="106">サンプル称号A</option><option selected value="39">サンプル称号B</option>`,
      }),
    );
    expect(wearing.options.map((one) => one.id)).toEqual([106, 39]);
    // The worn title is the heading's, whichever entry the page marks.
    expect(wearing.state).toEqual({ title: "サンプル\u{a0}称号" });
  });

  test("keeps a name that repeats as separate options, each under its own id", () => {
    const { options } = readOf(titlePage());
    expect(options.filter((one) => one.label === "サンプル 称号").map((one) => one.id)).toEqual([
      40, 41,
    ]);
  });

  test("an account with no title to choose has an empty list, not a refused page", () => {
    expect(readOf(titlePage({ owned: "" })).options).toEqual([]);
  });

  test("reads a title that wears none as the empty title", () => {
    expect(readOf(titlePage({ heading: "\n\t\t" })).state).toEqual({ title: "" });
  });

  test("labels are the entry's text, trimmed and decoded", () => {
    const { options } = readOf(
      titlePage({ owned: `<option value="7">\n  サンプル&amp;称号\t</option>` }),
    );
    expect(options).toEqual([{ id: 7, label: "サンプル&称号" }]);
  });

  test("keeps the token out of anything serialised", () => {
    expect(JSON.stringify(parseTitleEditorPage(titlePage()))).not.toContain(TOKEN);
  });

  test("refuses the login page as a logged-out page", () => {
    const result = parseTitleEditorPage(
      `<form id="login_form" action="./login_process.php"></form>`,
    );
    expect(failureOf(result)).toEqual({ kind: "loggedOut", page: "mypage_title_edit.php" });
  });
});

describe("parseTitleEditorPage refuses a page that is not the title editor", () => {
  type Case = [label: string, page: string, expected: ParseFailure];
  const PAGE = "mypage_title_edit.php";

  test.each<Case>([
    [
      "no list of titles",
      titlePage().replace("select", "span"),
      { kind: "missingMarker", page: PAGE, marker: "select#newTitle" },
    ],
    [
      "a list in no form",
      titlePage().replace(/<\/?form[^>]*>/g, ""),
      { kind: "missingMarker", page: PAGE, marker: "form select#newTitle" },
    ],
    [
      "a form that posts elsewhere",
      titlePage({ action: "ajax/change_mydon.php" }),
      {
        kind: "unreadableValue",
        page: PAGE,
        marker: "form[action] select#newTitle",
        raw: "ajax/change_mydon.php",
      },
    ],
    [
      "a mode that is not title",
      titlePage({ mode: "titleparts" }),
      { kind: "unreadableValue", page: PAGE, marker: "input#mode", raw: "titleparts" },
    ],
    [
      "a getStatus other than 1",
      titlePage({ getStatus: "0" }),
      { kind: "unreadableValue", page: PAGE, marker: "input.getStatus", raw: "0" },
    ],
    [
      "a setTitle other than on, which the handler takes another way",
      titlePage({ setTitle: "off" }),
      { kind: "unreadableValue", page: PAGE, marker: "input.setTitle", raw: "off" },
    ],
    [
      "no setTitle input",
      titlePage().replace(`class="setTitle"`, `class="other"`),
      { kind: "missingMarker", page: PAGE, marker: "input.setTitle" },
    ],
    [
      "no token",
      titlePage().replace(`name="_tckt"`, `name="other"`),
      { kind: "missingMarker", page: PAGE, marker: `[name="_tckt"]` },
    ],
    [
      "an empty token, without repeating it",
      titlePage({ token: "" }),
      { kind: "unreadableValue", page: PAGE, marker: `form [name="_tckt"]`, raw: "" },
    ],
    [
      "no heading with the worn title",
      titlePage({ heading: null }),
      { kind: "missingMarker", page: PAGE, marker: "#title_parts_comp" },
    ],
    [
      "a list that does not start with the choose entry",
      titlePage({ leading: `<option value="-">(称号をはずす)</option>`, owned: option(5, "A") }),
      { kind: "unreadableValue", page: PAGE, marker: "select#newTitle option", raw: "-" },
    ],
    [
      "a list that does not have 称号をはずす second",
      titlePage({ leading: `<option value="">(選択)</option>${option(5, "A")}`, owned: "" }),
      { kind: "unreadableValue", page: PAGE, marker: "select#newTitle option", raw: "5" },
    ],
    [
      "a list with no entries at all",
      titlePage({ leading: "", owned: "" }),
      { kind: "unreadableValue", page: PAGE, marker: "select#newTitle option", raw: "(no entry)" },
    ],
    [
      "an id that is no whole number",
      titlePage({ owned: option("12a", "A") }),
      { kind: "unreadableValue", page: PAGE, marker: "select#newTitle option", raw: "12a" },
    ],
    [
      "an empty id",
      titlePage({ owned: option("", "A") }),
      { kind: "unreadableValue", page: PAGE, marker: "select#newTitle option", raw: "" },
    ],
    [
      "an id listed twice",
      titlePage({ owned: option(5, "A") + option(5, "B") }),
      { kind: "unreadableValue", page: PAGE, marker: "select#newTitle option", raw: "5" },
    ],
    [
      "a title with no name",
      titlePage({ owned: option(5, "  ") }),
      { kind: "unreadableValue", page: PAGE, marker: "select#newTitle option", raw: "5" },
    ],
  ])("%s", (_label, page, expected) => {
    const failure = failureOf(parseTitleEditorPage(page));
    expect(failure).toEqual(expected);
    expect(JSON.stringify(failure)).not.toContain(TOKEN);
  });
});
