import { rmSync } from "node:fs";
import { launch, stop } from "./app";
import { CDP_PORT, en, NOON_JST, PAGE_GONE_USER_DATA } from "./config";
import type { Ctx } from "./context";
import { connect, waitFor } from "./harness";

export const pageGoneKeys = ["pageGoneShowsTheWindowsNote", "pageGoneNoteReloadsTheApp"] as const;

/** The window's page attached to anew, once its address is one `wanted` takes. */
async function pageAt(wanted: (url: string) => boolean) {
  const target = await waitFor("the window's page", async () => {
    const list = (await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()) as {
      url: string;
      webSocketDebuggerUrl: string;
    }[];
    return list.find((one) => wanted(one.url));
  });
  return connect(target.webSocketDebuggerUrl);
}

export async function pageGone(ctx: Ctx) {
  const { results } = ctx;
  const signIn = JSON.stringify(en.t("signIn.action"));
  rmSync(PAGE_GONE_USER_DATA, { recursive: true, force: true });
  const app = await launch({ now: NOON_JST, userData: PAGE_GONE_USER_DATA });
  try {
    await app.until(en.t("signIn.action"));
    // Not awaited: the page's process ends before it can answer.
    void app.page.send("Page.crash", {});
    const note = await pageAt((url) => url.includes("#page-gone="));
    const code = await waitFor("the window's note", async () => {
      const shown = await note.evaluate<string | null>(
        `document.querySelector("#window-crash-code")?.textContent ?? null`,
      );
      return shown ?? undefined;
    });
    results.pageGoneShowsTheWindowsNote = code.includes("renderer=");
    await note.evaluate(`document.querySelector("#window-crash-reload").click()`);
    const page = await pageAt((url) => url === "app://gui/");
    results.pageGoneNoteReloadsTheApp = await waitFor("the app again", async () => {
      const back = await page.evaluate<boolean>(`document.body.textContent.includes(${signIn})`);
      return back || undefined;
    });
  } finally {
    await stop(app);
  }
}
