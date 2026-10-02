import {
  beginPending,
  type CostumeSet,
  EMPTY_UNDO_SLOT,
  err,
  offeredUndo,
  reconcile,
  sameCostume,
  settle,
  type Transport,
  type UndoSlot,
  undoInput,
  type WriteOutcome,
} from "@abth/core";

import {
  changedTheCostume,
  type EnabledWrite,
  type HirobaSessionPort,
  type ReadFailure,
  type WriteOutcomeView,
} from "../session-port";
import { changeCostume } from "./change-costume";
import { openCostumeEditor } from "./open-costume-editor";
import type { HirobaEndpoints } from "./types";
import type { UndoStore } from "./undo-store";
import { enabledWrites, type WriteGateInput } from "./verified-writes";

/** The only kind of write so far. */
const KIND = "costume";

export interface SessionWritesOptions {
  readonly transport: Transport;
  readonly endpoints: HirobaEndpoints;
  /** Whether the build is packaged, and its environment: which writes the run may send. */
  readonly gate: WriteGateInput;
  readonly now: () => Date;
  readonly undoStore: UndoStore;
  /** Whether this device holds a session. */
  readonly signedIn: () => boolean;
  /** Drops the session: Hiroba ended it. */
  readonly endSession: () => void;
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

/**
 * A shell's writes: the gate, checked where each write is sent; the undo record, kept before a
 * write's first post and settled by its outcome; and the session, dropped when Hiroba ends it. An undo is an ordinary write, from the record's read-back set to its set before.
 *
 * Every undo slot read or written is the signed-in player's own, by taiko number: another
 * player's record or pending write, left on this device, is theirs, and nothing here touches it.
 */
export function createSessionWrites(options: SessionWritesOptions): SessionWrites {
  const { undoStore } = options;
  const costumeGate = () =>
    enabledWrites(options.gate).find((write: EnabledWrite) => write.kind === KIND);

  /** A player's slot, or an empty one when the store cannot be read: that never fails a read. */
  const slotOf = async (taikoNo: string): Promise<UndoSlot<CostumeSet>> => {
    try {
      return await undoStore.load(KIND, taikoNo);
    } catch {
      return EMPTY_UNDO_SLOT;
    }
  };

  /**
   * A player's slot read, changed and written after the fact: if that cannot be, the pending
   * write settles from a later read.
   */
  const amend = async (
    taikoNo: string,
    change: (slot: UndoSlot<CostumeSet>) => UndoSlot<CostumeSet>,
  ) => {
    try {
      await undoStore.save(KIND, taikoNo, change(await undoStore.load(KIND, taikoNo)));
    } catch {
      // Nothing more to do here: the slot kept still holds the pending write.
    }
  };

  async function write(
    input: { readonly expected: CostumeSet; readonly target: CostumeSet },
    purpose: "change" | "undo",
    gate: EnabledWrite,
  ): Promise<WriteOutcomeView> {
    // Whose set this is, for the whole write: the read that settles it is this player's too.
    const taikoNo = options.owner();
    let began = false;
    let outcome: WriteOutcome<CostumeSet>;
    try {
      outcome = await changeCostume(options.transport, options.endpoints, input, {
        now: options.now,
        crossCheck: !gate.verified,
        beginUndo: async (before, expectedAfter) => {
          if (taikoNo === null) {
            throw new Error("Whose set this is is not known before my page is read");
          }
          const slot = reconcile(await undoStore.load(KIND, taikoNo), before, sameCostume);
          const at = options.now().toISOString();
          // Rejects when it cannot be written, and the write then stops with nothing sent.
          await undoStore.save(
            KIND,
            taikoNo,
            beginPending(slot, { taikoNo, before, expectedAfter, at, purpose }),
          );
          began = true;
        },
      });
    } catch {
      // A fault in this app, not an answer from Hiroba, and it may have come after the save. The
      // pending write stays as it is on disk, for the next editor read to settle.
      return { kind: "interrupted" };
    }
    if (taikoNo !== null && began) {
      await amend(taikoNo, (slot) => settle(slot, outcome, sameCostume));
    } else if (taikoNo !== null && outcome.kind === "changedSincePreview") {
      await amend(taikoNo, (slot) => reconcile(slot, outcome.current, sameCostume));
    }
    if (outcome.kind === "sessionGone") {
      options.endSession();
    }
    if (changedTheCostume(outcome)) {
      options.costumeChanged();
    }
    return outcome;
  }

  return {
    async enabledWrites() {
      return enabledWrites(options.gate);
    },

    async openCostumeEditor() {
      if (!options.signedIn()) {
        return err({ kind: "notSignedIn" });
      }
      const taikoNo = options.owner();
      const read = await openCostumeEditor(options.transport, options.endpoints);
      if (read.ok && taikoNo !== null) {
        // The set as it is now settles a write whose end was not known, and dates a stale record.
        await amend(taikoNo, (slot) => reconcile(slot, read.value.state, sameCostume));
      } else if (!read.ok && sessionEnded(read.error)) {
        options.endSession();
      }
      return read;
    },

    async changeCostume(change) {
      const gate = costumeGate();
      if (gate === undefined) {
        return { kind: "notEnabled" };
      }
      if (!options.signedIn()) {
        return { kind: "notSignedIn" };
      }
      return write(change, "change", gate);
    },

    async pendingUndo() {
      const taikoNo = options.owner();
      if (costumeGate() === undefined || taikoNo === null) {
        return [];
      }
      const record = offeredUndo(await slotOf(taikoNo), taikoNo);
      return record === null
        ? []
        : [{ kind: KIND, at: record.at, before: record.before, after: record.after }];
    },

    async undo() {
      const gate = costumeGate();
      if (gate === undefined) {
        return { kind: "notEnabled" };
      }
      if (!options.signedIn()) {
        return { kind: "notSignedIn" };
      }
      const taikoNo = options.owner();
      const record = taikoNo === null ? null : offeredUndo(await slotOf(taikoNo), taikoNo);
      if (record === null) {
        return { kind: "nothingToUndo" };
      }
      return write(undoInput(record), "undo", gate);
    },
  };
}

/** A read that found the login page, or a card still to choose: the session is over. */
function sessionEnded(failure: ReadFailure): boolean {
  return failure.kind === "loggedOut" || failure.kind === "cardSelectUnfinished";
}
