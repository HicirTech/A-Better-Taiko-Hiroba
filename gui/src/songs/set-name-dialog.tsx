import type { Translator } from "@abth/i18n";
import { useState } from "react";
import { SET_NAME_MAX_LENGTH } from "../shared/sets/favorite-sets";
import { SimpleDialog } from "../ui/simple-dialog";

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
  const save = () => {
    if (name !== "") {
      onSave(name);
    }
  };
  return (
    <SimpleDialog
      id="favorite-set-name-dialog"
      open
      title={title}
      field={{
        id: "favorite-set-name",
        label: t("favorites.set.nameLabel"),
        value: text,
        maxLength: SET_NAME_MAX_LENGTH,
        onChange: setText,
        onEnter: save,
      }}
      cancel={{ id: "favorite-set-name-cancel", label: t("favorites.delete.cancel") }}
      actions={[
        {
          id: "favorite-set-name-save",
          label: t("favorites.saveSet"),
          disabled: name === "",
          onClick: save,
        },
      ]}
      onClose={onCancel}
    />
  );
}
