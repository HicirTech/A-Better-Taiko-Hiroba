import type { Translator } from "@abth/i18n";

import { SimpleDialog } from "../ui/simple-dialog";
import { notesFor } from "./update-feed";
import type { UpdateOffer } from "./use-update-reminder";

export interface UpdateDialogProps {
  readonly offer: UpdateOffer | null;
  readonly i18n: Translator;
  readonly onDownload: (version: string) => void;
  readonly onLater: () => void;
}

/** What is new in the latest release, with Download and Later. */
export function UpdateDialog({ offer, i18n, onDownload, onLater }: UpdateDialogProps) {
  const { t } = i18n;
  if (offer === null) {
    return null;
  }
  const { feed } = offer;
  return (
    <SimpleDialog
      id="update-dialog"
      open={offer.open}
      title={`${t("app.title")} ${feed.version}`}
      message={notesFor(feed, i18n.locale)}
      cancel={{ id: "update-later", label: t("update.later") }}
      actions={[
        {
          id: "update-download",
          label: t("update.download"),
          onClick: () => onDownload(feed.version),
        },
      ]}
      onClose={onLater}
    />
  );
}
