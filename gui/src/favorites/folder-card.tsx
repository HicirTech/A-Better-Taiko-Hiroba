import type { Translator } from "@abth/i18n";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import { useId, useState } from "react";

import { Waiting } from "../my-page/editor-parts";
import { WriteOutcomeNotice } from "../my-page/write-outcome";
import { useBackCloses } from "../navigation/back-closers";
import type { FavoriteSet } from "./favorite-sets";
import { ArrowDropDownIcon, CheckIcon } from "./favorites-icons";
import type { ShownFavorites } from "./favorites-state";
import type { SongLook } from "./song-look";
import { SongRow } from "./song-row";

const LIST = {
  listStyle: "none",
  m: 0,
  p: 0,
  display: "flex",
  flexDirection: "column",
  gap: 1,
} as const;
const REPLACE_TITLE_ID = "favorite-folder-replace-title";

export interface FolderCardProps {
  readonly shown: ShownFavorites;
  readonly look: (songNo: string) => SongLook;
  readonly i18n: Translator;
  /** The kept sets, to save the folder into one of them. */
  readonly sets: readonly FavoriteSet[];
  /** The set whose songs are the folder's, in its order; null when no set is. */
  readonly inUse: FavoriteSet | null;
  readonly onSaveAsSet: () => void;
  readonly onSaveToSet: (id: string) => void;
}

/** The songs in the お気に入り folder in slot order, under the set it is or the ways to keep it. */
export function FolderCard({
  shown,
  look,
  i18n,
  sets,
  inUse,
  onSaveAsSet,
  onSaveToSet,
}: FolderCardProps) {
  const { t } = i18n;
  const { view, notice, saving, shut } = shown;
  const songs = view.folder.state.slots.flatMap((songNo, index) =>
    songNo === null ? [] : [{ slot: index + 1, songNo }],
  );
  const menuId = useId();
  const [menuAt, setMenuAt] = useState<HTMLElement | null>(null);
  const [replacing, setReplacing] = useState<FavoriteSet | null>(null);
  const stopReplacing = () => setReplacing(null);
  useBackCloses(replacing !== null, stopReplacing);
  return (
    <Card id="favorite-folder-card" variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
            <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 500, flexGrow: 1 }}>
              {t("favorites.folder.heading")}
            </Typography>
            {inUse !== null ? (
              <Chip
                id="favorite-folder-set"
                icon={<CheckIcon />}
                label={t("favorites.inUse", { name: inUse.name })}
                color="primary"
                variant="outlined"
                size="small"
              />
            ) : (
              songs.length > 0 && (
                <>
                  <Button
                    id="favorite-folder-save-as-set"
                    variant="outlined"
                    size="small"
                    disabled={shut}
                    onClick={onSaveAsSet}
                  >
                    {t("favorites.saveAsSet")}
                  </Button>
                  {sets.length > 0 && (
                    <Button
                      id="favorite-folder-save-to-set"
                      variant="outlined"
                      size="small"
                      disabled={shut}
                      endIcon={<ArrowDropDownIcon />}
                      aria-haspopup="menu"
                      aria-controls={menuAt === null ? undefined : menuId}
                      aria-expanded={menuAt !== null}
                      onClick={(event) => setMenuAt(event.currentTarget)}
                    >
                      {t("favorites.saveToSet")}
                    </Button>
                  )}
                </>
              )
            )}
          </Box>
          {songs.length === 0 ? (
            <Typography id="favorite-folder-empty" color="text.secondary">
              {t("favorites.folderEmpty")}
            </Typography>
          ) : (
            <Box component="ul" id="favorite-folder-list" sx={LIST}>
              {songs.map(({ slot, songNo }) => (
                <li key={slot}>
                  <SongRow
                    id={`favorite-folder-slot-${slot}`}
                    look={look(songNo)}
                    i18n={i18n}
                    scrolling
                  />
                </li>
              ))}
            </Box>
          )}
          {saving === "folder" && (
            <Waiting id="favorite-folder-saving">{t("costume.saving")}</Waiting>
          )}
          {notice?.write === "folder" && (
            <WriteOutcomeNotice
              id="favorite-folder-outcome"
              kind="folder"
              outcome={notice.outcome}
              i18n={i18n}
              songName={(songNo) => look(songNo).name}
            />
          )}
        </Stack>
      </CardContent>
      <Menu id={menuId} anchorEl={menuAt} open={menuAt !== null} onClose={() => setMenuAt(null)}>
        {sets.map((set, index) => (
          <MenuItem
            key={set.id}
            id={`favorite-folder-save-to-set-${index}`}
            onClick={() => {
              setMenuAt(null);
              setReplacing(set);
            }}
          >
            {set.name}
          </MenuItem>
        ))}
      </Menu>
      <Dialog
        id="favorite-folder-replace-dialog"
        open={replacing !== null}
        onClose={stopReplacing}
        aria-labelledby={REPLACE_TITLE_ID}
      >
        <DialogTitle id={REPLACE_TITLE_ID}>
          {t("favorites.replace.title", { name: replacing?.name ?? "" })}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("favorites.replace.body", { name: replacing?.name ?? "" })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button id="favorite-folder-replace-cancel" onClick={stopReplacing}>
            {t("favorites.delete.cancel")}
          </Button>
          <Button
            id="favorite-folder-replace-confirm"
            onClick={() => {
              if (replacing !== null) {
                onSaveToSet(replacing.id);
              }
              stopReplacing();
            }}
          >
            {t("favorites.replace.confirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
