import type { Translator } from "@abth/i18n";
import { Box, Divider, IconButton, Modal, Paper, Slide, Typography, useTheme } from "@mui/material";
import type { ReactNode, RefObject } from "react";

import { useBackCloses, useBackLeaves } from "./back-closers";
import { CloseIcon } from "./icons";
import { VISUALLY_HIDDEN } from "./visually-hidden";

/** How a large modal is drawn here, as the window and the frame say. */
export interface ModalLook {
  /** As narrow as a phone: the modal takes the whole window. */
  readonly phone: boolean;
  /** The system asks for less motion: the modal comes and goes at once. */
  readonly reducedMotion: boolean;
  /** The pipelines page lies over the page: a modal that stands for a page steps aside. */
  readonly covered: boolean;
}

/** The panel's width on a computer; on a phone it takes the whole window. */
const WIDTH_PX = 900;
// Room kept round the panel on a computer, so the page behind still shows it is a layer.
const MARGIN_PX = 32;
const ROOM = `100% - ${2 * MARGIN_PX}px`;

const CENTRED = { display: "flex", alignItems: "center", justifyContent: "center" } as const;
const HEAD = { display: "flex", alignItems: "center", gap: 1, minHeight: 64 } as const;
const BUTTONS = { display: "flex", flexShrink: 0 } as const;
const OVER_THE_PICTURE = { position: "absolute", top: 8, right: 8, color: "common.white" } as const;

/** The app's large modal for a deeper task: a title, its buttons, and content that scrolls. */
export function LargeModal({
  id,
  open,
  title,
  titleLang,
  actions,
  head,
  fills = false,
  flush = false,
  picture = false,
  pageLike = false,
  contentRef,
  touchFirst,
  modalLook,
  i18n,
  onExited,
  onClose,
  children,
}: {
  readonly id: string;
  readonly open: boolean;
  /** What names it: words, or a node holding the element with the id `<id>-title`. */
  readonly title: ReactNode;
  /** The title's language, where it is a song's name. */
  readonly titleLang?: string | undefined;
  /** Buttons beside the close button; a touch screen draws neither, as its gestures stand in. */
  readonly actions?: ReactNode;
  /** Under the title and above what scrolls, such as a search and its filters. */
  readonly head?: ReactNode;
  /** As tall as the window on a computer too, so a list does not jump as it narrows. */
  readonly fills?: boolean | undefined;
  /** What scrolls runs to the panel's edges, as a list does. */
  readonly flush?: boolean | undefined;
  /** A picture on the whole screen: black, with only the close button over it. */
  readonly picture?: boolean | undefined;
  /** Stands for a page: Back leaves it after the menu, and it steps aside for the pipelines page. */
  readonly pageLike?: boolean | undefined;
  /** The part that scrolls, which a pull to read again listens on. */
  readonly contentRef?: RefObject<HTMLDivElement | null> | undefined;
  /** A touch screen: Back closes it, so it draws no close button. */
  readonly touchFirst: boolean;
  readonly modalLook: ModalLook;
  readonly i18n: Translator;
  /** Called once it has slid away. */
  readonly onExited?: (() => void) | undefined;
  readonly onClose: () => void;
  readonly children: ReactNode;
}) {
  const theme = useTheme();
  const { phone, reducedMotion, covered } = modalLook;
  useBackCloses(open && !pageLike, onClose);
  useBackLeaves(open && pageLike, onClose);
  const shown = open && !(pageLike && covered);
  const whole = picture || phone;
  const titleId = `${id}-title`;
  const close = touchFirst ? null : (
    <IconButton
      id={`${id}-close`}
      aria-label={i18n.t("picker.close")}
      onClick={onClose}
      sx={picture ? OVER_THE_PICTURE : undefined}
    >
      <CloseIcon />
    </IconButton>
  );
  const size = whole
    ? { width: 1, height: 1 }
    : { width: `min(${WIDTH_PX}px, ${ROOM})`, maxHeight: `calc(${ROOM})` };
  return (
    <Modal id={id} open={shown} onClose={() => onClose()} closeAfterTransition sx={CENTRED}>
      <Slide
        in={shown}
        direction="up"
        appear
        timeout={
          reducedMotion
            ? 0
            : {
                enter: theme.transitions.duration.enteringScreen,
                exit: theme.transitions.duration.leavingScreen,
              }
        }
        easing={{ enter: theme.transitions.easing.easeOut, exit: theme.transitions.easing.sharp }}
        onExited={() => onExited?.()}
      >
        <Paper
          role="dialog"
          aria-modal
          aria-labelledby={titleId}
          tabIndex={-1}
          elevation={24}
          square={whole}
          sx={{
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            outline: "none",
            ...size,
            ...(fills && !whole ? { height: `calc(${ROOM})` } : {}),
            // The dark theme lightens a raised panel; a picture's stays black.
            ...(picture
              ? { position: "relative", bgcolor: "common.black", backgroundImage: "none" }
              : {}),
          }}
        >
          {picture ? (
            <Typography id={titleId} component="h2" sx={VISUALLY_HIDDEN}>
              {title}
            </Typography>
          ) : (
            <>
              <Box
                sx={{
                  ...HEAD,
                  pl: typeof title === "string" ? 3 : 1,
                  pr: close === null ? 3 : 1.5,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {typeof title === "string" ? (
                    <Typography id={titleId} component="h2" variant="h6" lang={titleLang}>
                      {title}
                    </Typography>
                  ) : (
                    title
                  )}
                </Box>
                {close !== null && (
                  <Box sx={BUTTONS}>
                    {actions}
                    {close}
                  </Box>
                )}
              </Box>
              {head !== undefined && (
                <Box sx={{ px: 3, pb: 1.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {head}
                </Box>
              )}
              <Divider />
            </>
          )}
          <Box
            ref={contentRef}
            id={`${id}-content`}
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              ...(flush || picture ? {} : { px: 3, py: 2 }),
              ...(picture ? { position: "relative", overflow: "hidden" } : {}),
            }}
          >
            {children}
          </Box>
          {picture && close}
        </Paper>
      </Slide>
    </Modal>
  );
}
