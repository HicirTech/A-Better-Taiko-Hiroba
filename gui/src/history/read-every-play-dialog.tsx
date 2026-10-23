import type { Translator } from "@abth/i18n";

import { SimpleDialog } from "../ui/simple-dialog";

/** Asks before a walk of every recent play, first page to last, which takes minutes. */
export function ReadEveryPlayDialog({
  open,
  i18n,
  onAnswer,
}: {
  readonly open: boolean;
  readonly i18n: Translator;
  readonly onAnswer: (confirmed: boolean) => void;
}) {
  const { t } = i18n;
  return (
    <SimpleDialog
      id="history-read-every"
      open={open}
      title={t("history.readEvery.title")}
      message={t("history.readEvery.body")}
      cancel={{ id: "history-read-every-cancel", label: t("history.readEvery.cancel") }}
      actions={[
        {
          id: "history-read-every-confirm",
          label: t("history.readEvery.confirm"),
          onClick: () => onAnswer(true),
        },
      ]}
      onClose={() => onAnswer(false)}
    />
  );
}
