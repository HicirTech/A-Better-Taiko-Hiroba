import type { Translator } from "@abth/i18n";
import { Box, Button, ButtonBase, Skeleton, Stack, Typography } from "@mui/material";
import { type RefObject, useRef, useSyncExternalStore } from "react";

import type { PictureLane } from "../pictures/picture-lane";
import { usePicture } from "../pictures/use-picture";
import type { PictureWant } from "../session-port";
import { PART_LABEL, type SlotPart, slotOf } from "./costume-parts";
import { pickRing } from "./pick-ring";

interface CellSize {
  readonly cell: number;
  readonly gap: number;
  readonly picture: number;
}

// Hiroba's box shows six to a row and four rows at once.
const COLUMNS = 6;
const ROWS = 4;
/** Hiroba's 35 px is too small to touch; the picture stays near its size inside a larger cell. */
const NARROW_CELLS: CellSize = { cell: 44, gap: 6, picture: 40 };
const WIDE_CELLS: CellSize = { cell: 64, gap: 8, picture: 56 };
const RING_ROOM = 6;
const FILLS_COLUMN = { flex: "1 1 0", minHeight: 0, width: 1 } as const;

export interface CostumeItemGridProps {
  readonly lane: PictureLane;
  readonly i18n: Translator;
  readonly part: SlotPart;
  /** The slot's items in the page's order; はずす is not one of them. */
  readonly items: readonly number[];
  /** The item the draft holds in this slot, 0 for none. */
  readonly chosen: number;
  /** A wide window: larger cells, as many to a row as fit, and a box as tall as its column. */
  readonly wide: boolean;
  readonly onPick: (id: number) => void;
}

/** One slot's items as Hiroba's .costumeThumbArea shows them; the pictures are data: URLs. */
export function CostumeItemGrid({
  lane,
  i18n,
  part,
  items,
  chosen,
  wide,
  onPick,
}: CostumeItemGridProps) {
  const { t, number } = i18n;
  const box = useRef<HTMLDivElement>(null);
  useSyncExternalStore(lane.subscribe, lane.version);
  const cells = wide ? WIDE_CELLS : NARROW_CELLS;
  const slot = slotOf(part);
  const failures = items.flatMap((id) => {
    const answer = lane.peek({ kind: "costumeItem", slot, id });
    return answer !== undefined && "failure" in answer ? [answer.failure] : [];
  });
  const scroll = (rows: number) =>
    box.current?.scrollBy({ top: rows * (cells.cell + cells.gap), behavior: "smooth" });

  const cellBox = (
    <Box
      ref={box}
      id={`costume-items-${part}`}
      sx={{
        display: "grid",
        gridTemplateColumns: wide
          ? `repeat(auto-fill, ${cells.cell}px)`
          : `repeat(${COLUMNS}, ${cells.cell}px)`,
        gridAutoRows: `${cells.cell}px`,
        gap: `${cells.gap}px`,
        p: `${RING_ROOM}px`,
        ...(wide
          ? { ...FILLS_COLUMN, justifyContent: "space-between", alignContent: "start" }
          : {
              boxSizing: "content-box",
              height: ROWS * cells.cell + (ROWS - 1) * cells.gap,
            }),
        overflowY: "auto",
        // The same width whether or not a slot holds more rows than the box shows.
        scrollbarGutter: "stable",
        // Hiroba's own box in either theme: the art sits on the white ground it was drawn for.
        bgcolor: "#fff",
        border: "1px solid #999",
        boxShadow: "inset 0 1px 4px rgba(0, 0, 0, 0.35)",
      }}
    >
      {items.map((id, order) => (
        <ItemCell
          key={id}
          lane={lane}
          i18n={i18n}
          part={part}
          want={{ kind: "costumeItem", slot, id }}
          order={order}
          cells={cells}
          chosen={chosen === id}
          root={box}
          onPick={onPick}
        />
      ))}
    </Box>
  );
  return (
    <Stack spacing={1} sx={{ alignItems: "center", ...(wide && FILLS_COLUMN) }}>
      {wide ? (
        cellBox
      ) : (
        <Stack spacing={1} sx={{ width: "fit-content" }}>
          <Button
            size="small"
            variant="outlined"
            fullWidth
            aria-label={t("costume.scroll.up")}
            onClick={() => scroll(-1)}
            sx={{ py: 0 }}
          >
            ▲
          </Button>
          {cellBox}
          <Button
            size="small"
            variant="outlined"
            fullWidth
            aria-label={t("costume.scroll.down")}
            onClick={() => scroll(1)}
            sx={{ py: 0 }}
          >
            ▼
          </Button>
        </Stack>
      )}
      <Button
        id={`item-${part}-0`}
        variant={chosen === 0 ? "contained" : "outlined"}
        color="secondary"
        aria-pressed={chosen === 0}
        onClick={() => onPick(0)}
      >
        {t("costume.remove")}
      </Button>
      {failures.length > 0 && (
        <Stack id="costume-thumbnails-unavailable" sx={{ alignItems: "center" }}>
          <Typography variant="body2" color="text.secondary">
            {t("costume.thumbnails.unavailable", { count: number(failures.length) })}
          </Typography>
          <Typography
            id="costume-thumbnails-code"
            variant="body2"
            color="text.secondary"
            sx={{ fontFamily: "monospace", userSelect: "text", wordBreak: "break-all" }}
          >
            {t("costume.thumbnails.code", { code: failures[0] ?? "" })}
          </Typography>
        </Stack>
      )}
    </Stack>
  );
}

function ItemCell({
  lane,
  i18n,
  part,
  want,
  order,
  cells,
  chosen,
  root,
  onPick,
}: {
  lane: PictureLane;
  i18n: Translator;
  part: SlotPart;
  want: Extract<PictureWant, { kind: "costumeItem" }>;
  order: number;
  cells: CellSize;
  chosen: boolean;
  root: RefObject<HTMLDivElement | null>;
  onPick: (id: number) => void;
}) {
  const { t } = i18n;
  const cell = useRef<HTMLButtonElement>(null);
  // One row ahead counts as seen. A cell touching that edge counts too, so the margin stops short
  // of the row after.
  const answer = usePicture(lane, want, cell, { root, rootMargin: `${cells.cell}px 0px`, order });
  const number = t("costume.id", { id: want.id });
  const numberText = (
    <Typography variant="caption" sx={{ position: "relative", color: "#333", lineHeight: 1 }}>
      {number}
    </Typography>
  );
  return (
    <ButtonBase
      ref={cell}
      id={`item-${part}-${want.id}`}
      aria-label={t("costume.item.label", { part: t(PART_LABEL[part]), id: want.id })}
      aria-pressed={chosen}
      title={number}
      onClick={() => onPick(want.id)}
      sx={{
        width: cells.cell,
        height: cells.cell,
        borderRadius: 0.5,
        // Focus ring in black, as the box is white in either theme.
        ...pickRing(chosen, "common.black"),
      }}
    >
      {answer === undefined ? (
        <>
          <Skeleton
            variant="rectangular"
            width={cells.picture}
            height={cells.picture}
            sx={{ position: "absolute", bgcolor: "rgba(0, 0, 0, 0.11)" }}
          />
          {numberText}
        </>
      ) : "view" in answer ? (
        <Box
          component="img"
          src={answer.view.src}
          alt=""
          sx={{ width: cells.picture, height: cells.picture, objectFit: "contain" }}
        />
      ) : (
        numberText
      )}
    </ButtonBase>
  );
}
