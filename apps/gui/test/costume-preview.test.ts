/**
 * How the editor paces its requests for Hiroba's picture of the set: against a stand-in for the
 * port's previewCostume whose answers the test hands out, and timers the test runs by hand.
 */
import { describe, expect, test } from "bun:test";
import { err, ok, type Result } from "@abth/core";

import {
  createPreviewScheduler,
  type PreviewState,
  type PreviewTimers,
} from "../src/my-page/costume-preview";
import type { CostumePreviewFailure, CostumeSet } from "../src/session-port";

const START: CostumeSet = {
  colorBody: 12,
  colorLimb: 12,
  colorFace: 5,
  costume1: 0,
  costume2: 21,
  costume3: 68,
  costume4: 37,
  costume5: 140,
};
const face = (id: number): CostumeSet => ({ ...START, colorFace: id });
const picture = (set: CostumeSet) => `data:image/png;base64,face${set.colorFace}`;

type Answer = Result<string, CostumePreviewFailure>;

/** A scheduler with hand-run timers and hand-answered requests, and what it showed. */
function harness() {
  const asked: { set: CostumeSet; answer: (value: Answer | "throw") => Promise<void> }[] = [];
  const pending = new Map<number, () => void>();
  let nextTimer = 1;
  const timers: PreviewTimers = {
    set(run) {
      const id = nextTimer++;
      pending.set(id, run);
      return id;
    },
    clear(timer) {
      pending.delete(timer as number);
    },
  };
  const states: PreviewState[] = [];
  const scheduler = createPreviewScheduler({
    load: (set) =>
      new Promise<Answer>((resolve, reject) => {
        asked.push({
          set,
          answer: async (value) => {
            if (value === "throw") {
              reject(new Error("refused"));
            } else {
              resolve(value);
            }
            // Let the scheduler's handlers run.
            await Bun.sleep(0);
          },
        });
      }),
    onState: (state) => states.push(state),
    timers,
  });
  /** Ends the pause after the last pick, as the page's clock would. */
  const pauseEnds = () => {
    const runs = [...pending.values()];
    pending.clear();
    for (const run of runs) {
      run();
    }
  };
  const last = () => states.at(-1);
  return { scheduler, asked, pauseEnds, pausing: () => pending.size, states, last };
}

