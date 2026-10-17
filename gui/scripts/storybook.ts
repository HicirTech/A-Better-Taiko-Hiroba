/** The local Storybook on Node, with an optional `--pack <folder>`; `--host` is refused. */
import { dirname, isAbsolute, join } from "node:path";

import { PACK_VARIABLE, readStoryPack } from "../.storybook/pack";

const root = join(import.meta.dir, "..");
const STORYBOOK_BIN = join(
  dirname(Bun.resolveSync("storybook/package.json", root)),
  "dist",
  "bin",
  "dispatcher.js",
);
const DEV_ARGS = [
  "dev",
  "--config-dir",
  join(root, ".storybook"),
  "--port",
  "6006",
  "--exact-port",
  "--disable-telemetry",
  "--no-version-updates",
];

function fail(message: string): never {
  console.error(message);
  process.exit(64);
}

const args = process.argv.slice(2);
if (args.some((arg) => arg === "--host" || arg.startsWith("--host=") || arg === "-h")) {
  fail("--host is refused: the local Storybook answers this machine alone.");
}
const at = args.indexOf("--pack");
const packFolder = at === -1 ? null : (args[at + 1] ?? "");
const storybookArgs =
  at === -1 ? args : args.filter((_, index) => index !== at && index !== at + 1);

if (packFolder !== null) {
  if (!isAbsolute(packFolder)) {
    fail("--pack takes the absolute path of a folder holding a pack.json.");
  }
  // A pack in a work tree is one `git add` away from a commit.
  const git = Bun.spawnSync(["git", "-C", packFolder, "rev-parse", "--is-inside-work-tree"]);
  if (git.stdout.toString().trim() === "true") {
    fail("--pack is refused: the folder is inside a git work tree.");
  }
  const pack = readStoryPack(packFolder);
  const counts = new Map<string, number>();
  for (const key of Object.keys(pack.pictures)) {
    const kind = key.split("/")[0] ?? key;
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  const kinds = [...counts].map(([kind, count]) => `${kind} ${count}`).join(", ");
  console.log(`Resource pack "${pack.label}": ${kinds || "no pictures"}`);
}

const storybook = Bun.spawn(["node", STORYBOOK_BIN, ...DEV_ARGS, ...storybookArgs], {
  // Only --pack names a pack: a variable left in the shell or an env file does not.
  env: { ...process.env, [PACK_VARIABLE]: packFolder ?? "" },
  stdio: ["inherit", "inherit", "inherit"],
});
process.exit(await storybook.exited);
