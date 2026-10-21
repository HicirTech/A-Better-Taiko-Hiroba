import { Menu, MenuItem } from "@mui/material";
import { type MouseEvent, useState } from "react";

import { type LongPressHandlers, useLongPressLetGo } from "../my-page/use-long-press";
import {
  type ItemAction,
  type OpenedItem,
  type Point,
  pointerOf,
  runsAtOnce,
} from "./item-actions";
import { SimpleDialog } from "./simple-dialog";

const DESTRUCTIVE = { color: "error.main" } as const;

/** Which item's menu is open; `open` takes a right-click's point, or null for a long press. */
export function useItemMenu<T>(actionsOf: (item: T) => readonly ItemAction[]) {
  const [opened, setOpened] = useState<OpenedItem<T> | null>(null);
  return {
    opened,
    open: (item: T, at: Point | null) => {
      const once = runsAtOnce(actionsOf(item), at);
      if (once === null) {
        setOpened({ item, at });
      } else {
        once.onPick();
      }
    },
    close: () => setOpened(null),
  };
}

/** What a row hears to open its menu: a right-click, and a touch screen's long press. */
export interface ItemPressHandlers extends LongPressHandlers {
  readonly onContextMenu: (event: MouseEvent) => void;
}

/** A row's way to its menu: a right-click, or on a touch screen a long press let go in place. */
export function useItemPress(
  touchFirst: boolean,
  open: (at: Point | null) => void,
): { readonly handlers: ItemPressHandlers; readonly held: boolean } {
  const { handlers, held } = useLongPressLetGo(touchFirst, () => open(null));
  return {
    held,
    handlers: {
      ...handlers,
      // A touch screen's own menu would come up over the long press.
      onContextMenu: (event) => {
        event.preventDefault();
        if (!touchFirst) {
          open(pointerOf(event));
        }
      },
    },
  };
}

/** An item's own actions: a menu where the pointer was, or a small dialog on a touch screen. */
export function ItemMenu<T>({
  id,
  dialogId,
  opened,
  nameOf,
  actionsOf,
  cancel,
  onClose,
}: {
  /** The menu's id; an action's is `<id>-<key>`. */
  readonly id: string;
  /** The dialog's id; an action's button is `<dialogId>-<key>`, Cancel `<dialogId>-cancel`. */
  readonly dialogId: string;
  readonly opened: OpenedItem<T> | null;
  /** The item's name, which titles the dialog. */
  readonly nameOf: (item: T) => string;
  readonly actionsOf: (item: T) => readonly ItemAction[];
  /** The dialog's Cancel. */
  readonly cancel: string;
  /** A pick in the menu closes it first; the dialog stays under what an action opens. */
  readonly onClose: () => void;
}) {
  // Kept while the menu or the dialog fades out, so neither empties nor moves on its way.
  const [last, setLast] = useState(opened);
  if (opened !== null && opened !== last) {
    setLast(opened);
  }
  const actions = last === null ? [] : actionsOf(last.item);
  const at = last?.at ?? null;
  return (
    <>
      <Menu
        id={id}
        open={opened !== null && opened.at !== null}
        onClose={onClose}
        anchorReference="anchorPosition"
        anchorPosition={at === null ? undefined : { top: at.y, left: at.x }}
      >
        {actions.map((action) => (
          <MenuItem
            key={action.key}
            id={`${id}-${action.key}`}
            sx={action.destructive === true ? DESTRUCTIVE : undefined}
            onClick={() => {
              onClose();
              action.onPick();
            }}
          >
            {action.label}
          </MenuItem>
        ))}
      </Menu>
      <SimpleDialog
        id={dialogId}
        open={opened !== null && opened.at === null}
        title={last === null ? "" : nameOf(last.item)}
        cancel={{ id: `${dialogId}-cancel`, label: cancel }}
        actions={actions.map((action) => ({
          id: `${dialogId}-${action.key}`,
          label: action.label,
          destructive: action.destructive,
          onClick: action.onPick,
        }))}
        onClose={onClose}
      />
    </>
  );
}
