import { type Dispatch, type SetStateAction, useEffect, useEffectEvent, useState } from "react";

import type { FolderHistoryEntry } from "../shared/session-port";
import type { FavoriteSet } from "../shared/sets/favorite-sets";
import { useBackLeaves } from "../ui/back-closers";
import type { GiftDraft } from "./gift-maker";

/** What a tip told opens on the page: the sets drawer, or the first set being edited. */
export type FavoritesScene = "sets" | "editedSet" | null;

export interface FavoritesLevelOptions {
  readonly sets: readonly FavoriteSet[];
  readonly tipScene: FavoritesScene;
  /** Opens or shuts the sets drawer, as a tip's scene asks. */
  readonly onDrawer: (open: boolean) => void;
}

/** Where the page stands: Hiroba's favourites, a set shown or edited, a folder put back, a gift. */
export interface FavoritesLevel {
  /** The set picked from the drawer, while the list holds it. */
  readonly set: FavoriteSet | null;
  readonly editing: boolean;
  /** The set's edits, apart until Save; null for none. */
  readonly draft: readonly string[] | null;
  readonly setDraft: Dispatch<SetStateAction<readonly string[] | null>>;
  /** A kept folder put back, shown as a set is until the bar's Sync writes it or Back leaves it. */
  readonly putBack: FolderHistoryEntry | null;
  readonly setPutBack: (entry: FolderHistoryEntry | null) => void;
  /** A gift being made, which stands in for the page until Back leaves it. */
  readonly gift: GiftDraft | null;
  readonly setGift: Dispatch<SetStateAction<GiftDraft | null>>;
  /** Shows a set, or Hiroba's favourites for null, with nothing else of the page held. */
  showSet(id: string | null, editing?: boolean): void;
  edit(): void;
  leaveEditing(): void;
}

export function useFavoritesLevel({
  sets,
  tipScene,
  onDrawer,
}: FavoritesLevelOptions): FavoritesLevel {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<readonly string[] | null>(null);
  const [putBack, setPutBack] = useState<FolderHistoryEntry | null>(null);
  const [gift, setGift] = useState<GiftDraft | null>(null);
  const set = sets.find((one) => one.id === selectedId) ?? null;
  const showSet = (id: string | null, editingIt = false) => {
    setSelectedId(id);
    setDraft(null);
    setEditing(editingIt);
    setPutBack(null);
    setGift(null);
  };
  const leaveEditing = () => {
    setDraft(null);
    setEditing(false);
  };
  // A set from the drawer is a level of its own, Back going to the current favourites; Back
  // leaves the level registered last, so a set's edits before the set.
  useBackLeaves(set !== null, () => showSet(null));
  useBackLeaves(putBack !== null, () => setPutBack(null));
  useBackLeaves(gift !== null, () => setGift(null));
  useBackLeaves(editing, leaveEditing);
  // A tip shows what it tells, then leaves the page as it opened: the folder, the drawer shut.
  const showFor = useEffectEvent((scene: FavoritesScene) => {
    const first = sets[0];
    onDrawer(scene === "sets");
    if (scene === "editedSet" && first !== undefined) {
      showSet(first.id, true);
    } else if (scene === null) {
      showSet(null);
    }
  });
  useEffect(() => showFor(tipScene), [tipScene]);
  return {
    set,
    editing,
    draft,
    setDraft,
    putBack,
    setPutBack,
    gift,
    setGift,
    showSet,
    edit: () => setEditing(true),
    leaveEditing,
  };
}
