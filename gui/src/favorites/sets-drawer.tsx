import type { Translator } from "@abth/i18n";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import { useState } from "react";

import { useBackCloses } from "../navigation/back-closers";
import { type FavoriteSet, sameSongs } from "./favorite-sets";
import { AddIcon, CheckIcon, DeleteIcon } from "./favorites-icons";
import { SortableList } from "./sortable-list";

const DRAWER_WIDTH_PX = 280;
const DELETE_TITLE_ID = "favorite-set-delete-title";

export interface SetsDrawerProps {
  readonly open: boolean;
  readonly sets: readonly FavoriteSet[];
  /** The folder's songs in slot order; null while the folder is not read. */
  readonly folderSongs: readonly string[] | null;
  /** The set shown; null for the folder on Hiroba. */
  readonly selectedId: string | null;
  /** A long press moves a set, as on a phone; otherwise its handle does. */
  readonly byLongPress: boolean;
  readonly i18n: Translator;
  readonly onPick: (id: string | null) => void;
  readonly onAdd: () => void;
  readonly onMove: (from: number, to: number) => void;
  readonly onDelete: (id: string) => void;
  readonly onClose: () => void;
}

/** The folder on Hiroba, then the sets kept here, which move and go, then a new set. */
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
  onDelete,
  onClose,
}: SetsDrawerProps) {
  const { t } = i18n;
  const [deleting, setDeleting] = useState<FavoriteSet | null>(null);
  const stopDeleting = () => setDeleting(null);
  useBackCloses(open, onClose);
  useBackCloses(deleting !== null, stopDeleting);
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
            <ListItemText primary={t("favorites.folderOnHiroba")} />
          </ListItemButton>
        </List>
        <SortableList
          id="favorites-set-list"
          items={sets.map((set) => ({ key: set.id, name: set.name }))}
          byLongPress={byLongPress}
          i18n={i18n}
          onMove={onMove}
          sx={{ gap: 0 }}
          renderItem={(id, handle) => {
            const index = sets.findIndex((set) => set.id === id);
            const set = sets[index];
            if (set === undefined) {
              return null;
            }
            const same = folderSongs !== null && sameSongs(set.songs, folderSongs);
            const deleteLabel = t("favorites.deleteSet", { name: set.name });
            return (
              <Box sx={{ display: "flex", alignItems: "center", pl: handle === null ? 0 : 1 }}>
                {handle}
                <ListItemButton
                  id={`favorites-item-set-${index}`}
                  data-same-as-folder={same}
                  selected={set.id === selectedId}
                  aria-current={set.id === selectedId ? "true" : undefined}
                  onClick={() => onPick(set.id)}
                  sx={{ minWidth: 0, pl: handle === null ? 2 : 1 }}
                >
                  <ListItemText primary={set.name} slotProps={{ primary: { noWrap: true } }} />
                  {same && <CheckIcon titleAccess={t("favorites.set.sameAsFolder")} />}
                </ListItemButton>
                <IconButton
                  id={`favorites-set-delete-${index}`}
                  aria-label={deleteLabel}
                  title={deleteLabel}
                  onClick={() => setDeleting(set)}
                  sx={{ mr: 0.5 }}
                >
                  <DeleteIcon />
                </IconButton>
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