describe("createPreviewScheduler", () => {
  test("asks for the first set at once, and shows its picture", async () => {
    const { scheduler, asked, last } = harness();
    scheduler.start();
    scheduler.want(START);
    expect(asked.map(({ set }) => set)).toEqual([START]);
    expect(last()).toEqual({ image: null, loading: true, failure: null });
    await asked[0]?.answer(ok(picture(START)));
    expect(last()).toEqual({ image: picture(START), loading: false, failure: null });
  });

  test("asks for nothing before it is started, or after it is stopped", async () => {
    const { scheduler, asked, pauseEnds, pausing } = harness();
    scheduler.want(START);
    expect(asked).toHaveLength(0);
    scheduler.start();
    expect(asked).toHaveLength(1);
    await asked[0]?.answer(ok(picture(START)));
    scheduler.want(face(3));
    expect(pausing()).toBe(1);
    scheduler.stop();
    expect(pausing()).toBe(0);
    pauseEnds();
    expect(asked).toHaveLength(1);
  });

  test("a burst of picks is one request, for the last of them, once the picks pause", async () => {
    const { scheduler, asked, pauseEnds, last } = harness();
    scheduler.start();
    scheduler.want(START);
    await asked[0]?.answer(ok(picture(START)));
    for (const id of [1, 2, 3, 4, 7]) {
      scheduler.want(face(id));
    }
    expect(asked).toHaveLength(1);
    // The last picture stays while the next is waited for.
    expect(last()).toEqual({ image: picture(START), loading: true, failure: null });
    pauseEnds();
    expect(asked.map(({ set }) => set.colorFace)).toEqual([5, 7]);
    await asked[1]?.answer(ok(picture(face(7))));
    expect(last()).toEqual({ image: picture(face(7)), loading: false, failure: null });
  });

  test("keeps one request in flight; a newer pick drops the older picture and is asked after", async () => {
    const { scheduler, asked, pauseEnds, states, last } = harness();
    scheduler.start();
    scheduler.want(START);
    await asked[0]?.answer(ok(picture(START)));
    scheduler.want(face(1));
    pauseEnds();
    expect(asked).toHaveLength(2);
    scheduler.want(face(2));
    pauseEnds();
    // Face 1 is still on its way, so face 2 waits for it.
    expect(asked).toHaveLength(2);
    await asked[1]?.answer(ok(picture(face(1))));
    expect(states.some((state) => state.image === picture(face(1)))).toBe(false);
    expect(asked.map(({ set }) => set.colorFace)).toEqual([5, 1, 2]);
    await asked[2]?.answer(ok(picture(face(2))));
    expect(last()).toEqual({ image: picture(face(2)), loading: false, failure: null });
  });

  test("a pick back to a set already drawn shows it again, and asks nothing", async () => {
    const { scheduler, asked, pauseEnds, last } = harness();
    scheduler.start();
    scheduler.want(START);
    await asked[0]?.answer(ok(picture(START)));
    scheduler.want(face(1));
    pauseEnds();
    await asked[1]?.answer(ok(picture(face(1))));
    scheduler.want(START);
    expect(last()).toEqual({ image: picture(START), loading: false, failure: null });
    scheduler.want(face(1));
    expect(last()).toEqual({ image: picture(face(1)), loading: false, failure: null });
    pauseEnds();
    expect(asked).toHaveLength(2);
  });

  test("a failure keeps the last picture, says why, and is not retried", async () => {
    const { scheduler, asked, pauseEnds, last } = harness();
    scheduler.start();
    scheduler.want(START);
    await asked[0]?.answer(ok(picture(START)));
    scheduler.want(face(1));
    pauseEnds();
    await asked[1]?.answer(err({ code: "preview=notPng status=200 type=image/gif bytes=43" }));
    expect(last()).toEqual({
      image: picture(START),
      loading: false,
      failure: "preview=notPng status=200 type=image/gif bytes=43",
    });
    pauseEnds();
    scheduler.stop();
    scheduler.start();
    expect(asked).toHaveLength(2);
    // A call the bridge refuses is a failure too.
    scheduler.want(face(2));
    pauseEnds();
    await asked[2]?.answer("throw");
    expect(last()?.failure).toBe("preview=callFailed");
  });

  test("stopped and started again at once, as StrictMode does, the first set is asked once", async () => {
    const { scheduler, asked, last } = harness();
    scheduler.start();
    scheduler.want(START);
    scheduler.stop();
    scheduler.start();
    scheduler.want(START);
    expect(asked).toHaveLength(1);
    await asked[0]?.answer(ok(picture(START)));
    expect(last()).toEqual({ image: picture(START), loading: false, failure: null });
  });

  test("a picture that lands while it is stopped is not shown then", async () => {
    const { scheduler, asked, states } = harness();
    scheduler.start();
    scheduler.want(START);
    scheduler.stop();
    const shown = states.length;
    await asked[0]?.answer(ok(picture(START)));
    expect(states).toHaveLength(shown);
  });

  test("a picture that landed while it was stopped is shown at the start, and asked for no more", async () => {
    const { scheduler, asked, last } = harness();
    scheduler.start();
    scheduler.want(START);
    scheduler.stop();
    await asked[0]?.answer(ok(picture(START)));
    scheduler.start();
    expect(last()).toEqual({ image: picture(START), loading: false, failure: null });
    expect(asked).toHaveLength(1);
  });

  test("a failure that landed while it was stopped is shown at the start, and not retried", async () => {
    const { scheduler, asked, pauseEnds, last } = harness();
    scheduler.start();
    scheduler.want(START);
    scheduler.stop();
    await asked[0]?.answer(err({ code: "preview=notPng status=200 type=image/gif bytes=43" }));
    scheduler.start();
    pauseEnds();
    expect(last()).toEqual({
      image: null,
      loading: false,
      failure: "preview=notPng status=200 type=image/gif bytes=43",
    });
    expect(asked).toHaveLength(1);
  });

  test("a set picked while it is stopped is asked for after the pause once it starts", async () => {
    const { scheduler, asked, pauseEnds, pausing, last } = harness();
    scheduler.start();
    scheduler.want(START);
    await asked[0]?.answer(ok(picture(START)));
    scheduler.stop();
    scheduler.want(face(3));
    expect(pausing()).toBe(0);
    scheduler.start();
    expect(asked).toHaveLength(1);
    expect(pausing()).toBe(1);
    pauseEnds();
    await asked[1]?.answer(ok(picture(face(3))));
    expect(last()).toEqual({ image: picture(face(3)), loading: false, failure: null });
  });

  test("a superseded picture that lands while it is stopped asks for nothing, and the newest set at the start", async () => {
    const { scheduler, asked, pauseEnds, last } = harness();
    scheduler.start();
    scheduler.want(START);
    await asked[0]?.answer(ok(picture(START)));
    scheduler.want(face(1));
    pauseEnds();
    scheduler.want(face(2));
    scheduler.stop();
    await asked[1]?.answer(ok(picture(face(1))));
    expect(asked).toHaveLength(2);
    scheduler.start();
    pauseEnds();
    expect(asked.map(({ set }) => set.colorFace)).toEqual([5, 1, 2]);
    await asked[2]?.answer(ok(picture(face(2))));
    expect(last()).toEqual({ image: picture(face(2)), loading: false, failure: null });
  });
});
