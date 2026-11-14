import { describe, expect, test } from "bun:test";

import { err, officialNames, ok, parseChineseNamesBatch } from "../src/index";
import { batch, page, songbox } from "./chinese-names-fixtures";

describe("officialNames", () => {
  test("reads one name", () => {
    expect(officialNames(songbox("天體觀測"))).toEqual(["天體觀測"]);
  });

  test("splits names at line breaks, and drops footnotes, links and markup", () => {
    const field =
      'I\'m mecha。<ref>於《[[太鼓之達人11 亞洲版]]》的譯名。</ref><br/>Mecha DESU.<ref name="a" /><br>[[天竺|天竺2000]]';
    expect(officialNames(songbox(field))).toEqual(["I'm mecha。", "Mecha DESU.", "天竺2000"]);
  });

  test("reads a field that runs onto later lines, up to the next field", () => {
    expect(
      officialNames("{{Songbox\n|official = 喀啦喀啦碰之歌<br>\n妖怪碰碰之歌\n|genre = 童謠\n}}"),
    ).toEqual(["喀啦喀啦碰之歌", "妖怪碰碰之歌"]);
  });

  test("gives none for an empty field, or a box without one", () => {
    expect(officialNames(songbox(""))).toEqual([]);
    expect(officialNames("{{Songbox\n|id = 1ps\n}}")).toEqual([]);
  });
});

describe("parseChineseNamesBatch", () => {
  test("reads each page's title and names, and the fields that ask for the next batch", () => {
    const next = { gcmcontinue: "page|33|10196", continue: "gcmcontinue||" };
    expect(parseChineseNamesBatch(batch([page("天体観測", songbox("天體觀測"))], next))).toEqual(
      ok({ pages: [{ title: "天体観測", names: ["天體觀測"] }], next }),
    );
  });

  test("ends after a batch with no continuation, and skips a page without content", () => {
    expect(parseChineseNamesBatch(batch([{ title: "曲ID" }]))).toEqual(
      ok({ pages: [], next: null }),
    );
  });

  test.each([
    "<html>Not found</html>",
    "[]",
    JSON.stringify({ error: { code: "badvalue" } }),
    JSON.stringify({ continue: { "gcm continue": "x" }, query: { pages: [] } }),
    JSON.stringify({ continue: { gcmcontinue: 1 }, query: { pages: [] } }),
  ])("answers badAnswer to %p", (text) => {
    expect(parseChineseNamesBatch(text)).toEqual(err({ code: "badAnswer" }));
  });
});
