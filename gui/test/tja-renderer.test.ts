import { describe, expect, test } from "bun:test";

import { parseTJA } from "../src/vendor/tja-renderer/tja-parser";

// Hand-written charts: no chart from a TJA collection is kept in this repository.
const oni = (body: string) => `TITLE:Test\nBPM:120\nCOURSE:Oni\n#START\n${body}\n#END\n`;
const barsOf = (text: string) => parseTJA(text).oni?.bars.map((bar) => bar.join(""));

describe("TJA Renderer's parser, as the app changed it", () => {
  test("goes on with a kusudama whose start is written again before its end", () => {
    expect(barsOf(oni("9000,\n0090,\n8000,"))).toEqual(["9000", "0000", "8000"]);
  });

  test("goes on with a drumroll or a balloon in the same way", () => {
    expect(barsOf(oni("5050,\n0008,\n7700,\n0008,"))).toEqual(["5000", "0008", "7000", "0008"]);
  });

  test("starts a new long note once the one before has ended", () => {
    expect(barsOf(oni("5008,\n7008,\n1290,\n8000,"))).toEqual(["5008", "7008", "1290", "8000"]);
  });
});
