import { err, type Result, type Transport, type WriteOutcome } from "@abth/core";

import {
  type CostumeChange,
  type CostumeSet,
  changedTheCostume,
  type HirobaSessionPort,
  type NameChange,
  type ReadFailure,
  type TitleChange,
  type WriteKind,
  type WriteOutcomeView,
  type WriteSets,
} from "../session-port";
import { changeCostume } from "./change-costume";
import { changeName } from "./change-name";
import { changeTitle } from "./change-title";
import { mergeCostumeHistory } from "./costume-history";
import type { CostumeHistoryStore } from "./costume-history-store";
import { LIVE_CHECKED_WRITES, type WritePlatform } from "./live-checked-writes";
import { openCostumeEditor } from "./open-costume-editor";
import { openTitleEditor } from "./open-title-editor";
import { sessionEnded } from "./session-ended";
import type { HirobaEndpoints, WriteOptions } from "./types";

export interface SessionWritesOptions {
  readonly transport: Transport;
  readonly endpoints: HirobaEndpoints;
  /** The shell: whose list of live-checked kinds decides which writes also cross-check. */
  readonly platform: WritePlatform;
  /** The kinds live-checked here, in place of the platform's own list: only a test passes one. */
  readonly liveChecked?: readonly WriteKind[];
  readonly now: () => Date;
  readonly historyStore: CostumeHistoryStore;
  /** The picture of exactly this set that this session fetched lately, or null. */
  readonly recentPreview: (set: CostumeSet) => string | null;
  readonly signedIn: () => boolean;
  /** Drops the session: Hiroba ended it. The write that found it waits for this to be done. */
  readonly endSession: () => void | Promise<void>;
  /** Whose my page this run last read, or null before any read: whose history is whose. */
  readonly owner: () => string | null;
  /** A write applied: the costume is the one it wrote, whatever was kept of it. */
  readonly costumeChanged: () => void;
}

/** The port's write verbs, the same on every shell. */
export type SessionWrites = Pick<
  HirobaSessionPort,
  | "openCostumeEditor"
  | "openTitleEditor"
  | "changeCostume"
  | "changeTitle"
  | "changeName"
  | "costumeHistory"
>;

export const BUSY_OUTCOME: { readonly kind: "busy" } = { kind: "busy" };

/** What tells one kind of write from another, for the code every kind shares. */
interface WriteKindDefinition<K extends WriteKind, Input> {
  readonly kind: K;
  readonly run: (
    transport: Transport,
    endpoints: HirobaEndpoints,
    input: Input,
    options: WriteOptions,
  ) => Promise<WriteOutcome<WriteSets[K]>>;
  /** Told how a write of this kind ended, for what the platform keeps of its result. */
  readonly ended: (
    outcome: WriteOutcomeView<WriteSets[K]>,
    taikoNo: string | null,
  ) => void | Promise<void>;
}

/** A shell's writes. A kind not yet live-checked from this platform also reads another page before
 * and after. Nothing here queues (the shell does). */
export function createSessionWrites(options: SessionWritesOptions): SessionWrites {
  const { historyStore } = options;
  const liveChecked = options.liveChecked ?? LIVE_CHECKED_WRITES[options.platform];

  /** Puts the set a change moved to, then the one it moved from, first in the player's history. */
  const rememberWorn = async (
    taikoNo: string,
    { before, after }: { readonly before: CostumeSet; readonly after: CostumeSet },
  ) => {
    try {
      const worn = [after, before].map((set) => ({ set, picture: options.recentPreview(set) }));
      await historyStore.save(taikoNo, mergeCostumeHistory(await historyStore.load(taikoNo), worn));
    } catch {
      // The history is a convenience: it stays as it was, and the write's outcome with it.
    }
  };

  const costume: WriteKindDefinition<"costume", CostumeChange> = {
    kind: "costume",
    run: changeCostume,
    ended: async (outcome, taikoNo) => {
      if (!changedTheCostume(outcome)) {
        return;
      }
      options.costumeChanged();
      if (taikoNo !== null) {
        await rememberWorn(taikoNo, outcome);
      }
    },
  };

  const title: WriteKindDefinition<"title", TitleChange> = {
    kind: "title",
    run: changeTitle,
    ended: () => undefined,
  };

  const name: WriteKindDefinition<"name", NameChange> = {
    kind: "name",
    run: changeName,
    ended: () => undefined,
  };

  async function write<K extends WriteKind, Input>(
    definition: WriteKindDefinition<K, Input>,
    input: Input,
  ): Promise<WriteOutcomeView<WriteSets[K]>> {
    // Read first: a session that ends during the write clears the owner.
    const taikoNo = options.owner();
    let outcome: WriteOutcome<WriteSets[K]>;
    try {
      outcome = await definition.run(options.transport, options.endpoints, input, {
        now: options.now,
        crossCheck: !liveChecked.includes(definition.kind),
      });
    } catch {
      // A fault in this app, not an answer from Hiroba, and it may have come after the save.
      return { kind: "interrupted" };
    }
    if (outcome.kind === "sessionGone") {
      await options.endSession();
    }
    await definition.ended(outcome, taikoNo);
    return outcome;
  }

  async function opened<Editor>(
    read: (
      transport: Transport,
      endpoints: HirobaEndpoints,
    ) => Promise<Result<Editor, ReadFailure>>,
  ): Promise<Result<Editor, ReadFailure>> {
    if (!options.signedIn()) {
      return err({ kind: "notSignedIn" });
    }
    const result = await read(options.transport, options.endpoints);
    if (!result.ok && sessionEnded(result.error)) {
      await options.endSession();
    }
    return result;
  }

  return {
    openCostumeEditor: () => opened(openCostumeEditor),

    openTitleEditor: () => opened(openTitleEditor),

    async changeCostume(change) {
      if (!options.signedIn()) {
        return { kind: "notSignedIn" };
      }
      return write(costume, change);
    },

    async changeTitle(change) {
      if (!options.signedIn()) {
        return { kind: "notSignedIn" };
      }
      return write(title, change);
    },

    async changeName(change) {
      if (!options.signedIn()) {
        return { kind: "notSignedIn" };
      }
      return write(name, change);
    },

    async costumeHistory() {
      const taikoNo = options.owner();
      if (!options.signedIn() || taikoNo === null) {
        return [];
      }
      try {
        return await historyStore.load(taikoNo);
      } catch {
        return [];
      }
    },
  };
}
