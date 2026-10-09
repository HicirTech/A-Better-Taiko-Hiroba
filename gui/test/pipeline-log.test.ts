import { describe, expect, test } from "bun:test";

import {
  createMemoryPipelineStore,
  createPipelineLog,
  type EndedGroup,
  KEPT_GROUPS,
  type PipelineHistory,
  type PipelineHistoryStore,
  readPipelineHistory,
} from "../src/pipelines";

const PICTURE = "picture";

const group = (overrides: Partial<EndedGroup> = {}): EndedGroup =>
  ({
    operation: "readProfile",
    kind: "read",
    startedAt: 1000,
    endedAt: 1300,
    requests: 2,
    outcome: "succeeded",
    ...overrides,
  }) as EndedGroup;

const failedPicture = (outcome: "failed" | "stopped", requests = 1): EndedGroup => ({
  operation: PICTURE,
  kind: "read",
  startedAt: 1000,
  endedAt: 1100,
  requests,
  outcome,
  code: "costumeItem=timedOut",
  at: null,
});

/** Lets the log's own promises settle. */
const settle = () => Bun.sleep(0);

function setUp(store: PipelineHistoryStore = createMemoryPipelineStore()) {
  const saves: (() => void)[] = [];
  const log = createPipelineLog({
    counted: new Set([PICTURE]),
    store,
    later: (save) => {
      saves.push(save);
    },
  });
  /** Runs the save the log asked for, as its timer would. */
  const saveNow = async () => {
    saves.shift()?.();
    await settle();
  };
  return { log, saves, saveNow };
}

/** A store whose load waits until its test lets it, and which records each save. */
function heldStore(kept: PipelineHistory) {
  let loaded: () => void = () => undefined;
  const saved: PipelineHistory[] = [];
  const store: PipelineHistoryStore = {
    load: () =>
      new Promise((resolve) => {
        loaded = () => resolve(kept);
      }),
    save: async (history) => {
      saved.push(history);
    },
  };
  return { store, saved, load: () => loaded() };
}

describe("createPipelineLog", () => {
  test("keeps the groups that ended, the newest first, and no more than it keeps", async () => {
    const { log } = setUp();
    await settle();
    for (let index = 0; index <= KEPT_GROUPS; index++) {
      log.add(group({ startedAt: index }));
    }

    const kept = log.history(KEPT_GROUPS + 1).ended;
    expect(kept).toHaveLength(KEPT_GROUPS);
    expect(kept[0]?.startedAt).toBe(KEPT_GROUPS);
    expect(kept.at(-1)?.startedAt).toBe(1);
    expect(log.history(12).ended).toHaveLength(12);
  });

  test("counts the pictures that came and those that failed, and lists none of them", async () => {
    const { log } = setUp();
    await settle();
    log.add(group({ operation: PICTURE }));
    log.add(group({ operation: PICTURE }));
    log.add(failedPicture("failed"));

    expect(log.history(12)).toEqual({ ended: [], pictures: { came: 2, failed: 1 } });
  });

  test("counts no picture stopped by a sign-out, nor one that sent nothing", async () => {
    const { log } = setUp();
    await settle();
    log.add(failedPicture("stopped"));
    log.add(failedPicture("failed", 0));
    log.add(group({ operation: PICTURE, requests: 0 }));

    expect(log.history(12).pictures).toEqual({ came: 0, failed: 0 });
  });

  test("saves a moment after a change, once for a run of changes, and the latest of them", async () => {
    const held = heldStore({ ended: [], pictures: { came: 0, failed: 0 } });
    const { log, saves, saveNow } = setUp(held.store);
    held.load();
    await settle();
    log.add(group({ startedAt: 1 }));
    log.add(group({ operation: PICTURE }));
    log.add(group({ startedAt: 2 }));

    expect(saves).toHaveLength(1);
    await saveNow();
    expect(held.saved).toEqual([
      {
        ended: [group({ startedAt: 2 }), group({ startedAt: 1 })],
        pictures: { came: 1, failed: 0 },
      },
    ]);
    log.add(group({ startedAt: 3 }));
    expect(saves).toHaveLength(1);
  });

  test("puts what was kept behind the groups that ended while it loaded, and saves nothing before", async () => {
    const held = heldStore({
      ended: [group({ startedAt: 1 })],
      pictures: { came: 4, failed: 1 },
    });
    const { log, saves, saveNow } = setUp(held.store);
    log.add(group({ startedAt: 2 }));
    log.add(group({ operation: PICTURE }));
    expect(saves).toHaveLength(0);

    held.load();
    await settle();
    expect(log.history(12)).toEqual({
      ended: [group({ startedAt: 2 }), group({ startedAt: 1 })],
      pictures: { came: 5, failed: 1 },
    });
    expect(saves).toHaveLength(1);
    await saveNow();
    expect(held.saved).toHaveLength(1);
  });

  test("starts empty when its store cannot load, and saves all the same", async () => {
    const saved: PipelineHistory[] = [];
    const { log, saveNow } = setUp({
      load: () => Promise.reject(new Error("unreadable")),
      save: async (history) => {
        saved.push(history);
      },
    });
    await settle();
    log.add(group());
    await saveNow();

    expect(saved).toEqual([{ ended: [group()], pictures: { came: 0, failed: 0 } }]);
  });
});

describe("readPipelineHistory", () => {
  test("reads a history as it was saved", () => {
    const history: PipelineHistory = {
      ended: [
        group(),
        group({
          outcome: "failed",
          code: "readFailed timedOut",
          at: { index: 2, request: { method: "POST", path: "/ajax/change_mydon.php" } },
        } as Partial<EndedGroup>),
        failedPicture("stopped"),
      ],
      pictures: { came: 3, failed: 2 },
    };

    expect(readPipelineHistory(JSON.parse(JSON.stringify(history)))).toEqual(history);
  });

  test.each<[name: string, stored: unknown]>([
    ["no object", "history"],
    ["a list", []],
    ["no groups", { pictures: { came: 1, failed: 0 } }],
  ])("reads %s as an empty history", (_name, stored) => {
    expect(readPipelineHistory(stored).ended).toEqual([]);
  });

  test("drops what does not read as a group, and a tally that does not read as one", () => {
    const broken = [
      { ...group(), kind: "sideways" },
      { ...group(), requests: -1 },
      { ...group(), outcome: "failed" },
      { ...group(), outcome: "failed", code: "x", at: { index: 1, request: { method: "PUT" } } },
    ];
    const read = readPipelineHistory({ ended: [...broken, group()], pictures: { came: "3" } });

    expect(read).toEqual({ ended: [group()], pictures: { came: 0, failed: 0 } });
  });
});
