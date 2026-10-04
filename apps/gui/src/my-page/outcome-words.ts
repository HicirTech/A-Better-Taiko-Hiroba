import { NAME_FIELDS, TITLE_FIELDS } from "@abth/core";
import type { MessageKey, Translator } from "@abth/i18n";
import type { AlertColor } from "@mui/material";

import { FAILURE_MESSAGE } from "../read-failure-message";
import type { WriteKind, WriteOutcomeView, WriteSets } from "../session-port";
import { changedParts, isCostumePart, PART_LABEL, partValue } from "./costume-parts";
import type { Noticed } from "./write-ending";

type NotAppliedReasonKind = Extract<WriteOutcomeView, { kind: "notApplied" }>["reason"]["kind"];

// A sentence a write can end with: KIND_WORDING words it for a kind, else BASE_WORDING says it.
type Base =
  | "unchanged"
  | "diverged"
  | "crossChanged"
  | "changedSincePreview"
  | "nothingToChange"
  | "needsConfirmation";

const BASE_WORDING = {
  unchanged: "write.notApplied.unchanged",
  diverged: "write.diverged",
  crossChanged: "write.crossChanged",
  changedSincePreview: "write.changedSincePreview",
  nothingToChange: "write.nothingToChange",
  needsConfirmation: "write.needsConfirmation",
} as const satisfies Record<Base, MessageKey>;

// Costume is the base, so its entry is empty; a rename has no pre-check, so nothing to confirm.
const KIND_WORDING: Readonly<Record<WriteKind, Readonly<Partial<Record<Base, MessageKey>>>>> = {
  costume: {},
  title: {
    unchanged: "write.title.unchanged",
    diverged: "write.title.diverged",
    crossChanged: "write.title.crossChanged",
    changedSincePreview: "write.title.changedSincePreview",
    nothingToChange: "write.title.nothingToChange",
    needsConfirmation: "write.title.needsConfirmation",
  },
  name: {
    unchanged: "write.name.unchanged",
    diverged: "write.name.diverged",
    changedSincePreview: "write.name.changedSincePreview",
    nothingToChange: "write.name.nothingToChange",
  },
};

const wording = (kind: WriteKind, base: Base): MessageKey =>
  KIND_WORDING[kind][base] ?? BASE_WORDING[base];

const OUTCOME_BASE = {
  notApplied: "unchanged",
  diverged: "diverged",
  changedSincePreview: "changedSincePreview",
  nothingToChange: "nothingToChange",
  needsConfirmation: "needsConfirmation",
} as const satisfies Partial<Record<Noticed<unknown>["kind"], Base>>;

type KindDependent = keyof typeof OUTCOME_BASE;

const isKindDependent = (outcome: Noticed<unknown>["kind"]): outcome is KindDependent =>
  Object.hasOwn(OUTCOME_BASE, outcome);

const OUTCOME_MESSAGE = {
  maintenance: "write.maintenance",
  readFailed: "failure.unexpectedPage",
  sessionGone: "write.sessionGone",
  invalidTarget: "write.invalidTarget",
  stoppedBeforeWrite: "write.stoppedBeforeWrite",
  appliedNotSynced: "write.appliedNotSynced",
  outcomeUnknown: "write.outcomeUnknown",
  notSignedIn: "failure.notSignedIn",
  interrupted: "write.interrupted",
  busy: "write.busy",
} as const satisfies Record<Exclude<Noticed<unknown>["kind"], KindDependent>, MessageKey>;

const REASON_MESSAGE = {
  refused: "write.notApplied.refused",
  stale: "write.notApplied.stale",
  siteMaintenance: "write.notApplied.siteMaintenance",
  failed: "write.notApplied.failed",
  noAnswer: "write.notApplied.noAnswer",
  rejected: "write.notApplied.rejected",
  endedAtLogin: "write.notApplied.endedAtLogin",
  endpointMissing: "write.notApplied.endpointMissing",
  unexpected: "write.notApplied.unexpected",
} as const satisfies Record<Exclude<NotAppliedReasonKind, "unchanged">, MessageKey>;

// The app's gloss on refusal codes Hiroba gives no message for; its own words, when any, follow.
const REFUSED_GLOSS: Readonly<Record<WriteKind, Readonly<Partial<Record<number, MessageKey>>>>> = {
  costume: {},
  title: { 1: "write.title.refused1", 5: "write.title.refused5", 6: "write.title.refused6" },
  name: { 2: "write.name.refused2" },
};

type InvalidField =
  | (typeof TITLE_FIELDS)[keyof typeof TITLE_FIELDS]
  | (typeof NAME_FIELDS)[keyof typeof NAME_FIELDS];

const INVALID_FIELD_MESSAGE = {
  [TITLE_FIELDS.notOwned]: "write.invalid.titleNotOwned",
  [TITLE_FIELDS.unresolved]: "write.invalid.titleUnresolved",
  [TITLE_FIELDS.ambiguous]: "write.invalid.titleAmbiguous",
  [NAME_FIELDS.empty]: "write.invalid.nameEmpty",
  [NAME_FIELDS.edge]: "write.invalid.nameEdge",
  [NAME_FIELDS.tooLong]: "write.invalid.nameTooLong",
  [NAME_FIELDS.control]: "write.invalid.nameControl",
  [NAME_FIELDS.closed]: "write.invalid.nameClosed",
} as const satisfies Record<InvalidField, MessageKey>;

