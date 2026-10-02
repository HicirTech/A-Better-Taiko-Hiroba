/**
 * The rename against a made-up Hiroba (profile-fixtures.ts): my page is its editor and its
 * read-back, there is no pre-check, and its token is the one the page just read. What is sent and
 * in which order, how each code reads against the name read back, and what is refused unsent.
 */
import { describe, expect, test } from "bun:test";

import {
  changeName,
  err,
  type NameState,
  type Transport,
  type TransportRequest,
  type WriteOutcome,
} from "../src/index";
import {
  fakeHiroba,
  MESSAGE_FOR_NAME_FILTER,
  NICKNAME,
  NOON_JST,
  ORIGIN,
  WORN,
} from "./profile-fixtures";

const NEW_NAME = "あたらしい";

interface Run {
  readonly outcome: WriteOutcome<NameState>;
  readonly undo: [NameState, NameState][];
}

async function rename(
  transport: Transport,
  nickname: string,
  options: { expected?: string; crossCheck?: boolean; now?: Date; undoFails?: boolean } = {},
): Promise<Run> {
  const undo: [NameState, NameState][] = [];
  const outcome = await changeName(
    { expected: { nickname: options.expected ?? NICKNAME }, target: { nickname } },
    {
      transport,
      hirobaOrigin: ORIGIN,
      now: () => options.now ?? NOON_JST,
      crossCheck: options.crossCheck ?? false,
      beginUndo: async (before, expectedAfter) => {
        if (options.undoFails) {
          throw new Error("disk full");
        }
        undo.push([before, expectedAfter]);
      },
    },
  );
  return { outcome, undo };
}

describe("changeName's requests", () => {
  test("sends my page for the editor, one save and my page to read back, and no pre-check", async () => {
    const { hiroba, transport, routes } = fakeHiroba();
    const { outcome } = await rename(transport, NEW_NAME);
    expect(routes()).toEqual([
      "GET mypage_top.php",
      "POST ajax/change_mydon_profile.php",
      "GET mypage_top.php",
    ]);
    expect(hiroba.nickname).toBe(NEW_NAME);
    expect(outcome).toMatchObject({
      kind: "applied",
      before: { nickname: NICKNAME },
      after: { nickname: NEW_NAME },
      cross: "off",
    });
  });

  test("with the cross-check, reads my page for the title before the editor and after the read-back", async () => {
    const { transport, routes } = fakeHiroba();
    const { outcome } = await rename(transport, NEW_NAME, { crossCheck: true });
    // The editor is the second of the page's reads, so its token is the last one issued: the
    // fake answers 705 and saves nothing if another page is read between it and the post.
    expect(routes()).toEqual([
      "GET mypage_top.php",
      "GET mypage_top.php",
      "POST ajax/change_mydon_profile.php",
      "GET mypage_top.php",
      "GET mypage_top.php",
    ]);
    expect(outcome).toMatchObject({ kind: "applied", cross: "unchanged" });
  });

  test("posts the form as the dialog serialises it, with the token of the page just read", async () => {
    const { transport, postsTo } = fakeHiroba();
    await rename(transport, NEW_NAME);
    const [save] = postsTo("ajax/change_mydon_profile.php");
    expect(save?.form).toEqual([
      ["_tckt", "1".padStart(32, "0")],
      ["mode", "name"],
      ["oldName", NICKNAME],
      ["newName", NEW_NAME],
    ]);
    expect(save?.headers).toEqual({
      "X-Requested-With": "XMLHttpRequest",
      Accept: "application/json, text/javascript, */*; q=0.01",
      Origin: ORIGIN,
      Referer: `${ORIGIN}/mypage_top.php`,
    });
  });

  test("sends a name with characters outside ASCII as it is, for the transport to encode", async () => {
    const { hiroba, transport, postsTo } = fakeHiroba();
    await rename(transport, "ドンだー！～");
    expect(postsTo("ajax/change_mydon_profile.php")[0]?.form[3]).toEqual([
      "newName",
      "ドンだー！～",
    ]);
    expect(hiroba.nickname).toBe("ドンだー！～");
  });

  test("sends no save a second time, whatever the answer", async () => {
    const { hiroba, transport, postsTo } = fakeHiroba();
    hiroba.save = { code: 99, stores: false, message: "" };
    await rename(transport, NEW_NAME);
    expect(postsTo("ajax/change_mydon_profile.php")).toHaveLength(1);
  });

  test("keeps the undo record before the first post: the name before and the name planned", async () => {
    const { transport } = fakeHiroba();
    const { undo } = await rename(transport, NEW_NAME);
    expect(undo).toEqual([[{ nickname: NICKNAME }, { nickname: NEW_NAME }]]);
  });

  test("keeps the fresh token the answer carries, and every token, out of the outcome", async () => {
    const { hiroba, transport } = fakeHiroba();
    const { outcome } = await rename(transport, NEW_NAME, { crossCheck: true });
    const shown = JSON.stringify(outcome);
    for (let token = 1; token <= hiroba.tokens; token++) {
      expect(shown).not.toContain(String(token).padStart(32, "0"));
    }
  });

  test("sends nothing at all in the 05:00-07:00 JST break", async () => {
    const { transport, routes } = fakeHiroba();
    const { outcome, undo } = await rename(transport, NEW_NAME, {
      now: new Date("2026-09-26T20:30:00Z"),
    });
    expect(outcome).toEqual({ kind: "maintenance" });
    expect(routes()).toEqual([]);
    expect(undo).toEqual([]);
  });

  test("posts nothing when the undo record cannot be kept", async () => {
    const { transport, routes } = fakeHiroba();
    const { outcome } = await rename(transport, NEW_NAME, { undoFails: true });
    expect(outcome).toEqual({ kind: "undoNotSaved" });
    expect(routes()).toEqual(["GET mypage_top.php"]);
  });
});

