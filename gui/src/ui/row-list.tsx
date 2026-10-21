import { Box } from "@mui/material";
import {
  defaultRangeExtractor,
  measureElement,
  type Range,
  useVirtualizer,
  useWindowVirtualizer,
  type Virtualizer,
} from "@tanstack/react-virtual";
import {
  type CSSProperties,
  type FocusEvent,
  Fragment,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
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

export interface RowListProps<T> {
  readonly id: string;
  readonly rows: readonly T[];
  /** A row's own key, the same wherever the row moves. */
  readonly keyOf: (row: T) => string;
  /** A row's height until it is measured. */
  readonly rowPx: number;
  /** The element the list scrolls in, such as a dialog's body; the page's own scroll otherwise. */
  readonly scroller?: RefObject<HTMLElement | null> | undefined;
  readonly describedBy?: string | undefined;
  /** Draws a row, with `place` on its root element. */
  readonly children: (row: T, index: number, place: RowPlace) => ReactNode;
}

type Scroll = Window | HTMLElement;

// Hidden with its page, a row measures 0: it keeps its size, or the list would draw every row.
function keptSize<S extends Scroll>(
  element: Element,
  entry: ResizeObserverEntry | undefined,
  list: Virtualizer<S, Element>,
): number {
  const size = measureElement(element, entry, list);
  if (size > 0) {
    return size;
  }
  const index = list.indexFromElement(element);
  return list.itemSizeCache.get(list.options.getItemKey(index)) ?? list.options.estimateSize(index);
}

/** A long list: only the rows near the window are in the page. */
export function RowList<T>(props: RowListProps<T>) {
  const { scroller } = props;
  return scroller === undefined ? (
    <PageRows {...props} />
  ) : (
    <ScrollerRows {...props} scroller={scroller} />
  );
}

/** What a list keeps whatever it scrolls in: its rows' keys, the focused row, where it starts. */
function useRowKeeping<T>({ rows, keyOf }: RowListProps<T>) {
  const list = useRef<HTMLUListElement>(null);
  // Where the list starts in what scrolls it, which the scroll is measured against.
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
  const focusRow = (event: FocusEvent<HTMLElement>) => {
    const row = event.target.closest<HTMLElement>("[data-index]");
    setFocused(row === null ? null : Number(row.dataset.index));
  };
  const blurRow = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setFocused(null);
    }
  };
  const keepTop = (at: number) => {
    if (at !== top) {
      setTop(at);
    }
  };
  return { list, top, keepTop, getItemKey, rangeExtractor, focusRow, blurRow };
}

type RowKeeping = ReturnType<typeof useRowKeeping>;

function PageRows<T>(props: RowListProps<T>) {
  const keeping = useRowKeeping(props);
  const virtualizer = useWindowVirtualizer({
    count: props.rows.length,
    estimateSize: () => props.rowPx,
    getItemKey: keeping.getItemKey,
    rangeExtractor: keeping.rangeExtractor,
    overscan: OVERSCAN_ROWS,
    scrollMargin: keeping.top,
    measureElement: keptSize,
    initialRect: { width: window.innerWidth, height: window.innerHeight },
  });
  useLayoutEffect(() => {
    const element = keeping.list.current;
    // Hidden with its page, the list has no place to measure: it keeps the last one.
    if (element !== null && element.offsetParent !== null) {
      keeping.keepTop(Math.round(element.getBoundingClientRect().top + window.scrollY));
    }
  });
  return <Rows {...props} keeping={keeping} virtualizer={virtualizer} />;
}

function ScrollerRows<T>(
  props: RowListProps<T> & { readonly scroller: RefObject<HTMLElement | null> },
) {
  const { scroller } = props;
  const keeping = useRowKeeping(props);
  const virtualizer = useVirtualizer({
    count: props.rows.length,
    getScrollElement: () => scroller.current,
    estimateSize: () => props.rowPx,
    getItemKey: keeping.getItemKey,
    rangeExtractor: keeping.rangeExtractor,
    overscan: OVERSCAN_ROWS,
    scrollMargin: keeping.top,
    measureElement: keptSize,
  });
  useLayoutEffect(() => {
    const element = keeping.list.current;
    const box = scroller.current;
    if (element !== null && box !== null && element.offsetParent !== null) {
      const from = element.getBoundingClientRect().top - box.getBoundingClientRect().top;
      keeping.keepTop(Math.round(from + box.scrollTop));
    }
  });
  // Mounted with its scroller, the list runs its first effects before the scroller's ref is set:
  // one more render hands the scroller to the list.
  const [scrollerSeen, setScrollerSeen] = useState(false);
  useEffect(() => {
    if (!scrollerSeen && scroller.current !== null) {
      setScrollerSeen(true);
    }
  }, [scrollerSeen, scroller]);
  return <Rows {...props} keeping={keeping} virtualizer={virtualizer} />;
}

function Rows<T>({
  id,
  rows,
  describedBy,
  children,
  keeping,
  virtualizer,
}: RowListProps<T> & {
  readonly keeping: RowKeeping;
  readonly virtualizer: Virtualizer<Window, Element> | Virtualizer<HTMLElement, Element>;
}) {
  const { top } = keeping;
  return (
    <Box
      component="ul"
      id={id}
      ref={keeping.list}
      aria-describedby={describedBy}
      sx={LIST}
      style={{ height: virtualizer.getTotalSize() }}
      onFocus={keeping.focusRow}
      onBlur={keeping.blurRow}
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
