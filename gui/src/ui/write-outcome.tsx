import { HIROBA_LANG } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { useState } from "react";

import type { WriteKind, WriteSets } from "../shared/session-port";
import { type OutcomeWords, outcomeWords } from "../shared/writes/outcome-words";
import type { Noticed } from "../shared/writes/write-ending";
import { OperationSnackbar } from "./operation-snackbar";

// Stands where Hiroba's words go, so the sentence can be split there; no message holds it.
const WORDS_MARK = "\u0000";

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
  const [lead, tail] = t("write.failedBecause", { words: WORDS_MARK }).split(WORDS_MARK);
  return (
    <>
      {lead}
      <span lang={HIROBA_LANG}>{words.hirobas}</span>
      {tail}
    </>
  );
}
