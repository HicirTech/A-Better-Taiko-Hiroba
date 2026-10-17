import type { Translator } from "@abth/i18n";

import { SimpleDialog } from "../ui/simple-dialog";

/** Asks before a read of every score, which takes minutes: how many charts, and a way out. */
export function ReadEveryDialog({
  open,
  charts,
  i18n,
  onAnswer,
}: {
  readonly open: boolean;
  /** The played charts the read takes again. */
  readonly charts: number;
  readonly i18n: Translator;
  readonly onAnswer: (confirmed: boolean) => void;
}) {
  const { t, number } = i18n;
  return (
    <SimpleDialog
      id="scores-read-every"
      open={open}
      title={t("scores.readEvery.title")}
      message={t("scores.readEvery.body", { count: number(charts) })}
      cancel={{ id: "scores-read-every-cancel", label: t("scores.readEvery.cancel") }}
      actions={[
        {
          id: "scores-read-every-confirm",
          label: t("scores.readEvery.confirm"),
          onClick: () => onAnswer(true),
        },
      ]}
      onClose={() => onAnswer(false)}
    />
  );
}
