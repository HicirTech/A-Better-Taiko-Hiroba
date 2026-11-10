import type { MessageKey, Translator } from "@abth/i18n";
import { Box, CircularProgress, IconButton, Menu, MenuItem, Portal } from "@mui/material";
import { type ReactNode, useEffect, useEffectEvent, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { PictureLane } from "../pictures/picture-lane";
import type { PictureWay, SystemShare } from "../platform";
import { ShareIcon } from "../ui/icons";
import { OperationSnackbar } from "../ui/operation-snackbar";
import { useOperationNote } from "../ui/use-operation-note";
import { canvasWritesWebp, pictureOf } from "./draw-snapshot";
import { snapshotLane } from "./snapshot-lane";
import { pictureTypeFor, snapshotName } from "./snapshot-picture";

/** How long a snapshot waits for its pictures before it is taken with those that came. */
const PICTURES_WAIT_MS = 10_000;
// Where no one sees it, at its own size: the picture is made from it, then it goes.
const OFF_THE_WINDOW = {
  position: "fixed",
  top: 0,
  left: -100_000,
  pointerEvents: "none",
} as const;

const WAY_LABEL = {
  share: "snapshot.share",
  copy: "snapshot.copy",
  save: "snapshot.save",
} as const satisfies Record<PictureWay, MessageKey>;
/** What the foot of the window says once a way is done; a share sheet says it for itself. */
const DONE: Readonly<Record<PictureWay, MessageKey | null>> = {
  share: null,
  copy: "snapshot.copied",
  save: "snapshot.saved",
};

interface Said {
  /** How it ended, for the checks that read it: the way done, or `failed`. */
  readonly outcome: PictureWay | "failed";
  readonly message: MessageKey;
}

export interface SnapshotButtonProps {
  /** The button's; its menu, each way in it and the note at the foot take it before theirs. */
  readonly id: string;
  /** What the picture shows, its file's name before the day: `abth-rating`. */
  readonly shows: string;
  readonly share: SystemShare;
  readonly lane: PictureLane;
  readonly i18n: Translator;
  /** The page as a picture, its pictures asked for through `lane`. */
  readonly snapshot: (lane: PictureLane) => ReactNode;
  /** Shut while there is nothing to make a picture of, such as a gift with no songs. */
  readonly disabled?: boolean;
}

/** A page made a picture to share: by the system's share sheet, or a menu of the ways out. */
export function SnapshotButton({
  id,
  shows,
  share,
  lane,
  i18n,
  snapshot,
  disabled = false,
}: SnapshotButtonProps) {
  const { t } = i18n;
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [taking, setTaking] = useState<PictureWay | null>(null);
  const [handing, setHanding] = useState(false);
  const note = useOperationNote<Said>();
  const busy = taking !== null || handing;
  const [only] = share.ways.length === 1 ? share.ways : [];
  const failed: Said = { outcome: "failed", message: "snapshot.failed" };

  const hand = (way: PictureWay, picture: Uint8Array | null) => {
    setTaking(null);
    if (picture === null) {
      note.say(failed);
      return;
    }
    setHanding(true);
    share
      .hand(way, picture, snapshotName(shows, new Date(), pictureTypeFor(way, canvasWritesWebp())))
      .then((ended) => {
        const done = DONE[way];
        if (ended === "done" && done !== null) {
          note.say({ outcome: way, message: done });
        } else {
          note.clear();
        }
      })
      .catch(() => note.say(failed))
      .finally(() => setHanding(false));
  };

  return (
    <>
      <IconButton
        id={id}
        aria-label={t(busy ? "snapshot.making" : "snapshot.button")}
        title={t("snapshot.button")}
        aria-haspopup={only === undefined ? "menu" : undefined}
        aria-controls={menu === null ? undefined : `${id}-menu`}
        aria-expanded={menu === null ? undefined : true}
        disabled={busy || disabled}
        onClick={(event) => (only === undefined ? setMenu(event.currentTarget) : setTaking(only))}
      >
        {busy ? <CircularProgress size={20} /> : <ShareIcon />}
      </IconButton>
      <Menu id={`${id}-menu`} anchorEl={menu} open={menu !== null} onClose={() => setMenu(null)}>
        {share.ways.map((way) => (
          <MenuItem
            key={way}
            id={`${id}-${way}`}
            onClick={() => {
              setMenu(null);
              setTaking(way);
            }}
          >
            {t(WAY_LABEL[way])}
          </MenuItem>
        ))}
      </Menu>
      {taking !== null && (
        <SnapshotTaker
          way={taking}
          lane={lane}
          snapshot={snapshot}
          onTaken={(picture) => hand(taking, picture)}
        />
      )}
      {note.said !== null && (
        // At the window's foot as a write's outcome is, wherever the button stands: a band moves
        // what it holds, a fixed note too.
        <Portal>
          <OperationSnackbar
            id={`${id}-outcome`}
            {...note.snackbar}
            outcome={note.said.outcome}
            message={t(note.said.message)}
          />
        </Portal>
      )}
    </>
  );
}

/** The snapshot drawn off the window, its pictures asked for at once, taken once they are in. */
function SnapshotTaker({
  way,
  lane,
  snapshot,
  onTaken,
}: {
  /** Where the picture goes, which sets the format it is encoded in. */
  readonly way: PictureWay;
  readonly lane: PictureLane;
  readonly snapshot: (lane: PictureLane) => ReactNode;
  /** The picture's bytes, or null where it could not be made. */
  readonly onTaken: (picture: Uint8Array | null) => void;
}) {
  const [drawnOff] = useState(() => snapshotLane(lane));
  const box = useRef<HTMLDivElement>(null);
  const taken = useEffectEvent(onTaken);
  useEffect(() => {
    let gone = false;
    // The snapshot's own effects ran first: every picture it shows is asked for by now.
    drawnOff
      .allCome(PICTURES_WAIT_MS)
      .then(drawn)
      .then(() => {
        const node = box.current?.firstElementChild;
        return gone || !(node instanceof HTMLElement)
          ? null
          : pictureOf(node, pictureTypeFor(way, canvasWritesWebp()));
      })
      .then(
        (picture) => {
          if (!gone) {
            taken(picture);
          }
        },
        () => {
          if (!gone) {
            taken(null);
          }
        },
      );
    return () => {
      gone = true;
    };
  }, [drawnOff, way]);
  return createPortal(
    <Box ref={box} aria-hidden sx={OFF_THE_WINDOW}>
      {snapshot(drawnOff.lane)}
    </Box>,
    document.body,
  );
}

/** Settles once the browser has drawn what React put in place last. */
const drawn = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
