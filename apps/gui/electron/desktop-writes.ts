import {
  beginPending,
  type CostumeSet,
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
  changeCostume,
  enabledWrites,
  type HirobaEndpoints,
  openCostumeEditor,
  type WriteGateInput,
} from "../src/hiroba-session";
import type {
  EnabledWrite,
  HirobaSessionPort,
  ReadFailure,
  WriteOutcomeView,
} from "../src/session-port";
import type { UndoStore } from "./undo-store";

/** The only kind of write so far. */
const KIND = "costume";

export interface DesktopWritesOptions {
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

/** The port's write verbs on the desktop. */
export type DesktopWrites = Pick<
  HirobaSessionPort,
  "enabledWrites" | "openCostumeEditor" | "changeCostume" | "pendingUndo" | "undo"
>;

/**
 * The desktop's writes: the gate, checked where each write is sent; the undo record, kept on disk
 * before a write's first post and settled by its outcome; and the session, dropped when Hiroba
 * ends it. An undo is an ordinary write, from the record's read-back set to its set before.
 *
 * Every undo slot read or written is the signed-in player's own, by taiko number: another
 * player's record or pending write, left on this device, is theirs, and nothing here touches it.
 */
export function createDesktopWrites(options: DesktopWritesOptions): DesktopWrites {
  const { undoStore } = options;
  const costumeGate = () =>
    enabledWrites(options.gate).find((write: EnabledWrite) => write.kind === KIND);

  /**
   * A player's slot written after the fact: if it cannot be, the pending write settles from a
   * later read.
   */
  const keep = (taikoNo: string, slot: UndoSlot<CostumeSet>) => {
    try {
      undoStore.save(KIND, taikoNo, slot);
    } catch {
      // Nothing more to do here: the slot on disk still holds the pending write.
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
          const slot = reconcile(undoStore.load(KIND, taikoNo), before, sameCostume);
          const at = options.now().toISOString();
          // Throws when it cannot be written, and the write then stops with nothing sent.
          undoStore.save(
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
      keep(taikoNo, settle(undoStore.load(KIND, taikoNo), outcome, sameCostume));
    } else if (taikoNo !== null && outcome.kind === "changedSincePreview") {
      keep(taikoNo, reconcile(undoStore.load(KIND, taikoNo), outcome.current, sameCostume));
    }
    if (outcome.kind === "sessionGone") {
      options.endSession();
    }
    if (outcome.kind === "applied" || outcome.kind === "appliedNotSynced") {
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
        keep(taikoNo, reconcile(undoStore.load(KIND, taikoNo), read.value.state, sameCostume));
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
      const record = offeredUndo(undoStore.load(KIND, taikoNo), taikoNo);
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
      const record = taikoNo === null ? null : offeredUndo(undoStore.load(KIND, taikoNo), taikoNo);
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
