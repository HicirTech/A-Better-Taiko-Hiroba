import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ok, type Transport, type TransportResponse } from "@abth/core";

import { saveReads } from "../electron/save-reads";

const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
});

function newFolder(): string {
  const folder = mkdtempSync(join(tmpdir(), "abth-save-reads-"));
  folders.push(folder);
  return folder;
}

function answering(pages: Record<string, [type: string, body: string | Uint8Array]>): Transport {
  return {
    async send(request) {
      const [type, body] = pages[request.url] ?? ["text/plain", ""];
      const response: TransportResponse = {
        status: 200,
        url: request.url,
        headers: { "content-type": type },
        body: typeof body === "string" ? new TextEncoder().encode(body) : body,
      };
      return ok(response);
    },
  };
}

const MY_PAGE = "https://hiroba.test/mypage_top.php";
const EDITOR = "https://hiroba.test/mypage_kisekae.php";
const SAVE = "https://hiroba.test/ajax/change_mydon.php";
const TOKEN = "0123456789abcdef0123456789abcdef";
/** Three ways a page writes a token input: id first, name first, and value before both. */
const PAGE_WITH_TOKENS = `<form id="renameForm"><input type="hidden" id="_tckt" name="_tckt" value="${TOKEN}" />
<input name="_tckt" type="hidden" value='${TOKEN}'><input value="${TOKEN}" name="_tckt"></form>
<input type="hidden" id="color_face" name="color_face" value="8">`;

