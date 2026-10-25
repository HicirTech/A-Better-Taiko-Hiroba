import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const SRC = join(import.meta.dir, "../src");

// The theme module itself, the kit that serves the stories, and vendored code.
const NOT_CHECKED = ["theme", "story-kit", "vendor"];

// Hiroba's own look, which no theme changes: its colours, its plates, the words on its pictures.
const HIROBA_LOOK = [
  "shared/panel-colours.ts",
  "shared/song-catalogue/genre-look.ts",
  "pictures/hiroba-px.ts",
  "profile/title-plate.tsx",
  "my-page/score-panel.tsx",
  "my-page/medal-card.tsx",
  "my-page/my-don-portrait.tsx",
  "my-page/costume-item-grid.tsx",
  "my-page/costume-part-tiles.tsx",
];

// An element's id, such as "#add-songs", is no colour.
const COLOUR =
  /(?<![\w&])#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})(?![\w-])|\b(?:rgba?|hsla?)\(/gi;
const FONT =
  /\b(?:fontSize|fontWeight|fontFamily|font)(:\s*|=\{?\s*)("[^"]*"|'[^']*'|`[^`]*`|\d[\d.]*)/g;
const CORNER = /\bborder\w*Radius:\s*("[^"]*"|'[^']*'|`[^`]*`)/g;
// A theme's own keys, such as "fontWeightBold".
const THEME_KEY = /^font(?:Weight|Family)[A-Z]\w*$/;
const ICON_SIZES = ["small", "medium", "large"];
// A circle or a pill is a shape, not a corner.
const SHAPE = /^(?:50%|inherit|(?:0|999px)(?: (?:0|999px)){0,3})$/;

const unquoted = (value: string) => value.replace(/^["'`]|["'`]$/g, "");

/** Every colour, font setting and corner the text writes in place. */
function writtenInPlace(text: string): string[] {
  const found = [...text.matchAll(COLOUR)].map(([whole]) => whole);
  for (const [whole, way = "", value = ""] of text.matchAll(FONT)) {
    const words = unquoted(value);
    const iconSize = way.startsWith("=") && ICON_SIZES.includes(words);
    if (!THEME_KEY.test(words) && !iconSize && words !== "inherit") {
      found.push(whole);
    }
  }
  for (const [whole, value = ""] of text.matchAll(CORNER)) {
    if (!SHAPE.test(unquoted(value))) {
      found.push(whole);
    }
  }
  return found;
}

/** Every source file under a folder, by its path from `src`, its stories left out. */
function sourcesIn(at: string): string[] {
  return readdirSync(at).flatMap((name) => {
    const path = join(at, name);
    const file = relative(SRC, path).split(sep).join("/");
    if (statSync(path).isDirectory()) {
      return NOT_CHECKED.includes(file) ? [] : sourcesIn(path);
    }
    return /\.tsx?$/.test(name) && !name.endsWith(".stories.tsx") ? [file] : [];
  });
}

const inPlaceIn = (file: string) => writtenInPlace(readFileSync(join(SRC, file), "utf8"));

describe("the GUI's colours, fonts and corners", () => {
  test("come from the theme in every file but Hiroba's own look", () => {
    const inPlace = sourcesIn(SRC)
      .filter((file) => !HIROBA_LOOK.includes(file))
      .map((file) => ({ file, found: inPlaceIn(file) }))
      .filter(({ found }) => found.length > 0);

    expect(inPlace).toEqual([]);
  });

  test("are written in place in each file listed as Hiroba's own look", () => {
    expect(HIROBA_LOOK.filter((file) => inPlaceIn(file).length === 0)).toEqual([]);
  });

  test("written in place are found", () => {
    const sx =
      '{ color: "#fff", bgcolor: "rgba(0, 0, 0, 0.1)", fontSize: "0.8rem", fontWeight: 700, ' +
      'fontFamily: "monospace", borderRadius: "4px", borderRadius: `2px` }';

    expect(writtenInPlace(sx)).toHaveLength(7);
    expect(writtenInPlace("<text fontSize={12} fontWeight={600}>")).toHaveLength(2);
  });

  test("taken from the theme, as icon sizes or as shapes pass", () => {
    const sx =
      '{ fontWeight: "fontWeightBold", fontFamily: "fontFamilyMono", font: "inherit", ' +
      'fontSize: textSize("caption"), color: "text.secondary", borderRadius: 1, ' +
      'borderRadius: "50%", borderRadius: "0 999px 999px 0", "& #add-songs": {} }';

    expect(writtenInPlace(sx)).toEqual([]);
    expect(writtenInPlace('<CheckIcon fontSize="small" />')).toEqual([]);
  });
});
