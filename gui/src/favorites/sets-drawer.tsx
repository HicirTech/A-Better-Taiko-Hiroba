import type { Translator } from "@abth/i18n";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { type MouseEvent, useState } from "react";

import { useBackCloses } from "../navigation/back-closers";
import { type FavoriteSet, sameSongs } from "./favorite-sets";
import { AddIcon, CheckIcon } from "./favorites-icons";
import { SortableList } from "./sortable-list";

const DRAWER_WIDTH_PX = 280;
const DELETE_TITLE_ID = "favorite-set-delete-title";
const ACTIONS_TITLE_ID = "favorite-set-actions-title";

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
  readonly onRename: (id: string) => void;
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
  const [menu, setMenu] = useState<{ set: FavoriteSet; x: number; y: number } | null>(null);
  const [offering, setOffering] = useState<FavoriteSet | null>(null);
  const [deleting, setDeleting] = useState<FavoriteSet | null>(null);
  const stopOffering = () => setOffering(null);
  const stopDeleting = () => setDeleting(null);
  useBackCloses(open, onClose);
  useBackCloses(offering !== null, stopOffering);
  useBackCloses(deleting !== null, stopDeleting);
  const openMenu = (set: FavoriteSet, event: MouseEvent) => {
    event.preventDefault();
    setMenu({ set, x: event.clientX, y: event.clientY });
  };
  const rename = (set: FavoriteSet) => {
    setMenu(null);
    setOffering(null);
    onRename(set.id);
  };
  const askToDelete = (set: FavoriteSet) => {
    setMenu(null);
    setOffering(null);
    setDeleting(set);
  };
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
          onHold={(id) => setOffering(sets.find((set) => set.id === id) ?? null)}
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
                  aria-haspopup="menu"
                  onClick={() => onPick(set.id)}
                  onContextMenu={byLongPress ? undefined : (event) => openMenu(set, event)}
                  sx={{ minWidth: 0, pl: handle === null ? 2 : 1 }}
                >
                  <ListItemText primary={set.name} slotProps={{ primary: { noWrap: true } }} />
                  {same && <CheckIcon titleAccess={t("favorites.set.sameAsFolder")} />}
                </ListItemButton>
              </Box>
            );
          }}
        />
        <List disablePadding>
          <ListItemButton id="favorites-item-new" onClick={onAdd}>
            <ListItemIcon>
              <AddIcon />
            </ListItemIcon>
            <ListItemText primary={t("favorites.newSet")} />
          </ListItemButton>
        </List>
      </Box>
      <Menu
        id="favorite-set-menu"
        open={menu !== null}
        onClose={() => setMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={menu === null ? undefined : { top: menu.y, left: menu.x }}
      >
        <MenuItem id="favorite-set-menu-rename" onClick={() => menu && rename(menu.set)}>
          {t("favorites.rename")}
        </MenuItem>
        <MenuItem id="favorite-set-menu-delete" onClick={() => menu && askToDelete(menu.set)}>
          {t("favorites.delete")}
        </MenuItem>
      </Menu>
      <Dialog
        id="favorite-set-actions"
        open={offering !== null}
        onClose={stopOffering}
        aria-labelledby={ACTIONS_TITLE_ID}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle id={ACTIONS_TITLE_ID}>{offering?.name}</DialogTitle>
        <List disablePadding sx={{ pb: 1 }}>
          <ListItemButton
            id="favorite-set-actions-rename"
            onClick={() => offering && rename(offering)}
          >
            <ListItemText primary={t("favorites.rename")} />
          </ListItemButton>
          <ListItemButton
            id="favorite-set-actions-delete"
            onClick={() => offering && askToDelete(offering)}
          >
            <ListItemText
              primary={t("favorites.delete")}
              slotProps={{ primary: { color: "error" } }}
            />
          </ListItemButton>
        </List>
      </Dialog>
      <Dialog
        id="favorite-set-delete-dialog"
        open={deleting !== null}
        onClose={stopDeleting}
        aria-labelledby={DELETE_TITLE_ID}
      >
        <DialogTitle id={DELETE_TITLE_ID}>{t("favorites.delete.title")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("favorites.delete.body", { name: deleting?.name ?? "" })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button id="favorite-set-delete-cancel" onClick={stopDeleting}>
            {t("favorites.delete.cancel")}
          </Button>
          <Button
            id="favorite-set-delete-confirm"
            color="error"
            onClick={() => {
              if (deleting !== null) {
                onDelete(deleting.id);
              }
              stopDeleting();
            }}
          >
            {t("favorites.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
}
