import type { Translator } from "@abth/i18n";
import { Box, Button, ButtonBase, Skeleton, Stack, Typography } from "@mui/material";
import { type RefObject, useRef, useSyncExternalStore } from "react";

import { HIROBA_LANG } from "../language/show-language";
import type { PictureLane } from "../pictures/picture-lane";
import { usePicture } from "../pictures/use-picture";
import type { PictureWant } from "../session-port";
import { PART_LABEL, type SlotPart, slotOf } from "./costume-parts";
import { pickRing } from "./pick-ring";

/** Six to a row and four rows seen at once, as Hiroba's box has them. */
const COLUMNS = 6;
const ROWS = 4;
/** Hiroba's 35 px is too small to touch; the picture stays near its size inside a larger cell. */
const CELL = 44;
const GAP = 6;
const PICTURE = 40;
/** A row and the gap under it: what an arrow scrolls. */
const ROW = CELL + GAP;
/**
 * How far below or above the box a cell counts as seen: one row ahead. A cell only touching that
 * edge counts too, so the margin stops short of the row after.
 */
const AHEAD = `${CELL}px 0px`;
/** Room inside the box for the ring of a chosen or focused item at its edge. */
const PAD = 6;

export interface CostumeItemGridProps {
  readonly lane: PictureLane;
  readonly i18n: Translator;
  readonly part: SlotPart;
  /** The slot's items in the page's order; はずす is not one of them. */
  readonly items: readonly number[];
  /** The item the draft holds in this slot, 0 for none. */
  readonly chosen: number;
  readonly onPick: (id: number) => void;
}

/**
 * One slot's items as Hiroba's editor shows them, .costumeThumbArea: each item's own thumbnail,
 * six to a row, four rows at a time, scrolled natively or a row at a time with ▲ and ▼, and はずす
 * as a button under the box. A thumbnail is asked for only once its cell has stayed on screen, or
 * within a row of it, and only one at a time; until it comes the cell shows its number over a
 * placeholder, and a thumbnail that does not come leaves the number, as the editor showed before.
 * The pictures are data: URLs: no address of Hiroba's reaches the window.
 */
export function CostumeItemGrid({ lane, i18n, part, items, chosen, onPick }: CostumeItemGridProps) {
  const { t, number } = i18n;
  const box = useRef<HTMLDivElement>(null);
  useSyncExternalStore(lane.subscribe, lane.version);
  const slot = slotOf(part);
  const failures = items.flatMap((id) => {
    const answer = lane.peek({ kind: "costumeItem", slot, id });
    return answer !== undefined && "failure" in answer ? [answer.failure] : [];
  });
  const scroll = (rows: number) => box.current?.scrollBy({ top: rows * ROW, behavior: "smooth" });

  return (
    <Stack spacing={1} sx={{ alignItems: "center" }}>
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
        <Box
          ref={box}
          id={`costume-items-${part}`}
          sx={{
            display: "grid",
            gridTemplateColumns: `repeat(${COLUMNS}, ${CELL}px)`,
            gridAutoRows: `${CELL}px`,
            gap: `${GAP}px`,
            p: `${PAD}px`,
            boxSizing: "content-box",
            height: ROWS * CELL + (ROWS - 1) * GAP,
            overflowY: "auto",
            // The same width whether or not a slot holds more rows than the box shows.
            scrollbarGutter: "stable",
            // Hiroba's own box: white, a grey rule and a shadow set in, in either theme, so the art
            // sits on the ground it was drawn for.
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
              chosen={chosen === id}
              root={box}
              onPick={onPick}
            />
          ))}
        </Box>
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
      <Button
        id={`item-${part}-0`}
        variant={chosen === 0 ? "contained" : "outlined"}
        color="secondary"
        aria-pressed={chosen === 0}
        lang={HIROBA_LANG}
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
  chosen,
  root,
  onPick,
}: {
  lane: PictureLane;
  i18n: Translator;
  part: SlotPart;
  want: Extract<PictureWant, { kind: "costumeItem" }>;
  order: number;
  chosen: boolean;
  root: RefObject<HTMLDivElement | null>;
  onPick: (id: number) => void;
}) {
  const { t } = i18n;
  const cell = useRef<HTMLButtonElement>(null);
  const answer = usePicture(lane, want, cell, { root, rootMargin: AHEAD, order });
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
      lang={HIROBA_LANG}
      title={number}
      onClick={() => onPick(want.id)}
      sx={{
        width: CELL,
        height: CELL,
        borderRadius: 0.5,
        // Outside the cell, never over the picture; focus in black, as the box is white in either
        // theme.
        ...pickRing(chosen, "common.black"),
      }}
    >
      {answer === undefined ? (
        <>
          <Skeleton
            variant="rectangular"
            width={PICTURE}
            height={PICTURE}
            sx={{ position: "absolute", bgcolor: "rgba(0, 0, 0, 0.11)" }}
          />
          {numberText}
        </>
      ) : "view" in answer ? (
        <Box
          component="img"
          src={answer.view.src}
          alt=""
          sx={{ width: PICTURE, height: PICTURE, objectFit: "contain" }}
        />
      ) : (
        numberText
      )}
    </ButtonBase>
  );
}