describe("changeName's result codes, by the name read back", () => {
  type CodeCase = [
    label: string,
    save: { code: number; stores: boolean; message?: string },
    expected: Record<string, unknown>,
  ];
  test.each<CodeCase>([
    ["0 with the name changed", { code: 0, stores: true }, { kind: "applied" }],
    [
      "0 with nothing changed",
      { code: 0, stores: false },
      { kind: "notApplied", reason: { kind: "unchanged" } },
    ],
    ["3 with the name changed", { code: 3, stores: true }, { kind: "appliedNotSynced" }],
    [
      "3 with nothing changed",
      { code: 3, stores: false },
      { kind: "notApplied", reason: { kind: "failed", code: 3 } },
    ],
    [
      "1 with nothing changed, the site's refusal",
      { code: 1, stores: false, message: "不適切用語は使用できません" },
      {
        kind: "notApplied",
        reason: { kind: "refused", code: 1, message: "不適切用語は使用できません" },
      },
    ],
    [
      "1 with no words of its own",
      { code: 1, stores: false },
      { kind: "notApplied", reason: { kind: "refused", code: 1, message: null } },
    ],
    [
      "2, a failed update",
      { code: 2, stores: false },
      { kind: "notApplied", reason: { kind: "refused", code: 2, message: null } },
    ],
    [
      "5, which the dialog's script has no branch for",
      { code: 5, stores: false },
      { kind: "notApplied", reason: { kind: "failed", code: 5 } },
    ],
    [
      "705, the token no longer good",
      { code: 705, stores: false },
      { kind: "notApplied", reason: { kind: "stale" } },
    ],
    [
      "900, maintenance",
      { code: 900, stores: false },
      { kind: "notApplied", reason: { kind: "siteMaintenance" } },
    ],
    [
      "901, maintenance",
      { code: 901, stores: false },
      { kind: "notApplied", reason: { kind: "siteMaintenance" } },
    ],
    [
      "a code nobody has seen",
      { code: 42, stores: false },
      { kind: "notApplied", reason: { kind: "failed", code: 42 } },
    ],
    ["a refusal the name contradicts", { code: 1, stores: true }, { kind: "applied" }],
  ])("%s", async (_label, save, expected) => {
    const { hiroba, transport } = fakeHiroba();
    hiroba.save = { message: "", ...save };
    const { outcome } = await rename(transport, NEW_NAME);
    expect(outcome).toMatchObject(expected);
  });

  test("shows a name the filter refuses with Hiroba's words, as the text it is", async () => {
    const { hiroba, transport } = fakeHiroba();
    hiroba.refusedNames = [NEW_NAME];
    const { outcome } = await rename(transport, NEW_NAME);
    expect(outcome.kind === "notApplied" && outcome.reason).toEqual({
      kind: "refused",
      code: 1,
      message: MESSAGE_FOR_NAME_FILTER,
    });
    expect(hiroba.nickname).toBe(NICKNAME);
  });

  test("keeps a message that holds markup as written, for the interface to show as text", async () => {
    const { hiroba, transport } = fakeHiroba();
    hiroba.save = { code: 1, stores: false, message: "<b>だめ</b><script>x()</script>" };
    const { outcome } = await rename(transport, NEW_NAME);
    expect(outcome.kind === "notApplied" && outcome.reason).toMatchObject({
      message: "<b>だめ</b><script>x()</script>",
    });
  });

  test("a token another page read voided is stale, and nothing is retried", async () => {
    const { hiroba, transport, postsTo } = fakeHiroba();
    const reading: Transport = {
      send: async (request: TransportRequest) => {
        if (request.method === "POST") {
          await transport.send({ method: "GET", url: `${ORIGIN}/mypage_top.php` });
        }
        return transport.send(request);
      },
    };
    const { outcome } = await rename(reading, NEW_NAME);
    expect(outcome).toMatchObject({ kind: "notApplied", reason: { kind: "stale" } });
    expect(postsTo("ajax/change_mydon_profile.php")).toHaveLength(1);
    expect(hiroba.nickname).toBe(NICKNAME);
  });
});

