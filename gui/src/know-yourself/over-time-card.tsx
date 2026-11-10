import type { Translator } from "@abth/i18n";
import type { ReactNode } from "react";

import { FoldCard } from "../ui/fold-card";
import { StatusNote } from "../ui/status-note";

/** A card of something kept over time: its chart once two reads found it, else a note saying so. */
export function OverTimeCard({
  id,
  title,
  summary,
  opened,
  readings,
  i18n,
  chart,
}: {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly opened: boolean;
  /** How many reads found it: a line needs two. */
  readonly readings: number;
  readonly i18n: Translator;
  /** Drawn as the card opens. */
  readonly chart: () => ReactNode;
}) {
  return (
    <FoldCard
      id={id}
      opened={opened}
      title={title}
      summary={summary}
      details={() =>
        readings < 2 ? (
          <StatusNote id={`${id}-one-read`}>{i18n.t("chart.oneRead")}</StatusNote>
        ) : (
          chart()
        )
      }
    />
  );
}
