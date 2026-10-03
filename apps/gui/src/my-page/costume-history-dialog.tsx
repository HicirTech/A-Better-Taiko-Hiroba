import { sameCostume } from "@abth/core";
import type { Translator } from "@abth/i18n";
import {
  Box,
  Button,
  ButtonBase,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";

import type { CostumeHistoryEntry, CostumeSet } from "../session-port";
import { keyOf } from "./costume-preview";
import { pickRing } from "./pick-ring";

const TILE_MIN_PX = 104;
const TITLE_ID = "costume-history-title";

export interface CostumeHistoryDialogProps {
  readonly open: boolean;
  readonly entries: readonly CostumeHistoryEntry[];
  /** The set Hiroba shows now, marked in the list. */
  readonly worn: CostumeSet;
  readonly i18n: Translator;
  readonly onPick: (entry: CostumeHistoryEntry) => void;
  readonly onClose: () => void;
}

/** The sets the player wore, newest first, each a button with Hiroba's picture of it if kept. */
export function CostumeHistoryDialog({
  open,
  entries,
  worn,
  i18n,
  onPick,
  onClose,
}: CostumeHistoryDialogProps) {
  const { t } = i18n;
  const narrow = useMediaQuery(useTheme().breakpoints.down("sm"), { noSsr: true });
  return (
    <Dialog
      id="costume-history-dialog"
      open={open}
      onClose={onClose}
      fullScreen={narrow}
      fullWidth
      maxWidth="sm"
      aria-labelledby={TITLE_ID}
    >
      <DialogTitle id={TITLE_ID}>{t("costume.history.title")}</DialogTitle>
      <DialogContent>
        <Box
          component="ul"
          id="costume-history-list"
          sx={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fill, minmax(${TILE_MIN_PX}px, 1fr))`,
            gap: 1.5,
            listStyle: "none",
            m: 0,
            p: 0,
            // Room for the focus ring, which is drawn outside each tile.
            pt: 0.5,
          }}
        >
          {entries.map((entry, index) => (
            <Box component="li" key={keyOf(entry.set)}>
              <HistoryTile
                entry={entry}
                position={index + 1}
                isWorn={sameCostume(entry.set, worn)}
                i18n={i18n}
                onPick={onPick}
              />
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button id="costume-history-close" onClick={onClose}>
          {t("costume.history.close")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function HistoryTile({
  entry,
  position,
  isWorn,
  i18n,
  onPick,
}: {
  entry: CostumeHistoryEntry;
  position: number;
  isWorn: boolean;
  i18n: Translator;
  onPick: (entry: CostumeHistoryEntry) => void;
}) {
  const { t } = i18n;
  return (
    <ButtonBase
      id={`costume-history-entry-${position - 1}`}
      aria-label={t(isWorn ? "costume.history.entryWorn" : "costume.history.entry", { position })}
      onClick={() => onPick(entry)}
      sx={{
        position: "relative",
        width: 1,
        aspectRatio: "1",
        borderRadius: 1,
        bgcolor: "action.hover",
        ...pickRing(false, "text.primary"),
      }}
    >
      {entry.picture === null ? (
        <Typography variant="body2" color="text.secondary">
          {position}
        </Typography>
      ) : (
        <Box
          component="img"
          src={entry.picture}
          alt=""
          sx={{ width: 1, height: 1, objectFit: "contain" }}
        />
      )}
      {isWorn && (
        <Typography
          id="costume-history-worn"
          component="span"
          variant="caption"
          sx={{
            position: "absolute",
            top: 4,
            left: 4,
            px: 0.75,
            borderRadius: 0.5,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            lineHeight: 1.6,
          }}
        >
          {t("costume.history.wornNow")}
        </Typography>
      )}
    </ButtonBase>
  );
}
