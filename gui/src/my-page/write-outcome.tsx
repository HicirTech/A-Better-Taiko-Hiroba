import type { Translator } from "@abth/i18n";
import { useState } from "react";

import { HIROBA_LANG } from "../language/show-language";
import type { WriteKind, WriteSets } from "../session-port";
import { OperationSnackbar } from "../ui/operation-snackbar";
import { type OutcomeWords, outcomeWords } from "./outcome-words";
import type { Noticed } from "./write-ending";

/** How a write ended, said at the window's foot; `onClosed` lets the page drop the notice. */
export function WriteOutcomeSnackbar<K extends WriteKind>({
  outcome,
  kind,
  i18n,
  onClosed,
  id = "write-outcome",
}: {
  readonly outcome: Noticed<WriteSets[K]>;
  readonly kind: K;
  readonly i18n: Translator;
  readonly onClosed: () => void;
  readonly id?: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <OperationSnackbar
      id={id}
      open={open}
      outcome={outcome.kind}
      message={<Sentence words={outcomeWords(kind, outcome)} i18n={i18n} />}
      onClose={() => setOpen(false)}
      onExited={onClosed}
    />
  );
}

function Sentence({ words, i18n: { t } }: { words: OutcomeWords; i18n: Translator }) {
  if (words.said === "readBack") {
    return t("write.readBack");
  }
  if (words.hirobas === null) {
    return t("write.failed");
  }
  // A placeholder given no value stays as written, so it splits the sentence around the words.
  const [lead, tail] = t("write.failedBecause").split("{words}");
  return (
    <>
      {lead}
      <span lang={HIROBA_LANG}>{words.hirobas}</span>
      {tail}
    </>
  );
}
