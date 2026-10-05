import type { Translator } from "@abth/i18n";
import { Box, Dialog, IconButton } from "@mui/material";
import { type PointerEvent, useRef, useState, type WheelEvent } from "react";

import { CloseIcon } from "../favorites/favorites-icons";
import { useBackCloses } from "../navigation/back-closers";
import { useTouchFirst } from "../navigation/use-touch-first";
import type { PictureView } from "../session-port";
import { distanceOf, FITTED, midpointOf, type Point, type ZoomView, zoomedView } from "./zoom";

const DOUBLE_CLICK_ZOOM = 2.5;
/** How far the wheel turns for the picture to grow by a factor of e. */
const WHEEL_PER_E = 300;

// The page lets no gesture through here: the fingers zoom and move the picture alone.
const FRAME = { position: "absolute", inset: 0, overflow: "hidden", touchAction: "none" } as const;
const STAGE = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transformOrigin: "0 0",
} as const;

export interface ShownChart {
  readonly picture: PictureView;
  readonly label: string;
}

/** A chart picture on the whole screen, zoomed by two fingers, the wheel or a double click. */
export function ChartViewer({
  chart,
  i18n,
  onClose,
}: {
  chart: ShownChart | null;
  i18n: Translator;
  onClose: () => void;
}) {
  const touchFirst = useTouchFirst();
  useBackCloses(chart !== null, onClose);
  return (
    <Dialog
      id="chart-viewer"
      open={chart !== null}
      onClose={onClose}
      fullScreen
      slotProps={{ paper: { sx: { bgcolor: "common.black" } } }}
    >
      {chart !== null && <ZoomablePicture chart={chart} />}
      {!touchFirst && (
        <IconButton
          id="chart-viewer-close"
          aria-label={i18n.t("picker.close")}
          onClick={onClose}
          sx={{ position: "absolute", top: 8, right: 8, color: "common.white" }}
        >
          <CloseIcon />
        </IconButton>
      )}
    </Dialog>
  );
}

function ZoomablePicture({ chart }: { chart: ShownChart }) {
  const [view, setView] = useState<ZoomView>(FITTED);
  const frame = useRef<HTMLDivElement>(null);
  const fingers = useRef(new Map<number, Point>());
  const pinch = useRef<{ view: ZoomView; distance: number; midpoint: Point } | null>(null);

  const inFrame = (event: { clientX: number; clientY: number }): Point => {
    const box = frame.current?.getBoundingClientRect();
    return { x: event.clientX - (box?.left ?? 0), y: event.clientY - (box?.top ?? 0) };
  };
  const startPinch = () => {
    const [a, b] = [...fingers.current.values()];
    pinch.current =
      a === undefined || b === undefined
        ? null
        : { view, distance: distanceOf(a, b), midpoint: midpointOf(a, b) };
  };
  const down = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    fingers.current.set(event.pointerId, inFrame(event));
    startPinch();
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const before = fingers.current.get(event.pointerId);
    if (before === undefined) {
      return;
    }

    const now = inFrame(event);
    fingers.current.set(event.pointerId, now);
    const [a, b] = [...fingers.current.values()];
    const start = pinch.current;
    if (start !== null && a !== undefined && b !== undefined && start.distance > 0) {
      const scale = (start.view.scale * distanceOf(a, b)) / start.distance;
      setView(zoomedView(start.view, scale, start.midpoint, midpointOf(a, b)));
    } else if (fingers.current.size === 1) {
      setView((was) =>
        was.scale === 1
          ? was
          : { ...was, x: was.x + now.x - before.x, y: was.y + now.y - before.y },
      );
    }
  };
  const up = (event: PointerEvent<HTMLDivElement>) => {
    fingers.current.delete(event.pointerId);
    startPinch();
  };
  const wheel = (event: WheelEvent<HTMLDivElement>) => {
    const point = inFrame(event);
    setView((was) =>
      zoomedView(was, was.scale * Math.exp(-event.deltaY / WHEEL_PER_E), point, point),
    );
  };

  return (
    <Box
      ref={frame}
      className="chart-viewer-frame"
      data-scale={view.scale}
      sx={FRAME}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onWheel={wheel}
      onDoubleClick={(event) => {
        const point = inFrame(event);
        setView((was) =>
          was.scale === 1 ? zoomedView(was, DOUBLE_CLICK_ZOOM, point, point) : FITTED,
        );
      }}
    >
      <Box
        sx={STAGE}
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
      >
        <img
          src={chart.picture.src}
          width={chart.picture.width}
          height={chart.picture.height}
          alt={chart.label}
          draggable={false}
          style={{ maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto" }}
        />
      </Box>
    </Box>
  );
}
