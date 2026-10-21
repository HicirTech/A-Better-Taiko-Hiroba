import type { Translator } from "@abth/i18n";
import { List, ListItemButton, ListItemText, Typography } from "@mui/material";
import type { ReactNode } from "react";

import { LargeModal } from "../ui/large-modal";

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
  i18n,
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
  readonly i18n: Translator;
  readonly onClose: () => void;
  /** Where the choice follows an earlier question: Back and Esc go back to it, a click out closes. */
  readonly onBack?: (() => void) | undefined;
}) {
  return (
    <LargeModal
      id={id}
      open
      title={title}
      head={
        subtitle === null ? undefined : (
          <Typography lang={subtitle.lang} variant="body2" color="text.secondary" noWrap>
            {subtitle.text}
          </Typography>
        )
      }
      flush
      i18n={i18n}
      onClose={onClose}
      onBack={onBack}
    >
      {choices.length > 0 ? (
        <List disablePadding sx={{ py: 1 }}>
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
    </LargeModal>
  );
}
