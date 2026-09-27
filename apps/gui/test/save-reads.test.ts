/**
 * The debugging wrapper that keeps what a read brings back, against a stand-in transport and a
 * folder of its own under the system's temporary directory.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
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

/** Answers each URL with its page from `pages`, as the given content type. */
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

  test("writes nothing for a post, and still hands its answer back", async () => {
    const folder = newFolder();
    const saving = saveReads(
      answering({ [SAVE]: ["application/json", `{"result":0,"_tckt":""}`] }),
      folder,
    );
    const sent = await saving.send({ method: "POST", url: SAVE, form: [["_tckt", TOKEN]] });
    expect(sent.ok && new TextDecoder().decode(sent.value.body)).toBe(`{"result":0,"_tckt":""}`);
    expect(readdirSync(folder)).toEqual([]);
  });
});