export function invalidFieldText(field: string, { t }: Translator): string {
  if (isCostumePart(field)) {
    return t(PART_LABEL[field]);
  }
  return Object.hasOwn(INVALID_FIELD_MESSAGE, field)
    ? t(INVALID_FIELD_MESSAGE[field as InvalidField])
    : field;
}

/** A comparison cell; `hirobas` marks Hiroba's own words, which are never translated. */
export interface Cell {
  readonly text: string;
  readonly hirobas?: true;
}

export interface ComparisonRow {
  readonly label: Cell;
  readonly before: Cell;
  readonly planned: Cell;
  readonly now: Cell | null;
}

type Rows<S> = (before: S, planned: S, now: S | null, i18n: Translator) => readonly ComparisonRow[];

// Each part the plan changed, and each the write changed that the plan did not mean to.
const costumeRows: Rows<WriteSets["costume"]> = (before, planned, now, i18n) => {
  const { t } = i18n;
  const parts = changedParts(before, planned).concat(
    now === null ? [] : changedParts(planned, now).filter((part) => before[part] === planned[part]),
  );
  const cell = (part: (typeof parts)[number], set: WriteSets["costume"]): Cell => ({
    text: partValue(part, set[part], i18n),
  });
  return parts.map((part) => ({
    label: { text: t(PART_LABEL[part]) },
    before: cell(part, before),
    planned: cell(part, planned),
    now: now === null ? null : cell(part, now),
  }));
};

const singleRow =
  <S>(label: MessageKey, textOf: (set: S, i18n: Translator) => Cell): Rows<S> =>
  (before, planned, now, i18n) => [
    {
      label: { text: i18n.t(label) },
      before: textOf(before, i18n),
      planned: textOf(planned, i18n),
      now: now === null ? null : textOf(now, i18n),
    },
  ];

const ROWS: { readonly [K in WriteKind]: Rows<WriteSets[K]> } = {
  costume: costumeRows,
  title: singleRow("title.heading", ({ title }, { t }) =>
    title === "" ? { text: t("profile.noTitle") } : { text: title, hirobas: true },
  ),
  name: singleRow("name.heading", ({ nickname }) => ({ text: nickname, hirobas: true })),
};

export interface Comparison {
  readonly rows: readonly ComparisonRow[];
  readonly withNow: boolean;
}

export interface Described {
  readonly severity: AlertColor;
  readonly message: string;
  readonly notes: readonly string[];
  /** Report codes, shown to copy; never page text. */
  readonly codes: readonly string[];
  readonly comparison: Comparison | null;
}

export interface DescribeOptions<K extends WriteKind> {
  readonly kind: K;
}

export function describeOutcome<K extends WriteKind>(
  outcome: Noticed<WriteSets[K]>,
  i18n: Translator,
  { kind }: DescribeOptions<K>,
): Described {
  const { t } = i18n;
  const plain = (
    severity: AlertColor,
    key: MessageKey = isKindDependent(outcome.kind)
      ? wording(kind, OUTCOME_BASE[outcome.kind])
      : OUTCOME_MESSAGE[outcome.kind],
  ) => ({
    severity,
    message: t(key),
    notes: [] as string[],
    codes: [] as string[],
    comparison: null,
  });
  const compared = (before: WriteSets[K], planned: WriteSets[K], now: WriteSets[K] | null) => ({
    rows: ROWS[kind](before, planned, now, i18n),
    withNow: now !== null,
  });
  switch (outcome.kind) {
    case "appliedNotSynced":
      return plain("warning");
    case "notApplied": {
      const { reason, save } = outcome;
      const gloss = reason.kind === "refused" ? REFUSED_GLOSS[kind][reason.code] : undefined;
      const message =
        reason.kind === "refused"
          ? t(REASON_MESSAGE.refused, { code: reason.code })
          : reason.kind === "unchanged"
            ? t(wording(kind, "unchanged"))
            : t(REASON_MESSAGE[reason.kind]);
      return {
        severity: "warning",
        message,
        notes: [
          ...(gloss === undefined ? [] : [t(gloss)]),
          ...(reason.kind === "refused" && reason.message !== null
            ? [t("write.siteMessage", { message: reason.message })]
            : []),
        ],
        codes: save.answer === "json" ? [] : [save.report],
        comparison: null,
      };
    }
    case "diverged":
      return {
        ...plain("warning"),
        notes: outcome.cross === "changed" ? [t(wording(kind, "crossChanged"))] : [],
        comparison: compared(outcome.before, outcome.expectedAfter, outcome.after),
      };
    case "outcomeUnknown":
      return {
        ...plain("warning"),
        notes: [t(FAILURE_MESSAGE[outcome.failure.kind])],
        codes: outcome.failure.detail === undefined ? [] : [outcome.failure.detail],
        comparison: compared(outcome.before, outcome.expectedAfter, null),
      };
    case "sessionGone":
      return outcome.writeMayHaveHappened
        ? {
            ...plain("warning", "write.sessionGoneAfterSave"),
            comparison: compared(outcome.before, outcome.expectedAfter, null),
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
        message: t("write.invalidTarget", { field: invalidFieldText(outcome.field, i18n) }),
      };
    case "stoppedBeforeWrite":
      return { ...plain("warning"), codes: [`${outcome.reason} ${outcome.code}`] };
    case "changedSincePreview":
      return plain("warning", wording(kind, "changedSincePreview"));
    case "needsConfirmation":
    case "interrupted":
      return plain("warning");
    case "maintenance":
    case "nothingToChange":
    case "notSignedIn":
    case "busy":
      return plain("info");
  }
}
