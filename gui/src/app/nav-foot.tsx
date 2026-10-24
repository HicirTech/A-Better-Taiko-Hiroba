import { type ReactNode, useContext } from "react";
import { createPortal } from "react-dom";

import { NavFootContext } from "../navigation/app-frame";

/** Drawn at the foot of the navigation, such as the way to read again; nowhere while it is shut. */
export function NavFoot({ children }: { children: ReactNode }) {
  const foot = useContext(NavFootContext);
  return foot === null ? null : createPortal(children, foot);
}
