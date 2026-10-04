import { describe, expect, test } from "bun:test";

import { createBackClosers } from "../src/navigation/back-closers";

describe("the overlays that take Back", () => {
  test("none is open before one is added, and closing then does nothing", () => {
    const closers = createBackClosers();

    closers.closeLatest();

    expect(closers.isOpen()).toBe(false);
  });

  test("closes only the overlay opened last", () => {
    const closed: string[] = [];
    const closers = createBackClosers();
    closers.add(() => closed.push("first"));
    closers.add(() => closed.push("second"));

    closers.closeLatest();

    expect(closed).toEqual(["second"]);
    expect(closers.isOpen()).toBe(true);
  });

  test("leaves the overlay to take itself away when it shuts", () => {
    const closed: string[] = [];
    const closers = createBackClosers();
    const takeAway = closers.add(() => closed.push("only"));

    closers.closeLatest();
    closers.closeLatest();
    takeAway();

    expect(closed).toEqual(["only", "only"]);
    expect(closers.isOpen()).toBe(false);
  });

  test("closes the one below once the latest has shut", () => {
    const closed: string[] = [];
    const closers = createBackClosers();
    closers.add(() => closed.push("below"));
    const takeAwayLatest = closers.add(() => closed.push("latest"));

    takeAwayLatest();
    closers.closeLatest();

    expect(closed).toEqual(["below"]);
  });

  test("a closer taken away twice leaves the others in place", () => {
    const closed: string[] = [];
    const closers = createBackClosers();
    closers.add(() => closed.push("kept"));
    const takeAway = closers.add(() => closed.push("gone"));

    takeAway();
    takeAway();
    closers.closeLatest();

    expect(closed).toEqual(["kept"]);
  });

  test("an overlay opened below another is closed after it, whichever shuts first", () => {
    const closed: string[] = [];
    const closers = createBackClosers();
    const takeAwayBelow = closers.add(() => closed.push("below"));
    closers.add(() => closed.push("above"));

    takeAwayBelow();
    closers.closeLatest();

    expect(closed).toEqual(["above"]);
  });
});