describe("changeName's judgement of where the name ended", () => {
  test("a name Hiroba stores as another is diverged, with all three values to compare", async () => {
    const { hiroba, transport } = fakeHiroba();
    hiroba.afterSave = () => {
      hiroba.nickname = "ドン";
    };
    const { outcome } = await rename(transport, "ﾄﾞﾝ");
    expect(outcome).toMatchObject({
      kind: "diverged",
      before: { nickname: NICKNAME },
      expectedAfter: { nickname: "ﾄﾞﾝ" },
      after: { nickname: "ドン" },
    });
  });

  test("a title that moved during the rename is diverged, though the name is as planned", async () => {
    const { hiroba, transport } = fakeHiroba();
    hiroba.afterSave = () => {
      hiroba.title = "サンプル称号B";
    };
    const { outcome } = await rename(transport, NEW_NAME, { crossCheck: true });
    expect(outcome).toMatchObject({ kind: "diverged", cross: "changed" });
  });

  test("a title that could not be read again is unknown, and the rename still stands", async () => {
    const { hiroba, transport } = fakeHiroba();
    let reads = 0;
    const failing: Transport = {
      send: (request) => {
        if (request.method === "GET" && ++reads === 4) {
          return Promise.resolve(err({ kind: "timedOut", url: request.url }));
        }
        return transport.send(request);
      },
    };
    const { outcome } = await rename(failing, NEW_NAME, { crossCheck: true });
    expect(outcome).toMatchObject({ kind: "applied", cross: "unknown" });
    expect(hiroba.nickname).toBe(NEW_NAME);
  });
});

