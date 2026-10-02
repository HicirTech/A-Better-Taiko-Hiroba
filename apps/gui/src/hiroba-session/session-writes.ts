import {
  beginPending,
  EMPTY_UNDO_SLOT,
  err,
  offeredUndo,
  reconcile,
  sameCostume,
  settle,
  type Transport,
  type UndoRecord,
  type UndoSlot,
  undoInput,
  type WriteDeps,
  type WriteOutcome,
} from "@abth/core";

import {
  changedTheCostume,
  type CostumeChange,
  type EnabledWrite,
  type HirobaSessionPort,
  type WriteKind,
  type WriteOutcomeView,
  type WriteSets,
} from "../session-port";
import { changeCostume } from "./change-costume";
import { openCostumeEditor } from "./open-costume-editor";
import { sessionEnded } from "./session-ended";
import type { HirobaEndpoints } from "./types";
import type { UndoStore } from "./undo-store";
import { enabledWrites, type WriteGateInput } from "./verified-writes";

export interface SessionWritesOptions {
  readonly transport: Transport;
  readonly endpoints: HirobaEndpoints;
  /** Whether the build is packaged, and its environment: which writes the run may send. */
  readonly gate: WriteGateInput;
  /** The kinds verified on this platform, in place of its own list: only a test passes one. */
  readonly verified?: readonly WriteKind[];
  readonly now: () => Date;
  readonly undoStore: UndoStore;
  /** Whether this device holds a session. */
  readonly signedIn: () => boolean;
  /** Drops the session: Hiroba ended it. The write that found it waits for this to be done. */
  readonly endSession: () => void | Promise<void>;
  /** Whose my page this run last read, or null before any read: whose undo record is whose. */
  readonly owner: () => string | null;
  /** A write, or an undo, applied: the costume is the one it wrote, whatever was kept of it. */
  readonly costumeChanged: () => void;
}

/** The port's write verbs, the same on every shell. */
export type SessionWrites = Pick<
  HirobaSessionPort,
  "enabledWrites" | "openCostumeEditor" | "changeCostume" | "pendingUndo" | "undo"
>;

/** How a write that was asked for while another was queued or running answers: sent nothing. */
export const BUSY_OUTCOME: WriteOutcomeView = { kind: "busy" };

/** What a write is run with besides the transport: the clock, the cross-check, and the undo. */
type WriteRunOptions<K extends WriteKind> = Omit<
  WriteDeps<WriteSets[K]>,
  "transport" | "hirobaOrigin"
>;

/**
 * What tells one kind of write from another, for the code every kind shares (`write`, and the undo
 * slots it keeps): the gate, the undo record, the session and the order of it all. A kind joins by
 * one of these and by the port verbs that ask for it, which are the last thing in this module.
 */
interface WriteKindDefinition<K extends WriteKind, Input> {
  readonly kind: K;
  /** Whether two sets are the same one. */
  readonly same: (left: WriteSets[K], right: WriteSets[K]) => boolean;
  /** The write, the way every write goes (`runWrite`). */
  readonly run: (
    transport: Transport,
    endpoints: HirobaEndpoints,
    input: Input,
    options: WriteRunOptions<K>,
  ) => Promise<WriteOutcome<WriteSets[K]>>;
  /** The write that undoes a record: from the set it was read back as, to the set before it. */
  readonly undoInput: (record: UndoRecord<WriteSets[K]>) => Input;
  /** Told how a write or an undo of this kind ended, for what the platform keeps of its result. */
  readonly ended: (outcome: WriteOutcomeView) => void;
}

/**
 * A shell's writes: the gate, checked where each write is sent; the undo record, kept before a
 * write's first post and settled by its outcome; and the session, dropped when Hiroba ends it. An
 * undo is an ordinary write, from the record's read-back set to its set before.
 *
 * Every undo slot read or written is the signed-in player's own, by taiko number: another
 * player's record or pending write, left on this device, is theirs, and nothing here touches it.
 *
 * Nothing here queues: the shell runs each verb that asks Hiroba something in its queue, so one
 * write is never inside another and no read lands between a write's requests.
 */
