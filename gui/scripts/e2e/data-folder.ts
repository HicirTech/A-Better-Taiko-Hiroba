import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { PICTURE_EPOCH } from "../../src/hiroba-session";
import { IDP_MARKER, root, userDataOf } from "./config";
import { type Ctx, LANES } from "./context";

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      yield* walk(path);
    } else {
      yield path;
    }
  }
}

export const dataFolderKeys = [
  "userDataHits",
  "partitionsFolder",
  "debugReadsRedacted",
  "titleDebugReadRedacted",
  "noUndoKeptOnDisk",
  "picturesFiledUnderHashes",
  "medalIdsKeptOffDisk",
  "scoreChangesKept",
] as const;

interface KeptChange {
  readonly songNo: string;
  readonly level: number;
  readonly from: { readonly highScore: number | null };
  readonly to: { readonly highScore: number | null };
}

export async function dataFolder(ctx: Ctx) {
  const { medalIds, results, tokens } = ctx;
  const folders = [...LANES.keys()]
    .map((lane) => userDataOf(lane))
    .filter((dir) => existsSync(dir));
  /** The file at `path` in each lane's folder that holds one. */
  const inEachFolder = (path: string) =>
    folders.map((folder) => join(folder, path)).filter((file) => existsSync(file));
  const files = folders.flatMap((folder) => [...walk(folder)]);
  const out = join(root, "out");

  const hits: string[] = [];
  for (const file of files) {
    const bytes = readFileSync(file).toString("latin1");
    if (
      tokens.some((t) => t !== "" && bytes.includes(t)) ||
      bytes.includes("_token_v2") ||
      bytes.includes(IDP_MARKER) ||
      bytes.includes("abth_mock_idp")
    ) {
      hits.push(relative(out, file));
    }
  }
  results.userDataHits = hits;
  results.partitionsFolder = folders.some((folder) => readdirSync(folder).includes("Partitions"));
  const redacted = (page: string) => {
    const copies = inEachFolder(join("debug", page));
    return (
      copies.length > 0 &&
      copies.every((file) => readFileSync(file, "utf8").includes(`value="<tckt>"`))
    );
  };
  results.debugReadsRedacted = redacted("mypage_kisekae.php.html");
  results.titleDebugReadRedacted = redacted("mypage_title_edit.php.html");
  results.noUndoKeptOnDisk = inEachFolder("undo.json").length === 0;
  const pictureFiles = inEachFolder("pictures").flatMap((pictures) =>
    [...walk(pictures)].map((file) => file.slice(pictures.length).split(sep).join("/")),
  );
  const HASH = "[0-9a-f]{64}";
  const filedAs = (pattern: string) => new RegExp(`^/${PICTURE_EPOCH}/${pattern}.png$`);
  results.picturesFiledUnderHashes =
    pictureFiles.some((file) => filedAs(`shared/${HASH}`).test(file)) &&
    pictureFiles.some((file) => filedAs(`player/${HASH}/${HASH}`).test(file)) &&
    pictureFiles.every((file) => filedAs(`(shared|player/${HASH})/${HASH}`).test(file));
  // Debug copies of the pages that showed an id may hold it; nothing else may.
  const inDebugCopies = (file: string) => relative(out, file).split(sep)[1] === "debug";
  results.medalIdsKeptOffDisk =
    medalIds.length === 2 &&
    files.every((file) => {
      const bytes = readFileSync(file).toString("latin1");
      return medalIds.every(
        (id) => !file.includes(id) && (inDebugCopies(file) || !bytes.includes(id)),
      );
    });

  // The scores section replays song 5 after its first read: the log on disk keeps that change.
  const players = inEachFolder("score-changes.json").flatMap((file) =>
    Object.values(
      (
        JSON.parse(readFileSync(file, "utf8")) as {
          players?: Record<string, { baselined?: boolean; changes?: KeptChange[] }>;
        }
      ).players ?? {},
    ),
  );
  results.scoreChangesKept = players.some(
    ({ baselined, changes }) =>
      baselined === true &&
      (changes ?? []).some(
        ({ songNo, level, from, to }) =>
          songNo === "1005" && level === 1 && from.highScore === 800005 && to.highScore === 801005,
      ),
  );
}
