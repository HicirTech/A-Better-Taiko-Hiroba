import {
  beginPending,
  EMPTY_UNDO_SLOT,
  err,
  offeredUndo,
  type Result,
  reconcile,
  sameCostume,
  sameName,
  sameTitle,
  settle,
  type Transport,
  type UndoRecord,
  type UndoSlot,
  undoInput,
  type WriteOutcome,
} from "@abth/core";

import {
  changedTheCostume,
  type CostumeChange,
  type HirobaSessionPort,
  type NameChange,
  type ReadFailure,
  type TitleChange,
  type UndoSummary,
  type UndoSummaryOf,
  type WriteKind,
  type WriteOutcomeView,
  type WriteSets,
} from "../session-port";
import { changeCostume } from "./change-costume";
import { changeName } from "./change-name";
import { changeTitle } from "./change-title";
import { LIVE_CHECKED_WRITES, type WritePlatform } from "./live-checked-writes";
import { openCostumeEditor } from "./open-costume-editor";
import { openTitleEditor } from "./open-title-editor";
import { sessionEnded } from "./session-ended";
import type { HirobaEndpoints, WriteOptions } from "./types";
import type { UndoStore } from "./undo-store";

export interface SessionWritesOptions {
  readonly transport: Transport;
  readonly endpoints: HirobaEndpoints;
  /** The shell: whose list of live-checked kinds decides which writes also cross-check. */
  readonly platform: WritePlatform;
  /** The kinds live-checked here, in place of the platform's own list: only a test passes one. */
  readonly liveChecked?: readonly WriteKind[];
  readonly now: () => Date;
  readonly undoStore: UndoStore;
  readonly signedIn: () => boolean;
  /** Drops the session: Hiroba ended it. The write that found it waits for this to be done. */
  readonly endSession: () => void | Promise<void>;
  /** Whose my page this run last read, or null before any read: whose undo record is whose. */
  readonly owner: () => string | null;
  /** A write, or an undo, applied: the costume is the one it wrote, whatever was kept of it. */
  readonly costumeChanged: () => void;
}

/** What a good read of my page showed of the sets other pages write, and whose page it was. */
export interface ProfileSeen {
  readonly taikoNo: string;
  readonly title: string;
  readonly nickname: string;
}

/** The port's write verbs, the same on every shell, plus what a read of my page tells them. */
export type SessionWrites = Pick<
  HirobaSessionPort,
  | "openCostumeEditor"
  | "openTitleEditor"
  | "changeCostume"
  | "changeTitle"
  | "changeName"
  | "pendingUndo"
  | "undo"
> & {
  /** A good read of my page shows the title and name too: it settles a write whose end was unknown
   * and dates a stale record, no request needed. The read waits for it: no write starts between. */
  profileRead(seen: ProfileSeen): Promise<void>;
};

export const BUSY_OUTCOME: { readonly kind: "busy" } = { kind: "busy" };

/** What tells one kind of write from another, for the code every kind shares. */
interface WriteKindDefinition<K extends WriteKind, Input> {
  readonly kind: K;
  readonly same: (left: WriteSets[K], right: WriteSets[K]) => boolean;
  readonly run: (
    transport: Transport,
    endpoints: HirobaEndpoints,
    input: Input,
    options: WriteOptions<WriteSets[K]>,
  ) => Promise<WriteOutcome<WriteSets[K]>>;
  /** The write that undoes a record: from the set it was read back as, to the set before it. */
  readonly undoInput: (record: UndoRecord<WriteSets[K]>) => Input;
  /** Told how a write or an undo of this kind ended, for what the platform keeps of its result. */
  readonly ended: (outcome: WriteOutcomeView<WriteSets[K]>) => void;
}

/** A shell's writes. A kind not yet live-checked from this platform also reads another page before
 * and after. Nothing here queues (the shell does); each undo slot is the signed-in player's. */
