import type { Translator } from "@abth/i18n";

import type { SystemLink } from "../platform";
import { releaseUrl } from "../shared/updates";
import type { UpdateReminder } from "../shared/updates/use-update-reminder";
import { UpdateDialog } from "../updates/update-dialog";

/** The update reminder's question: a download opens the new version's release page. */
export function UpdateReminderDialog({
  updates,
  link,
  i18n,
}: {
  readonly updates: UpdateReminder;
  readonly link: SystemLink;
  readonly i18n: Translator;
}) {
  return (
    <UpdateDialog
      offer={updates.offer}
      i18n={i18n}
      onDownload={(version) => {
        link.open(releaseUrl(version));
        updates.later();
      }}
      onLater={updates.later}
    />
  );
}
