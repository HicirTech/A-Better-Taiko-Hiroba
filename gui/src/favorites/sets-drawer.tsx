import type { Translator } from "@abth/i18n";
import {
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import { useState } from "react";

import { useBackCloses } from "../navigation/back-closers";
import { AddIcon, CheckIcon } from "../ui/icons";
import { type ItemAction, pointerOf } from "../ui/item-actions";
import { ItemMenu, useItemMenu } from "../ui/item-menu";
import { SimpleDialog } from "../ui/simple-dialog";
import { type FavoriteSet, sameSongs } from "./favorite-sets";
import { SetNameDialog } from "./set-name-dialog";
import { SortableList } from "./sortable-list";

const DRAWER_WIDTH_PX = 280;

export interface SetsDrawerProps {
  readonly open: boolean;
  readonly sets: readonly FavoriteSet[];
  /** The folder's songs in slot order; null while the folder is not read. */
  readonly folderSongs: readonly string[] | null;
  /** The set shown; null for the current favourites. */
  readonly selectedId: string | null;
  /** On a touch screen a long press moves a set, or, let go in place, offers what to do with it. */
  readonly byLongPress: boolean;
  readonly i18n: Translator;
  readonly onPick: (id: string | null) => void;
  readonly onAdd: () => void;
  readonly onMove: (from: number, to: number) => void;
  readonly onRename: (id: string, name: string) => void;
  readonly onDelete: (id: string) => void;
  readonly onClose: () => void;
}

/** The current favourites, the sets kept here and a new set; a set's menu renames or deletes it. */
export function SetsDrawer({
  open,
  sets,
  folderSongs,
  selectedId,
  byLongPress,
  i18n,
  onPick,
  onAdd,
  onMove,
  onRename,
  onDelete,
  onClose,
}: SetsDrawerProps) {
  const { t } = i18n;
  const [deleting, setDeleting] = useState<FavoriteSet | null>(null);
  const [renaming, setRenaming] = useState<FavoriteSet | null>(null);
  const stopDeleting = () => setDeleting(null);
  useBackCloses(open, onClose);
  const actionsOf = (set: FavoriteSet): readonly ItemAction[] => [
    { key: "rename", label: t("favorites.rename"), onPick: () => setRenaming(set) },
    {
      key: "delete",
      label: t("favorites.delete"),
      destructive: true,
      onPick: () => setDeleting(set),
    },
  ];
  const menu = useItemMenu(actionsOf);
  return (
    <Drawer
      anchor="right"
      variant="temporary"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { id: "favorites-drawer", sx: { width: DRAWER_WIDTH_PX } } }}
    >
      <Box component="nav" aria-label={t("favorites.sets")}>
        <Typography
          component="p"
          variant="subtitle2"
          color="text.secondary"
          noWrap
          sx={{ px: 3, pt: 2.5, pb: 1.5 }}
        >
          {t("favorites.sets")}
        </Typography>
        <List disablePadding>
          <ListItemButton
            id="favorites-item-folder"
            selected={selectedId === null}
            aria-current={selectedId === null ? "true" : undefined}
            onClick={() => onPick(null)}
          >
            <ListItemText primary={t("favorites.current")} />
          </ListItemButton>
        </List>
        <Divider sx={{ my: 1 }} />
        <SortableList
          id="favorites-set-list"
          items={sets.map((set) => ({ key: set.id, name: set.name }))}
          byLongPress={byLongPress}
          i18n={i18n}
          onMove={onMove}
          onHold={(id) => {
            const set = sets.find((one) => one.id === id);
            if (set !== undefined) {
              menu.open(set, null);
            }
          }}
          sx={{ gap: 0 }}
          renderItem={(id, handle) => {
            const index = sets.findIndex((set) => set.id === id);
            const set = sets[index];
            if (set === undefined) {
              return null;
            }
            const same = folderSongs !== null && sameSongs(set.songs, folderSongs);
            return (
              <Box sx={{ display: "flex", alignItems: "center", pl: handle === null ? 0 : 1 }}>
                {handle}
                <ListItemButton
                  id={`favorites-item-set-${index}`}
                  data-same-as-folder={same}
                  selected={set.id === selectedId}
                  aria-current={set.id === selectedId ? "true" : undefined}
                  onClick={() => onPick(set.id)}
                  onContextMenu={
                    byLongPress
                      ? undefined
                      : (event) => {
                          event.preventDefault();
                          menu.open(set, pointerOf(event));
                        }
                  }
                  sx={{ minWidth: 0, pl: handle === null ? 2 : 1 }}
                >
                  <ListItemText primary={set.name} slotProps={{ primary: { noWrap: true } }} />
                  {same && (
                    <CheckIcon fontSize="small" titleAccess={t("favorites.set.sameAsFolder")} />
                  )}
                </ListItemButton>
              </Box>
            );
          }}
        />
        <List disablePadding>
          <ListItemButton id="favorites-item-new" onClick={onAdd}>
            <ListItemIcon>
              <AddIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={t("favorites.newSet")} />
          </ListItemButton>
        </List>
      </Box>
      <ItemMenu
        id="favorite-set-menu"
        dialogId="favorite-set-actions"
        opened={menu.opened}
        nameOf={(set) => set.name}
        actionsOf={actionsOf}
        cancel={t("favorites.delete.cancel")}
        onClose={menu.close}
      />
      <SimpleDialog
        id="favorite-set-delete-dialog"
        open={deleting !== null}
        title={t("favorites.delete.title")}
        message={t("favorites.delete.body", { name: deleting?.name ?? "" })}
        cancel={{ id: "favorite-set-delete-cancel", label: t("favorites.delete.cancel") }}
        actions={[
          {
            id: "favorite-set-delete-confirm",
            label: t("favorites.delete"),
            destructive: true,
            onClick: () => {
              if (deleting !== null) {
                onDelete(deleting.id);
              }
              stopDeleting();
              menu.close();
            },
          },
        ]}
        onClose={stopDeleting}
      />
      {renaming !== null && (
        <SetNameDialog
          key={renaming.id}
          title={t("favorites.rename.title")}
          initial={renaming.name}
          i18n={i18n}
          onCancel={() => setRenaming(null)}
          onSave={(name) => {
            onRename(renaming.id, name);
            setRenaming(null);
            menu.close();
          }}
        />
      )}
    </Drawer>
  );
}
