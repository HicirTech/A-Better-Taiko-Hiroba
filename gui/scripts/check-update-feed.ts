import { readFileSync } from "node:fs";
import { join } from "node:path";

import pkg from "../package.json";
import { parseUpdateFeed } from "../src/updates";

/** What is wrong with the feed, one sentence each; none when it is valid and states the version. */
export function updateFeedProblems(feedText: string, packageVersion: string): string[] {
  const feed = parseUpdateFeed(feedText);
  if (!feed.ok) {
    return [feed.error];
  }
  return feed.value.version === packageVersion
    ? []
    : [`"version" is ${feed.value.version}, but gui/package.json says ${packageVersion}.`];
}

if (import.meta.main) {
  const feedText = readFileSync(join(import.meta.dir, "..", "update.json"), "utf8");
  const problems = updateFeedProblems(feedText, pkg.version);
  for (const problem of problems) {
    console.error(`gui/update.json: ${problem}`);
  }
  process.exit(problems.length === 0 ? 0 : 1);
}
