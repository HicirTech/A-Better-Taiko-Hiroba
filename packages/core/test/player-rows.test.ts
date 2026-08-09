/**
 * Excerpts, not captured pages — see README.md for why. The two row shapes below mirror the real
 * ones: a list row carries a hidden `taiko_no` and a write form, a search row carries neither and
 * wraps its title in whitespace.
 */
import { describe, expect, test } from "bun:test";

import { isErr, parsePlayerRowsPage } from "../src/index";

const TAIKO_NO = "000000000000";
const PAGE = "user_search.php";

interface RowOptions {
  /** The `段位：…` line, exactly as the page prints it. `null` omits the block — a third state. */
  danLine?: string | null;
  /** A list row adds the hidden input and the unfollow form; a search row has neither. */
  withWriteForm?: boolean;
  title?: string;
}

function row(options: RowOptions = {}): string {
  const {
    danLine = "段位：十段(赤クリア)",
    withWriteForm = false,
    title = "称号：サンプル称号",
  } = options;

  // The site's own spacing: list rows print inline, search rows wrap in whitespace and some titles
  // carry a raw &nbsp;.
  const writeForm = withWriteForm
    ? `<div class="buttonArea friend">
         <form name="friend_request" method="post" action="">
           <input type="hidden" name="taiko_no" value="${TAIKO_NO}">
           <input type="hidden" name="self_url" value="/friend_request_list.php?order_type=0">
           <input type="hidden" id="_tckt" name="_tckt" value="TCKT_REDACTED">
           <div class="buttonLabel">フォローする</div>
         </form>
         <a href="./challenge_form.php?taiko_no=${TAIKO_NO}"><img src="btn_challenge.png"></a>
       </div>`
    : "";

  return `<div class="friendArea clearfix">
    <div class="friendMydonImgArea">
      <a href="./user_profile.php?taiko_no=${TAIKO_NO}">
        <img src="https://img.taiko-p.jp/imgsrc.php?v=&kind=mydon&fn=mydon_${TAIKO_NO}" width="85" height="85">
      </a>
    </div>
    <div class="friendProfileArea">
      <div class="friendTitleArea">${title}</div>
      <div class="friendMydonNameArea">ドンだーネーム：サンプルどんだー</div>
      ${danLine === null ? "" : `<div class="friendDanArea">${danLine}</div>`}
      ${writeForm}
    </div>
  </div>`;
}

/** Rows sit directly inside the `<ul>` — there is no `<li>` anywhere on these pages. */
function page(rows: string[], extra = ""): string {
  return `<!DOCTYPE html><html><body>
    <h1>ユーザー検索</h1>
    <div id="tabBody" class="tabColor1"><ul>${rows.join("\n")}</ul></div>
    ${extra}
  </body></html>`;
}

function parseOrThrow(html: string) {
  const result = parsePlayerRowsPage(html, PAGE);
  if (isErr(result)) {
    throw new Error(`expected a reading, got ${JSON.stringify(result.error)}`);
  }
  return result.value;
}

