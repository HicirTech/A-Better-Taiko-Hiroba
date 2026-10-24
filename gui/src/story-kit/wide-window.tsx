import type { ReactNode } from "react";

import { useWideWindow } from "../ui/use-wide-window";

/** Draws `children` for the window's width as the app measures it. */
export function WideWindow({ children }: { readonly children: (wide: boolean) => ReactNode }) {
  return children(useWideWindow());
}
