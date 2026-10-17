import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from "@mui/material";

import { useBackCloses } from "../navigation/back-closers";

const POINTS = { m: 0, pl: 3 } as const;

/** One of a dialog's buttons: what it says and what it does. */
export interface DialogButton {
  readonly id: string;
  readonly label: string;
  readonly onClick: () => void;
  /** It deletes or replaces something: said in red. */
  readonly destructive?: boolean | undefined;
  /** Shut while it cannot be taken, such as Save with no name. */
  readonly disabled?: boolean | undefined;
}

/** The one line a dialog asks the user to type, such as a set's name. */
export interface DialogField {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly maxLength?: number | undefined;
  readonly onChange: (value: string) => void;
  /** Enter, once an input method has finished with it. */
  readonly onEnter: () => void;
}

// A hold's lift can leave MUI's backdrop flag set on the dialog it opened: a click whose target is
// in a dialog is never one on the backdrop.
function onTheBackdrop(event: object): boolean {
  return !(
    "target" in event &&
    event.target instanceof Element &&
    event.target.closest('[role="dialog"]') !== null
  );
}

/** The app's small dialog: a title, a few words, perhaps a line to type, and its buttons. */
export function SimpleDialog({
  id,
  open,
  title,
  message,
  field,
  cancel,
  actions,
  onClose,
}: {
  readonly id: string;
  readonly open: boolean;
  readonly title: string;
  /** One paragraph, or several points. */
  readonly message?: string | readonly string[] | undefined;
  readonly field?: DialogField | undefined;
  /** The way out, which Esc, Back and a click outside take too. */
  readonly cancel: { readonly id: string; readonly label: string };
  readonly actions: readonly DialogButton[];
  readonly onClose: () => void;
}) {
  useBackCloses(open, onClose);
  const titleId = `${id}-title`;
  const messageId = `${id}-message`;
  return (
    <Dialog
      id={id}
      open={open}
      onClose={(event, reason) => {
        if (reason !== "backdropClick" || onTheBackdrop(event)) {
          onClose();
        }
      }}
      aria-labelledby={titleId}
      aria-describedby={message === undefined ? undefined : messageId}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle id={titleId}>{title}</DialogTitle>
      {(message !== undefined || field !== undefined) && (
        <DialogContent>
          {typeof message === "string" && (
            <DialogContentText id={messageId}>{message}</DialogContentText>
          )}
          {message !== undefined && typeof message !== "string" && (
            <DialogContentText id={messageId} component="ul" sx={POINTS}>
              {message.map((line, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: lines may repeat; the list is replaced whole
                <li key={index}>{line}</li>
              ))}
            </DialogContentText>
          )}
          {field !== undefined && (
            <TextField
              id={field.id}
              variant="standard"
              label={field.label}
              autoFocus
              fullWidth
              value={field.value}
              onChange={(event) => field.onChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  field.onEnter();
                }
              }}
              slotProps={{ htmlInput: { maxLength: field.maxLength } }}
            />
          )}
        </DialogContent>
      )}
      <DialogActions>
        <Button id={cancel.id} onClick={onClose}>
          {cancel.label}
        </Button>
        {actions.map((action) => (
          <Button
            key={action.id}
            id={action.id}
            color={action.destructive === true ? "error" : "primary"}
            disabled={action.disabled === true}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ))}
      </DialogActions>
    </Dialog>
  );
}
