import { describe, expect, test } from "bun:test";

import { updateFeedProblems } from "../scripts/check-update-feed";

const feedOf = (version: string) =>
  JSON.stringify({ version, notes: { en: ["First release"], "zh-Hans": ["首个版本"] } });

describe("updateFeedProblems", () => {
  test("finds nothing wrong with a valid feed that states the package's version", () => {
    expect(updateFeedProblems(feedOf("0.1.0"), "0.1.0")).toEqual([]);
  });

  test("names both versions when the feed states another one", () => {
    const [problem, ...others] = updateFeedProblems(feedOf("0.1.0"), "0.2.0");
    expect(problem).toContain("0.1.0");
    expect(problem).toContain("0.2.0");
    expect(others).toEqual([]);
  });

  test("gives the reason a feed is not valid, whatever version it states", () => {
    const text = JSON.stringify({ version: "0.1.0", notes: { en: [] } });
    expect(updateFeedProblems(text, "0.1.0")).toEqual([
      '"notes.en" must be a list of lines, each with some text.',
    ]);
    expect(updateFeedProblems("{", "0.1.0")).toEqual(["The feed is not JSON."]);
  });
});
