/**
 * Starts the packaged desktop app and checks its first screen, then quits. It never presses
 * "Sign in": a packaged build talks only to the real Hiroba, which a test must not touch. It will
 * not start at all while the packaged app keeps a session (`refusalToStart`): opened, the app would
 * read the real my page by itself.
 *
 *   bun run dist:dir && bun scripts/smoke-packaged.ts
 */
import { join } from "node:path";

import { refusalToStart } from "./packaged-session";

const refusal = refusalToStart(process.env.APPDATA);
if (refusal !== null) {
  console.error(refusal);
  process.exit(1);
}

const root = join(import.meta.dir, "..");
const exe = join(root, "release", "win-unpacked", "A Better Taiko Hiroba.exe");
const CDP_PORT = 9334;

const app = Bun.spawn([exe, `--remote-debugging-port=${CDP_PORT}`], {
  stdout: "ignore",
  stderr: "ignore",
});
try {
  const deadline = Date.now() + 30_000;
  let target: { url: string; webSocketDebuggerUrl: string } | undefined;
  while (target === undefined && Date.now() < deadline) {
    try {
      const list = (await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()) as {
        url: string;
        webSocketDebuggerUrl: string;
      }[];
      target = list.find((t) => t.url.startsWith("app://gui/"));
    } catch {
      // Not up yet.
    }
    await Bun.sleep(200);
  }
  if (target === undefined) {
    throw new Error("The main window never loaded app://gui/");
  }
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
  const evaluate = (expression: string) =>
    new Promise<unknown>((resolve) => {
      socket.addEventListener(
        "message",
        (event) => resolve(JSON.parse(String(event.data)).result?.result?.value),
        { once: true },
      );
      socket.send(
        JSON.stringify({
          id: 1,
          method: "Runtime.evaluate",
          params: { expression, returnByValue: true },
        }),
      );
    });
  await Bun.sleep(1000);
  const report = await evaluate(`(() => {
    const inline = document.createElement("script");
    inline.textContent = "window.__inlineRan = true";
    document.head.append(inline);
    return {
      signInShown: document.body.textContent.includes("Sign in to Hiroba"),
      bridge: Object.keys(window.abth ?? {}),
      require: typeof require,
      inlineScriptBlocked: window.__inlineRan !== true,
      font: getComputedStyle(document.body).fontFamily,
    };
  })()`);
  console.log(JSON.stringify(report, null, 2));
  socket.close();
} finally {
  app.kill();
  await app.exited;
}
