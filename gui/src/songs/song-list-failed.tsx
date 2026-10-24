import type { Translator } from "@abth/i18n";
import type { SongCatalogue } from "../shared/song-catalogue/use-song-catalogue";
import { ReadFailureAlert } from "../ui/read-failure-alert";

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
