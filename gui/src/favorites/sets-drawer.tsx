import type { Translator } from "@abth/i18n";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";

import { useBackCloses } from "../navigation/back-closers";
import { type FavoriteSet, sameSongs } from "./favorite-sets";
import { AddIcon, CheckIcon } from "./favorites-icons";

const DRAWER_WIDTH_PX = 280;

export interface SetsDrawerProps {
  readonly open: boolean;
  readonly sets: readonly FavoriteSet[];
  /** The folder's songs in slot order; null while the folder is not read. */
  readonly folderSongs: readonly string[] | null;
  /** The set shown; null for the folder on Hiroba. */
  readonly selectedId: string | null;
  readonly i18n: Translator;
  readonly onPick: (id: string | null) => void;
  readonly onAdd: () => void;
  readonly onClose: () => void;
}

/** The folder on Hiroba, then the sets kept here, then a new set; slides out from the right. */
export function SetsDrawer({
  open,
  sets,
  folderSongs,
  selectedId,
  i18n,
  onPick,
  onAdd,
  onClose,
}: SetsDrawerProps) {
  const { t } = i18n;
  useBackCloses(open, onClose);
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
          {sets.map((set, index) => {
            const same = folderSongs !== null && sameSongs(set.songs, folderSongs);
            return (
              <ListItemButton
                key={set.id}
                id={`favorites-item-set-${index}`}
                data-same-as-folder={same}
                selected={set.id === selectedId}
                aria-current={set.id === selectedId ? "true" : undefined}
                onClick={() => onPick(set.id)}
              >
                <ListItemText primary={set.name} slotProps={{ primary: { noWrap: true } }} />
                {same && <CheckIcon titleAccess={t("favorites.set.sameAsFolder")} />}
              </ListItemButton>
            );
          })}
          <ListItemButton id="favorites-item-new" onClick={onAdd}>
            <ListItemIcon>
              <AddIcon />
            </ListItemIcon>
            <ListItemText primary={t("favorites.newSet")} />
          </ListItemButton>
        </List>
      </Box>
    </Drawer>
  );
}
