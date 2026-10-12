import type { Translator } from "@abth/i18n";
import type { ReactNode } from "react";

import type { PictureLane } from "../pictures/picture-lane";
import type { SystemToast } from "../platform";
import type { KnownChart } from "./known-charts";

/** What every part of the page draws with: one row of the whole page is open at a time. */
export interface PageParts {
  readonly i18n: Translator;
  readonly lane: PictureLane;
  readonly toast: SystemToast | undefined;
  /** The open row among this part's rows. */
  readonly openedIn: (part: string) => string | null;
  readonly toggleIn: (part: string) => (row: string) => void;
  /** The charts' gaps nearest the player first, as a list to add to a set; none without gaps. */
  readonly gapList: (id: string, charts: readonly KnownChart[]) => (() => ReactNode) | null;
  /** Charts as a list to add to a set, each with its note. */
  readonly chartList: (
    id: string,
    charts: readonly KnownChart[],
    note: (chart: KnownChart) => string,
  ) => ReactNode;
}
