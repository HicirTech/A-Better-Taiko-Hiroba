import type { Translator } from "@abth/i18n";

import { ReadFailureAlert } from "../ui/read-failure-alert";
import type { SongCatalogue } from "./use-song-catalogue";

/** taiko.wiki's song list could not be read and none is kept: why, in the list's place. */
export function SongListFailed({
  id,
  catalogue,
  i18n,
}: {
  /** The id's start: `<id>-failed`. */
  readonly id: string;
  readonly catalogue: SongCatalogue;
  readonly i18n: Translator;
}) {
  return (
    <ReadFailureAlert
      id={`${id}-failed`}
      message={i18n.t("picker.failed")}
      code={catalogue.failure}
      i18n={i18n}
    />
  );
}
