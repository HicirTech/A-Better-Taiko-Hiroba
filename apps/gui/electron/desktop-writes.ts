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
 */
export function createDesktopWrites(options: DesktopWritesOptions): DesktopWrites {
  const { undoStore } = options;
  const costumeGate = () =>
    enabledWrites(options.gate).find((write: EnabledWrite) => write.kind === KIND);

  /**
   * Settles a slot against the set as it is now, but only the signed-in player's own: another
   * player's record, left on this device, is theirs to settle.
   */
  const reconciled = (slot: UndoSlot<CostumeSet>, current: CostumeSet) => {
    const whose = slot.pending?.taikoNo ?? slot.record?.taikoNo;
    return whose === undefined || whose === options.owner()
      ? reconcile(slot, current, sameCostume)
      : slot;
  };

  /** A slot written after the fact: if it cannot be, the pending write settles from a later read. */
  const keep = (slot: UndoSlot<CostumeSet>) => {
    try {
      undoStore.save(KIND, slot);
    } catch {
      // Nothing more to do here: the slot on disk still holds the pending write.
    }
  };

  async function write(
    input: { readonly expected: CostumeSet; readonly target: CostumeSet },
    purpose: "change" | "undo",
    gate: EnabledWrite,
  ): Promise<WriteOutcomeView> {
    let began = false;
    const outcome = await changeCostume(options.transport, options.endpoints, input, {
      now: options.now,
      crossCheck: !gate.verified,
      beginUndo: async (before, expectedAfter) => {
        const taikoNo = options.owner();
        if (taikoNo === null) {
          throw new Error("Whose set this is is not known before my page is read");
        }
        const slot = reconciled(undoStore.load(KIND), before);
        const at = options.now().toISOString();
        // Throws when it cannot be written, and the write then stops with nothing sent.
        undoStore.save(KIND, beginPending(slot, { taikoNo, before, expectedAfter, at, purpose }));
        began = true;
      },
    });
    if (began) {
      keep(settle(undoStore.load(KIND), outcome, sameCostume));
    } else if (outcome.kind === "changedSincePreview") {
      keep(reconciled(undoStore.load(KIND), outcome.current));
    }
    if (outcome.kind === "sessionGone") {
      options.endSession();
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
      const read = await openCostumeEditor(options.transport, options.endpoints);
      if (read.ok) {
        // The set as it is now settles a write whose end was not known, and dates a stale record.
        keep(reconciled(undoStore.load(KIND), read.value.state));
      } else if (sessionEnded(read.error)) {
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
      if (costumeGate() === undefined) {
        return [];
      }
      const record = offeredUndo(undoStore.load(KIND), options.owner());
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
      const record = offeredUndo(undoStore.load(KIND), options.owner());
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
