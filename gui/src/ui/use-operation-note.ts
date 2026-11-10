import { useCallback, useState } from "react";

/** A note at the window's foot: said, closing as it slides away, then gone. */
export interface OperationNote<T> {
  /** What is said, while it stands and while it slides away; none once it has gone. */
  readonly said: T | null;
  /** Changes with each note said, so a snackbar keyed by it starts over for each. */
  readonly key: number;
  /** Says it now, in place of a note that stands. */
  readonly say: (note: T) => void;
  /** Takes the note away at once, standing or not. */
  readonly clear: () => void;
  /** What `OperationSnackbar` takes: whether it stands, its close and its end. */
  readonly snackbar: {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly onExited: () => void;
  };
}

interface Said<T> {
  readonly note: T;
  readonly open: boolean;
  readonly key: number;
}

const saying =
  <T>(note: T) =>
  (now: Said<T> | null): Said<T> => ({ note, open: true, key: (now?.key ?? 0) + 1 });

/** A note at the window's foot; each new value of `follows` is said, the first one not. */
export function useOperationNote<T>(follows: T | null = null): OperationNote<T> {
  const [said, setSaid] = useState<Said<T> | null>(null);
  const [heard, setHeard] = useState(follows);
  if (follows !== heard) {
    setHeard(follows);
    if (follows !== null) {
      setSaid(saying<T>(follows));
    }
  }
  const say = useCallback((note: T) => setSaid(saying(note)), []);
  const clear = useCallback(() => setSaid(null), []);
  const onClose = useCallback(
    () => setSaid((now) => (now === null ? null : { ...now, open: false })),
    [],
  );
  return {
    said: said === null ? null : said.note,
    key: said?.key ?? 0,
    say,
    clear,
    snackbar: { open: said?.open ?? false, onClose, onExited: clear },
  };
}
