import type { Translator } from "@abth/i18n";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import type { SystemCamera } from "../platform";
import { stopStream } from "../platform/system-camera";
import { type Gift, scannedCodeOf } from "../shared/gifts/gift-code";
import type { FolderState, WriteOutcomeView } from "../shared/session-port";
import type { ShownDifficulty } from "../shared/song-catalogue/shown-difficulty";
import type { SongLook } from "../shared/song-catalogue/song-look";
import { type Noticed, noticeOf } from "../shared/writes/write-ending";
import type { ModalLook } from "../ui/large-modal";
import { OperationSnackbar } from "../ui/operation-snackbar";
import { WriteOutcomeSnackbar } from "../ui/write-outcome";
import { GiftDialog } from "./gift-dialog";
import { qrTextOfPicture } from "./picture-code";
import { type CameraState, ScanWindow } from "./scan-window";

interface Offer {
  readonly gift: Gift;
  readonly open: boolean;
  readonly syncing: boolean;
}

/** How accepting a gift ended: songs the player's Hiroba does not offer, or the folder's write. */
export type GiftAccepted =
  | { readonly kind: "notOffered"; readonly songs: readonly string[] }
  | { readonly kind: "written"; readonly outcome: WriteOutcomeView<FolderState> | null };

type NoteOutcome = "accepted" | "notOffered" | "noCode" | "unknown" | "failed";

/** What the window's foot says as a scan or a gift ends; each one its own, by `key`. */
type Said = { readonly key: number } & (
  | {
      readonly kind: "note";
      readonly outcome: NoteOutcome;
      readonly message: string;
      readonly open: boolean;
    }
  | { readonly kind: "write"; readonly outcome: Noticed<FolderState> }
);

export interface ScanFlowProps {
  /** The scan button was pressed: until `onScanned`, a picture or the camera's view is read. */
  readonly scanning: boolean;
  /** A phone's camera; none on a computer, where the system's picture chooser opens at once. */
  readonly camera: SystemCamera | null;
  readonly look: (songNo: string) => SongLook;
  /** The difficulty whose level the songs show in front of the others. */
  readonly shownDifficulty: ShownDifficulty;
  readonly touchFirst: boolean;
  readonly modalLook: ModalLook;
  readonly i18n: Translator;
  /** Puts a gift's songs in Hiroba's folder, unless the player's Hiroba does not offer one. */
  readonly accept: (gift: Gift) => Promise<GiftAccepted>;
  readonly onScanned: () => void;
}

