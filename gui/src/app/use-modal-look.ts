import { useMediaQuery, useTheme } from "@mui/material";
import { useMemo } from "react";

import type { ModalLook } from "../ui/large-modal";
import { REDUCED_MOTION } from "../ui/window-move";

/** How a large modal is drawn here, from the window and the system, `covered` from the frame. */
export function useModalLook(covered: boolean): ModalLook {
  const phone = useMediaQuery(useTheme().breakpoints.down("sm"), { noSsr: true });
  const reducedMotion = useMediaQuery(REDUCED_MOTION, { noSsr: true });
  return useMemo(() => ({ phone, reducedMotion, covered }), [phone, reducedMotion, covered]);
}
