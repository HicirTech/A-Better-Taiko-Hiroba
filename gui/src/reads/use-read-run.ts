import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { createReadRun, type ReadRun, type ReadRunOptions, type ReadStatus } from "./read-run";

/** A kind of data's reads, made once, and where they stand, drawn again whenever that changes. */
export function useReadRun<F, P = never>(
  options: ReadRunOptions<F> = {},
): readonly [ReadRun<F, P>, ReadStatus<F, P>] {
  // The run is made once; what it calls back is the caller's latest.
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });
  const [run] = useState(() =>
    createReadRun<F, P>({
      endsTheSession: (failure) => latest.current.endsTheSession?.(failure) === true,
      onSessionEnded: (failure) => latest.current.onSessionEnded?.(failure),
    }),
  );
  const status = useSyncExternalStore(run.subscribe, run.status);
  return [run, status];
}
