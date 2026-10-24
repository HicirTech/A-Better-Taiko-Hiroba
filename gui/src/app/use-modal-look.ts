import { useMediaQuery, useTheme } from "@mui/material";
import { useContext, useMemo } from "react";

import type { ModalLook } from "../ui/large-modal";
import { PipelinesShownContext } from "../ui/pipelines-shown";
import { REDUCED_MOTION } from "../ui/window-move";

/** How a large modal is drawn here, from the window, the system and the frame. */
export function useModalLook(): ModalLook {
  const phone = useMediaQuery(useTheme().breakpoints.down("sm"), { noSsr: true });
  const reducedMotion = useMediaQuery(REDUCED_MOTION, { noSsr: true });
  const covered = useContext(PipelinesShownContext);
  return useMemo(() => ({ phone, reducedMotion, covered }), [phone, reducedMotion, covered]);
}
