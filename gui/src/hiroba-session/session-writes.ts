import {
  err,
  type Result,
  refreshHiroba,
  sameCostume,
  type Transport,
  type WriteOutcome,
} from "@abth/core";

import {
  type CostumeChange,
  type CostumeHistoryEntry,
  type CostumeSet,
  changedOnHiroba,
  type FavoriteSongChange,
  type FolderChange,
  type FolderNames,
  type FolderState,
  type HirobaSessionPort,
  type NameChange,
  type ReadFailure,
  type TitleChange,
  type VerbImplementation,
  type WriteKind,
  type WriteOutcomeView,
  type WriteSets,
} from "../shared/session-port";
import { filledSlots } from "../shared/sets/favorite-sets";
import { changeCostume } from "./change-costume";
import { changeFavoriteSong } from "./change-favorite-song";
import { changeFolder } from "./change-folder";
import { changeName } from "./change-name";
import { changeTitle } from "./change-title";
import { mergeCostumeHistory } from "./costume-history";
import { mergeFolderHistory } from "./folder-history";
import type { CostumeHistoryStore, FolderHistoryStore, HistoryStore } from "./history-store";
import { LIVE_CHECKED_WRITES, type WritePlatform } from "./live-checked-writes";
import { openCostumeEditor } from "./open-costume-editor";
import { openFavorites } from "./open-favorites";
import { openTitleEditor } from "./open-title-editor";
import { readSongPicker } from "./read-song-picker";
import { sessionEnded } from "./session-ended";
import type { HirobaEndpoints, WriteOptions } from "./types";

export interface SessionWritesOptions {
  readonly endpoints: HirobaEndpoints;
  /** The shell: whose list of live-checked kinds decides which writes also cross-check. */
  readonly platform: WritePlatform;
  /** The kinds live-checked here, in place of the platform's own list: only a test passes one. */
  readonly liveChecked?: readonly WriteKind[];
  readonly now: () => Date;
  readonly historyStore: CostumeHistoryStore;
  readonly folderHistoryStore: FolderHistoryStore;
  /** The picture of exactly this set that this session holds, or null. */
  readonly recentPreview: (set: CostumeSet) => string | null;
  readonly signedIn: () => boolean;
  /** Drops the session: Hiroba ended it. The write that found it waits for this to be done. */
  readonly endSession: () => void | Promise<void>;
  /** Whose my page this run last read, or null before any read: whose history is whose. */
  readonly owner: () => string | null;
  /** A write applied: the costume worn is the one it read back, whatever was kept of the last. */
  readonly costumeChanged: (worn: CostumeSet) => void;
}

type QueuedWrites = {
  readonly [V in
    | "openCostumeEditor"
    | "openTitleEditor"
    | "openFavorites"
    | "changeCostume"
    | "changeTitle"
    | "changeName"
    | "changeFolder"
    | "changeFavoriteSong"
    | "readSongPicker"
    | "refreshHiroba"]: VerbImplementation<V>;
};

/** The port's write verbs, the same on every shell; a queued one takes its group's transport. */
export interface SessionWrites
  extends QueuedWrites,
    Pick<HirobaSessionPort, "costumeHistory" | "folderHistory"> {
  /** A preview came: a history entry of that set with no picture takes it. */
  previewKept(set: CostumeSet, picture: string): Promise<void>;
}

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
    input: Input,
  ) => void | Promise<void>;
}

/** A shell's writes. A kind not yet live-checked from this platform also reads another page before
 * and after. Nothing here queues (the shell does). */
