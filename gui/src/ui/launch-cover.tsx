import { keyframes } from "@emotion/react";
import { Box, GlobalStyles } from "@mui/material";
import { useEffect, useState } from "react";

import appPicture from "../../icons/app-icon.png";
import { FADE_MS, REDUCED_MOTION } from "./window-move";

/** The picture's side: large, but no larger than its 512 pixels stay sharp. */
const PICTURE_SIDE = "min(56vmin, 320px)";

// A fixed cover cannot reach over the page's scrollbar, so the scrollbar goes while it stands.
const NO_PAGE_SCROLLBAR = { ":root": { overflowY: "hidden" } } as const;

const FADE_OUT = keyframes`to { opacity: 0; }`;

const FADES_OUT = {
  animation: `${FADE_OUT} ${FADE_MS}ms ease-in forwards`,
  [`@media ${REDUCED_MOTION}`]: { animation: "none" },
  // The app beneath may be used as soon as the cover starts to go.
  pointerEvents: "none",
} as const;

/** The app's own launch screen over the whole window, its picture in the middle, while `shown`. */
export function LaunchCover({ shown }: { readonly shown: boolean }) {
  const [standing, setStanding] = useState(shown);
  if (shown && !standing) {
    setStanding(true);
  }
  useEffect(() => {
    if (shown || !standing) {
      return;
    }
    const gone = setTimeout(() => setStanding(false), FADE_MS);
    return () => clearTimeout(gone);
  }, [shown, standing]);
  if (!standing) {
    return null;
  }
  return (
    <>
      {shown && <GlobalStyles styles={NO_PAGE_SCROLLBAR} />}
      <Box
        id="launch-cover"
        aria-hidden
        sx={(theme) => ({
          position: "fixed",
          inset: 0,
          zIndex: theme.zIndex.tooltip + 1,
          display: "grid",
          placeItems: "center",
          bgcolor: "background.default",
          ...(shown ? {} : FADES_OUT),
        })}
      >
        <Box component="img" src={appPicture} alt="" sx={{ width: PICTURE_SIDE }} />
      </Box>
    </>
  );
}
