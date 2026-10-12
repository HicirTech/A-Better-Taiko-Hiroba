import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import { PICTURE_EPOCH } from "../../src/hiroba-session";
import { IDP_MARKER, USER_DATA } from "./config";
import type { Ctx } from "./context";

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

  const hits: string[] = [];
  for (const file of walk(USER_DATA)) {
    const bytes = readFileSync(file).toString("latin1");
    if (
      tokens.some((t) => t !== "" && bytes.includes(t)) ||
      bytes.includes("_token_v2") ||
      bytes.includes(IDP_MARKER) ||
      bytes.includes("abth_mock_idp")
    ) {
      hits.push(file.slice(USER_DATA.length));
    }
  }
  results.userDataHits = hits;
  results.partitionsFolder = readdirSync(USER_DATA).includes("Partitions");
  const savedEditor = join(USER_DATA, "debug", "mypage_kisekae.php.html");
  results.debugReadsRedacted =
    existsSync(savedEditor) && readFileSync(savedEditor, "utf8").includes(`value="<tckt>"`);
  const savedTitleEditor = join(USER_DATA, "debug", "mypage_title_edit.php.html");
  results.titleDebugReadRedacted =
    existsSync(savedTitleEditor) &&
    readFileSync(savedTitleEditor, "utf8").includes(`value="<tckt>"`);
  results.noUndoKeptOnDisk = !existsSync(join(USER_DATA, "undo.json"));
  const PICTURES = join(USER_DATA, "pictures");
  const pictureFiles = (existsSync(PICTURES) ? [...walk(PICTURES)] : []).map((file) =>
    file.slice(PICTURES.length).split(sep).join("/"),
  );
  const HASH = "[0-9a-f]{64}";
  const filedAs = (pattern: string) => new RegExp(`^/${PICTURE_EPOCH}/${pattern}\\.png$`);
  results.picturesFiledUnderHashes =
    pictureFiles.some((file) => filedAs(`shared/${HASH}`).test(file)) &&
    pictureFiles.some((file) => filedAs(`player/${HASH}/${HASH}`).test(file)) &&
    pictureFiles.every((file) => filedAs(`(shared|player/${HASH})/${HASH}`).test(file));
  // Debug copies of the pages that showed an id may hold it; nothing else may.
  const inDebugCopies = (file: string) => file.slice(USER_DATA.length).split(sep)[1] === "debug";
  results.medalIdsKeptOffDisk =
    medalIds.length === 2 &&
    [...walk(USER_DATA)].every((file) => {
      const bytes = readFileSync(file).toString("latin1");
      return medalIds.every(
        (id) => !file.includes(id) && (inDebugCopies(file) || !bytes.includes(id)),
      );
    });

  // The scores section replays song 5 after its first read: the log on disk keeps that change.
  const changesFile = join(USER_DATA, "score-changes.json");
  const players = existsSync(changesFile)
    ? (
        JSON.parse(readFileSync(changesFile, "utf8")) as {
          players?: Record<string, { baselined?: boolean; changes?: KeptChange[] }>;
        }
      ).players
    : undefined;
  results.scoreChangesKept = Object.values(players ?? {}).some(
    ({ baselined, changes }) =>
      baselined === true &&
      (changes ?? []).some(
        ({ songNo, level, from, to }) =>
          songNo === "1005" && level === 1 && from.highScore === 800005 && to.highScore === 801005,
      ),
  );
}
