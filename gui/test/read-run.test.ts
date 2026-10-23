import { describe, expect, test } from "bun:test";
import { err, ok, type Result } from "@abth/core";

import { createReadRun } from "../src/reads/read-run";

interface Failure {
  readonly kind: string;
}

/** An answer the test hands over when it chooses. */
function later<R>() {
  let answer: (result: Result<R, Failure>) => void = () => {};
  const promise = new Promise<Result<R, Failure>>((done) => {
    answer = done;
  });
  return { ask: () => promise, answer };
}

/** A timer the test ticks by hand. */
function handTimer() {
  const ticks = new Set<() => void>();
  return {
    every: (_ms: number, tick: () => void) => {
      ticks.add(tick);
      return () => ticks.delete(tick);
    },
    tick: () => {
      for (const tick of ticks) {
        tick();
      }
    },
    running: () => ticks.size,
  };
}

const settled = () => new Promise((done) => setTimeout(done, 0));

describe("createReadRun", () => {
  test("says reading while a read runs, then read, or failed with its failure", async () => {
    const run = createReadRun<Failure>();
    expect(run.status().phase).toBe("unread");
    const first = later<string>();
    const reading = run.run(first.ask);
    expect(run.status().phase).toBe("reading");
    first.answer(ok("plays"));
    expect(await reading).toEqual(ok("plays"));
    expect(run.status()).toEqual({ phase: "read", failure: null, progress: null });

    await run.run(() => Promise.resolve(err({ kind: "timedOut" })));
    expect(run.status()).toEqual({
      phase: "failed",
      failure: { kind: "timedOut" },
      progress: null,
    });
  });

  test("runs one read at a time: an ask while one runs is turned away", async () => {
    const run = createReadRun<Failure>();
    const first = later<string>();
    const reading = run.run(first.ask);
    let asked = false;
    expect(
      await run.run(() => {
        asked = true;
        return Promise.resolve(ok("again"));
      }),
    ).toBeNull();
    expect(asked).toBe(false);
    first.answer(ok("once"));
    await reading;
    expect(await run.run(() => Promise.resolve(ok("next")))).toEqual(ok("next"));
  });

  test("lets go of a read its session outlived, and the next session reads at once", async () => {
    const run = createReadRun<Failure>();
    const old = later<string>();
    const oldRead = run.run(old.ask);
    run.forget();
    expect(run.status().phase).toBe("unread");
    const fresh = later<string>();
    const freshRead = run.run(fresh.ask);
    old.answer(ok("the last player's"));
    expect(await oldRead).toBeNull();
    expect(run.status().phase).toBe("reading");
    fresh.answer(ok("this player's"));
    expect(await freshRead).toEqual(ok("this player's"));
    expect(run.status().phase).toBe("read");
  });

  test("tells of a failure that ended the session instead of keeping it", async () => {
    const ended: Failure[] = [];
    const run = createReadRun<Failure>({
      endsTheSession: (failure) => failure.kind === "loggedOut",
      onSessionEnded: (failure) => ended.push(failure),
    });
    expect(await run.run(() => Promise.resolve(err({ kind: "loggedOut" })))).toBeNull();
    expect(ended).toEqual([{ kind: "loggedOut" }]);
    expect(run.status().phase).toBe("unread");
  });

  test("asks how far the read has come while it runs, and no longer after", async () => {
    const timer = handTimer();
    const run = createReadRun<Failure, number>({ every: timer.every });
    run.subscribe(() => {});
    const walk = later<string>();
    let page = 0;
    const reading = run.run(walk.ask, { progress: () => Promise.resolve(++page) });
    timer.tick();
    await settled();
    expect(run.status().progress).toBe(1);
    timer.tick();
    await settled();
    expect(run.status().progress).toBe(2);
    walk.answer(ok("walked"));
    await reading;
    expect(timer.running()).toBe(0);
    expect(run.status().progress).toBeNull();
  });

  test("asks how far the read has come only while someone listens", () => {
    const timer = handTimer();
    const run = createReadRun<Failure, number>({ every: timer.every });
    void run.run(later<string>().ask, { progress: () => Promise.resolve(1) });
    expect(timer.running()).toBe(0);
    const stopListening = run.subscribe(() => {});
    expect(timer.running()).toBe(1);
    stopListening();
    expect(timer.running()).toBe(0);
  });

  test("stops asking how far a read has come once its session ends", async () => {
    const timer = handTimer();
    const run = createReadRun<Failure, number>({ every: timer.every });
    run.subscribe(() => {});
    let answer: (page: number) => void = () => {};
    const progress = () =>
      new Promise<number>((done) => {
        answer = done;
      });
    void run.run(later<string>().ask, { progress });
    timer.tick();
    run.forget();
    expect(timer.running()).toBe(0);
    answer(3);
    await settled();
    expect(run.status()).toEqual({ phase: "unread", failure: null, progress: null });
  });

  test("keeps what the read brought before it says the read ended", async () => {
    const run = createReadRun<Failure>();
    const seen: string[] = [];
    await run.run(() => Promise.resolve(ok("plays")), {
      keep: async (result) => {
        await settled();
        seen.push(`${result.ok ? result.value : "none"} while ${run.status().phase}`);
      },
    });
    expect(seen).toEqual(["plays while reading"]);
    expect(run.status().phase).toBe("read");
  });

  test("settles a failure: read again where the session read once, else unread", async () => {
    const run = createReadRun<Failure>();
    await run.run(() => Promise.resolve(err({ kind: "unreachable" })));
    run.settle();
    expect(run.status().phase).toBe("unread");
    await run.run(() => Promise.resolve(ok("plays")));
    await run.run(() => Promise.resolve(err({ kind: "unreachable" })));
    run.settle();
    expect(run.status()).toEqual({ phase: "read", failure: null, progress: null });
  });
});
