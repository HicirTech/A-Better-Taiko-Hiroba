import { keyframes } from "@emotion/react";
import { Box } from "@mui/material";
import { type CSSProperties, type ReactNode, useLayoutEffect, useRef, useState } from "react";

const SPEED_PX_PER_S = 40;
// The share of each pass spent still at either end, so the start and the end can be read.
const RESTING_SHARE = 0.3;

const SCROLL = keyframes`
  0%, 15% { transform: translateX(0); }
  85%, 100% { transform: translateX(var(--shift)); }
`;

/** One line that scrolls to its end and back when it does not fit; an ellipsis with less motion. */
export function ScrollingText({
  children,
  id,
  className,
  lang,
}: {
  children: ReactNode;
  id?: string;
  className?: string;
  lang?: string;
}) {
  const box = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const [overflowPx, setOverflowPx] = useState(0);
  useLayoutEffect(() => {
    const outer = box.current;
    const inner = text.current;
    if (outer === null || inner === null) {
      return;
    }
    const measure = () =>
      setOverflowPx(
        Math.max(0, Math.ceil(inner.getBoundingClientRect().width - outer.clientWidth)),
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);
  const seconds = overflowPx / SPEED_PX_PER_S / (1 - RESTING_SHARE);
  return (
    <Box
      component="span"
      ref={box}
      id={id}
      className={className}
      lang={lang}
      sx={{ display: "block", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}
    >
      <Box
        component="span"
        ref={text}
        className={overflowPx > 0 ? "scrolling" : undefined}
        style={overflowPx > 0 ? ({ "--shift": `-${overflowPx}px` } as CSSProperties) : undefined}
        sx={
          overflowPx > 0
            ? {
                display: "inline-block",
                animation: `${SCROLL} ${seconds}s ease-in-out infinite alternate`,
                "@media (prefers-reduced-motion: reduce)": { display: "inline", animation: "none" },
              }
            : undefined
        }
      >
        {children}
      </Box>
    </Box>
  );
}
