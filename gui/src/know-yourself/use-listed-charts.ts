import { useEffect, useState } from "react";

import type { HirobaSessionPort, ListedChartsView, ScoresView } from "../shared/session-port";

/** Every chart the lists name, asked again whenever the kept scores change. */
export function useListedCharts(
  port: Pick<HirobaSessionPort, "listedCharts">,
  scores: ScoresView | null,
): ListedChartsView | null {
  const [listed, setListed] = useState<ListedChartsView | null>(null);
  // Scores dropped for another player's session take their charts with them.
  if (scores === null && listed !== null) {
    setListed(null);
  }
  useEffect(() => {
    if (scores === null) {
      return;
    }
    let current = true;
    void port.listedCharts().then((view) => {
      if (current) {
        setListed(view);
      }
    });
    return () => {
      current = false;
    };
  }, [port, scores]);
  return listed;
}
