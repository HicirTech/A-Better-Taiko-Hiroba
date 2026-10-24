import { describe, expect, test } from "bun:test";

import { PAGE_GONE_FRAGMENT, pageGoneReasonOf } from "../src/platform/desktop-window";

describe("pageGoneReasonOf", () => {
  test("reads why the page's process ended from the fragment the window was loaded with", () => {
    expect(pageGoneReasonOf(`#${PAGE_GONE_FRAGMENT}oom`)).toBe("oom");
  });

  test.each(["", "#", "#page", `${PAGE_GONE_FRAGMENT}oom`, "#other=oom"])(
    "reads no reason from %p",
    (hash) => {
      expect(pageGoneReasonOf(hash)).toBeNull();
    },
  );
});
