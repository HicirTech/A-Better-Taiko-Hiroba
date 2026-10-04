import type { Translator } from "@abth/i18n";
import {
  type Announcements,
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  type Modifier,
  MouseSensor,
  TouchSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Box, type SxProps, type Theme } from "@mui/material";
import { type ReactNode, useRef } from "react";

import { holdGestures } from "../navigation/gesture-hold";
import { DragHandleIcon } from "./favorites-icons";

const VERTICAL: Modifier = ({ transform }) => ({ ...transform, x: 0 });
// A finger held still this long picks a row up; one that moves sooner scrolls the page.
const TOUCH_HOLD = { delay: 300, tolerance: 8 } as const;
const MOUSE_DRAG = { distance: 4 } as const;
// A finger let go within this of where the row was picked up meant the press, not a move.
const HELD_IN_PLACE_PX = 8;

const LIST = {
  listStyle: "none",
  m: 0,
  p: 0,
  display: "flex",
  flexDirection: "column",
  gap: 1,
} as const;
const HANDLE = {
  display: "flex",
  alignItems: "center",
  color: "text.secondary",
  cursor: "grab",
  touchAction: "none",
  borderRadius: 1,
  "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" },
} as const;
// A long press must not select the name or open the system's menu.
const HELD_BY_A_FINGER = {
  userSelect: "none",
  WebkitUserSelect: "none",
  WebkitTouchCallout: "none",
  touchAction: "manipulation",
} as const;

export interface SortableItem {
  readonly key: string;
  /** What a screen reader calls the item as it moves. */
  readonly name: string;
}

export interface SortableListProps {
  readonly id: string;
  readonly items: readonly SortableItem[];
  /** A long press anywhere on a row picks it up, as on a phone; otherwise its handle does. */
  readonly byLongPress: boolean;
  readonly i18n: Translator;
  readonly onMove: (from: number, to: number) => void;
  /** A finger held a row and let go where it was: the touch screen's right-click. */
  readonly onHold?: (key: string) => void;
  /** The row's content, given the handle to put at its start; null when a long press moves it. */
  readonly renderItem: (key: string, handle: ReactNode) => ReactNode;
  readonly sx?: SxProps<Theme>;
}

/** Rows that move up and down by a handle, a long press or the keyboard. */
export function SortableList({
  id,
  items,
  byLongPress,
  i18n,
  onMove,
  onHold,
  renderItem,
  sx,
}: SortableListProps) {
  const { t } = i18n;
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: MOUSE_DRAG }),
    useSensor(TouchSensor, { activationConstraint: TOUCH_HOLD }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const release = useRef<(() => void) | null>(null);
  const keys = items.map((item) => item.key);
  const indexOf = (key: UniqueIdentifier) => keys.indexOf(String(key));
  const nameOf = (key: UniqueIdentifier) => items[indexOf(key)]?.name ?? "";
  const total = items.length;
  const announcements: Announcements = {
    onDragStart: ({ active }) => t("sort.picked", { name: nameOf(active.id) }),
    onDragOver: ({ active, over }) =>
      over === null
        ? undefined
        : t("sort.over", { name: nameOf(active.id), position: indexOf(over.id) + 1, total }),
    onDragEnd: ({ active, over }) =>
      over === null
        ? t("sort.cancelled", { name: nameOf(active.id) })
        : t("sort.dropped", { name: nameOf(active.id), position: indexOf(over.id) + 1, total }),
    onDragCancel: ({ active }) => t("sort.cancelled", { name: nameOf(active.id) }),
  };
  const letGo = () => {
    release.current?.();
    release.current = null;
  };
  const end = ({ active, over, delta, activatorEvent }: DragEndEvent) => {
    letGo();
    const from = indexOf(active.id);
    const to = over === null ? -1 : indexOf(over.id);
    if (from !== -1 && to !== -1 && from !== to) {
      onMove(from, to);
    } else if (
      onHold !== undefined &&
      activatorEvent.type.startsWith("touch") &&
      Math.hypot(delta.x, delta.y) <= HELD_IN_PLACE_PX
    ) {
      onHold(String(active.id));
    }
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[VERTICAL]}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: t("sort.instructions") },
      }}
      onDragStart={() => {
        letGo();
        release.current = holdGestures();
      }}
      onDragEnd={end}
      onDragCancel={letGo}
    >
      <SortableContext items={keys} strategy={verticalListSortingStrategy}>
        <Box component="ul" id={id} sx={[LIST, ...(Array.isArray(sx) ? sx : [sx])]}>
          {items.map((item) => (
            <SortableRow
              key={item.key}
              item={item}
              byLongPress={byLongPress}
              handleLabel={t("sort.handle", { name: item.name })}
              renderItem={renderItem}
            />
          ))}
        </Box>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  item,
  byLongPress,
  handleLabel,
  renderItem,
}: {
  item: SortableItem;
  byLongPress: boolean;
  handleLabel: string;
  renderItem: SortableListProps["renderItem"];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.key });
  const lifted = isDragging
    ? {
        position: "relative",
        zIndex: 1,
        bgcolor: "background.paper",
        boxShadow: 4,
        borderRadius: 1,
      }
    : {};
  const handle = byLongPress ? null : (
    <Box
      component="span"
      ref={setActivatorNodeRef}
      className="drag-handle"
      data-key={item.key}
      {...attributes}
      {...listeners}
      aria-label={handleLabel}
      title={handleLabel}
      sx={HANDLE}
    >
      <DragHandleIcon />
    </Box>
  );
  return (
    <Box
      component="li"
      ref={setNodeRef}
      data-key={item.key}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...(byLongPress ? { ...attributes, ...listeners } : {})}
      onContextMenu={byLongPress ? (event) => event.preventDefault() : undefined}
      sx={{ ...lifted, ...(byLongPress ? HELD_BY_A_FINGER : {}) }}
    >
      {renderItem(item.key, handle)}
    </Box>
  );
}
