/** Where a right-click landed. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Where a right-click landed, from its event. */
export const pointerOf = (event: {
  readonly clientX: number;
  readonly clientY: number;
}): Point => ({
  x: event.clientX,
  y: event.clientY,
});

/** One of an item's own actions. */
export interface ItemAction {
  /** Ends its ids: `<menu id>-<key>` in the menu, `<dialog id>-<key>` in the dialog. */
  readonly key: string;
  readonly label: string;
  /** It deletes or replaces something: said in red, in the menu as in the dialog. */
  readonly destructive?: boolean;
  /** Its own dialog asks the rest, such as which set: alone, a long press goes straight to it. */
  readonly chooses?: boolean;
  readonly onPick: () => void;
}

/** An item whose menu is open, and where a right-click landed; null for a long press. */
export interface OpenedItem<T> {
  readonly item: T;
  readonly at: Point | null;
}

/** The action a long press runs at once: an item's only one, where its own dialog asks the rest. */
export function runsAtOnce(actions: readonly ItemAction[], at: Point | null): ItemAction | null {
  const [only] = actions;
  return at === null && actions.length === 1 && only?.chooses === true ? only : null;
}
