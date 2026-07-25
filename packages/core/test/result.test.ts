import { describe, expect, test } from "bun:test";

import { err, isErr, isOk, ok, type Result } from "../src/index";

/** Stands in for the tagged failures the client and parsers will return later. */
interface SampleFailure {
  readonly code: "loggedOut" | "unexpectedPage";
  readonly page: string;
}

describe("Result", () => {
  test("carries the success value", () => {
    const result = ok(4827);

    expect(result.ok).toBe(true);
    expect(result.value).toBe(4827);
  });

  test("carries the failure untouched", () => {
    const failure: SampleFailure = { code: "loggedOut", page: "score_list.php" };

    const result = err(failure);

    expect(result.ok).toBe(false);
    expect(result.error).toEqual(failure);
  });

  test("narrows to the success branch", () => {
    const result: Result<string, SampleFailure> = ok("電脳 神化 3.0");

    if (!isOk(result)) {
      throw new Error("expected a success");
    }

    expect(result.value).toBe("電脳 神化 3.0");
  });

  test("narrows to the failure branch", () => {
    const result: Result<string, SampleFailure> = err({
      code: "unexpectedPage",
      page: "mypage_top.php",
    });

    if (!isErr(result)) {
      throw new Error("expected a failure");
    }

    expect(result.error.code).toBe("unexpectedPage");
  });

  test("the two guards disagree on every result", () => {
    const results: Result<number, SampleFailure>[] = [
      ok(0),
      err({ code: "loggedOut", page: "mypage_top.php" }),
    ];

    for (const result of results) {
      expect(isOk(result)).toBe(!isErr(result));
    }
  });
});
