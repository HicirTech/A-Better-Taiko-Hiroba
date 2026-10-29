import { createContext } from "react";

/** Whether the navigation menu is open: a page with a drawer of its own leaves it its touches. */
export const MenuOpenContext = createContext(false);

/** Opens or shuts the navigation menu from below the frame, as a tip told inside it does. */
export const MenuOpenerContext = createContext<(open: boolean) => void>(() => undefined);
