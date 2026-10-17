import { Box } from "@mui/material";
import {
  defaultRangeExtractor,
  measureElement,
  type Range,
  useWindowVirtualizer,
  type VirtualizerOptions,
} from "@tanstack/react-virtual";
import {
  type CSSProperties,
  type FocusEvent,
  Fragment,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { drawnRows } from "./drawn-rows";

/** Rows drawn past each edge of the window: about a screen, so a fling does not outrun them. */
const OVERSCAN_ROWS = 10;

const LIST = { position: "relative", listStyle: "none", m: 0, p: 0 } as const;
const PLACED = { position: "absolute", top: 0, left: 0, right: 0 } as const;

/** Where the list puts a row: spread on the row's root element, which it measures. */
export interface RowPlace {
  readonly ref: (element: HTMLElement | null) => void;
  readonly "data-index": number;
  readonly style: CSSProperties;
}

type Measure = NonNullable<VirtualizerOptions<Window, Element>["measureElement"]>;

// Hidden with its page, a row measures 0: it keeps its size, or the list would draw every row.
const keptSize: Measure = (element, entry, list) => {
  const size = measureElement(element, entry, list);
  if (size > 0) {
    return size;
  }
  const index = list.indexFromElement(element);
  return list.itemSizeCache.get(list.options.getItemKey(index)) ?? list.options.estimateSize(index);
};

/** A long list on the page's scroll: only the rows near the window are in the page. */
export function RowList<T>({
  id,
  rows,
  keyOf,
  rowPx,
  children,
}: {
  readonly id: string;
  readonly rows: readonly T[];
  /** A row's own key, the same wherever the row moves. */
  readonly keyOf: (row: T) => string;
  /** A row's height until it is measured. */
  readonly rowPx: number;
  /** Draws a row, with `place` on its root element. */
  readonly children: (row: T, index: number, place: RowPlace) => ReactNode;
}) {
  const list = useRef<HTMLUListElement>(null);
  // Where the list starts on the page, which the window's scroll is measured against.
  const [top, setTop] = useState(0);
  const [focused, setFocused] = useState<number | null>(null);
  const getItemKey = useCallback(
    (index: number) => {
      const row = rows[index];
      return row === undefined ? index : keyOf(row);
    },
    [rows, keyOf],
  );
  const rangeExtractor = useCallback(
    (range: Range) => drawnRows(defaultRangeExtractor(range), focused, range.count),
    [focused],
  );
  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => rowPx,
    getItemKey,
    rangeExtractor,
    overscan: OVERSCAN_ROWS,
    scrollMargin: top,
    measureElement: keptSize,
    initialRect: { width: window.innerWidth, height: window.innerHeight },
  });
  useLayoutEffect(() => {
    const element = list.current;
    // Hidden with its page, the list has no place to measure: it keeps the last one.
    if (element === null || element.offsetParent === null) {
      return;
    }
    const at = Math.round(element.getBoundingClientRect().top + window.scrollY);
    if (at !== top) {
      setTop(at);
    }
  });
  const focusRow = (event: FocusEvent<HTMLElement>) => {
    const row = event.target.closest<HTMLElement>("[data-index]");
    setFocused(row === null ? null : Number(row.dataset.index));
  };
  const blurRow = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setFocused(null);
    }
  };
  return (
    <Box
      component="ul"
      id={id}
      ref={list}
      sx={LIST}
      style={{ height: virtualizer.getTotalSize() }}
      onFocus={focusRow}
      onBlur={blurRow}
    >
      {virtualizer.getVirtualItems().map(({ index, key, start }) => {
        const row = rows[index];
        return row === undefined ? null : (
          <Fragment key={key}>
            {children(row, index, {
              ref: virtualizer.measureElement,
              "data-index": index,
              style: { ...PLACED, transform: `translateY(${start - top}px)` },
            })}
          </Fragment>
        );
      })}
    </Box>
  );
}
