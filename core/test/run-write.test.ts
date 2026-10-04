import { describe, expect, test } from "bun:test";

import {
  type EditorReading,
  err,
  FormToken,
  isErr,
  ok,
  type ParseFailure,
  parsePage,
  type ReadDeps,
  type Result,
  readHirobaPage,
  requireMarker,
  runWrite,
  type SaveReading,
  type StopReason,
  type Transport,
  type TransportRequest,
  type WriteDeps,
  type WriteOutcome,
  type WriteSpec,
} from "../src/index";

const ORIGIN = "https://hiroba.test";
const TOKEN = "0123456789abcdef0123456789abcdef";
/** 12:00 JST, outside the daily break. */
const NOON_JST = new Date("2026-09-27T03:00:00Z");

interface Value {
  readonly n: number;
}

type Answer = Awaited<ReturnType<Transport["send"]>>;

const page = (path: string, html: string, type = "text/html; charset=UTF-8"): Answer =>
  ok({
    status: 200,
    url: `${ORIGIN}/${path}`,
    headers: { "content-type": type },
    body: new TextEncoder().encode(html),
  });
const json = (path: string, value: unknown) =>
  page(path, JSON.stringify(value), "application/json");
const LOGIN = page("login.php", `<form id="login_form"></form>`);
const ERROR_SHELL = `<h1>エラー</h1><table><tr><td>リクエストされたページは存在しません</td></tr></table>`;

/** A made-up Hiroba: pages show `state` and `crossValue`; posts answer from `answers`. */
function fakeHiroba(initial = 1) {
  const hiroba = {
    state: initial,
    crossValue: "a",
    requests: [] as string[],
    sent: [] as TransportRequest[],
    /** One-off answers by "METHOD path", used in order before the defaults. */
    answers: new Map<string, (() => Answer)[]>(),
    transport: {} as Transport,
  };
  const editPage = () =>
    page(
      "edit.php",
      `<form><input name="_tckt" value="${TOKEN}"><input id="n" value="${hiroba.state}"></form>`,
    );
  hiroba.transport = {
    async send(request) {
      const path = new URL(request.url).pathname.slice(1);
      const key = `${request.method} ${path}`;
      hiroba.requests.push(key);
      hiroba.sent.push(request);
      const queued = hiroba.answers.get(key)?.shift();
      if (queued !== undefined) {
        return queued();
      }
      switch (key) {
        case "GET edit.php":
          return editPage();
        case "GET cross.php":
          return page("cross.php", `<p id="c">${hiroba.crossValue}</p>`);
        case "POST ajax/check.php":
          return json("ajax/check.php", { result: false });
        case "POST ajax/save.php": {
          const n = request.method === "POST" ? request.form.find(([name]) => name === "n") : null;
          hiroba.state = Number(n?.[1]);
          return json("ajax/save.php", { result: 0, errmsg: "更新しました。", _tckt: "" });
        }
        default:
          return page(path, "not found", "text/html");
      }
    },
  };
  /** Queues a one-off answer for the next request of that method and path. */
  const next = (key: string, answer: () => Answer) => {
    hiroba.answers.set(key, [...(hiroba.answers.get(key) ?? []), answer]);
  };
  return { hiroba, next };
}

function parseEdit(html: string): Result<EditorReading<Value>, ParseFailure> {
  const root = parsePage(html, "edit.php");
  if (isErr(root)) {
    return root;
  }
  const n = requireMarker(root.value, "#n", "edit.php");
  const token = requireMarker(root.value, `[name="_tckt"]`, "edit.php");
  if (isErr(n)) {
    return n;
  }
  if (isErr(token)) {
    return token;
  }
  return ok({
    state: { n: Number(n.value.getAttribute("value")) },
    token: new FormToken(token.value.getAttribute("value") ?? ""),
  });
}

const readEditor = (deps: ReadDeps) => readHirobaPage(deps, "edit.php", parseEdit);

