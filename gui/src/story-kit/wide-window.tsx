import type { ReactNode } from "react";

import { useWideWindow } from "../navigation/use-wide-window";

/** Draws `children` for the window's width as the app measures it: wide enough for the side panel,
 * or not. */
export function WideWindow({ children }: { readonly children: (wide: boolean) => ReactNode }) {
  return children(useWideWindow());
}
