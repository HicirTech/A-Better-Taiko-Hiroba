/** Which kinds of write have been made for real from each platform: the lists that decide the cross-check. */
import { expect, test } from "bun:test";

import { LIVE_CHECKED_WRITES } from "../src/hiroba-session";

test("lists the desktop's costume, and none of Android's until its first real write is recorded", () => {
  // A kind joins its platform's list in a commit of its own, with this test: Android's costume
  // writes read my page before and after until then.
  expect(LIVE_CHECKED_WRITES).toEqual({ desktop: ["costume"], android: [] });
});
