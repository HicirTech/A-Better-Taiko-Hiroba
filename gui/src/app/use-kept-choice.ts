import { useCallback, useState } from "react";

/** A choice the device keeps: read as the window opens, and kept again whenever it changes. */
export function useKeptChoice<T>(
  kept: () => T,
  keep: (value: T) => void,
): readonly [T, (value: T) => void] {
  const [value, setValue] = useState(kept);
  const choose = useCallback(
    (next: T) => {
      keep(next);
      setValue(next);
    },
    [keep],
  );
  return [value, choose];
}
