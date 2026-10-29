import type { Translator } from "@abth/i18n";
import { useState, useSyncExternalStore } from "react";

import type { PictureLane, ReadAgainEnded } from "../pictures/picture-lane";
import { OperationSnackbar } from "../ui/operation-snackbar";

/** Says at the window's foot how each read again of a page's pictures ended. */
export function PicturesReadNote({
  lane,
  i18n,
}: {
  readonly lane: PictureLane;
  readonly i18n: Translator;
}) {
  const { t } = i18n;
  useSyncExternalStore(lane.subscribe, lane.version);
  const ended = lane.readAgainEnded();
  const [heard, setHeard] = useState<ReadAgainEnded | null>(ended);
  const [said, setSaid] = useState<{
    readonly ended: ReadAgainEnded;
    readonly open: boolean;
  } | null>(null);
  if (ended !== heard) {
    setHeard(ended);
    if (ended !== null) {
      setSaid({ ended, open: true });
    }
  }
  if (said === null) {
    return null;
  }

  return (
    <OperationSnackbar
      id="pictures-read-again"
      open={said.open}
      outcome={said.ended.failed ? "failed" : "read"}
      message={t(said.ended.failed ? "pictures.readAgain.failed" : "pictures.readAgain.done")}
      onClose={() => setSaid({ ...said, open: false })}
      onExited={() => setSaid(null)}
    />
  );
}
