import { Chip } from "@mui/material";
import type { ReactElement } from "react";

/** A word or two naming what it stands by, outlined in the theme's colour or filled in another. */
export function LabelChip({
  id,
  label,
  icon,
  fill,
}: {
  readonly id?: string | undefined;
  readonly label: string;
  readonly icon?: ReactElement | undefined;
  /** A colour of Hiroba's own, such as a genre's, with words that read on it. */
  readonly fill?: string | undefined;
}) {
  return fill === undefined ? (
    <Chip id={id} icon={icon} label={label} color="primary" variant="outlined" size="small" />
  ) : (
    <Chip
      id={id}
      icon={icon}
      label={label}
      size="small"
      sx={{ bgcolor: fill, color: (theme) => theme.palette.getContrastText(fill) }}
    />
  );
}
