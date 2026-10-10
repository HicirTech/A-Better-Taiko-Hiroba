import { createContext } from "react";

/** Whether the pipelines page is over the page: the page's own dialogs step aside until it goes. */
export const PipelinesShownContext = createContext(false);