function reasonOf(save: SaveReading) {
  if (save.answer !== "json") {
    return { kind: "noAnswer" } as const;
  }
  if (save.code === 0) {
    return { kind: "unchanged" } as const;
  }
  return save.code !== null && save.code >= 1 && save.code <= 999
    ? ({ kind: "refused", code: save.code, message: save.message } as const)
    : ({ kind: "failed", code: save.code } as const);
}

const SPEC: WriteSpec<Value, Value, Value, EditorReading<Value>, string> = {
  readEditor,
  same: (left, right) => left.n === right.n,
  normalise: (_editor, target) => (target.n < 0 ? err({ field: "n" }) : ok(target)),
  // The made-up server rule: it stores 10 whatever it is sent above 10.
  expectedAfter: (_before, body) => ({ n: Math.min(body.n, 10) }),
  precheck: (editor, body) => ({
    path: "ajax/check.php",
    referer: "edit.php",
    form: [
      ["_tckt", editor.token],
      ["n", String(body.n)],
    ],
  }),
  save: (editor, body) => ({
    path: "ajax/save.php",
    referer: "edit.php",
    form: [
      ["_tckt", editor.token],
      ["n", String(body.n)],
    ],
  }),
  codes: { reason: reasonOf },
  readBack: async (deps) => {
    const read = await readEditor(deps);
    return isErr(read) ? read : ok(read.value.state);
  },
  cross: {
    read: (deps) =>
      readHirobaPage(deps, "cross.php", (html) => {
        const root = parsePage(html, "cross.php");
        return isErr(root) ? root : ok(root.value.querySelector("#c")?.text ?? "");
      }),
    same: (left, right) => left === right,
  },
};

function write(
  transport: Transport,
  target: number,
  options: {
    expected?: number;
    crossCheck?: boolean;
    now?: Date;
    clock?: () => Date;
  } = {},
  spec: WriteSpec<Value, Value, Value, EditorReading<Value>, string> = SPEC,
): Promise<WriteOutcome<Value>> {
  const deps: WriteDeps = {
    transport,
    hirobaOrigin: ORIGIN,
    now: options.clock ?? (() => options.now ?? NOON_JST),
    crossCheck: options.crossCheck ?? false,
  };
  return runWrite(spec, { expected: { n: options.expected ?? 1 }, target: { n: target } }, deps);
}

const APPLIED_SAVE: SaveReading = {
  answer: "json",
  code: 0,
  message: "更新しました。",
  report: "path=/ajax/save.php status=200 type=application/json bytes=56",
};

