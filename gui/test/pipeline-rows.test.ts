import { describe, expect, test } from "bun:test";
import { createTranslator } from "@abth/i18n";

import { PICTURE_OPERATION, RECENT_PLAYS_PAGE_OPERATION } from "../src/hiroba-session";
import type { EndedGroup, GroupNow, PipelineView } from "../src/pipelines";
import {
  groupName,
  OPERATION_NAMES,
  operationName,
  PAGE_NAMES,
} from "../src/pipelines-page/operation-names";
import {
  BLOCKS,
  blockRow,
  endedKey,
  followed,
  type Picked,
  pickedNow,
} from "../src/pipelines-page/pipeline-rows";
import { PORT_QUEUEING } from "../src/session-port";
import { CHART_PICTURE_OPERATION } from "../src/song-catalogue";

const now = (id: number, overrides: Partial<GroupNow> = {}): GroupNow => ({
  id,
  operation: "readProfile",
  kind: "read",
  askedAt: 1000,
  startedAt: 1000,
  sent: [],
  expectedRequests: null,
  ...overrides,
});

const ended = (overrides: Partial<EndedGroup> = {}): EndedGroup =>
  ({
    operation: "readProfile",
    kind: "read",
    startedAt: 1000,
    endedAt: 1300,
    requests: 1,
    outcome: "succeeded",
    ...overrides,
  }) as EndedGroup;

const view = (overrides: Partial<PipelineView> = {}): PipelineView => ({
  running: [],
  waiting: [],
  ended: [],
  ...overrides,
});

describe("blockRow", () => {
  test("gives a block to each group, the running ones first, and counts those waiting", () => {
    const row = blockRow({ running: [now(1), now(2)], waiting: [now(3, { startedAt: null })] });

    expect(row.groups.map((group) => group.id)).toEqual([1, 2, 3]);
    expect(row).toMatchObject({ more: false, waiting: 1 });
  });

  test.each<[groups: number, more: boolean]>([
    [BLOCKS, false],
    [BLOCKS + 1, true],
  ])("with %p groups, fills the blocks, and says %p that there are more", (count, more) => {
    const waiting = Array.from({ length: count - 1 }, (_, index) => now(index + 2));
    const row = blockRow({ running: [now(1)], waiting });

    expect(row.groups).toHaveLength(BLOCKS);
    expect(row.more).toBe(more);
    expect(row.waiting).toBe(count - 1);
  });
});

describe("followed", () => {
  const picked = pickedNow(now(7, { operation: "changeCostume", askedAt: 2000 }));

  test("keeps a group that is still in the pipeline", () => {
    expect(followed(picked, view({ waiting: [now(7, { startedAt: null })] }))).toBe(picked);
  });

  test("goes on as the group it ended as: the first of its operation to start once asked", () => {
    const before = ended({ operation: "changeCostume", startedAt: 1500 });
    const mine = ended({ operation: "changeCostume", startedAt: 2100 });
    const after = ended({ operation: "changeCostume", startedAt: 2900 });
    const other = ended({ operation: "readProfile", startedAt: 2050 });

    expect(followed(picked, view({ ended: [after, other, mine, before] }))).toEqual({
      kind: "ended",
      group: mine,
    });
  });

  test("lets go of a group that ended unlisted, as a picture is", () => {
    expect(followed(picked, view({ ended: [ended({ startedAt: 2100 })] }))).toBeNull();
  });

  test("keeps a group that ended as it was, and nothing as nothing", () => {
    const pick: Picked = { kind: "ended", group: ended() };
    expect(followed(pick, view())).toBe(pick);
    expect(followed(null, view())).toBeNull();
  });
});

describe("endedKey", () => {
  test("tells apart two groups of one operation that ended apart", () => {
    expect(endedKey(ended({ endedAt: 1300 }))).not.toBe(endedKey(ended({ endedAt: 1400 })));
  });
});

describe("operationName", () => {
  test("has a name for every group a pipeline runs: each queued verb and the pictures", () => {
    const queued = Object.entries(PORT_QUEUEING)
      .filter(([, how]) => how !== "unqueued")
      .map(([verb]) => verb);
    const operations = [...queued, PICTURE_OPERATION, CHART_PICTURE_OPERATION].sort();

    expect(Object.keys(OPERATION_NAMES).sort()).toEqual(operations);
  });

  test("names an operation in the language shown, and one it has no name for by its own name", () => {
    expect(operationName(createTranslator("zh-Hans"), "changeCostume")).toBe("换装保存");
    expect(operationName(createTranslator("en"), "somethingNew")).toBe("somethingNew");
  });

  test("names a picture by what it shows, and any other group by its operation", () => {
    const zh = createTranslator("zh-Hans");
    expect(groupName(zh, { operation: PICTURE_OPERATION, subject: "myDon" })).toBe("小咚");
    expect(groupName(zh, { operation: PICTURE_OPERATION, subject: "somethingNew" })).toBe("图片");
    expect(groupName(zh, { operation: "changeCostume" })).toBe("换装保存");
  });

  test("names each page of the recent plays walk with its page", () => {
    const zh = createTranslator("zh-Hans");

    expect(groupName(zh, { operation: RECENT_PLAYS_PAGE_OPERATION, subject: "37" })).toBe(
      "近期游玩第 37 页",
    );
    expect(Object.keys(PAGE_NAMES)).toEqual([RECENT_PLAYS_PAGE_OPERATION]);
  });
});
