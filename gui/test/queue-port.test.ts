import { describe, expect, test } from "bun:test";

import { BUSY_OUTCOME, createHirobaQueue, queuePort } from "../src/hiroba-session";
import {
  BRIDGE_CHANNELS,
  type HirobaSessionPort,
  PORT_ARGUMENTS,
  PORT_QUEUEING,
  type VerbQueueing,
} from "../src/session-port";

type Verb = keyof HirobaSessionPort;
const VERBS = Object.keys(PORT_QUEUEING) as Verb[];
const queuedAs = (how: VerbQueueing) => VERBS.filter((verb) => PORT_QUEUEING[verb] === how);
const READS = queuedAs("read");
const WRITES = queuedAs("write");
const UNQUEUED = queuedAs("unqueued");

/** Gives the next turn of the event loop to whatever the queue has ready to run. */
const settle = () => Bun.sleep(1);

function watchedPort() {
  const events: string[] = [];
  const gates = new Map<Verb, () => void>();
  const verbs = Object.fromEntries(
    VERBS.map((verb) => [
      verb,
      async (...args: unknown[]) => {
        events.push(`begin ${verb}`);
        await new Promise<void>((resolve) => gates.set(verb, resolve));
        events.push(`end ${verb}`);
        return { verb, args };
      },
    ]),
  ) as unknown as HirobaSessionPort;
  const port = queuePort(createHirobaQueue(), verbs);
  const ask = (verb: Verb, ...args: unknown[]) =>
    (port[verb] as (...values: unknown[]) => Promise<unknown>)(...args);
  const letGo = async (verb: Verb) => {
    gates.get(verb)?.();
    await settle();
  };
  return { events, ask, letGo };
}

describe("PORT_QUEUEING", () => {
  test("places every verb of the port, the bridge's and the argument checks' alike", () => {
    const placed: string[] = [...VERBS].sort();
    expect(placed).toEqual(Object.keys(BRIDGE_CHANNELS).sort());
    expect(placed).toEqual(Object.keys(PORT_ARGUMENTS).sort());
  });

  test("queues the verbs that ask Hiroba for a page, and sends the changes as writes", () => {
    expect(READS).toEqual([
      "readProfile",
      "openCostumeEditor",
      "openTitleEditor",
      "previewCostume",
      "openFavorites",
    ]);
    expect(WRITES).toEqual([
      "changeCostume",
      "changeTitle",
      "changeName",
      "changeFolder",
      "changeFavoriteSong",
    ]);
  });
});

describe("queuePort", () => {
  describe.each(WRITES)("while %s runs", (running) => {
    test.each(READS)("a %s asked for waits until it has ended, and then goes", async (read) => {
      const { events, ask, letGo } = watchedPort();
      const writing = ask(running);
      await settle();
      const reading = ask(read);
      await settle();
      expect(events).toEqual([`begin ${running}`]);

      await letGo(running);
      expect(events).toEqual([`begin ${running}`, `end ${running}`, `begin ${read}`]);
      await letGo(read);
      await Promise.all([writing, reading]);
      expect(events.slice(-1)).toEqual([`end ${read}`]);
    });

    test.each(WRITES)("a %s asked for answers busy, and never begins", async (other) => {
      const { events, ask, letGo } = watchedPort();
      const writing = ask(running);
      await settle();
      expect(await ask(other)).toEqual(BUSY_OUTCOME);
      await letGo(running);
      await writing;
      expect(events).toEqual([`begin ${running}`, `end ${running}`]);
    });

    test.each(UNQUEUED)("a %s asked for is not held up", async (free) => {
      const { events, ask, letGo } = watchedPort();
      const writing = ask(running);
      await settle();
      const answered = ask(free);
      await settle();
      expect(events).toEqual([`begin ${running}`, `begin ${free}`]);
      await letGo(free);
      await letGo(running);
      await Promise.all([writing, answered]);
    });
  });

  test.each(READS)(
    "a read waits for a %s that is running, and each read for the ones before it",
    async (first) => {
      const { events, ask, letGo } = watchedPort();
      const others = READS.filter((read) => read !== first);
      const asked = [ask(first), ...others.map((read) => ask(read))];
      await settle();
      expect(events).toEqual([`begin ${first}`]);
      await letGo(first);
      expect(events.at(-1)).toBe(`begin ${others[0]}`);
      for (const read of others) {
        await letGo(read);
      }
      await Promise.all(asked);
      expect(events).toEqual(
        [first, ...others].flatMap((read) => [`begin ${read}`, `end ${read}`]),
      );
    },
  );

  test("a write asked for behind a read waits for it, and a second write meanwhile answers busy", async () => {
    const { events, ask, letGo } = watchedPort();
    const reading = ask("readProfile");
    const writing = ask("changeCostume");
    await settle();
    expect(events).toEqual(["begin readProfile"]);
    expect(await ask("changeName")).toEqual(BUSY_OUTCOME);
    await letGo("readProfile");
    expect(events).toEqual(["begin readProfile", "end readProfile", "begin changeCostume"]);
    await letGo("changeCostume");
    await Promise.all([reading, writing]);
  });

  test("hands each verb its own arguments and gives back its own answer", async () => {
    const { ask, letGo } = watchedPort();
    const answered = ask("previewCostume", { colorFace: 3 });
    await settle();
    await letGo("previewCostume");
    expect(await answered).toEqual({ verb: "previewCostume", args: [{ colorFace: 3 }] });
  });
});
