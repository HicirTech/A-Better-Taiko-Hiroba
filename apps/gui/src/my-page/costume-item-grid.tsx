import type { Translator } from "@abth/i18n";
import { Box, ButtonBase, Skeleton, Stack, SvgIcon, Typography } from "@mui/material";
import { type ReactNode, useRef, useSyncExternalStore } from "react";

import type { PictureAnswer, PictureLane } from "../pictures/picture-lane";
import { usePicture } from "../pictures/use-picture";
import type { PictureWant } from "../session-port";
import { PART_LABEL, type SlotPart, slotOf } from "./costume-parts";
import { pickRing } from "./pick-ring";
import { CLEAR_OF_STUCK } from "./stuck-clearance";

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
  /** The slot's items in the page's order; はずす is the grid's first cell, not one of them. */
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
  const cells = wide ? WIDE_CELLS : NARROW_CELLS;
  const slot = slotOf(part);
  return (
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
      <NoneCell part={part} i18n={i18n} cells={cells} chosen={chosen === 0} onPick={onPick} />
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
  );
}

export interface ThumbnailsUnavailableProps {
  readonly lane: PictureLane;
  readonly i18n: Translator;
  readonly part: SlotPart;
  readonly items: readonly number[];
}

/** The words for thumbnails that did not come, with the code to report; nothing if all did. */
export function ThumbnailsUnavailable({ lane, i18n, part, items }: ThumbnailsUnavailableProps) {
  const { t, number } = i18n;
  useSyncExternalStore(lane.subscribe, lane.version);
  const slot = slotOf(part);
  const failures = items.flatMap((id) => {
    const answer = lane.peek({ kind: "costumeItem", slot, id });
    return answer !== undefined && "failure" in answer ? [answer.failure] : [];
  });
  if (failures.length === 0) {
    return null;
  }

  return (
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

// Material's "block" icon (Apache 2.0), inline because the icons package is not a dependency.
function NoneCell({
  part,
  i18n,
  cells,
  chosen,
  onPick,
}: {
  part: SlotPart;
  i18n: Translator;
  cells: CellSize;
  chosen: boolean;
  onPick: (id: number) => void;
}) {
  const label = i18n.t("costume.remove");
  return (
    <ButtonBase
      id={`item-${part}-0`}
      aria-label={label}
      aria-pressed={chosen}
      title={label}
      onClick={() => onPick(0)}
      sx={{
        width: cells.cell,
        height: cells.cell,
        borderRadius: 0.5,
        bgcolor: "action.hover",
        color: "text.secondary",
        ...pickRing(chosen, "text.primary"),
        ...CLEAR_OF_STUCK,
      }}
    >
      <SvgIcon aria-hidden sx={{ fontSize: cells.picture / 2 }}>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z" />
      </SvgIcon>
    </ButtonBase>
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
  const answer = usePicture(lane, want, cell, { rootMargin: `${cells.cell}px 0px`, order });
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
        ...CLEAR_OF_STUCK,
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
