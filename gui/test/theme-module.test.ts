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
// A quoted or template literal is read whole, so a `,` or `}` inside it ends no value.
const QUOTED = String.raw`"[^"]*"|'[^']*'|\x60[^\x60]*\x60`;
const TO_ITS_END = String.raw`(?:${QUOTED}|[^,}\n"'\x60])*`;
const IN_BRACES = String.raw`\{(?:${QUOTED}|[^}"'\x60])*\}`;
// A setting's whole value: an attribute's string or braces, or an object's value up to its end.
const FONT = new RegExp(
  String.raw`\b(?:fontSize|fontWeight|fontFamily|font)(:|=)\s*("[^"]*"|${IN_BRACES}|${TO_ITS_END})`,
  "g",
);
const CORNER = new RegExp(String.raw`\bborder\w*Radius:\s*(${TO_ITS_END})`, "g");
const LITERAL = new RegExp(String.raw`${QUOTED}|(?<![\w.$])\d+(?:\.\d+)?(?!\w)`, "g");
// What a value may name of the theme: its keys, such as "fontWeightBold", and its text styles.
const THEME_KEY = /^font(?:Weight|Family)[A-Z]\w*$/;
const TEXT_STYLES = [
  ...["h1", "h2", "h3", "h4", "h5", "h6", "subtitle1", "subtitle2", "body1", "body2"],
  ...["caption", "overline", "button", "rowLine", "badge", "figure"],
];
const ICON_SIZES = ["small", "medium", "large"];
// A circle or a pill is a shape, not a corner.
const SHAPE = /^(?:50%|inherit|(?:0|999px)(?: (?:0|999px)){0,3})$/;

const unquoted = (value: string) => value.replace(/^["'`]|["'`]$/g, "");
const literalsIn = (value: string) => [...value.matchAll(LITERAL)].map(([literal]) => literal);

/** Every colour, font setting and corner the text writes in place. */
function writtenInPlace(text: string): string[] {
  const found = [...text.matchAll(COLOUR)].map(([whole]) => whole);
  for (const [whole, way = "", value = ""] of text.matchAll(FONT)) {
    const named = (words: string) =>
      THEME_KEY.test(words) ||
      TEXT_STYLES.includes(words) ||
      words === "inherit" ||
      (way === "=" && ICON_SIZES.includes(words));
    if (!literalsIn(value).every((literal) => named(unquoted(literal)))) {
      found.push(whole.trim());
    }
  }
  for (const [whole, value = ""] of text.matchAll(CORNER)) {
    const words = literalsIn(value).filter((literal) => /^["'`]/.test(literal));
    if (!words.every((literal) => SHAPE.test(unquoted(literal)))) {
      found.push(whole.trim());
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
    expect(writtenInPlace("{ fontWeight: current ? 600 : undefined }")).toHaveLength(1);
    expect(writtenInPlace(`{ borderRadius: \`\${BAR_PX / 2}px\`, px: 0.5 }`)).toHaveLength(1);
    expect(writtenInPlace("<text fontSize={12} fontWeight={600}>")).toHaveLength(2);
  });

  test("taken from the theme, as icon sizes or as shapes pass", () => {
    const sx =
      '{ fontWeight: "fontWeightBold", fontFamily: "fontFamilyMono", font: "inherit", ' +
      'fontSize: textSize("caption"), color: "text.secondary", borderRadius: 1, ' +
      'borderRadius: "50%", borderRadius: "0 999px 999px 0", "& #add-songs": {} }';

    expect(writtenInPlace(sx)).toEqual([]);
    expect(
      writtenInPlace('{ fontWeight: on ? "fontWeightBold" : undefined, fontSize: MARK_PX }'),
    ).toEqual([]);
    expect(
      writtenInPlace('<CheckIcon fontSize="small" /><text fontSize={typography.caption.fontSize}>'),
    ).toEqual([]);
  });
});
