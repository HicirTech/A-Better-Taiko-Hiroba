import type { EndedGroup, GroupKind } from "./pipeline";

/** How many ended groups a pipeline's history keeps. */
export const KEPT_GROUPS = 1000;

/** How long a change waits to be saved, so a run of pictures is saved once. */
const SAVE_DELAY_MS = 1000;

/** The pictures a pipeline fetched, counted rather than listed. */
export interface PictureTally {
  readonly came: number;
  readonly failed: number;
}

/** What a pipeline keeps of its groups that ended: the newest first. */
export interface PipelineHistory {
  readonly ended: readonly EndedGroup[];
  readonly pictures: PictureTally;
}

/** Where a pipeline's history is kept between launches. */
export interface PipelineHistoryStore {
  load(): Promise<PipelineHistory>;
  save(history: PipelineHistory): Promise<void>;
}

export interface PipelineLog {
  /** Takes each group as it ends: `createPipeline`'s `ended`. */
  readonly add: (group: EndedGroup) => void;
  /** The newest `limit` groups that ended, and the pictures' tally. */
  history(limit: number): PipelineHistory;
}

export interface PipelineLogOptions {
  /** The operations counted rather than listed: the pictures'. */
  readonly counted: ReadonlySet<string>;
  readonly store: PipelineHistoryStore;
  /** Runs `save` later: `setTimeout`, unless a test hands in its own. */
  readonly later?: (save: () => void, ms: number) => void;
}

const NONE: PipelineHistory = { ended: [], pictures: { came: 0, failed: 0 } };

/** A pipeline's history, loaded from its store and saved to it a moment after each change. */
export function createPipelineLog(options: PipelineLogOptions): PipelineLog {
  const later = options.later ?? ((save, ms) => void setTimeout(save, ms));
  let ended: readonly EndedGroup[] = [];
  let pictures: PictureTally = NONE.pictures;
  // Nothing is saved before the kept history has loaded, which would write over it.
  let loaded = false;
  let changed = false;
  let saving = false;

  const save = () => {
    saving = false;
    changed = false;
    options.store.save({ ended, pictures }).catch(() => undefined);
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
      pictures = {
        came: pictures.came + kept.pictures.came,
        failed: pictures.failed + kept.pictures.failed,
      };
      loaded = true;
      if (changed) {
        changes();
      }
    });

  return {
    add(group) {
      if (!options.counted.has(group.operation)) {
        ended = [group, ...ended].slice(0, KEPT_GROUPS);
        changes();
      } else if (group.requests > 0 && group.outcome !== "stopped") {
        pictures =
          group.outcome === "succeeded"
            ? { ...pictures, came: pictures.came + 1 }
            : { ...pictures, failed: pictures.failed + 1 };
        changes();
      }
    },
    history: (limit) => ({ ended: ended.slice(0, limit), pictures }),
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

/** A history as a store kept it: groups that do not read as one are dropped, and a tally that
 * does not read as one is zero. */
export function readPipelineHistory(stored: unknown): PipelineHistory {
  if (!isRecord(stored)) {
    return NONE;
  }
  const ended = Array.isArray(stored.ended) ? stored.ended.filter(isEndedGroup) : [];
  return {
    ended: ended.slice(0, KEPT_GROUPS),
    pictures: isTally(stored.pictures) ? stored.pictures : NONE.pictures,
  };
}

function isEndedGroup(value: unknown): value is EndedGroup {
  if (
    !isRecord(value) ||
    typeof value.operation !== "string" ||
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

function isTally(value: unknown): value is PictureTally {
  return isRecord(value) && isCount(value.came) && isCount(value.failed);
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
