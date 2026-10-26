/** ABTH CDN's site from an ESE clone: each chart drawn and counted where it lies, never copied. */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import electronPath from "electron";
import { cdnChartPath, cdnDensityPath } from "../../src/shared/song-catalogue/abth-cdn";
import {
  densitiesByDifficulty,
  densityFile,
} from "../../src/shared/song-catalogue/read-chart-density";
import { DIFFICULTIES, isDifficulty } from "../../src/shared/song-catalogue/types";
import { webpOf } from "./encode";
import { workOf } from "./work-list";

/** Read by the site's workflow, which builds again only when ESE's commit has moved. */
const MANIFEST_PATH = "manifest.json";

/** What a build of ABTH CDN says of itself. */
interface CdnManifest {
  /** ESE's commit the charts were drawn from. */
  readonly ese: string;
  readonly builtAt: string;
  readonly songs: number;
  readonly charts: number;
  /** Drawings left out, as `<song>/<difficulty>`: charts the renderer or WebP could not take. */
  readonly skipped: readonly string[];
}

const { values } = parseArgs({
  options: {
    ese: { type: "string" },
    map: { type: "string" },
    out: { type: "string" },
    commit: { type: "string" },
  },
});
const { ese, map, out, commit } = values;
if (ese === undefined || map === undefined || out === undefined || commit === undefined) {
  throw new Error("usage: build.ts --ese <clone> --map <map.json> --out <site> --commit <sha>");
}

const work = workOf(readFileSync(map, "utf8")).map((song) => ({
  ...song,
  file: join(ese, song.path),
}));
const found = work.filter(({ file }) => existsSync(file));
console.log(`${work.length} songs in OurTaiko's map, ${found.length} with a chart in the clone`);

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "densities"), { recursive: true });
let densities = 0;
/** Each song's charts, as its notes were counted: a song the window leaves out names them. */
const courses = new Map<string, readonly string[]>();
for (const { songNo, file } of found) {
  const counted = densitiesByDifficulty(new TextDecoder("utf-8").decode(readFileSync(file)));
  courses.set(songNo, Object.keys(counted));
  if (Object.keys(counted).length > 0) {
    writeFileSync(join(out, cdnDensityPath(songNo)), densityFile(counted));
    densities += 1;
  }
}
console.log(`counted the notes of ${densities} songs`);

const scratch = mkdtempSync(join(tmpdir(), "abth-cdn-"));
try {
  const built = await Bun.build({
    entrypoints: [join(import.meta.dir, "draw-page.ts")],
    target: "browser",
  });
  const bundle = built.outputs[0];
  if (!built.success || bundle === undefined) {
    throw new Error("the drawing page did not build");
  }
  await Bun.write(join(scratch, "bundle.js"), bundle);
  writeFileSync(
    join(scratch, "page.html"),
    '<!doctype html><html><head><meta charset="utf-8"></head><body><script src="bundle.js"></script></body></html>',
  );
  const songs = found.map(({ songNo, file }) => ({ songNo, file }));
  writeFileSync(join(scratch, "work.json"), JSON.stringify({ difficulties: DIFFICULTIES, songs }));
  const pngs = join(scratch, "png");
  const drawing = Bun.spawn(
    [
      String(electronPath),
      join(import.meta.dir, "draw-window.cjs"),
      scratch,
      join(scratch, "work.json"),
      pngs,
      // A runner's chrome-sandbox is no SUID binary, and the page runs only this bundle; Chromium
      // reads the switch before draw-window.cjs runs, so it goes on the command line.
      "--no-sandbox",
    ],
    { stdout: "inherit", stderr: "inherit" },
  );
  if ((await drawing.exited) !== 0) {
    throw new Error("the drawing window failed");
  }

  let charts = 0;
  const leftOut: readonly string[] = JSON.parse(
    readFileSync(join(scratch, "left-out.json"), "utf8"),
  );
  const skipped = leftOut.flatMap((songNo) =>
    (courses.get(songNo) ?? []).map((difficulty) => `${songNo}/${difficulty}`),
  );
  const drawings = readdirSync(pngs).sort();
  for (const [at, name] of drawings.entries()) {
    const [songNo = "", difficulty = ""] = name.replace(/\.png$/, "").split("-");
    if (!isDifficulty(difficulty)) {
      continue;
    }
    const place = `${at + 1} of ${drawings.length}`;
    const webp = await webpOf(readFileSync(join(pngs, name)));
    if (webp === null) {
      skipped.push(`${songNo}/${difficulty}`);
      console.log(`left out ${songNo}/${difficulty}, ${place}: no WebP can hold it`);
      continue;
    }
    const target = join(out, cdnChartPath(songNo, difficulty));
    mkdirSync(join(target, ".."), { recursive: true });
    writeFileSync(target, webp);
    charts += 1;
    console.log(`kept ${songNo}/${difficulty}.webp, ${place}`);
  }
  console.log(`kept ${charts} drawings as WebP, left out ${skipped.length}`);

  const manifest: CdnManifest = {
    ese: commit,
    builtAt: new Date().toISOString(),
    songs: found.length,
    charts,
    skipped,
  };
  writeFileSync(join(out, MANIFEST_PATH), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(join(out, ".nojekyll"), "");
  writeFileSync(join(out, "index.html"), pageOf(manifest));
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

/** The site's front page: what it holds, where it comes from, and that it keeps no chart file. */
function pageOf(manifest: CdnManifest): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ABTH CDN</title></head>
<body>
<h1>ABTH CDN</h1>
<p>Chart pictures and note counts for <a href="https://github.com/HicirTech/A-Better-Taiko-Hiroba">A Better Taiko Hiroba</a>, drawn ahead of time from the charts of <a href="https://ese.tjadataba.se/ESE/ESE">ESE</a> (TJADB) with TJA Renderer. No chart file is kept here: only the drawings and the numbers.</p>
<p>${manifest.charts} drawings of ${manifest.songs} songs, from ESE's commit <code>${manifest.ese}</code>, built ${manifest.builtAt}.</p>
</body>
</html>
`;
}
