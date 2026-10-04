import type { Translator } from "@abth/i18n";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import { type KeyboardEvent, useState } from "react";

import { useBackCloses } from "../navigation/back-closers";
import { SET_NAME_MAX_LENGTH } from "./favorite-sets";

const TITLE_ID = "favorite-set-name-title";

export interface SetNameDialogProps {
  readonly title: string;
  /** The name the field starts with. */
  readonly initial: string;
  readonly i18n: Translator;
  readonly onCancel: () => void;
  readonly onSave: (name: string) => void;
}

/** Asks for a set's name; Save is shut while the name is blank. Mounted only while it asks. */
export function SetNameDialog({ title, initial, i18n, onCancel, onSave }: SetNameDialogProps) {
  const { t } = i18n;
  const [text, setText] = useState(initial);
  const name = text.trim();
  useBackCloses(true, onCancel);
  const save = () => {
    if (name !== "") {
      onSave(name);
    }
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      save();
    }
  };
  return (
    <Dialog
      id="favorite-set-name-dialog"
      open
      onClose={onCancel}
      aria-labelledby={TITLE_ID}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle id={TITLE_ID}>{title}</DialogTitle>
      <DialogContent>
        <TextField
          id="favorite-set-name"
          variant="standard"
          label={t("favorites.set.nameLabel")}
          autoFocus
          fullWidth
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          slotProps={{ htmlInput: { maxLength: SET_NAME_MAX_LENGTH } }}
        />
      </DialogContent>
      <DialogActions>
        <Button id="favorite-set-name-cancel" onClick={onCancel}>
          {t("favorites.delete.cancel")}
        </Button>
        <Button id="favorite-set-name-save" disabled={name === ""} onClick={save}>
          {t("favorites.saveSet")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