export function createSessionWrites(options: SessionWritesOptions): SessionWrites {
  const { undoStore } = options;
  const liveChecked = options.liveChecked ?? LIVE_CHECKED_WRITES[options.platform];

  const costume: WriteKindDefinition<"costume", CostumeChange> = {
    kind: "costume",
    same: sameCostume,
    run: changeCostume,
    undoInput,
    ended: (outcome) => {
      if (changedTheCostume(outcome)) {
        options.costumeChanged();
      }
    },
  };

  const title: WriteKindDefinition<"title", TitleChange> = {
    kind: "title",
    same: sameTitle,
    run: changeTitle,
    // The id of a title worn is never readable, so one is put back by its name; the core resolves
    // it against today's list, and refuses a name that no title or more than one title has.
    undoInput: ({ before, after }) => ({
      expected: after,
      target: { id: null, title: before.title },
    }),
    ended: () => undefined,
  };

  const name: WriteKindDefinition<"name", NameChange> = {
    kind: "name",
    same: sameName,
    run: changeName,
    // Put back by the ordinary write, name to name; if Hiroba refuses, the record stays.
    undoInput,
    ended: () => undefined,
  };

  /** A player's slot, or an empty one when the store cannot be read: that never fails a read. */
  const slotOf = async <K extends WriteKind>(kind: K, taikoNo: string) => {
    try {
      return await undoStore.load(kind, taikoNo);
    } catch {
      return EMPTY_UNDO_SLOT;
    }
  };

  const amend = async <K extends WriteKind>(
    kind: K,
    taikoNo: string,
    change: (slot: UndoSlot<WriteSets[K]>) => UndoSlot<WriteSets[K]>,
  ) => {
    try {
      await undoStore.save(kind, taikoNo, change(await undoStore.load(kind, taikoNo)));
    } catch {
      // Nothing more to do: the slot still holds the pending write, which a later read settles.
    }
  };

  async function write<K extends WriteKind, Input>(
    definition: WriteKindDefinition<K, Input>,
    input: Input,
    purpose: "change" | "undo",
  ): Promise<WriteOutcomeView<WriteSets[K]>> {
    const { kind, same } = definition;
    // Whose set this is, for the whole write: the read that settles it is this player's too.
    const taikoNo = options.owner();
    let began = false;
    let outcome: WriteOutcome<WriteSets[K]>;
    try {
      outcome = await definition.run(options.transport, options.endpoints, input, {
        now: options.now,
        crossCheck: !liveChecked.includes(kind),
        beginUndo: async (before, expectedAfter) => {
          if (taikoNo === null) {
            throw new Error("Whose set this is is not known before my page is read");
          }
          const slot = reconcile(await undoStore.load(kind, taikoNo), before, same);
          const at = options.now().toISOString();
          // Rejects when it cannot be written, and the write then stops with nothing sent.
          await undoStore.save(
            kind,
            taikoNo,
            beginPending(slot, { taikoNo, before, expectedAfter, at, purpose }),
          );
          began = true;
        },
      });
    } catch {
      // A fault in this app, not an answer from Hiroba, and it may have come after the save. The
      // pending write stays as it was kept, for the next editor read to settle.
      return { kind: "interrupted" };
    }
    if (taikoNo !== null && began) {
      await amend(kind, taikoNo, (slot) => settle(slot, outcome, same));
    } else if (taikoNo !== null && outcome.kind === "changedSincePreview") {
      await amend(kind, taikoNo, (slot) => reconcile(slot, outcome.current, same));
    }
    if (outcome.kind === "sessionGone") {
      await options.endSession();
    }
    definition.ended(outcome);
    return outcome;
  }

  async function opened<K extends WriteKind, Editor extends { readonly state: WriteSets[K] }>(
    definition: Pick<WriteKindDefinition<K, unknown>, "kind" | "same">,
    read: (
      transport: Transport,
      endpoints: HirobaEndpoints,
    ) => Promise<Result<Editor, ReadFailure>>,
  ): Promise<Result<Editor, ReadFailure>> {
    if (!options.signedIn()) {
      return err({ kind: "notSignedIn" });
    }
    const taikoNo = options.owner();
    const result = await read(options.transport, options.endpoints);
    if (result.ok && taikoNo !== null) {
      await amend(definition.kind, taikoNo, (slot) =>
        reconcile(slot, result.value.state, definition.same),
      );
    } else if (!result.ok && sessionEnded(result.error)) {
      await options.endSession();
    }
    return result;
  }

  async function offeredFor<K extends WriteKind>(kind: K, taikoNo: string) {
    return offeredUndo(await slotOf(kind, taikoNo), taikoNo);
  }

  async function summaryOf<K extends WriteKind>(
    kind: K,
    taikoNo: string,
  ): Promise<UndoSummaryOf<K> | null> {
    const record = await offeredFor(kind, taikoNo);
    return record === null
      ? null
      : { kind, at: record.at, before: record.before, after: record.after };
  }

  const undoers = {
    costume: (record) => write(costume, costume.undoInput(record), "undo"),
    title: (record) => write(title, title.undoInput(record), "undo"),
    name: (record) => write(name, name.undoInput(record), "undo"),
  } satisfies {
    readonly [K in WriteKind]: (
      record: UndoRecord<WriteSets[K]>,
    ) => Promise<WriteOutcomeView<WriteSets[K]>>;
  };

  async function settledBy<K extends WriteKind>(
    definition: Pick<WriteKindDefinition<K, unknown>, "kind" | "same">,
    taikoNo: string,
    shown: WriteSets[K],
  ) {
    const slot = await slotOf(definition.kind, taikoNo);
    if (slot.record !== null || slot.pending !== null) {
      await amend(definition.kind, taikoNo, (held) => reconcile(held, shown, definition.same));
    }
  }

  return {
    openCostumeEditor: () => opened(costume, openCostumeEditor),

    openTitleEditor: () => opened(title, openTitleEditor),

    async changeCostume(change) {
      if (!options.signedIn()) {
        return { kind: "notSignedIn" };
      }
      return write(costume, change, "change");
    },

    async changeTitle(change) {
      if (!options.signedIn()) {
        return { kind: "notSignedIn" };
      }
      return write(title, change, "change");
    },

    async changeName(change) {
      if (!options.signedIn()) {
        return { kind: "notSignedIn" };
      }
      return write(name, change, "change");
    },

    async pendingUndo() {
      const taikoNo = options.owner();
      if (taikoNo === null) {
        return [];
      }
      const offers = await Promise.all([
        summaryOf("costume", taikoNo),
        summaryOf("title", taikoNo),
        summaryOf("name", taikoNo),
      ]);
      return offers.filter((offer): offer is UndoSummary => offer !== null);
    },

    async undo<K extends WriteKind>(kind: K): Promise<WriteOutcomeView<WriteSets[K]>> {
      if (!options.signedIn()) {
        return { kind: "notSignedIn" };
      }
      const taikoNo = options.owner();
      const record = taikoNo === null ? null : await offeredFor(kind, taikoNo);
      if (record === null) {
        return { kind: "nothingToUndo" };
      }
      // The table is keyed by kind, so the entry is the one for K; TypeScript cannot see that.
      const undoer = undoers[kind] as (
        record: UndoRecord<WriteSets[K]>,
      ) => Promise<WriteOutcomeView<WriteSets[K]>>;
      return undoer(record);
    },

    async profileRead({ taikoNo, title: shownTitle, nickname }) {
      await settledBy(title, taikoNo, { title: shownTitle });
      await settledBy(name, taikoNo, { nickname });
    },
  };
}
