import type { Translator } from "@abth/i18n";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

import { useBackCloses } from "../navigation/back-closers";
import { notesFor } from "./update-feed";
import type { UpdateOffer } from "./use-update-reminder";

const TITLE_ID = "update-title";

export interface UpdateDialogProps {
  readonly offer: UpdateOffer | null;
  readonly i18n: Translator;
  readonly onDownload: (version: string) => void;
  readonly onLater: () => void;
}

/** What is new in the latest release, with Download and Later. */
export function UpdateDialog({ offer, i18n, onDownload, onLater }: UpdateDialogProps) {
  const { t } = i18n;
  useBackCloses(offer?.open === true, onLater);
  if (offer === null) {
    return null;
  }
  const { feed } = offer;
  return (
    <Dialog
      id="update-dialog"
      open={offer.open}
      onClose={onLater}
      fullWidth
      maxWidth="xs"
      aria-labelledby={TITLE_ID}
    >
      <DialogTitle id={TITLE_ID}>{`${t("app.title")} ${feed.version}`}</DialogTitle>
      <DialogContent>
        <Box component="ul" id="update-notes" sx={{ m: 0, pl: 3 }}>
          {notesFor(feed, i18n.locale).map((line, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: lines may repeat; the list is replaced whole
            <Typography component="li" key={index}>
              {line}
            </Typography>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button id="update-later" onClick={onLater}>
          {t("update.later")}
        </Button>
        <Button id="update-download" variant="contained" onClick={() => onDownload(feed.version)}>
          {t("update.download")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
