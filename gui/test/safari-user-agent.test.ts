import { expect, test } from "bun:test";

import { safariUserAgent } from "../src/platform/safari-user-agent";

test("adds Safari's own tokens to what WKWebView says of itself", () => {
  expect(
    safariUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 26_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
    ),
  ).toBe(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
  );
});

test("leaves a string that names no iOS version as it is", () => {
  expect(safariUserAgent("Mozilla/5.0 (Macintosh)")).toBe("Mozilla/5.0 (Macintosh)");
});
