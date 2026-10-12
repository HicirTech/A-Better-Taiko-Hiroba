import { describe, expect, test } from "bun:test";

import { type ChartDensity, courseLevel, type Level, tjaDensities } from "../src/index";

// Hand-written charts: no chart from a TJA collection is kept in this repository.
const chart = (body: string, headers = "BPM:120\nCOURSE:Oni") =>
  `TITLE:Test\n${headers}\n#START\n${body}\n#END\n`;

const lineOf = (density: ChartDensity | undefined) =>
  density !== undefined && !density.branched ? density.line : null;

const oniLine = (text: string) => lineOf(tjaDensities(text).get(4));

describe("tjaDensities", () => {
  test("counts each don and ka, small and big, in each second from the first note", () => {
    expect(oniLine(chart("1234,"))).toEqual({ notes: 4, seconds: 1.5, perSecond: [2, 2] });
  });

  test("leaves drumrolls, balloons and their ends uncounted", () => {
    expect(oniLine(chart("1500,\n0008,\n7000,\n0008,\n2000,"))).toEqual({
      notes: 2,
      seconds: 8,
      perSecond: [1, 0, 0, 0, 0, 0, 0, 0, 1],
    });
  });

  test("changes tempo where a measure says so, not at its start", () => {
    expect(oniLine(chart("11\n#BPMCHANGE 240\n11,"))).toEqual({
      notes: 4,
      seconds: 1.25,
      perSecond: [2, 2],
    });
  });

  test("gives a measure the length #MEASURE sets", () => {
    expect(oniLine(chart("#MEASURE 3/4\n100,\n100,", "BPM:60\nCOURSE:Oni"))).toEqual({
      notes: 2,
      seconds: 3,
      perSecond: [1, 0, 0, 1],
    });
  });

  test("moves the notes after a #DELAY by its seconds", () => {
    expect(oniLine(chart("1000,\n#DELAY 1.5\n1000,"))).toEqual({
      notes: 2,
      seconds: 3.5,
      perSecond: [1, 0, 0, 1],
    });
  });

  test("lets an empty measure take its whole length", () => {
    expect(oniLine(chart("1,\n,\n1,"))).toEqual({
      notes: 2,
      seconds: 4,
      perSecond: [1, 0, 0, 0, 1],
    });
  });

  test("reads each branch of a branched chart along its own path", () => {
    const body = "1000,\n#BRANCHSTART p,10,20\n#N\n1000,\n#E\n1100,\n#M\n1111,\n#BRANCHEND\n2000,";
    expect(tjaDensities(chart(body)).get(4)).toEqual({
      branched: true,
      lines: {
        normal: { notes: 3, seconds: 4, perSecond: [1, 0, 1, 0, 1] },
        advanced: { notes: 4, seconds: 4, perSecond: [1, 0, 2, 0, 1] },
        master: { notes: 6, seconds: 4, perSecond: [1, 0, 2, 2, 1] },
      },
    });
  });

  test("reads every course a file holds, by its name or number", () => {
    const text = [
      "BPM:120",
      "COURSE:Easy",
      "#START\n1,\n#END",
      "COURSE:2",
      "#START\n1,\n#END",
      "COURSE:Oni",
      "#START\n1,\n#END",
      "COURSE:Edit",
      "#START\n1,\n#END",
    ].join("\n");
    expect([...tjaDensities(text).keys()].sort()).toEqual([1, 3, 4, 5] satisfies Level[]);
  });

  test("skips a two-player chart and keeps the single one", () => {
    const text = [
      "BPM:120",
      "COURSE:Oni",
      "STYLE:Double",
      "#START P1\n1111,\n#END",
      "#START P2\n2222,\n#END",
      "STYLE:Single",
      "#START\n1000,\n#END",
      "COURSE:Hard",
      "STYLE:Double",
      "#START P1\n1111,\n#END",
    ].join("\n");
    const densities = tjaDensities(text);
    expect(lineOf(densities.get(4))?.notes).toBe(1);
    expect(densities.has(3)).toBe(false);
  });

  test("ignores comments, a byte order mark and commands that do not move notes", () => {
    const text = `﻿${chart("#GOGOSTART\n1111, // four\n#SCROLL 2\n#GOGOEND", "BPM:120 // tempo\nCOURSE:Oni")}`;
    expect(oniLine(text)).toEqual({ notes: 4, seconds: 1.5, perSecond: [2, 2] });
  });

  test("gives a chart with no notes no density", () => {
    expect(tjaDensities(chart("0000,\n5008,")).has(4)).toBe(false);
  });

  test("keeps a level's first chart when a file repeats it", () => {
    const text = `${chart("1,")}\n${chart("1111,")}`;
    expect(oniLine(text)?.notes).toBe(1);
  });
});

describe("courseLevel", () => {
  test("reads a course by its name or its number, the inner chart as Edit or Ura", () => {
    expect(["Easy", "normal", "HARD", "3", " Edit ", "ura", "4"].map(courseLevel)).toEqual([
      1, 2, 3, 4, 5, 5, 5,
    ]);
  });

  test("reads no level for any other course", () => {
    expect(courseLevel("Tower")).toBeUndefined();
    expect(courseLevel("5")).toBeUndefined();
  });
});
