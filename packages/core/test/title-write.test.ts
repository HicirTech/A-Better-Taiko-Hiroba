/**
 * The title write against a made-up Hiroba (profile-fixtures.ts) that keeps a title, a costume and
 * one token that only the latest page read holds: what is sent and in which order, how each result
 * code reads against the title read back, and what is refused before anything is sent.
 */
import { describe, expect, test } from "bun:test";

import {
  changeTitle,
  openTitleEditor,
  type TitleState,
  type TitleTarget,
  type Transport,
  type WriteOutcome,
} from "../src/index";
import { fakeHiroba, NOON_JST, ORIGIN, OWNED, WORN } from "./profile-fixtures";

const B: TitleTarget = { id: 39, title: "サンプル称号B" };
const SHARED = "サンプル 称号";

interface Run {
  readonly outcome: WriteOutcome<TitleState>;
  readonly undo: [TitleState, TitleState][];
}

async function change(
  transport: Transport,
  target: TitleTarget,
  options: { expected?: TitleState; crossCheck?: boolean; now?: Date; undoFails?: boolean } = {},
): Promise<Run> {
  const undo: [TitleState, TitleState][] = [];
  const outcome = await changeTitle(
    { expected: options.expected ?? { title: WORN }, target },
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

describe("openTitleEditor", () => {
  test("reads the worn title and the owned titles with one GET, and leaves the token behind", async () => {
    const { hiroba, transport, routes } = fakeHiroba();
    const opened = await openTitleEditor({ transport, hirobaOrigin: ORIGIN });
    expect(routes()).toEqual(["GET mypage_title_edit.php"]);
    expect(opened.ok && opened.value.state).toEqual({ title: WORN });
    expect(opened.ok && opened.value.options).toEqual(OWNED);
    expect(opened.ok && Object.keys(opened.value)).toEqual(["state", "options"]);
    expect(JSON.stringify(opened)).not.toContain(hiroba.token);
  });

  test("reads a session that is gone as such", async () => {
    const { transport } = fakeHiroba();
    const gone: Transport = {
      send: async (request) =>
        request.method === "GET"
          ? transport.send({ method: "GET", url: `${ORIGIN}/login.php` })
          : transport.send(request),
    };
    const opened = await openTitleEditor({ transport: gone, hirobaOrigin: ORIGIN });
    expect(opened.ok).toBe(false);
  });
});

describe("changeTitle's requests", () => {
  test("sends the title page, the pre-check, one save and my page, and no more", async () => {
    const { hiroba, transport, routes } = fakeHiroba();
    const { outcome } = await change(transport, B);
    expect(routes()).toEqual([
      "GET mypage_title_edit.php",
      "POST ajax/check_ip_title.php",
      "POST ajax/change_mydon_profile.php",
      "GET mypage_top.php",
    ]);
    expect(hiroba.title).toBe("サンプル称号B");
    expect(outcome).toMatchObject({
      kind: "applied",
      before: { title: WORN },
      after: { title: "サンプル称号B" },
      cross: "off",
    });
  });

  test("with the cross-check, reads the costume before the title page and after my page", async () => {
    const { transport, routes } = fakeHiroba();
    const { outcome } = await change(transport, B, { crossCheck: true });
    // The costume page first: it issues a token too, so the title page has to be the last read
    // before the posts, or the fake answers 705 and nothing is saved.
    expect(routes()).toEqual([
      "GET mypage_kisekae.php",
      "GET mypage_title_edit.php",
      "POST ajax/check_ip_title.php",
      "POST ajax/change_mydon_profile.php",
      "GET mypage_top.php",
      "GET mypage_kisekae.php",
    ]);
    expect(outcome).toMatchObject({ kind: "applied", cross: "unchanged" });
  });

  test("posts the pre-check as the page does: mode and newTitle, no token, the ajax headers", async () => {
    const { transport, postsTo } = fakeHiroba();
    await change(transport, B);
    const [precheck] = postsTo("ajax/check_ip_title.php");
    expect(precheck?.form).toEqual([
      ["mode", "title"],
      ["newTitle", "39"],
    ]);
    expect(precheck?.headers).toEqual({
      "X-Requested-With": "XMLHttpRequest",
      Accept: "application/json, text/javascript, */*; q=0.01",
      Origin: ORIGIN,
      Referer: `${ORIGIN}/mypage_title_edit.php`,
    });
  });

  test("posts the save with the fields in the script's order, and the token of the page just read", async () => {
    const { hiroba, transport, postsTo } = fakeHiroba();
    await change(transport, B);
    const [save] = postsTo("ajax/change_mydon_profile.php");
    // The title page was the last page read before the post: its token is the live one, and the
    // token the save carries was spent by it.
    expect(save?.form).toEqual([
      ["newTitle", "39"],
      ["_tckt", "1".padStart(32, "0")],
      ["mode", "title"],
      ["getStatus", "1"],
    ]);
    expect(save?.headers?.Referer).toBe(`${ORIGIN}/mypage_title_edit.php`);
    expect(save?.headers?.["X-Requested-With"]).toBe("XMLHttpRequest");
    expect(hiroba.title).toBe("サンプル称号B");
  });

  test("sends no save a second time, whatever the answer", async () => {
    const { hiroba, transport, postsTo } = fakeHiroba();
    hiroba.save = { code: 99, stores: false, message: "" };
    await change(transport, B);
    expect(postsTo("ajax/change_mydon_profile.php")).toHaveLength(1);
  });

  test("keeps the undo record before the first post: the title before and the title planned", async () => {
    const { transport } = fakeHiroba();
    const { undo } = await change(transport, B);
    expect(undo).toEqual([[{ title: WORN }, { title: "サンプル称号B" }]]);
  });

  test("sends nothing at all, and keeps nothing, in the 05:00-07:00 JST break", async () => {
    const { transport, routes } = fakeHiroba();
    const { outcome, undo } = await change(transport, B, {
      now: new Date("2026-09-26T20:30:00Z"),
    });
    expect(outcome).toEqual({ kind: "maintenance" });
    expect(routes()).toEqual([]);
    expect(undo).toEqual([]);
  });

  test("posts nothing when the undo record cannot be kept", async () => {
    const { transport, routes } = fakeHiroba();
    const { outcome } = await change(transport, B, { undoFails: true });
    expect(outcome).toEqual({ kind: "undoNotSaved" });
    expect(routes()).toEqual(["GET mypage_title_edit.php"]);
  });
});

describe("changeTitle's pre-check", () => {
  test.each([true, 1, "1"])(
    "a pre-check of %p stops the write with nothing saved",
    async (result) => {
      const { hiroba, transport, routes } = fakeHiroba();
      hiroba.precheck = { result };
      const { outcome } = await change(transport, B);
      expect(outcome).toEqual({ kind: "needsConfirmation" });
      expect(routes()).toEqual(["GET mypage_title_edit.php", "POST ajax/check_ip_title.php"]);
      expect(hiroba.title).toBe(WORN);
    },
  );

  test.each([0, "0", null, "false"])("a pre-check of %p stops it too", async (result) => {
    const { hiroba, transport, routes } = fakeHiroba();
    hiroba.precheck = { result };
    const { outcome } = await change(transport, B);
    expect(outcome).toMatchObject({ kind: "stoppedBeforeWrite", reason: "precheckUnexpected" });
    expect(routes()).toEqual(["GET mypage_title_edit.php", "POST ajax/check_ip_title.php"]);
    expect(hiroba.title).toBe(WORN);
  });
});

describe("changeTitle's result codes, by the title read back", () => {
  type CodeCase = [
    label: string,
    save: { code: number; stores: boolean; message?: string },
    expected: Record<string, unknown>,
  ];
  test.each<CodeCase>([
    ["0 with the title changed", { code: 0, stores: true }, { kind: "applied" }],
    [
      "0 with nothing changed",
      { code: 0, stores: false },
      { kind: "notApplied", reason: { kind: "unchanged" } },
    ],
    ["3 with the title changed", { code: 3, stores: true }, { kind: "appliedNotSynced" }],
    [
      "3 with nothing changed",
      { code: 3, stores: false },
      { kind: "notApplied", reason: { kind: "failed", code: 3 } },
    ],
    [
      "1 with nothing changed",
      { code: 1, stores: false },
      { kind: "notApplied", reason: { kind: "refused", code: 1, message: null } },
    ],
    [
      "5 with nothing changed",
      { code: 5, stores: false },
      { kind: "notApplied", reason: { kind: "refused", code: 5, message: null } },
    ],
    [
      "6 with nothing changed",
      { code: 6, stores: false },
      { kind: "notApplied", reason: { kind: "refused", code: 6, message: null } },
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
      "2, which this endpoint's script has no branch for",
      { code: 2, stores: false },
      { kind: "notApplied", reason: { kind: "failed", code: 2 } },
    ],
    [
      "a code nobody has seen",
      { code: 42, stores: false },
      { kind: "notApplied", reason: { kind: "failed", code: 42 } },
    ],
    [
      "a refusal the title contradicts, 5 with the change read back",
      { code: 5, stores: true },
      { kind: "applied" },
    ],
    ["a stale code the title contradicts", { code: 705, stores: true }, { kind: "applied" }],
  ])("%s", async (_label, save, expected) => {
    const { hiroba, transport } = fakeHiroba();
    // The token check is the fake's own: a save with the right token answers by `save`.
    hiroba.save = { message: "", ...save };
    const { outcome } = await change(transport, B);
    expect(outcome).toMatchObject(expected);
  });

  test("a code the title contradicts is only a note on an applied write", async () => {
    const { hiroba, transport } = fakeHiroba();
    hiroba.save = { code: 6, stores: true, message: "" };
    const { outcome } = await change(transport, B);
    expect(outcome.kind === "applied" && outcome.save.code).toBe(6);
  });

  test("keeps Hiroba's own message as text when the answer carries one, err_message included", async () => {
    const { hiroba, transport } = fakeHiroba();
    hiroba.save = { code: 5, stores: false, message: "<b>選択した称号は獲得していません。</b>" };
    const { outcome } = await change(transport, B);
    expect(outcome.kind === "notApplied" && outcome.reason).toEqual({
      kind: "refused",
      code: 5,
      message: "<b>選択した称号は獲得していません。</b>",
    });
  });

  test("a token another page read voided is stale, and nothing is retried", async () => {
    const { hiroba, transport, routes } = fakeHiroba();
    // The title page was read, then something else read a page with a form before the posts.
    const reading: Transport = {
      send: async (request) => {
        const sent = await transport.send(request);
        if (request.method === "POST" && request.url.endsWith("check_ip_title.php")) {
          await transport.send({ method: "GET", url: `${ORIGIN}/mypage_top.php` });
        }
        return sent;
      },
    };
    const { outcome } = await change(reading, B);
    expect(outcome).toMatchObject({ kind: "notApplied", reason: { kind: "stale" } });
    expect(routes().filter((route) => route === "POST ajax/change_mydon_profile.php")).toHaveLength(
      1,
    );
    expect(hiroba.title).toBe(WORN);
  });
});

describe("changeTitle's judgement of where the title ended", () => {
  test("a title set elsewhere, to another than planned, is diverged", async () => {
    const { hiroba, transport } = fakeHiroba();
    hiroba.afterSave = () => {
      hiroba.title = "サンプル称号C";
    };
    const { outcome } = await change(transport, B);
    expect(outcome).toMatchObject({
      kind: "diverged",
      before: { title: WORN },
      expectedAfter: { title: "サンプル称号B" },
      after: { title: "サンプル称号C" },
    });
  });

  test("a costume that moved during the write is diverged, though the title is as planned", async () => {
    const { hiroba, transport } = fakeHiroba();
    hiroba.afterSave = () => {
      hiroba.costume = { ...hiroba.costume, colorFace: 3 };
    };
    const { outcome } = await change(transport, B, { crossCheck: true });
    expect(outcome).toMatchObject({ kind: "diverged", cross: "changed" });
  });

  test("a read-back that is the other id's name with other white space is the planned title", async () => {
    const { hiroba, transport } = fakeHiroba();
    hiroba.title = "サンプル称号A";
    // Picked by id from a list that writes an ASCII space; the title page writes it as &nbsp; and
    // my page, which the read-back reads, as it likes: the titles read the same.
    const { outcome } = await change(transport, { id: 40, title: SHARED });
    expect(outcome).toMatchObject({ kind: "applied", after: { title: SHARED } });
  });
});

describe("changeTitle's refusals before anything is posted", () => {
  type RefusedCase = [label: string, target: TitleTarget, field: string];
  test.each<RefusedCase>([
    ["an id the account does not own", { id: 999, title: "サンプル称号B" }, "title.notOwned"],
    ["an id under another title's name", { id: 106, title: "サンプル称号B" }, "title.notOwned"],
    ["a name that no title has", { id: null, title: "リストにない称号" }, "title.unresolved"],
    ["no name at all", { id: null, title: "" }, "title.unresolved"],
    ["a name that more than one title has", { id: null, title: SHARED }, "title.ambiguous"],
  ])("refuses %s", async (_label, target, field) => {
    const { transport, routes } = fakeHiroba();
    const { outcome, undo } = await change(transport, target);
    expect(outcome).toEqual({ kind: "invalidTarget", field });
    expect(routes()).toEqual(["GET mypage_title_edit.php"]);
    expect(undo).toEqual([]);
  });

  test("posts nothing for the title that is worn already, by its own id or another's of the name", async () => {
    const { hiroba, transport, routes } = fakeHiroba();
    expect((await change(transport, { id: 106, title: WORN })).outcome).toEqual({
      kind: "nothingToChange",
    });
    hiroba.title = SHARED;
    expect(
      (await change(transport, { id: 41, title: SHARED }, { expected: { title: SHARED } })).outcome,
    ).toEqual({ kind: "nothingToChange" });
    expect(routes().filter((route) => route.startsWith("POST"))).toEqual([]);
  });

  test("posts nothing when the title was changed elsewhere since the editor was read", async () => {
    const { hiroba, transport, routes } = fakeHiroba();
    hiroba.title = "サンプル称号B";
    const { outcome, undo } = await change(transport, { id: 106, title: "サンプル称号A" });
    expect(outcome).toEqual({ kind: "changedSincePreview", current: { title: "サンプル称号B" } });
    expect(routes()).toEqual(["GET mypage_title_edit.php"]);
    expect(undo).toEqual([]);
  });
});

describe("changeTitle as an undo", () => {
  test("puts the title back by the name the record holds, resolved to the one id that has it", async () => {
    const { hiroba, transport, postsTo } = fakeHiroba();
    await change(transport, B);
    expect(hiroba.title).toBe("サンプル称号B");

    const { outcome } = await change(
      transport,
      { id: null, title: WORN },
      { expected: { title: "サンプル称号B" } },
    );
    expect(outcome).toMatchObject({ kind: "applied", after: { title: WORN } });
    expect(hiroba.title).toBe(WORN);
    expect(postsTo("ajax/change_mydon_profile.php").map((post) => post.form[0])).toEqual([
      ["newTitle", "39"],
      ["newTitle", "106"],
    ]);
  });

  test("refuses to put back a name two titles share, and sends no save", async () => {
    const { hiroba, transport, postsTo } = fakeHiroba();
    hiroba.title = "サンプル称号B";
    const { outcome } = await change(
      transport,
      { id: null, title: SHARED },
      { expected: { title: "サンプル称号B" } },
    );
    expect(outcome).toEqual({ kind: "invalidTarget", field: "title.ambiguous" });
    expect(postsTo("ajax/change_mydon_profile.php")).toEqual([]);
  });
});
