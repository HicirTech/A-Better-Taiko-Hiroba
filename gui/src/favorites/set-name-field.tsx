import type { Translator } from "@abth/i18n";
import { TextField } from "@mui/material";
import { type KeyboardEvent, useState } from "react";

import { type FavoriteSet, SET_NAME_MAX_LENGTH } from "./favorite-sets";

/** A set's name, in the page's heading place; saved when it loses focus and on Enter. */
export function SetNameField({
  set,
  i18n,
  onRename,
}: {
  set: FavoriteSet;
  i18n: Translator;
  onRename: (name: string) => void;
}) {
  const [text, setText] = useState(set.name);
  // A blank name is not kept: the field goes back to the one the set has.
  const commit = () => {
    const name = text.trim();
    if (name === "") {
      setText(set.name);
      return;
    }

    setText(name);
    if (name !== set.name) {
      onRename(name);
    }
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      commit();
    }
  };
  return (
    <TextField
      id="favorite-set-name"
      variant="standard"
      fullWidth
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
      slotProps={{
        htmlInput: {
          "aria-label": i18n.t("favorites.set.nameLabel"),
          maxLength: SET_NAME_MAX_LENGTH,
        },
      }}
      sx={{ "& input": { typography: "h6" } }}
    />
  );
}
