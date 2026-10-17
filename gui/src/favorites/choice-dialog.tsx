import { Dialog, DialogTitle, List, ListItemButton, ListItemText, Typography } from "@mui/material";
import type { ReactNode } from "react";

import { useBackCloses } from "../navigation/back-closers";

// The choice's name greyed, but the reason it cannot be made left readable.
const REFUSED = {
  "&.Mui-disabled": { opacity: 1 },
  "&.Mui-disabled .MuiListItemText-primary": { color: "text.disabled" },
} as const;

export interface Choice {
  readonly id: string;
  readonly primary: string;
  /** The language of a song's name. */
  readonly lang?: string;
  readonly secondary: string | null;
  /** None for a choice that cannot be made, such as a set that cannot take the song. */
  readonly onChoose: (() => void) | null;
}

/** A dialog that asks for one of its choices, such as the set that takes a song. */
export function ChoiceDialog({
  id,
  title,
  subtitle,
  choices,
  empty,
  onClose,
  onBack,
}: {
  readonly id: string;
  readonly title: string;
  /** What the choice is for, such as the song's name. */
  readonly subtitle: { readonly text: string; readonly lang?: string } | null;
  readonly choices: readonly Choice[];
  /** What stands in for the choices when there are none. */
  readonly empty?: ReactNode;
  readonly onClose: () => void;
  /** Where the choice follows an earlier question: Back and Esc go back to it, a click out closes. */
  readonly onBack?: (() => void) | undefined;
}) {
  const back = onBack ?? onClose;
  useBackCloses(true, back);
  const titleId = `${id}-title`;
  return (
    <Dialog
      id={id}
      open
      onClose={(_event, reason) => (reason === "escapeKeyDown" ? back() : onClose())}
      aria-labelledby={titleId}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle id={titleId} sx={{ pb: subtitle === null ? undefined : 0.5 }}>
        {title}
      </DialogTitle>
      {subtitle !== null && (
        <Typography
          lang={subtitle.lang}
          variant="body2"
          color="text.secondary"
          noWrap
          sx={{ px: 3, pb: 1 }}
        >
          {subtitle.text}
        </Typography>
      )}
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
        empty
      )}
    </Dialog>
  );
}
