import type { Translator } from "@abth/i18n";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

import { useBackCloses } from "../navigation/back-closers";

const TITLE_ID = "scores-read-every-title";

/** Asks before a read of every score, which takes minutes: how many charts, and a way out. */
export function ReadEveryDialog({
  open,
  charts,
  i18n,
  onAnswer,
}: {
  readonly open: boolean;
  /** The played charts the read takes again. */
  readonly charts: number;
  readonly i18n: Translator;
  readonly onAnswer: (confirmed: boolean) => void;
}) {
  const { t, number } = i18n;
  const cancel = () => onAnswer(false);
  useBackCloses(open, cancel);
  return (
    <Dialog id="scores-read-every" open={open} onClose={cancel} aria-labelledby={TITLE_ID}>
      <DialogTitle id={TITLE_ID}>{t("scores.readEvery.title")}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {t("scores.readEvery.body", { count: number(charts) })}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button id="scores-read-every-cancel" onClick={cancel}>
          {t("scores.readEvery.cancel")}
        </Button>
        <Button id="scores-read-every-confirm" onClick={() => onAnswer(true)}>
          {t("scores.readEvery.confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
