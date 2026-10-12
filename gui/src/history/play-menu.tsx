import type { Translator } from "@abth/i18n";
import {
  Dialog,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";

import { type FavoriteSet, refusedSong, SET_SONG_LIMIT } from "../favorites/favorite-sets";
import { useBackCloses } from "../navigation/back-closers";

const TITLE_ID = "history-add-to-set-title";
// The set's name greyed, but the reason it cannot take the song left readable.
const REFUSED = {
  "&.Mui-disabled": { opacity: 1 },
  "&.Mui-disabled .MuiListItemText-primary": { color: "text.disabled" },
} as const;

/** Where a right-click landed. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** A song the dialog names: in the player's language, with what tells it from a same-titled one. */
export interface NamedSong {
  readonly songNo: string;
  readonly text: string;
  readonly lang: string;
  /** Its genres and artists. */
  readonly detail: string;
}

interface Choice {
  readonly id: string;
  readonly primary: string;
  /** The language of a song's name. */
  readonly lang?: string;
  readonly secondary: string | null;
  /** None for a set that cannot take the song. */
  readonly onChoose: (() => void) | null;
}

/** A recent play's own menu on a computer: its one action, which asks where in a dialog. */
export function PlayMenu({
  at,
  i18n,
  onAddToSet,
  onClose,
}: {
  readonly at: Point;
  readonly i18n: Translator;
  readonly onAddToSet: () => void;
  readonly onClose: () => void;
}) {
  return (
    <Menu
      id="history-play-menu"
      open
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={{ top: at.y, left: at.x }}
    >
      <MenuItem id="history-play-menu-add" onClick={onAddToSet}>
        {i18n.t("history.addToSet")}
      </MenuItem>
    </Menu>
  );
}

export interface AddToSetDialogProps {
  /** The play's song as its row names it. */
  readonly name: { readonly text: string; readonly lang: string };
  /** The song to add; none until one is chosen where several share the title, or none is known. */
  readonly songNo: string | null;
  /** The songs that share the play's title. */
  readonly candidates: readonly NamedSong[];
  readonly sets: readonly FavoriteSet[];
  readonly i18n: Translator;
  readonly onChooseSong: (songNo: string) => void;
  readonly onAdd: (set: FavoriteSet, songNo: string) => void;
  readonly onNewSet: (songNo: string) => void;
  readonly onClose: () => void;
}

/** Asks which set on this device takes the play's song, or a new one; a shared title asks first. */
export function AddToSetDialog({
  name,
  songNo,
  candidates,
  sets,
  i18n,
  onChooseSong,
  onAdd,
  onNewSet,
  onClose,
}: AddToSetDialogProps) {
  const { t, number } = i18n;
  useBackCloses(true, onClose);
  const choices: readonly Choice[] =
    songNo === null
      ? candidates.map((song) => ({
          id: `history-add-song-${song.songNo}`,
          primary: song.text,
          lang: song.lang,
          secondary: song.detail,
          onChoose: () => onChooseSong(song.songNo),
        }))
      : [
          ...sets.map((set, index) => {
            const refused = refusedSong(set, songNo);
            return {
              id: `history-add-set-${index}`,
              primary: set.name,
              secondary:
                refused === null
                  ? null
                  : refused === "holds"
                    ? t("history.setHolds")
                    : t("history.setFull", { count: number(SET_SONG_LIMIT) }),
              onChoose: refused === null ? () => onAdd(set, songNo) : null,
            };
          }),
          {
            id: "history-add-new-set",
            primary: t("favorites.newSet"),
            secondary: null,
            onChoose: () => onNewSet(songNo),
          },
        ];
  return (
    <Dialog
      id="history-add-to-set"
      open
      onClose={onClose}
      aria-labelledby={TITLE_ID}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle id={TITLE_ID} sx={{ pb: 0.5 }}>
        {songNo === null && candidates.length > 0 ? t("history.whichSong") : t("history.addToSet")}
      </DialogTitle>
      <Typography
        lang={name.lang}
        variant="body2"
        color="text.secondary"
        noWrap
        sx={{ px: 3, pb: 1 }}
      >
        {name.text}
      </Typography>
      {choices.length > 0 ? (
        <List disablePadding sx={{ pb: 1 }}>
          {choices.map((choice) => (
            <ListItemButton
              key={choice.id}
              id={choice.id}
              disabled={choice.onChoose === null}
              onClick={choice.onChoose ?? undefined}
              sx={{ ...REFUSED, px: 3 }}
            >
              <ListItemText
                primary={choice.primary}
                secondary={choice.secondary}
                slotProps={{ primary: { noWrap: true, lang: choice.lang } }}
              />
            </ListItemButton>
          ))}
        </List>
      ) : (
        <Typography id="history-add-unknown" color="text.secondary" sx={{ px: 3, pt: 1, pb: 3 }}>
          {t("history.unknownSong")}
        </Typography>
      )}
    </Dialog>
  );
}