export function createSessionWrites(options: SessionWritesOptions): SessionWrites {
  const { historyStore, folderHistoryStore } = options;
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

  /** Puts the folder a write saved first in the player's history, then the one it replaced. */
  const rememberFolders = async (
    taikoNo: string,
    { before, after }: { readonly before: FolderState; readonly after: FolderState },
    names: FolderNames | undefined,
  ) => {
    try {
      const keptAt = options.now().getTime();
      const saved = { songs: filledSlots(after), keptAt, setName: names?.target ?? null };
      const replaced = { songs: filledSlots(before), setName: names?.expected ?? null };
      const kept = await folderHistoryStore.load(taikoNo);
      await folderHistoryStore.save(taikoNo, mergeFolderHistory(kept, saved, replaced));
    } catch {
      // The history is a convenience: it stays as it was, and the write's outcome with it.
    }
  };

  /** The signed-in player's entries of one history; none where it cannot be read. */
  const historyOf = async <Entry>(store: HistoryStore<Entry>): Promise<readonly Entry[]> => {
    const taikoNo = options.owner();
    if (!options.signedIn() || taikoNo === null) {
      return [];
    }
    try {
      return await store.load(taikoNo);
    } catch {
      return [];
    }
  };

  const costume: WriteKindDefinition<"costume", CostumeChange> = {
    kind: "costume",
    run: changeCostume,
    ended: async (outcome, taikoNo) => {
      if (!changedOnHiroba(outcome)) {
        return;
      }
      options.costumeChanged(outcome.after);
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

  const folder: WriteKindDefinition<"folder", FolderChange> = {
    kind: "folder",
    run: changeFolder,
    ended: async (outcome, taikoNo, change) => {
      if (changedOnHiroba(outcome) && taikoNo !== null) {
        await rememberFolders(taikoNo, outcome, change.names);
      }
    },
  };

  const favoriteSong: WriteKindDefinition<"favoriteSong", FavoriteSongChange> = {
    kind: "favoriteSong",
    run: changeFavoriteSong,
    ended: () => undefined,
  };

  async function write<K extends WriteKind, Input>(
    transport: Transport,
    definition: WriteKindDefinition<K, Input>,
    input: Input,
  ): Promise<WriteOutcomeView<WriteSets[K]>> {
    // Read first: a session that ends during the write clears the owner.
    const taikoNo = options.owner();
    let outcome: WriteOutcome<WriteSets[K]>;
    try {
      outcome = await definition.run(transport, options.endpoints, input, {
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
    await definition.ended(outcome, taikoNo, input);
    return outcome;
  }

  async function opened<Editor>(
    transport: Transport,
    read: (
      transport: Transport,
      endpoints: HirobaEndpoints,
    ) => Promise<Result<Editor, ReadFailure>>,
  ): Promise<Result<Editor, ReadFailure>> {
    if (!options.signedIn()) {
      return err({ kind: "notSignedIn" });
    }
    const result = await read(transport, options.endpoints);
    if (!result.ok && sessionEnded(result.error)) {
      await options.endSession();
    }
    return result;
  }

  return {
    openCostumeEditor: (transport) => opened(transport, openCostumeEditor),

    openTitleEditor: (transport) => opened(transport, openTitleEditor),

    openFavorites: (transport) => opened(transport, openFavorites),

    readSongPicker: (transport) => opened(transport, readSongPicker),

    refreshHiroba: (transport) =>
      opened(transport, (hiroba, { hirobaOrigin }) =>
        refreshHiroba({ transport: hiroba, hirobaOrigin, now: options.now }),
      ),

    async changeCostume(transport, change) {
      if (!options.signedIn()) {
        return { kind: "notSignedIn" };
      }
      return write(transport, costume, change);
    },

    async changeTitle(transport, change) {
      if (!options.signedIn()) {
        return { kind: "notSignedIn" };
      }
      return write(transport, title, change);
    },

    async changeName(transport, change) {
      if (!options.signedIn()) {
        return { kind: "notSignedIn" };
      }
      return write(transport, name, change);
    },

    async changeFolder(transport, change) {
      if (!options.signedIn()) {
        return { kind: "notSignedIn" };
      }
      return write(transport, folder, change);
    },

    async changeFavoriteSong(transport, change) {
      if (!options.signedIn()) {
        return { kind: "notSignedIn" };
      }
      return write(transport, favoriteSong, change);
    },

    async previewKept(set, picture) {
      const taikoNo = options.owner();
      if (taikoNo === null) {
        return;
      }
      try {
        const kept = await historyStore.load(taikoNo);
        const blank = (entry: CostumeHistoryEntry) =>
          entry.picture === null && sameCostume(entry.set, set);
        if (kept.some(blank)) {
          await historyStore.save(
            taikoNo,
            kept.map((entry) => (blank(entry) ? { ...entry, picture } : entry)),
          );
        }
      } catch {
        // The history is a convenience: it stays as it was.
      }
    },

    costumeHistory: () => historyOf(historyStore),

    folderHistory: () => historyOf(folderHistoryStore),
  };
}
