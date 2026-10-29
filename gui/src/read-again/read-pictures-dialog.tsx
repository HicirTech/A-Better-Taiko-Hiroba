import type { Translator } from "@abth/i18n";

import { SimpleDialog } from "../ui/simple-dialog";

/** Asks before a page's pictures are read again from Hiroba, in place of the ones kept. */
export function ReadPicturesDialog({
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
      id="read-pictures"
      open={open}
      title={t("pictures.readAgain.title")}
      message={t("pictures.readAgain.body")}
      cancel={{ id: "read-pictures-cancel", label: t("pictures.readAgain.cancel") }}
      actions={[
        {
          id: "read-pictures-confirm",
          label: t("pictures.readAgain.confirm"),
          onClick: () => onAnswer(true),
        },
      ]}
      onClose={() => onAnswer(false)}
    />
  );
}