describe("runWrite", () => {
  test("reads, pre-checks, saves once and reads back, in that order", async () => {
    const { hiroba } = fakeHiroba();
    const outcome = await write(hiroba.transport, 2);
    expect(hiroba.requests).toEqual([
      "GET edit.php",
      "POST ajax/check.php",
      "POST ajax/save.php",
      "GET edit.php",
    ]);
    expect(outcome).toEqual({
      kind: "applied",
      before: { n: 1 },
      after: { n: 2 },
      save: APPLIED_SAVE,
      cross: "off",
    });
  });

  test("sends the fresh token with both posts, and the headers every ajax post needs", async () => {
    const { hiroba } = fakeHiroba();
    await write(hiroba.transport, 2);
    for (const request of hiroba.sent.filter((one) => one.method === "POST")) {
      expect(request.method === "POST" && request.form[0]).toEqual(["_tckt", TOKEN]);
      expect(request.headers?.["X-Requested-With"]).toBe("XMLHttpRequest");
    }
  });

  test("with the cross-check, reads the other page first, so the editor's token is the last one issued", async () => {
    const { hiroba } = fakeHiroba();
    const outcome = await write(hiroba.transport, 2, { crossCheck: true });
    expect(hiroba.requests).toEqual([
      "GET cross.php",
      "GET edit.php",
      "POST ajax/check.php",
      "POST ajax/save.php",
      "GET edit.php",
      "GET cross.php",
    ]);
    expect(outcome.kind === "applied" && outcome.cross).toBe("unchanged");
  });

  test("calls it diverged when the cross-checked page moved, even with the set as planned", async () => {
    const { hiroba, next } = fakeHiroba();
    next("GET cross.php", () => page("cross.php", `<p id="c">a</p>`));
    next("GET cross.php", () => page("cross.php", `<p id="c">b</p>`));
    const outcome = await write(hiroba.transport, 2, { crossCheck: true });
    expect(outcome.kind).toBe("diverged");
    expect(outcome.kind === "diverged" && outcome.cross).toBe("changed");
  });

  test("calls it diverged when the cross-checked page moved and the set did not", async () => {
    const { hiroba, next } = fakeHiroba();
    next("GET cross.php", () => page("cross.php", `<p id="c">a</p>`));
    next("GET cross.php", () => page("cross.php", `<p id="c">b</p>`));
    // The save answers 0 and moves nothing: it is the page beside it that changed, not a refusal.
    next("POST ajax/save.php", () => json("ajax/save.php", { result: 0 }));
    const outcome = await write(hiroba.transport, 2, { crossCheck: true });
    expect(outcome).toMatchObject({
      kind: "diverged",
      before: { n: 1 },
      expectedAfter: { n: 2 },
      after: { n: 1 },
      cross: "changed",
    });
  });

  test("marks the cross-check unknown when the page after the write does not arrive", async () => {
    const { hiroba, next } = fakeHiroba();
    next("GET cross.php", () => page("cross.php", `<p id="c">a</p>`));
    next("GET cross.php", () => err({ kind: "timedOut", url: `${ORIGIN}/cross.php` }));
    const outcome = await write(hiroba.transport, 2, { crossCheck: true });
    expect(outcome.kind === "applied" && outcome.cross).toBe("unknown");
  });

  test("sends nothing at all in the 05:00-07:00 JST break", async () => {
    const { hiroba } = fakeHiroba();
    const outcome = await write(hiroba.transport, 2, {
      now: new Date("2026-09-26T20:30:00Z"),
    });
    expect(outcome).toEqual({ kind: "maintenance" });
    expect(hiroba.requests).toEqual([]);
  });

  test("looks at the clock again before each post, so a write crossing 05:00 saves nothing", async () => {
    /** 04:59:59 JST for the first `calm` looks at the clock, and 05:00:30 JST after them. */
    const crossingAfter = (calm: number) => {
      let looks = 0;
      return () => new Date(looks++ < calm ? "2026-09-26T19:59:59Z" : "2026-09-26T20:00:30Z");
    };

    const beforeThePrecheck = fakeHiroba();
    const stopped = await write(beforeThePrecheck.hiroba.transport, 2, {
      clock: crossingAfter(1),
      crossCheck: true,
    });
    expect(stopped).toEqual({ kind: "maintenance" });
    expect(beforeThePrecheck.hiroba.requests).toEqual(["GET cross.php", "GET edit.php"]);

    const beforeTheSave = fakeHiroba();
    const outcome = await write(beforeTheSave.hiroba.transport, 2, {
      clock: crossingAfter(2),
    });
    expect(outcome).toEqual({ kind: "maintenance" });
    expect(beforeTheSave.hiroba.requests).toEqual(["GET edit.php", "POST ajax/check.php"]);
    expect(beforeTheSave.hiroba.state).toBe(1);
  });

  test("posts nothing when the set changed since the change was made", async () => {
    const { hiroba } = fakeHiroba(5);
    const outcome = await write(hiroba.transport, 2);
    expect(outcome).toEqual({ kind: "changedSincePreview", current: { n: 5 } });
    expect(hiroba.requests).toEqual(["GET edit.php"]);
  });

  test("posts nothing for a refused target, or one that changes nothing", async () => {
    const refused = fakeHiroba();
    expect(await write(refused.hiroba.transport, -1)).toEqual({
      kind: "invalidTarget",
      field: "n",
    });
    expect(refused.hiroba.requests).toEqual(["GET edit.php"]);

    const same = fakeHiroba(10);
    expect(await write(same.hiroba.transport, 12, { expected: 10 })).toEqual({
      kind: "nothingToChange",
    });
    expect(same.hiroba.requests).toEqual(["GET edit.php"]);
  });

  test("a session gone before the first post is sessionGone, and nothing was posted", async () => {
    const { hiroba, next } = fakeHiroba();
    next("GET edit.php", () => LOGIN);
    expect(await write(hiroba.transport, 2)).toEqual({
      kind: "sessionGone",
      writeMayHaveHappened: false,
    });
    expect(hiroba.requests).toEqual(["GET edit.php"]);
  });

  test("a read that fails before the first post is readFailed, with codes only", async () => {
    const { hiroba, next } = fakeHiroba();
    next("GET edit.php", () => page("edit.php", "<p>new shape</p>"));
    const outcome = await write(hiroba.transport, 2);
    expect(outcome).toEqual({
      kind: "readFailed",
      failure: {
        kind: "unexpectedPage",
        detail:
          "path=/edit.php status=200 type=text/html; charset=UTF-8 bytes=16 parse=missingMarker@#n",
      },
    });
  });

  test("stops before the save on anything but a pre-check of false", async () => {
    const cases: [() => Answer, WriteOutcome<Value>["kind"], StopReason | null][] = [
      [() => json("ajax/check.php", { result: true }), "needsConfirmation", null],
      [() => json("ajax/check.php", { result: 1 }), "needsConfirmation", null],
      [() => json("ajax/check.php", { result: "1" }), "needsConfirmation", null],
      [() => json("ajax/check.php", { result: 0 }), "stoppedBeforeWrite", "precheckUnexpected"],
      [() => json("ajax/check.php", {}), "stoppedBeforeWrite", "precheckUnexpected"],
      [() => page("ajax/check.php", ERROR_SHELL), "stoppedBeforeWrite", "precheckRejected"],
      [
        () => err({ kind: "timedOut", url: `${ORIGIN}/ajax/check.php` }),
        "stoppedBeforeWrite",
        "precheckNoAnswer",
      ],
    ];
    for (const [answer, kind, reason] of cases) {
      const { hiroba, next } = fakeHiroba();
      next("POST ajax/check.php", answer);
      const outcome = await write(hiroba.transport, 2);
      expect(outcome.kind).toBe(kind);
      expect(outcome.kind === "stoppedBeforeWrite" ? outcome.reason : null).toBe(reason);
      expect(hiroba.requests).toEqual(["GET edit.php", "POST ajax/check.php"]);
      expect(hiroba.state).toBe(1);
    }
  });

  test("a pre-check that ends on the login page costs one GET to decide the session", async () => {
    const gone = fakeHiroba();
    gone.next("POST ajax/check.php", () => LOGIN);
    gone.next("GET edit.php", () => editPageOf(1));
    gone.next("GET edit.php", () => LOGIN);
    expect(await write(gone.hiroba.transport, 2)).toEqual({
      kind: "sessionGone",
      writeMayHaveHappened: false,
    });
    expect(gone.hiroba.requests).toEqual(["GET edit.php", "POST ajax/check.php", "GET edit.php"]);

    const kept = fakeHiroba();
    kept.next("POST ajax/check.php", () => LOGIN);
    const outcome = await write(kept.hiroba.transport, 2);
    expect(outcome.kind === "stoppedBeforeWrite" && outcome.reason).toBe("precheckAtLogin");
    expect(kept.hiroba.requests).toEqual(["GET edit.php", "POST ajax/check.php", "GET edit.php"]);
  });

  test("after a save that timed out, reads back and never posts again", async () => {
    const { hiroba, next } = fakeHiroba();
    next("POST ajax/save.php", () => err({ kind: "timedOut", url: `${ORIGIN}/ajax/save.php` }));
    const outcome = await write(hiroba.transport, 2);
    expect(hiroba.requests).toEqual([
      "GET edit.php",
      "POST ajax/check.php",
      "POST ajax/save.php",
      "GET edit.php",
    ]);
    expect(outcome.kind === "notApplied" && outcome.reason).toEqual({ kind: "noAnswer" });
  });

  test("a save that answered, then a read-back on the login page, is sessionGone after a post", async () => {
    const { hiroba, next } = fakeHiroba();
    next("GET edit.php", () => editPageOf(1));
    next("GET edit.php", () => LOGIN);
    expect(await write(hiroba.transport, 2)).toEqual({
      kind: "sessionGone",
      writeMayHaveHappened: true,
      before: { n: 1 },
      expectedAfter: { n: 2 },
      save: APPLIED_SAVE,
    });
  });

  test("a read-back that fails otherwise leaves the outcome unknown", async () => {
    const { hiroba, next } = fakeHiroba();
    next("GET edit.php", () => editPageOf(1));
    next("GET edit.php", () => err({ kind: "unreachable", url: `${ORIGIN}/edit.php` }));
    const outcome = await write(hiroba.transport, 2);
    expect(outcome.kind).toBe("outcomeUnknown");
    expect(outcome.kind === "outcomeUnknown" && outcome.failure).toEqual({ kind: "unreachable" });
  });

  test("a 0 that moved nothing is notApplied, unchanged: the answer does not prove a write", async () => {
    const { hiroba, next } = fakeHiroba();
    next("POST ajax/save.php", () => json("ajax/save.php", { result: 0 }));
    const outcome = await write(hiroba.transport, 2);
    expect(outcome.kind === "notApplied" && outcome.reason).toEqual({ kind: "unchanged" });
    expect(outcome.kind === "notApplied" && outcome.after).toEqual({ n: 1 });
  });

  test("the state decides, and the code only annotates", async () => {
    const saved = fakeHiroba();
    saved.next("POST ajax/save.php", () => {
      saved.hiroba.state = 2;
      return json("ajax/save.php", { result: 5, errmsg: "sample" });
    });
    const applied = await write(saved.hiroba.transport, 2);
    expect(applied.kind).toBe("applied");
    expect(applied.kind === "applied" && applied.save.code).toBe(5);

    const refused = fakeHiroba();
    refused.next("POST ajax/save.php", () =>
      json("ajax/save.php", { result: 5, errmsg: "sample" }),
    );
    const notApplied = await write(refused.hiroba.transport, 2);
    expect(notApplied.kind === "notApplied" && notApplied.reason).toEqual({
      kind: "refused",
      code: 5,
      message: "sample",
    });
  });

  test("the not-synced code counts only for an endpoint that has one, and only as planned", async () => {
    const withCode = fakeHiroba();
    withCode.next("POST ajax/save.php", () => {
      withCode.hiroba.state = 2;
      return json("ajax/save.php", { result: 3 });
    });
    const spec = { ...SPEC, codes: { ...SPEC.codes, notSynced: 3 } };
    expect((await write(withCode.hiroba.transport, 2, {}, spec)).kind).toBe("appliedNotSynced");

    const without = fakeHiroba();
    without.next("POST ajax/save.php", () => {
      without.hiroba.state = 2;
      return json("ajax/save.php", { result: 3 });
    });
    expect((await write(without.hiroba.transport, 2)).kind).toBe("applied");
  });

  test("a set that moved somewhere else than planned is diverged", async () => {
    const { hiroba, next } = fakeHiroba();
    next("POST ajax/save.php", () => {
      hiroba.state = 7;
      return json("ajax/save.php", { result: 0 });
    });
    const outcome = await write(hiroba.transport, 2);
    expect(outcome).toMatchObject({
      kind: "diverged",
      before: { n: 1 },
      expectedAfter: { n: 2 },
      after: { n: 7 },
    });
  });

  test("judges by the server's rule for the set, not by the body sent", async () => {
    const { hiroba, next } = fakeHiroba();
    next("POST ajax/save.php", () => {
      hiroba.state = 10;
      return json("ajax/save.php", { result: 0 });
    });
    const outcome = await write(hiroba.transport, 12);
    expect(outcome).toMatchObject({ kind: "applied", after: { n: 10 } });
  });
});

function editPageOf(n: number): Answer {
  return page(
    "edit.php",
    `<form><input name="_tckt" value="${TOKEN}"><input id="n" value="${n}"></form>`,
  );
}
