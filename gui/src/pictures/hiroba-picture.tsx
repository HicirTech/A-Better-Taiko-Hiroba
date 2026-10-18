import type { Translator } from "@abth/i18n";
import { Box, CircularProgress, type SxProps, type Theme } from "@mui/material";
import type { ReactNode, Ref } from "react";

const SPINNER_PX = 14;
// The top-right corner, where none of Hiroba's pictures carries the app's words.
const SPINNER = { position: "absolute", top: 4, right: 4 } as const;
const FILLS = { position: "absolute", inset: 0, width: 1, height: 1, display: "block" } as const;

export interface HirobaPictureProps {
  /** The frame's id; the picture is `<id>-image` and the spinner `<id>-loading`. */
  readonly id: string;
  /** The picture, or null while it is on its way or if it did not come. */
  readonly src: string | null;
  /** Asked for and not answered yet: the frame is busy and the spinner turns. */
  readonly onItsWay: boolean;
  /** What stands where the picture would, until it comes or if it never does. */
  readonly standIn?: ReactNode;
  /** The picture's name for screen readers; none where the words around it say what it is. */
  readonly alt?: string;
  readonly loadingLabel?: string;
  /** The colour of the words drawn over the picture, which the spinner takes. */
  readonly wordsColour: string;
  /** The frame's size, shape and ground. */
  readonly sx: SxProps<Theme>;
  /** Where the picture stands in the frame, which it fills by default. */
  readonly imageSx?: SxProps<Theme>;
  readonly component?: "div" | "span";
  readonly ref?: Ref<HTMLElement>;
  readonly role?: string;
  readonly "aria-label"?: string;
  readonly i18n: Translator;
  /** What the app draws over the picture, such as a plate's name. */
  readonly children?: ReactNode;
}

/** One of Hiroba's pictures in its frame: a stand-in until it comes, and one spinner meanwhile. */
export function HirobaPicture({
  id,
  src,
  onItsWay,
  standIn,
  alt,
  loadingLabel,
  wordsColour,
  sx,
  imageSx = FILLS,
  component = "div",
  ref,
  role,
  "aria-label": label,
  i18n,
  children,
}: HirobaPictureProps) {
  return (
    <Box
      ref={ref}
      component={component}
      id={id}
      role={role}
      aria-label={label}
      aria-busy={onItsWay}
      sx={[{ position: "relative" }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      {src === null ? (
        standIn
      ) : (
        <Box
          component="img"
          id={`${id}-image`}
          src={src}
          alt={alt ?? ""}
          aria-hidden={alt === undefined || undefined}
          draggable={false}
          sx={imageSx}
        />
      )}
      {onItsWay && (
        <CircularProgress
          id={`${id}-loading`}
          size={SPINNER_PX}
          aria-label={loadingLabel ?? i18n.t("pictures.loading")}
          sx={{ ...SPINNER, color: wordsColour }}
        />
      )}
      {children}
    </Box>
  );
}
