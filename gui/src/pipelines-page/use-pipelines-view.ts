import { useEffect, useState } from "react";

import type { HirobaSessionPort, PipelinesView } from "../session-port";

/** How long the page waits after one read of the pipelines before the next. */
export const READ_AGAIN_MS = 250;

/** The pipelines with their newest `history` groups that ended, read again and again for as long
 * as the calling page is shown; null before the first read comes. */
export function usePipelinesView(
  port: Pick<HirobaSessionPort, "readPipelines">,
  history: number,
): PipelinesView | null {
  const [view, setView] = useState<PipelinesView | null>(null);
  useEffect(() => {
    let current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const read = async () => {
      try {
        const next = await port.readPipelines(history);
        if (current) {
          setView(next);
        }
      } catch {
        // A read the bridge refused: the next one asks again.
      }
      if (current) {
        timer = setTimeout(read, READ_AGAIN_MS);
      }
    };
    void read();
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [port, history]);
  return view;
}
