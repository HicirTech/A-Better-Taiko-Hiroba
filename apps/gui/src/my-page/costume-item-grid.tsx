import type { Translator } from "@abth/i18n";
import { Box, Button, ButtonBase, Skeleton, Stack, Typography } from "@mui/material";
import { type ReactNode, useRef, useSyncExternalStore } from "react";

import type { PictureAnswer, PictureLane } from "../pictures/picture-lane";
import { usePicture } from "../pictures/use-picture";
import type { PictureWant } from "../session-port";
import { PART_LABEL, type SlotPart, slotOf } from "./costume-parts";
import { pickRing } from "./pick-ring";

interface CellSize {
  readonly cell: number;
  readonly gap: number;
  readonly picture: number;
}

/** Hiroba's 35 px is too small to touch; the picture stays near its size inside a larger cell. */
const NARROW_CELLS: CellSize = { cell: 44, gap: 6, picture: 40 };
const WIDE_CELLS: CellSize = { cell: 64, gap: 8, picture: 56 };

export interface CostumeItemGridProps {
  readonly lane: PictureLane;
  readonly i18n: Translator;
  readonly part: SlotPart;
  /** The slot's items in the page's order; はずす is not one of them. */
  readonly items: readonly number[];
  /** The item the draft holds in this slot, 0 for none. */
  readonly chosen: number;
  /** A wide window: larger cells. */
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
  useSyncExternalStore(lane.subscribe, lane.version);
  const cells = wide ? WIDE_CELLS : NARROW_CELLS;
  const slot = slotOf(part);
  const failures = items.flatMap((id) => {
    const answer = lane.peek({ kind: "costumeItem", slot, id });
    return answer !== undefined && "failure" in answer ? [answer.failure] : [];
  });

  return (
    <Stack spacing={1.5}>
      {failures.length > 0 && (
        <Stack id="costume-thumbnails-unavailable">
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
      <Box
        id={`costume-items-${part}`}
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fill, ${cells.cell}px)`,
          gridAutoRows: `${cells.cell}px`,
          gap: `${cells.gap}px`,
          justifyContent: "start",
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
            onPick={onPick}
          />
        ))}
      </Box>
      <Button
        id={`item-${part}-0`}
        variant={chosen === 0 ? "contained" : "outlined"}
        color="secondary"
        aria-pressed={chosen === 0}
        onClick={() => onPick(0)}
        sx={{ alignSelf: "flex-start" }}
      >
        {t("costume.remove")}
      </Button>
    </Stack>
  );
}

/** An item's picture: a skeleton while it is on its way, and `fallback` where it did not come. */
export function ItemPicture({
  answer,
  size,
  fallback,
}: {
  answer: PictureAnswer | undefined;
  size: number | string;
  fallback?: ReactNode;
}) {
  if (answer !== undefined && "view" in answer) {
    return (
      <Box
        component="img"
        src={answer.view.src}
        alt=""
        sx={{ width: size, height: size, objectFit: "contain" }}
      />
    );
  }

  return (
    <>
      {answer === undefined && (
        <Skeleton
          variant="rectangular"
          width={size}
          height={size}
          sx={{ position: "absolute", bgcolor: "rgba(0, 0, 0, 0.11)" }}
        />
      )}
      {fallback}
    </>
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
  onPick,
}: {
  lane: PictureLane;
  i18n: Translator;
  part: SlotPart;
  want: Extract<PictureWant, { kind: "costumeItem" }>;
  order: number;
  cells: CellSize;
  chosen: boolean;
  onPick: (id: number) => void;
}) {
  const { t } = i18n;
  const cell = useRef<HTMLButtonElement>(null);
  // One row ahead of the window counts as seen. A cell touching that edge counts too, so the
  // margin stops short of the row after.
  const answer = usePicture(lane, want, cell, {
    root: null,
    rootMargin: `${cells.cell}px 0px`,
    order,
  });
  const number = t("costume.id", { id: want.id });
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
        // Hiroba's art on the white ground it was drawn for, in either theme.
        bgcolor: "#fff",
        ...pickRing(chosen, "text.primary"),
      }}
    >
      <ItemPicture
        answer={answer}
        size={cells.picture}
        fallback={
          <Typography variant="caption" sx={{ position: "relative", color: "#333", lineHeight: 1 }}>
            {number}
          </Typography>
        }
      />
    </ButtonBase>
  );
}
