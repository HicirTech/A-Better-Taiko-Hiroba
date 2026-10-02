import type { MessageKey, Translator } from "@abth/i18n";
import {
  Alert,
  type AlertColor,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import { HIROBA_LANG } from "../language/show-language";
import { FAILURE_MESSAGE } from "../read-failure-message";
import type { CostumeSet, WriteOutcomeView } from "../session-port";
import { changedParts, isCostumePart, PART_LABEL, partValue } from "./costume-parts";

type NotAppliedReasonKind = Extract<WriteOutcomeView, { kind: "notApplied" }>["reason"]["kind"];

/** Each way a write can end, worded: a new kind nobody worded is a type error. */
const OUTCOME_MESSAGE = {
  maintenance: "write.maintenance",
  readFailed: "failure.unexpectedPage",
  sessionGone: "write.sessionGone",
  changedSincePreview: "write.changedSincePreview",
  invalidTarget: "write.invalidTarget",
  nothingToChange: "write.nothingToChange",
  undoNotSaved: "write.undoNotSaved",
  needsConfirmation: "write.needsConfirmation",
  stoppedBeforeWrite: "write.stoppedBeforeWrite",
  applied: "write.applied",
  appliedNotSynced: "write.appliedNotSynced",
  notApplied: "write.notApplied.unchanged",
  diverged: "write.diverged",
  outcomeUnknown: "write.outcomeUnknown",
  notSignedIn: "failure.notSignedIn",
  nothingToUndo: "write.nothingToUndo",
  interrupted: "write.interrupted",
  busy: "write.busy",
} as const satisfies Record<WriteOutcomeView["kind"], MessageKey>;

/** Each reason a save left the set as it was, worded. */
const REASON_MESSAGE = {
  unchanged: "write.notApplied.unchanged",
  refused: "write.notApplied.refused",
  stale: "write.notApplied.stale",
  siteMaintenance: "write.notApplied.siteMaintenance",
  failed: "write.notApplied.failed",
  noAnswer: "write.notApplied.noAnswer",
  rejected: "write.notApplied.rejected",
  endedAtLogin: "write.notApplied.endedAtLogin",
  endpointMissing: "write.notApplied.endpointMissing",
  unexpected: "write.notApplied.unexpected",
} as const satisfies Record<NotAppliedReasonKind, MessageKey>;

interface Described {
  readonly severity: AlertColor;
  readonly message: string;
  /** More sentences: Hiroba's own words, a code it answered with, the cross-check. */
  readonly notes: readonly string[];
  /** Report codes, shown to copy. Never page text. */
  readonly codes: readonly string[];
  readonly comparison: {
    readonly before: CostumeSet;
    readonly planned: CostumeSet;
    readonly now: CostumeSet | null;
  } | null;
}

/** How a write ended, in words: what happened first, then Hiroba's own words and the codes. */
export function describeOutcome(
  outcome: WriteOutcomeView,
  i18n: Translator,
  asUndo = false,
): Described {
  const { t } = i18n;
  const plain = (severity: AlertColor, key: MessageKey = OUTCOME_MESSAGE[outcome.kind]) => ({
    severity,
    message: t(key),
    notes: [] as string[],
    codes: [] as string[],
    comparison: null,
  });
  switch (outcome.kind) {
    case "applied": {
      const notes =
        outcome.save.code !== null && outcome.save.code !== 0
          ? [t("write.siteNote", { code: outcome.save.code })]
          : [];
      return outcome.cross === "unknown"
        ? { ...plain("warning", "write.crossUnknown"), notes }
        : { ...plain("success", asUndo ? "write.undone" : "write.applied"), notes };
    }
    case "appliedNotSynced":
      return plain("warning");
    case "notApplied": {
      const { reason, save } = outcome;
      const message =
        reason.kind === "refused"
          ? t(REASON_MESSAGE.refused, { code: reason.code })
          : t(REASON_MESSAGE[reason.kind]);
      return {
        severity: "warning",
        message,
        notes:
          reason.kind === "refused" && reason.message !== null
            ? [t("write.siteMessage", { message: reason.message })]
            : [],
        codes: save.answer === "json" ? [] : [save.report],
        comparison: null,
      };
    }
    case "diverged":
      return {
        ...plain("warning"),
        notes: outcome.cross === "changed" ? [t("write.crossChanged")] : [],
        comparison: { before: outcome.before, planned: outcome.expectedAfter, now: outcome.after },
      };
    case "outcomeUnknown":
      return {
        ...plain("warning"),
        notes: [t(FAILURE_MESSAGE[outcome.failure.kind])],
        codes: outcome.failure.detail === undefined ? [] : [outcome.failure.detail],
        comparison: { before: outcome.before, planned: outcome.expectedAfter, now: null },
      };
    case "sessionGone":
      return outcome.writeMayHaveHappened
        ? {
            ...plain("warning", "write.sessionGoneAfterSave"),
            comparison: { before: outcome.before, planned: outcome.expectedAfter, now: null },
          }
        : plain("info");
    case "readFailed":
      return {
        ...plain("error", FAILURE_MESSAGE[outcome.failure.kind]),
        codes: outcome.failure.detail === undefined ? [] : [outcome.failure.detail],
      };
    case "invalidTarget":
      return {
        ...plain("error"),
        message: t("write.invalidTarget", {
          field: isCostumePart(outcome.field) ? t(PART_LABEL[outcome.field]) : outcome.field,
        }),
      };
    case "stoppedBeforeWrite":
      return { ...plain("warning"), codes: [`${outcome.reason} ${outcome.code}`] };
    case "changedSincePreview":
      return plain("warning", asUndo ? "write.undoStale" : "write.changedSincePreview");
    case "needsConfirmation":
    case "interrupted":
      return plain("warning");
    case "undoNotSaved":
      return plain("error");
    case "maintenance":
    case "nothingToChange":
    case "notSignedIn":
    case "nothingToUndo":
    case "busy":
      return plain("info");
  }
}

/**
 * A write's ending, as an Alert: the sentence, then Hiroba's own words as plain text, report codes
 * to copy, and, when the set did not end as planned, the values before, planned and now.
 */
export function WriteOutcomeNotice({
  outcome,
  i18n,
  asUndo = false,
}: {
  outcome: WriteOutcomeView;
  i18n: Translator;
  asUndo?: boolean;
}) {
  const { t } = i18n;
  const { severity, message, notes, codes, comparison } = describeOutcome(outcome, i18n, asUndo);
  const parts =
    comparison === null
      ? []
      : changedParts(comparison.before, comparison.planned).concat(
          comparison.now === null
            ? []
            : changedParts(comparison.planned, comparison.now).filter(
                (part) => comparison.before[part] === comparison.planned[part],
              ),
        );
  return (
    <Alert id="write-outcome" severity={severity} data-outcome={outcome.kind}>
      <Typography variant="body2">{message}</Typography>
      {notes.map((note) => (
        <Typography key={note} variant="body2" sx={{ mt: 0.5 }}>
          {note}
        </Typography>
      ))}
      {codes.map((code) => (
        <Typography
          key={code}
          variant="body2"
          sx={{ mt: 0.5, fontFamily: "monospace", userSelect: "text", wordBreak: "break-all" }}
        >
          {t("write.code", { code })}
        </Typography>
      ))}
      {comparison !== null && parts.length > 0 && (
        <Table id="write-comparison" size="small" sx={{ mt: 1 }}>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>{t("write.before")}</TableCell>
              <TableCell>{t("write.planned")}</TableCell>
              {comparison.now !== null && <TableCell>{t("write.now")}</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {parts.map((part) => (
              <TableRow key={part}>
                <TableCell lang={HIROBA_LANG}>{t(PART_LABEL[part])}</TableCell>
                <TableCell>{partValue(part, comparison.before[part], i18n)}</TableCell>
                <TableCell>{partValue(part, comparison.planned[part], i18n)}</TableCell>
                {comparison.now !== null && (
                  <TableCell>{partValue(part, comparison.now[part], i18n)}</TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Alert>
  );
}
