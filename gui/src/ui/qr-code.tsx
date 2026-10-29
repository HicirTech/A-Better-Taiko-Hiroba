import { Box } from "@mui/material";
import { useMemo } from "react";

import { qrCodePath } from "../shared/gifts/qr-codes";

/** A QR code of `text`, at most `sizePx` wide, each module whole pixels so it stays sharp. */
export function QrCode({
  id,
  text,
  sizePx,
  label,
}: {
  readonly id?: string;
  readonly text: string;
  readonly sizePx: number;
  /** What the code holds, for screen readers. */
  readonly label: string;
}) {
  const { size, path } = useMemo(() => qrCodePath(text), [text]);
  const side = Math.max(1, Math.floor(sizePx / size)) * size;
  return (
    <Box
      component="svg"
      id={id}
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      sx={{
        width: side,
        height: side,
        display: "block",
        color: "common.black",
        bgcolor: "common.white",
      }}
    >
      <path d={path} fill="currentColor" />
    </Box>
  );
}
