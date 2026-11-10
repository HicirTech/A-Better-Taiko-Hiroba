import type { Translator } from "@abth/i18n";
import { useSyncExternalStore } from "react";

import type { PictureLane } from "../pictures/picture-lane";
import { OperationSnackbar } from "../ui/operation-snackbar";
import { useOperationNote } from "../ui/use-operation-note";

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
  const note = useOperationNote(lane.readAgainEnded());
  if (note.said === null) {
    return null;
  }

  return (
    <OperationSnackbar
      id="pictures-read-again"
      {...note.snackbar}
      outcome={note.said.failed ? "failed" : "read"}
      message={t(note.said.failed ? "pictures.readAgain.failed" : "pictures.readAgain.done")}
    />
  );
}