describe("changeName's refusals before anything is posted", () => {
  type RefusedCase = [label: string, name: string, field: string];
  test.each<RefusedCase>([
    ["no name", "", "name.empty"],
    ["a name that starts with white space", " あたらしい", "name.edge"],
    ["a name that ends with an ideographic space", "あたらしい\u{3000}", "name.edge"],
    ["a name longer than the form takes", "あ".repeat(11), "name.tooLong"],
    ["a name with a control character", "あたら\u{0}しい", "name.control"],
    ["a name with half a surrogate pair", "あたら\u{d800}しい", "name.control"],
  ])("refuses %s", async (_label, name, field) => {
    const { transport, routes } = fakeHiroba();
    const { outcome, undo } = await rename(transport, name);
    expect(outcome).toEqual({ kind: "invalidTarget", field });
    expect(routes()).toEqual(["GET mypage_top.php"]);
    expect(undo).toEqual([]);
  });

  test("refuses every name while the page's flag says renames are closed", async () => {
    const { hiroba, transport, routes } = fakeHiroba();
    hiroba.renameFlag = "1";
    const { outcome } = await rename(transport, NEW_NAME);
    expect(outcome).toEqual({ kind: "invalidTarget", field: "name.closed" });
    expect(routes()).toEqual(["GET mypage_top.php"]);
  });

  test("leaves a rename whose flag it could not read to Hiroba", async () => {
    const { hiroba, transport } = fakeHiroba();
    hiroba.renameFlag = null;
    const { outcome } = await rename(transport, NEW_NAME);
    expect(outcome.kind).toBe("applied");
  });

  test("posts nothing for the name that is there already", async () => {
    const { transport, routes } = fakeHiroba();
    const { outcome } = await rename(transport, NICKNAME);
    expect(outcome).toEqual({ kind: "nothingToChange" });
    expect(routes()).toEqual(["GET mypage_top.php"]);
  });

  test("posts nothing when the name was changed elsewhere since the page was read", async () => {
    const { hiroba, transport, routes } = fakeHiroba();
    hiroba.nickname = "べつのなまえ";
    const { outcome, undo } = await rename(transport, NEW_NAME);
    expect(outcome).toEqual({ kind: "changedSincePreview", current: { nickname: "べつのなまえ" } });
    expect(routes()).toEqual(["GET mypage_top.php"]);
    expect(undo).toEqual([]);
  });

  test("leaves the title alone: a rename never sends a pre-check or a title", async () => {
    const { hiroba, transport, routes } = fakeHiroba();
    await rename(transport, NEW_NAME, { crossCheck: true });
    expect(routes().some((route) => route.includes("check_ip_title"))).toBe(false);
    expect(hiroba.title).toBe(WORN);
  });
});

describe("changeName as an undo", () => {
  test("puts the name back the way any other rename goes, with the old name as the new one", async () => {
    const { hiroba, transport, postsTo } = fakeHiroba();
    await rename(transport, NEW_NAME);
    const { outcome } = await rename(transport, NICKNAME, { expected: NEW_NAME });
    expect(outcome).toMatchObject({ kind: "applied", after: { nickname: NICKNAME } });
    expect(hiroba.nickname).toBe(NICKNAME);
    expect(postsTo("ajax/change_mydon_profile.php").map((post) => post.form.slice(2))).toEqual([
      [
        ["oldName", NICKNAME],
        ["newName", NEW_NAME],
      ],
      [
        ["oldName", NEW_NAME],
        ["newName", NICKNAME],
      ],
    ]);
  });

  test("keeps the record's name and says why when Hiroba refuses to change it back", async () => {
    const { hiroba, transport } = fakeHiroba();
    await rename(transport, NEW_NAME);
    hiroba.refusedNames = [NICKNAME];
    const { outcome } = await rename(transport, NICKNAME, { expected: NEW_NAME });
    expect(outcome).toMatchObject({
      kind: "notApplied",
      before: { nickname: NEW_NAME },
      after: { nickname: NEW_NAME },
      reason: { kind: "refused", code: 1, message: MESSAGE_FOR_NAME_FILTER },
    });
  });
});
