import type { Translator } from "@abth/i18n";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";

import { Waiting } from "../my-page/editor-parts";
import { useBackCloses } from "../navigation/back-closers";
import type { FavoriteSet } from "./favorite-sets";
import { CloseIcon } from "./favorites-icons";
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
const DELETE_TITLE_ID = "favorite-set-delete-title";

export interface SetViewProps {
  readonly set: FavoriteSet;
  readonly look: (songNo: string) => SongLook;
  readonly i18n: Translator;
  /** The folder is read and no write runs, and applying this set would change it. */
  readonly canApply: boolean;
  /** The folder is being written. */
  readonly applying: boolean;
  readonly onAddSongs: () => void;
  readonly onRemoveSong: (songNo: string) => void;
  readonly onApply: () => void;
  readonly onDelete: () => void;
}

/** A set's songs, each with a button that takes it out, and what can be done with the set. */
export function SetView({
  set,
  look,
  i18n,
  canApply,
  applying,
  onAddSongs,
  onRemoveSong,
  onApply,
  onDelete,
}: SetViewProps) {
  const { t } = i18n;
  const [confirming, setConfirming] = useState(false);
  const close = () => setConfirming(false);
  useBackCloses(confirming, close);
  return (
    <Card id="favorite-set-view" variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          {set.songs.length === 0 ? (
            <Typography id="favorite-set-empty" color="text.secondary">
              {t("favorites.setEmpty")}
            </Typography>
          ) : (
            <Box component="ul" id="favorite-set-songs" sx={LIST}>
              {set.songs.map((songNo) => {
                const shown = look(songNo);
                const label = t("favorites.removeSong", { name: shown.name });
                return (
                  <li key={songNo}>
                    <SongRow
                      id={`favorite-set-song-${songNo}`}
                      look={shown}
                      i18n={i18n}
                      end={
                        <IconButton
                          size="small"
                          aria-label={label}
                          title={label}
                          data-song-no={songNo}
                          onClick={() => onRemoveSong(songNo)}
                        >
                          <CloseIcon />
                        </IconButton>
                      }
                    />
                  </li>
                );
              })}
            </Box>
          )}
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
            <Button id="favorite-set-add" variant="outlined" onClick={onAddSongs}>
              {t("favorites.addSongs")}
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <Button id="favorite-set-delete" color="error" onClick={() => setConfirming(true)}>
              {t("favorites.delete")}
            </Button>
            <Button
              id="favorite-set-apply"
              variant="contained"
              disabled={!canApply}
              onClick={onApply}
            >
              {t("favorites.apply")}
            </Button>
          </Box>
          {applying && <Waiting id="favorite-set-applying">{t("costume.saving")}</Waiting>}
        </Stack>
      </CardContent>
      <Dialog
        id="favorite-set-delete-dialog"
        open={confirming}
        onClose={close}
        aria-labelledby={DELETE_TITLE_ID}
      >
        <DialogTitle id={DELETE_TITLE_ID}>{t("favorites.delete.title")}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t("favorites.delete.body", { name: set.name })}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button id="favorite-set-delete-cancel" onClick={close}>
            {t("favorites.delete.cancel")}
          </Button>
          <Button
            id="favorite-set-delete-confirm"
            color="error"
            onClick={() => {
              close();
              onDelete();
            }}
          >
            {t("favorites.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