describe("saveReads", () => {
  test("hands the caller's abort signal on to the transport it wraps", async () => {
    const seen: (AbortSignal | undefined)[] = [];
    const inner: Transport = {
      async send(request, signal) {
        seen.push(signal);
        return ok({ status: 200, url: request.url, headers: {}, body: new Uint8Array() });
      },
    };
    const controller = new AbortController();
    await saveReads(inner, newFolder()).send(
      { method: "GET", url: "https://hiroba.test/mypage_top.php" },
      controller.signal,
    );
    expect(seen).toEqual([controller.signal]);
  });

  test("keeps each page under its own name, with every form token replaced", async () => {
    const folder = newFolder();
    const saving = saveReads(
      answering({
        [MY_PAGE]: ["text/html; charset=utf-8", PAGE_WITH_TOKENS],
        [EDITOR]: ["text/html; charset=utf-8", `<p>editor</p>${PAGE_WITH_TOKENS}`],
      }),
      folder,
    );
    await saving.send({ method: "GET", url: MY_PAGE });
    await saving.send({ method: "GET", url: EDITOR });
    expect(readdirSync(folder).sort()).toEqual([
      "history",
      "mypage_kisekae.php.html",
      "mypage_kisekae.php.json",
      "mypage_top.php.html",
      "mypage_top.php.json",
    ]);
    const saved = readFileSync(join(folder, "mypage_top.php.html"), "utf8");
    expect(saved).not.toContain(TOKEN);
    expect(saved.match(/<tckt>/g)).toHaveLength(3);
    expect(saved).toContain(`id="color_face" name="color_face" value="8"`);
    expect(JSON.parse(readFileSync(join(folder, "mypage_top.php.json"), "utf8"))).toEqual({
      status: 200,
      path: "/mypage_top.php",
      contentType: "text/html; charset=utf-8",
    });
  });

  test("replaces a token in a JSON answer, and keeps an image's bytes as they came", async () => {
    const folder = newFolder();
    const image = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff]);
    const label = "https://hiroba.test/imgsrc_danlabel.php?taiko_no=000000000000";
    const json = "https://hiroba.test/answer.php";
    const saving = saveReads(
      answering({
        [label]: ["image/png", image],
        [json]: ["application/json", `{"result":0,"_tckt":"${TOKEN}"}`],
      }),
      folder,
    );
    await saving.send({ method: "GET", url: label });
    await saving.send({ method: "GET", url: json });
    expect(new Uint8Array(readFileSync(join(folder, "imgsrc_danlabel.php.png")))).toEqual(image);
    expect(readFileSync(join(folder, "answer.php.html"), "utf8")).toBe(
      `{"result":0,"_tckt":"<tckt>"}`,
    );
  });

  test("keeps a post's answer only in the history, token replaced, never the form it sent", async () => {
    const folder = newFolder();
    const saving = saveReads(
      answering({ [SAVE]: ["application/json", `{"result":705,"_tckt":"${TOKEN}"}`] }),
      folder,
      () => new Date("2026-09-28T01:02:03.456Z"),
    );
    const sent = await saving.send({ method: "POST", url: SAVE, form: [["_tckt", TOKEN]] });
    expect(sent.ok && new TextDecoder().decode(sent.value.body)).toBe(
      `{"result":705,"_tckt":"${TOKEN}"}`,
    );
    expect(readdirSync(folder)).toEqual(["history"]);
    const history = join(folder, "history");
    expect(readdirSync(history).sort()).toEqual([
      "20260928-010203-001-POST-change_mydon.php.html",
      "20260928-010203-001-POST-change_mydon.php.json",
    ]);
    const answer = readFileSync(
      join(history, "20260928-010203-001-POST-change_mydon.php.html"),
      "utf8",
    );
    expect(answer).toBe(`{"result":705,"_tckt":"<tckt>"}`);
    expect(
      JSON.parse(
        readFileSync(join(history, "20260928-010203-001-POST-change_mydon.php.json"), "utf8"),
      ),
    ).toEqual({
      at: "2026-09-28T01:02:03.456Z",
      method: "POST",
      status: 200,
      path: "/ajax/change_mydon.php",
      contentType: "application/json",
    });
  });

  test("numbers every answer in the order it came, reads and posts alike", async () => {
    const folder = newFolder();
    const saving = saveReads(
      answering({
        [EDITOR]: ["text/html; charset=utf-8", PAGE_WITH_TOKENS],
        [SAVE]: ["application/json", `{"result":0,"_tckt":""}`],
      }),
      folder,
      () => new Date("2026-09-28T01:02:03.000Z"),
    );
    await saving.send({ method: "GET", url: EDITOR });
    await saving.send({ method: "POST", url: SAVE, form: [["_tckt", TOKEN]] });
    await saving.send({ method: "GET", url: EDITOR });
    const pages = readdirSync(join(folder, "history"))
      .filter((name) => name.endsWith(".html"))
      .sort();
    expect(pages).toEqual([
      "20260928-010203-001-GET-mypage_kisekae.php.html",
      "20260928-010203-002-POST-change_mydon.php.html",
      "20260928-010203-003-GET-mypage_kisekae.php.html",
    ]);
    for (const page of pages) {
      expect(readFileSync(join(folder, "history", page), "utf8")).not.toContain(TOKEN);
    }
  });

  test("keeps only the latest costume preview, and none of them in the history", async () => {
    const folder = newFolder();
    const first = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x01]);
    const second = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x02]);
    const preview = (face: number) =>
      `https://hiroba.test/imgsrc_mydon.php?face=${face}&body=1&limb=1&cos1=0&cos2=0&cos3=0&cos4=0&cos5=0`;
    const saving = saveReads(
      answering({
        [preview(1)]: ["image/png", first],
        [preview(2)]: ["image/png", second],
        [EDITOR]: ["text/html; charset=utf-8", PAGE_WITH_TOKENS],
      }),
      folder,
      () => new Date("2026-09-28T01:02:03.000Z"),
    );
    await saving.send({ method: "GET", url: EDITOR });
    await saving.send({ method: "GET", url: preview(1) });
    await saving.send({ method: "GET", url: preview(2) });
    await saving.send({ method: "GET", url: EDITOR });
    expect(new Uint8Array(readFileSync(join(folder, "imgsrc_mydon.php.png")))).toEqual(second);
    expect(JSON.parse(readFileSync(join(folder, "imgsrc_mydon.php.json"), "utf8"))).toEqual({
      status: 200,
      path: "/imgsrc_mydon.php",
      contentType: "image/png",
    });
    expect(readdirSync(join(folder, "history")).sort()).toEqual([
      "20260928-010203-001-GET-mypage_kisekae.php.html",
      "20260928-010203-001-GET-mypage_kisekae.php.json",
      "20260928-010203-002-GET-mypage_kisekae.php.html",
      "20260928-010203-002-GET-mypage_kisekae.php.json",
    ]);
  });

  test("keeps only the latest item thumbnail, counting every one, and none in the history", async () => {
    const folder = newFolder();
    const thumbnail = (cos: number) => `https://hiroba.test/imgsrc_kisekae.php?cos=${cos}&type=1`;
    const picture = (cos: number) => new Uint8Array([0x89, 0x50, 0x4e, 0x47, cos]);
    const saving = saveReads(
      answering({
        [thumbnail(4)]: ["image/png", picture(4)],
        [thumbnail(14)]: ["image/png", picture(14)],
        [thumbnail(36)]: ["image/png", picture(36)],
        [EDITOR]: ["text/html; charset=utf-8", PAGE_WITH_TOKENS],
      }),
      folder,
      () => new Date("2026-09-28T01:02:03.000Z"),
    );
    await saving.send({ method: "GET", url: EDITOR });
    for (const cos of [4, 14, 36]) {
      await saving.send({ method: "GET", url: thumbnail(cos) });
    }
    expect(new Uint8Array(readFileSync(join(folder, "imgsrc_kisekae.php.png")))).toEqual(
      picture(36),
    );
    expect(JSON.parse(readFileSync(join(folder, "imgsrc_kisekae.php.json"), "utf8"))).toEqual({
      status: 200,
      path: "/imgsrc_kisekae.php",
      contentType: "image/png",
      count: 3,
    });
    expect(readdirSync(join(folder, "history")).sort()).toEqual([
      "20260928-010203-001-GET-mypage_kisekae.php.html",
      "20260928-010203-001-GET-mypage_kisekae.php.json",
    ]);
    const editorStatus = JSON.parse(readFileSync(join(folder, "mypage_kisekae.php.json"), "utf8"));
    expect(editorStatus).not.toHaveProperty("count");
  });

  test("hands the answer back as it came when its copy cannot be written", async () => {
    // A folder where the label's copy would go: the write fails, as a file held open would.
    const folder = newFolder();
    mkdirSync(join(folder, "imgsrc_danlabel.php.png"));
    const image = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff]);
    const label = "https://hiroba.test/imgsrc_danlabel.php?taiko_no=000000000000";
    const sent = await saveReads(answering({ [label]: ["image/png", image] }), folder).send({
      method: "GET",
      url: label,
    });
    expect(sent.ok && sent.value.body).toEqual(image);

    // A file where the folder would go: nothing can be written under it.
    const inTheWay = join(newFolder(), "debug");
    writeFileSync(inTheWay, "");
    const read = await saveReads(
      answering({ [EDITOR]: ["text/html; charset=utf-8", PAGE_WITH_TOKENS] }),
      inTheWay,
    ).send({ method: "GET", url: EDITOR });
    expect(read.ok && new TextDecoder().decode(read.value.body)).toBe(PAGE_WITH_TOKENS);
  });
});
