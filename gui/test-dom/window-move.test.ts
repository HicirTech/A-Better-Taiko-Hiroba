import { afterEach, describe, expect, test } from "bun:test";

import { moveWindow } from "../src/ui/window-move";
import { inADocument } from "./document";

inADocument();

/** A view transition the next move skipped: its change is made, and its `ready` rejects. */
function skipped(change: () => void) {
  change();
  return {
    ready: Promise.reject(new DOMException("Transition was skipped", "AbortError")),
    updateCallbackDone: Promise.resolve(),
    finished: Promise.resolve(),
    skipTransition: () => undefined,
  };
}

describe("moveWindow", () => {
  afterEach(() => {
    Reflect.deleteProperty(document, "startViewTransition");
  });

  test("makes a change whose slide the next move skipped, and leaves no rejection unheard", async () => {
    const unheard: unknown[] = [];
    const hear = (reason: unknown) => unheard.push(reason);
    process.on("unhandledRejection", hear);
    Reflect.set(document, "startViewTransition", skipped);
    let changed = false;

    moveWindow("down", () => {
      changed = true;
    });
    await Bun.sleep(20);
    process.off("unhandledRejection", hear);

    expect(changed).toBe(true);
    expect(unheard).toEqual([]);
  });
});
