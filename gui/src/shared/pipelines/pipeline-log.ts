import { KEPT_GROUPS } from "./kept-groups";
import type { EndedGroup, GroupKind } from "./pipeline";

/** How long a change waits to be saved, so a run of pictures is saved once. */
const SAVE_DELAY_MS = 1000;

/** What a pipeline keeps of its groups that ended: the newest first. */
export interface PipelineHistory {
  readonly ended: readonly EndedGroup[];
}

/** Where a pipeline's history is kept between launches. */
export interface PipelineHistoryStore {
  load(): Promise<PipelineHistory>;
  save(history: PipelineHistory): Promise<void>;
}

export interface PipelineLog {
  /** Takes each group as it ends: `createPipeline`'s `ended`, or what it hands on. */
  readonly add: (group: EndedGroup) => void;
  /** The newest `limit` groups that ended. */
  history(limit: number): PipelineHistory;
}

export interface PipelineLogOptions {
  readonly store: PipelineHistoryStore;
  /** Runs `save` later: `setTimeout`, unless a test hands in its own. */
  readonly later?: (save: () => void, ms: number) => void;
}

const NONE: PipelineHistory = { ended: [] };

/** A pipeline's history, loaded from its store and saved to it a moment after each change. */
export function createPipelineLog(options: PipelineLogOptions): PipelineLog {
  const later = options.later ?? ((save, ms) => void setTimeout(save, ms));
  let ended: readonly EndedGroup[] = [];
  // Nothing is saved before the kept history has loaded, which would write over it.
  let loaded = false;
  let changed = false;
  let saving = false;

  const save = () => {
    saving = false;
    changed = false;
    options.store.save({ ended }).catch(() => undefined);
  };
  const changes = () => {
    changed = true;
    if (loaded && !saving) {
      saving = true;
      later(save, SAVE_DELAY_MS);
    }
  };

  options.store
    .load()
    .catch(() => NONE)
    .then((kept) => {
      // Groups that ended while it loaded are the newer ones.
      ended = [...ended, ...kept.ended].slice(0, KEPT_GROUPS);
      loaded = true;
      if (changed) {
        changes();
      }
    });

  return {
    add(group) {
      ended = [group, ...ended].slice(0, KEPT_GROUPS);
      changes();
    },
    history: (limit) => ({ ended: ended.slice(0, limit) }),
  };
}

/** A store that keeps the history in memory only, for a shell with nowhere to keep it. */
export function createMemoryPipelineStore(): PipelineHistoryStore {
  let kept = NONE;
  return {
    load: async () => kept,
    save: async (history) => {
      kept = history;
    },
  };
}

const KINDS: ReadonlySet<unknown> = new Set<GroupKind>(["read", "exclusive", "write"]);
const UNSUCCESSFUL: ReadonlySet<unknown> = new Set(["failed", "stopped"]);
const METHODS: ReadonlySet<unknown> = new Set(["GET", "POST"]);

/** A history as a store kept it: groups that do not read as one are dropped. */
export function readPipelineHistory(stored: unknown): PipelineHistory {
  if (!isRecord(stored)) {
    return NONE;
  }
  const ended = Array.isArray(stored.ended) ? stored.ended.filter(isEndedGroup) : [];
  return { ended: ended.slice(0, KEPT_GROUPS) };
}

function isEndedGroup(value: unknown): value is EndedGroup {
  if (
    !isRecord(value) ||
    typeof value.operation !== "string" ||
    !(value.subject === undefined || typeof value.subject === "string") ||
    !KINDS.has(value.kind) ||
    !isCount(value.startedAt) ||
    !isCount(value.endedAt) ||
    !isCount(value.requests)
  ) {
    return false;
  }
  if (value.outcome === "succeeded") {
    return true;
  }
  return UNSUCCESSFUL.has(value.outcome) && typeof value.code === "string" && isEndedAt(value.at);
}

function isEndedAt(value: unknown): boolean {
  if (value === null) {
    return true;
  }
  if (!isRecord(value) || !isCount(value.index) || !isRecord(value.request)) {
    return false;
  }
  return METHODS.has(value.request.method) && typeof value.request.path === "string";
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
