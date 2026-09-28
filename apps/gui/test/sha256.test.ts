/** SHA-256 as the stores name kept pictures by it: FIPS 180-4's examples, and node:crypto's answers. */
import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";

import { sha256Hex } from "../src/hiroba-session/sha256";

type KnownCase = [text: string, hex: string];

describe("sha256Hex", () => {
  test.each<KnownCase>([
    ["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
    ["abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
    [
      "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    ],
  ])("gives FIPS 180-4's digest of %p", (text, hex) => {
    expect(sha256Hex(text)).toBe(hex);
  });

  test("agrees with node:crypto on UTF-8 text, and at every length around a block's end", () => {
    const texts = [
      "000000000000",
      "v1/titleplate/bare/%E3%82%B5%E3%83%B3%E3%83%97%E3%83%AB",
      "サンプルの称号",
      ...Array.from({ length: 140 }, (_, length) => "x".repeat(length)),
    ];
    for (const text of texts) {
      expect(sha256Hex(text)).toBe(createHash("sha256").update(text, "utf8").digest("hex"));
    }
  });
});