describe("parsePlayerRowsPage", () => {
  test("reads a search row, which carries no hidden taiko_no at all", () => {
    const reading = parseOrThrow(page([row()]));

    expect(reading.rows).toHaveLength(1);
    const [only] = reading.rows;
    expect(only?.taikoNo).toBe(TAIKO_NO);
    expect(only?.nickname).toBe("サンプルどんだー");
    expect(only?.title).toBe("サンプル称号");
    expect(only?.dan).toEqual({ kind: "dan", dan: 15, clearState: "redClear" });
    expect(only?.myDonImageUrl).toContain("img.taiko-p.jp");
  });

  test("one reader serves the list shape too, and never reads its controls as data", () => {
    const reading = parseOrThrow(page([row({ withWriteForm: true })]));

    expect(reading.rows).toHaveLength(1);
    // The write form carries taiko_no, self_url and _tckt; none of them is the player's data.
    expect(reading.rows[0]?.nickname).toBe("サンプルどんだー");
    expect(JSON.stringify(reading.rows[0])).not.toContain("TCKT");
    expect(JSON.stringify(reading.rows[0])).not.toContain("self_url");
  });

  test("normalises the whitespace and &nbsp; the search row wraps its title in", () => {
    const spaced = parseOrThrow(page([row({ title: "称号： 世界一決定戦&nbsp;ありがドン " })]));

    expect(spaced.rows[0]?.title).toBe("世界一決定戦 ありがドン");
  });

  test("the six tiers land on the plate reader's vocabulary", () => {
    const tiers: [string, string][] = [
      ["段位：五級(赤クリア)", "redClear"],
      ["段位：一級(赤フルコン)", "redFullCombo"],
      ["段位：初段(赤ドンダフル)", "redDonderful"],
      ["段位：五段(金クリア)", "goldClear"],
      ["段位：九段(金フルコン)", "goldFullCombo"],
      ["段位：十段(金ドンダフル)", "goldDonderful"],
    ];

    for (const [line, expected] of tiers) {
      const reading = parseOrThrow(page([row({ danLine: line })]));
      expect(reading.rows[0]?.dan).toMatchObject({ kind: "dan", clearState: expected });
    }
  });

  test("段位なし is no dan — and it is not the same as a missing dan line", () => {
    const stated = parseOrThrow(page([row({ danLine: "段位：段位なし" })]));
    const absent = parseOrThrow(page([row({ danLine: null })]));

    expect(stated.rows[0]?.dan).toEqual({ kind: "none" });
    expect(absent.rows[0]?.dan).toEqual({ kind: "notShown" });
  });

  test("a dan name or tier outside the known vocabulary is not guessed at", () => {
    const unknownName = parseOrThrow(page([row({ danLine: "段位：達人(金クリア)" })]));
    const unknownTier = parseOrThrow(page([row({ danLine: "段位：十段(虹クリア)" })]));

    expect(unknownName.rows[0]?.dan).toEqual({ kind: "notShown" });
    expect(unknownTier.rows[0]?.dan).toEqual({ kind: "notShown" });
  });

  test("carries the paging the site offers", () => {
    const paged = parseOrThrow(
      page(
        [row(), row()],
        `<a href="user_search.php?exec=1&keyword=&dan_id=15&page=2">next</a>
         <script>if (current.page >= 10) { $('#pager').hide(); }</script>`,
      ),
    );

    expect(paged.nextPage).toBe(2);
    expect(paged.pageCount).toBe(10);
  });

  test("an empty list is a reading, and its notice says which kind of empty", () => {
    const emptyList = parseOrThrow(
      page([], `<div id="error" class="contentBox errorArea">フレンドが登録されていません。</div>`),
    );
    const noMatch = parseOrThrow(
      page(
        [],
        `<div id="error" class="contentBox errorArea">検索結果に該当するプレイヤーがみつからなかったドン！</div>`,
      ),
    );

    expect(emptyList.rows).toHaveLength(0);
    expect(emptyList.notice).toBe("フレンドが登録されていません。");
    expect(noMatch.notice).toBe("検索結果に該当するプレイヤーがみつからなかったドン！");
    expect(noMatch.nextPage).toBeNull();
  });

  test("the block list is not this shape, and reads as empty rather than being mis-parsed", () => {
    // Its rows are `.friendblocklist`; nothing here matches `.friendArea`.
    const blockList = parseOrThrow(
      `<html><body><h1>ブロックリスト</h1>
       <div id="error" class="contentBox errorArea">対象者が存在しません。</div>
       </body></html>`,
    );

    expect(blockList.rows).toHaveLength(0);
    expect(blockList.notice).toBe("対象者が存在しません。");
  });

  test("refuses the logged-out page", () => {
    const result = parsePlayerRowsPage(
      `<html><body><form id="login_form" action="login_process.php"></form></body></html>`,
      PAGE,
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("loggedOut");
    }
  });
});