/** A scan: a picture or the camera read, a gift offered and accepted, anything else said. */
export function ScanFlow({
  scanning,
  camera,
  look,
  shownDifficulty,
  touchFirst,
  modalLook,
  i18n,
  accept,
  onScanned,
}: ScanFlowProps) {
  const { t, locale } = i18n;
  const input = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<CameraState>({ kind: "starting" });
  const [note, setNote] = useState<string | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [said, setSaid] = useState<Said | null>(null);
  const scanned = useEffectEvent(onScanned);
  const inTheWindow = scanning && camera !== null;

  const say = (outcome: NoteOutcome, message: string) =>
    setSaid((now) => ({ key: (now?.key ?? 0) + 1, kind: "note", outcome, message, open: true }));
  const offered = (gift: Gift) => {
    setOffer({ gift, open: true, syncing: false });
    onScanned();
  };
  const readInTheWindow = (text: string | null) => {
    const code = text === null ? null : scannedCodeOf(text);
    if (code?.kind === "gift") {
      offered(code.gift);
    } else {
      setNote(t(code === null ? "scan.noCode" : "scan.unknown"));
    }
  };
  const readThePicture = async (picture: File) => {
    const text = await qrTextOfPicture(picture);
    const code = text === null ? null : scannedCodeOf(text);
    if (code?.kind === "gift") {
      offered(code.gift);
      return;
    }
    say(code === null ? "noCode" : "unknown", t(code === null ? "scan.noCode" : "scan.unknown"));
    onScanned();
  };
  const acceptOffered = (gift: Gift) => {
    setOffer((now) => (now?.gift === gift ? { ...now, syncing: true } : now));
    void accept(gift)
      .catch((): GiftAccepted => ({ kind: "written", outcome: null }))
      .then((accepted) => {
        const outcome = accepted.kind === "written" ? accepted.outcome : null;
        const noticed = outcome === null ? null : noticeOf(outcome);
        const taken = outcome !== null && noticed === null;
        // A song the player's Hiroba does not offer keeps the gift out however often it is tried.
        const ended = taken || accepted.kind === "notOffered";
        setOffer((now) =>
          now?.gift === gift ? { ...now, syncing: false, open: now.open && !ended } : now,
        );
        if (accepted.kind === "notOffered") {
          const names = accepted.songs.map((songNo) => look(songNo).name);
          const songs = new Intl.ListFormat(locale, { type: "conjunction" }).format(names);
          say(
            "notOffered",
            gift.shown ? t("gift.notOffered", { songs }) : t("gift.notOfferedMystery"),
          );
        } else if (taken) {
          say("accepted", t("gift.accepted"));
        } else if (noticed === null) {
          say("failed", t("write.failed"));
        } else {
          setSaid((now) => ({ key: (now?.key ?? 0) + 1, kind: "write", outcome: noticed }));
        }
      });
  };

  // A computer has no camera: its scan is the system's picture chooser, a cancel ending it.
  useEffect(() => {
    const chooser = input.current;
    if (!scanning || camera !== null || chooser === null) {
      return;
    }

    const cancelled = () => scanned();
    chooser.addEventListener("cancel", cancelled);
    chooser.click();
    return () => chooser.removeEventListener("cancel", cancelled);
  }, [scanning, camera]);

  // The camera runs while the window is open, and stops as it shuts.
  useEffect(() => {
    if (!inTheWindow || camera === null) {
      return;
    }

    let gone = false;
    let stream: MediaStream | null = null;
    setView({ kind: "starting" });
    setNote(null);
    void camera.open().then((opened) => {
      stream = opened;
      if (gone) {
        stopStream(opened);
      } else {
        setView(opened === null ? { kind: "off" } : { kind: "on", stream: opened });
      }
    });
    return () => {
      gone = true;
      stopStream(stream);
    };
  }, [inTheWindow, camera]);

  return (
    <>
      {camera === null ? (
        <input
          ref={input}
          id="scan-picture"
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            const [picture] = event.currentTarget.files ?? [];
            event.currentTarget.value = "";
            if (picture === undefined) {
              onScanned();
            } else {
              void readThePicture(picture);
            }
          }}
        />
      ) : (
        <ScanWindow
          open={inTheWindow}
          camera={view}
          note={note}
          touchFirst={touchFirst}
          modalLook={modalLook}
          i18n={i18n}
          onText={readInTheWindow}
          onFocusAt={(point) => {
            if (view.kind === "on") {
              void camera.focusAt(view.stream, point);
            }
          }}
          onPicture={(picture) => void qrTextOfPicture(picture).then(readInTheWindow)}
          onClose={onScanned}
        />
      )}
      <GiftDialog
        gift={offer?.gift ?? null}
        open={offer?.open === true}
        syncing={offer?.syncing === true}
        look={look}
        shownDifficulty={shownDifficulty}
        i18n={i18n}
        onAccept={acceptOffered}
        onClose={() => setOffer((now) => (now === null ? null : { ...now, open: false }))}
      />
      {said?.kind === "write" && (
        <WriteOutcomeSnackbar
          key={said.key}
          id="scan-outcome"
          kind="folder"
          outcome={said.outcome}
          i18n={i18n}
          onClosed={() => setSaid(null)}
        />
      )}
      {said?.kind === "note" && (
        <OperationSnackbar
          key={said.key}
          id="scan-outcome"
          open={said.open}
          outcome={said.outcome}
          message={said.message}
          onClose={() => setSaid({ ...said, open: false })}
          onExited={() => setSaid(null)}
        />
      )}
    </>
  );
}
