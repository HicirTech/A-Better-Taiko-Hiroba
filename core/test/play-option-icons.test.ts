import { describe, expect, test } from "bun:test";

import {
  PLAY_OPTION_CODES,
  type PlayOptionCode,
  type PlayOptions,
  playOptionIcons,
} from "../src/index";

const NONE: PlayOptions = {
  speed: 1,
  doron: false,
  abekobe: false,
  random: "none",
  supportChart: null,
};

describe("playOptionIcons", () => {
  test("gives no code for a chart played with no option, speed 1 included", () => {
    expect(playOptionIcons(NONE)).toEqual([]);
  });

  test("gives the codes in the page's order: random, abekobe, doron, then the speed", () => {
    const options: PlayOptions = {
      ...NONE,
      speed: 1.5,
      doron: true,
      abekobe: true,
      random: "detarame",
    };

    expect(playOptionIcons(options)).toEqual([
      { option: "random", code: "a7" },
      { option: "abekobe", code: "a2" },
      { option: "doron", code: "a1" },
      { option: "speed", code: "a15" },
    ]);
  });

  test.each<[speed: number, code: PlayOptionCode]>([
    [2, "a3"],
    [2.5, "a25"],
    [4, "a5"],
  ])("draws speed %p with %p", (speed, code) => {
    expect(playOptionIcons({ ...NONE, speed })).toEqual([{ option: "speed", code }]);
  });

  test("knows each of the 19 codes Hiroba has, and no other", () => {
    expect(new Set(PLAY_OPTION_CODES).size).toBe(19);
    expect(PLAY_OPTION_CODES).toContain("a6");
    expect(PLAY_OPTION_CODES).not.toContain("a8");
  });
});
