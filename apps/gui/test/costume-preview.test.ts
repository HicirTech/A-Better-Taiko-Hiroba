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

  describe("reset", () => {
    test("shows nothing at once, started or not, and keeps no picture", async () => {
      const { scheduler, asked, pauseEnds, states, last } = harness();
      scheduler.start();
      scheduler.want(START);
      await asked[0]?.answer(ok(picture(START)));
      scheduler.reset();
      expect(last()).toEqual({ image: null, loading: false, failure: null });

      scheduler.want(face(1));
      expect(asked).toHaveLength(2);
      await asked[1]?.answer(ok(picture(face(1))));
      pauseEnds();
      scheduler.stop();
      const shown = states.length;
      scheduler.reset();
      expect(states).toHaveLength(shown + 1);
      expect(last()).toEqual({ image: null, loading: false, failure: null });
    });

    test("asks the next session's first set at once, though the same set was drawn before", async () => {
      const { scheduler, asked, pauseEnds, pausing, last } = harness();
      scheduler.start();
      scheduler.want(START);
      await asked[0]?.answer(ok(picture(START)));
      scheduler.want(face(1));
      pauseEnds();
      await asked[1]?.answer(ok(picture(face(1))));
      scheduler.reset();

      scheduler.want(face(1));
      expect(pausing()).toBe(0);
      expect(asked).toHaveLength(3);
      expect(last()).toEqual({ image: null, loading: true, failure: null });
      await asked[2]?.answer(ok(picture(face(1))));
      expect(last()).toEqual({ image: picture(face(1)), loading: false, failure: null });
      pauseEnds();
      expect(asked).toHaveLength(3);
    });

    test("drops a picture still on its way from before, and what it was for", async () => {
      const { scheduler, asked, last } = harness();
      scheduler.start();
      scheduler.want(START);
      scheduler.reset();
      scheduler.want(face(1));
      expect(asked.map(({ set }) => set.colorFace)).toEqual([5, 1]);

      await asked[0]?.answer(ok(picture(START)));
      expect(last()).toEqual({ image: null, loading: true, failure: null });
      await asked[1]?.answer(ok(picture(face(1))));
      expect(last()).toEqual({ image: picture(face(1)), loading: false, failure: null });
      scheduler.want(START);
      expect(asked).toHaveLength(2);
    });

    test("ends the pause after a pick, which asks nothing", async () => {
      const { scheduler, asked, pauseEnds, pausing } = harness();
      scheduler.start();
      scheduler.want(START);
      await asked[0]?.answer(ok(picture(START)));
      scheduler.want(face(3));
      expect(pausing()).toBe(1);
      scheduler.reset();
      expect(pausing()).toBe(0);
      pauseEnds();
      expect(asked).toHaveLength(1);
    });

    test("leaves it ready to be started again with nothing asked for before", async () => {
      const { scheduler, asked } = harness();
      scheduler.start();
      scheduler.want(START);
      scheduler.reset();
      scheduler.stop();
      scheduler.start();
      expect(asked).toHaveLength(1);
      scheduler.want(face(2));
      expect(asked.map(({ set }) => set.colorFace)).toEqual([5, 2]);
    });
  });

  describe("keep", () => {
    test("shows a picture in hand at the next want of its set, and asks nothing", async () => {
      const { scheduler, asked, pauseEnds, pausing, last } = harness();
      scheduler.start();
      scheduler.want(START);
      await asked[0]?.answer(ok(picture(START)));

      scheduler.keep(face(3), picture(face(3)));
      scheduler.want(face(3));

      expect(last()).toEqual({ image: picture(face(3)), loading: false, failure: null });
      expect(pausing()).toBe(0);
      pauseEnds();
      expect(asked).toHaveLength(1);
    });

    test("shows it at once when the set is the one wanted, and ends the pause for it", async () => {
      const { scheduler, asked, pauseEnds, pausing, last } = harness();
      scheduler.start();
      scheduler.want(START);
      await asked[0]?.answer(ok(picture(START)));
      scheduler.want(face(3));
      expect(pausing()).toBe(1);

      scheduler.keep(face(3), picture(face(3)));

      expect(last()).toEqual({ image: picture(face(3)), loading: false, failure: null });
      expect(pausing()).toBe(0);
      pauseEnds();
      expect(asked).toHaveLength(1);
    });

    test("replaces the failure of the set wanted with the picture, which is no retry", async () => {
      const { scheduler, asked, pauseEnds, last } = harness();
      scheduler.start();
      scheduler.want(START);
      await asked[0]?.answer(ok(picture(START)));
      scheduler.want(face(1));
      pauseEnds();
      await asked[1]?.answer(err({ code: "preview=notPng status=200 type=image/gif bytes=43" }));
      expect(last()?.failure).not.toBeNull();

      scheduler.keep(face(1), picture(face(1)));

      expect(last()).toEqual({ image: picture(face(1)), loading: false, failure: null });
      pauseEnds();
      expect(asked).toHaveLength(2);
    });

    test("changes nothing shown for a set that is not the one wanted", async () => {
      const { scheduler, asked, states } = harness();
      scheduler.start();
      scheduler.want(START);
      await asked[0]?.answer(ok(picture(START)));
      const shown = states.length;

      scheduler.keep(face(3), picture(face(3)));

      expect(states).toHaveLength(shown);
    });

    test("counts among the last eight pictures kept, the oldest going", async () => {
      const { scheduler, asked, pauseEnds, last } = harness();
      scheduler.start();
      scheduler.want(START);
      await asked[0]?.answer(ok(picture(START)));
      for (const id of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
        scheduler.keep(face(id), picture(face(id)));
      }

      scheduler.want(face(9));
      expect(last()).toEqual({ image: picture(face(9)), loading: false, failure: null });
      expect(asked).toHaveLength(1);

      scheduler.want(face(1));
      pauseEnds();
      expect(asked.map(({ set }) => set.colorFace)).toEqual([5, 1]);
    });

    test("is forgotten with the rest when the session ends", async () => {
      const { scheduler, asked } = harness();
      scheduler.start();
      scheduler.want(START);
      await asked[0]?.answer(ok(picture(START)));
      scheduler.keep(face(3), picture(face(3)));

      scheduler.reset();
      scheduler.want(face(3));

      expect(asked.map(({ set }) => set.colorFace)).toEqual([5, 3]);
    });
  });
});