export function createSessionWrites(options: SessionWritesOptions): SessionWrites {
  const { undoStore } = options;
  const gateOf = (kind: WriteKind) =>
    enabledWrites(options.gate, options.verified).find(
      (write: EnabledWrite) => write.kind === kind,
    );

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

  /** A player's slot, or an empty one when the store cannot be read: that never fails a read. */
  const slotOf = async <K extends WriteKind>(kind: K, taikoNo: string) => {
    try {
      return await undoStore.load(kind, taikoNo);
    } catch {
      return EMPTY_UNDO_SLOT;
    }
  };

  /**
   * A player's slot read, changed and written after the fact: if that cannot be, the pending
   * write settles from a later read.
   */
  const amend = async <K extends WriteKind>(
    kind: K,
    taikoNo: string,
    change: (slot: UndoSlot<WriteSets[K]>) => UndoSlot<WriteSets[K]>,
  ) => {
    try {
      await undoStore.save(kind, taikoNo, change(await undoStore.load(kind, taikoNo)));
    } catch {
      // Nothing more to do here: the slot kept still holds the pending write.
    }
  };

  async function write<K extends WriteKind, Input>(
    definition: WriteKindDefinition<K, Input>,
    input: Input,
    purpose: "change" | "undo",
    gate: EnabledWrite,
  ): Promise<WriteOutcomeView> {
    const { kind, same } = definition;
    // Whose set this is, for the whole write: the read that settles it is this player's too.
    const taikoNo = options.owner();
    let began = false;
    let outcome: WriteOutcome<WriteSets[K]>;
    try {
      outcome = await definition.run(options.transport, options.endpoints, input, {
        now: options.now,
        crossCheck: !gate.verified,
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

  /** The undo this player can be offered for the kind, if any: asks Hiroba nothing. */
  async function offeredFor<K extends WriteKind>(kind: K, taikoNo: string) {
    return offeredUndo(await slotOf(kind, taikoNo), taikoNo);
  }

  return {
    async enabledWrites() {
      return enabledWrites(options.gate, options.verified);
    },

    async openCostumeEditor() {
      if (!options.signedIn()) {
        return err({ kind: "notSignedIn" });
      }
      const taikoNo = options.owner();
      const read = await openCostumeEditor(options.transport, options.endpoints);
      if (read.ok && taikoNo !== null) {
        // The set as it is now settles a write whose end was not known, and dates a stale record.
        await amend(costume.kind, taikoNo, (slot) =>
          reconcile(slot, read.value.state, costume.same),
        );
      } else if (!read.ok && sessionEnded(read.error)) {
        await options.endSession();
      }
      return read;
    },

    async changeCostume(change) {
      const gate = gateOf(costume.kind);
      if (gate === undefined) {
        return { kind: "notEnabled" };
      }
      if (!options.signedIn()) {
        return { kind: "notSignedIn" };
      }
      return write(costume, change, "change", gate);
    },

    async pendingUndo() {
      const taikoNo = options.owner();
      if (gateOf(costume.kind) === undefined || taikoNo === null) {
        return [];
      }
      const record = await offeredFor(costume.kind, taikoNo);
      return record === null
        ? []
        : [{ kind: costume.kind, at: record.at, before: record.before, after: record.after }];
    },

    async undo() {
      const gate = gateOf(costume.kind);
      if (gate === undefined) {
        return { kind: "notEnabled" };
      }
      if (!options.signedIn()) {
        return { kind: "notSignedIn" };
      }
      const taikoNo = options.owner();
      const record = taikoNo === null ? null : await offeredFor(costume.kind, taikoNo);
      if (record === null) {
        return { kind: "nothingToUndo" };
      }
      return write(costume, costume.undoInput(record), "undo", gate);
    },
  };
}
