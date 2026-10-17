import { readFileSync, realpathSync, statSync } from "node:fs";
import { join, sep } from "node:path";

import type { Plugin } from "vite";

/** Names a resource pack's folder to the local Storybook; `scripts/storybook.ts` sets it. */
export const PACK_VARIABLE = "ABTH_STORY_PACK";

const PACK_MODULE = "virtual:abth-story-pack";
// Vite's mark for a module no file holds.
const RESOLVED_PACK_MODULE = `\0${PACK_MODULE}`;
const MANIFEST = "pack.json";
const FORMAT = "abth-story-pack";
// Twice the largest picture the app takes from Hiroba, a panel or a portrait.
const MAX_PICTURE_BYTES = 1024 * 1024;
// The most the app takes of taiko.wiki's song list, the largest data file.
const MAX_DATA_BYTES = 16 * 1024 * 1024;
// A picture lane's key, such as `rankIcon/5` or `costumeItem/costume2/21`, or `danLabel/<board>`.
const PICTURE_KEY = /^[A-Za-z]+(?:\/[\w-]+)*$/;
// A data file's name, such as `recentPlays`.
const DATA_NAME = /^[A-Za-z]+$/;
// Plain names below the pack's folder: no drive, root, backslash, `.` or `..`.
const PICTURE_PATH = /^(?:[\w-][\w.-]*\/)*[\w-][\w.-]*\.png$/;
const DATA_PATH = /^(?:[\w-][\w.-]*\/)*[\w-][\w.-]*\.json$/;
const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

/** A pack as stories read it: a label, PNGs in base64 by key, JSON files' text by name. */
export interface StoryPack {
  readonly label: string;
  readonly pictures: Readonly<Record<string, string>>;
  readonly data: Readonly<Record<string, string>>;
}

interface Manifest {
  readonly format: typeof FORMAT;
  readonly version: 1;
  readonly label: string;
  readonly pictures: Readonly<Record<string, unknown>>;
  readonly data?: Readonly<Record<string, unknown>>;
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null;

function isManifest(value: unknown): value is Manifest {
  if (!isRecord(value)) {
    return false;
  }
  const { format, version, label, pictures, data } = value;
  return (
    format === FORMAT &&
    version === 1 &&
    typeof label === "string" &&
    isRecord(pictures) &&
    (data === undefined || isRecord(data))
  );
}

/** The file `path` names, which must match `shape` and really be in the pack, at most `maxBytes`. */
function packFile(root: string, entry: string, path: unknown, shape: RegExp, maxBytes: number) {
  if (typeof path !== "string" || !shape.test(path)) {
    throw new Error(`${MANIFEST}: ${entry} is not a path inside the pack`);
  }
  // A link inside the pack may lead out of it: only a file that really is in the pack is read.
  const file = realpathSync(join(root, path));
  if (!file.startsWith(`${root}${sep}`)) {
    throw new Error(`${MANIFEST}: ${entry} leads out of the pack`);
  }
  if (statSync(file).size > maxBytes) {
    throw new Error(`${MANIFEST}: ${entry} is larger than any the app reads`);
  }
  return readFileSync(file);
}

function readPicture(root: string, key: string, path: unknown): string {
  if (!PICTURE_KEY.test(key)) {
    throw new Error(`${MANIFEST}: ${JSON.stringify(key)} is no picture key`);
  }
  return packFile(root, key, path, PICTURE_PATH, MAX_PICTURE_BYTES).toString("base64");
}

function readData(root: string, name: string, path: unknown): string {
  if (!DATA_NAME.test(name)) {
    throw new Error(`${MANIFEST}: ${JSON.stringify(name)} is no data name`);
  }
  const text = packFile(root, name, path, DATA_PATH, MAX_DATA_BYTES).toString("utf8");
  try {
    JSON.parse(text);
  } catch {
    throw new Error(`${MANIFEST}: ${name} is no JSON`);
  }
  return text;
}

/** Reads the pack in `folder`: its `pack.json` and the files it names; throws otherwise. */
export function readStoryPack(folder: string): StoryPack {
  const root = realpathSync(folder);
  const manifest: unknown = JSON.parse(readFileSync(join(root, MANIFEST), "utf8"));
  if (!isManifest(manifest)) {
    throw new Error(`${MANIFEST} is no ${FORMAT} of version 1`);
  }
  const pictures: Record<string, string> = {};
  for (const [key, path] of Object.entries(manifest.pictures)) {
    pictures[key] = readPicture(root, key, path);
  }
  const data: Record<string, string> = {};
  for (const [name, path] of Object.entries(manifest.data ?? {})) {
    data[name] = readData(root, name, path);
  }
  return { label: manifest.label, pictures, data };
}

/** Answers the pack's module with `pack`, or null; with a pack, answers this machine alone. */
export function storyPackPlugin(pack: StoryPack | null): Plugin {
  return {
    name: "abth-story-pack",
    resolveId: (id) => (id === PACK_MODULE ? RESOLVED_PACK_MODULE : null),
    load: (id) => (id === RESOLVED_PACK_MODULE ? `export default ${JSON.stringify(pack)};` : null),
    configureServer(server) {
      if (pack === null) {
        return;
      }
      server.middlewares.use((request, response, next) => {
        if (LOOPBACK.has(request.socket.remoteAddress ?? "")) {
          next();
          return;
        }
        response.statusCode = 403;
        response.end();
      });
    },
  };
}
