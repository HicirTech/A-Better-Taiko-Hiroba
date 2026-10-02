import { NAME_FIELDS, TITLE_FIELDS } from "@abth/core";
import type { MessageKey, Translator } from "@abth/i18n";
import type { AlertColor } from "@mui/material";

import { FAILURE_MESSAGE } from "../read-failure-message";
import type { WriteKind, WriteOutcomeView, WriteSets } from "../session-port";
import { changedParts, isCostumePart, PART_LABEL, partValue } from "./costume-parts";

type NotAppliedReasonKind = Extract<WriteOutcomeView, { kind: "notApplied" }>["reason"]["kind"];

/**
 * The sentences a write can end with, by what they say: the ones a kind words in its own terms
 * have a key of their own (KIND_WORDING), and every kind without one says it with the base key.
 */
type Base =
  | "applied"
  | "undone"
  | "unchanged"
  | "diverged"
  | "crossChanged"
  | "crossUnknown"
  | "changedSincePreview"
  | "undoStale"
  | "nothingToChange"
  | "needsConfirmation";

/** The costume's wording, which is the base. */
const BASE_WORDING = {
  applied: "write.applied",
  undone: "write.undone",
  unchanged: "write.notApplied.unchanged",
  diverged: "write.diverged",
  crossChanged: "write.crossChanged",
  crossUnknown: "write.crossUnknown",
  changedSincePreview: "write.changedSincePreview",
  undoStale: "write.undoStale",
  nothingToChange: "write.nothingToChange",
  needsConfirmation: "write.needsConfirmation",
} as const satisfies Record<Base, MessageKey>;

/**
 * The sentences each kind words in its own terms, a sentence it has no entry for being the base's:
 * the costume's is empty, the title's says costume where the base says title, and a rename has no
 * pre-check, so it is never asked to confirm anything.
 */
const KIND_WORDING: Readonly<Record<WriteKind, Readonly<Partial<Record<Base, MessageKey>>>>> = {
  costume: {},
  title: {
    applied: "write.title.applied",
    undone: "write.title.undone",
    unchanged: "write.title.unchanged",
    diverged: "write.title.diverged",
    crossChanged: "write.title.crossChanged",
    crossUnknown: "write.title.crossUnknown",
    changedSincePreview: "write.title.changedSincePreview",
    undoStale: "write.title.undoStale",
    nothingToChange: "write.title.nothingToChange",
    needsConfirmation: "write.title.needsConfirmation",
  },
  name: {
    applied: "write.name.applied",
    undone: "write.name.undone",
    unchanged: "write.name.unchanged",
    diverged: "write.name.diverged",
    changedSincePreview: "write.name.changedSincePreview",
    undoStale: "write.name.undoStale",
    nothingToChange: "write.name.nothingToChange",
  },
};

const wording = (kind: WriteKind, base: Base): MessageKey =>
  KIND_WORDING[kind][base] ?? BASE_WORDING[base];

/** The sentence an outcome says first, where which write it was changes the words. */
const OUTCOME_BASE = {
  applied: "applied",
  notApplied: "unchanged",
  diverged: "diverged",
  changedSincePreview: "changedSincePreview",
  nothingToChange: "nothingToChange",
  needsConfirmation: "needsConfirmation",
} as const satisfies Partial<Record<WriteOutcomeView["kind"], Base>>;

type KindDependent = keyof typeof OUTCOME_BASE;

const isKindDependent = (outcome: WriteOutcomeView["kind"]): outcome is KindDependent =>
  Object.hasOwn(OUTCOME_BASE, outcome);

/** Each other way a write can end, worded: a new kind nobody worded is a type error. */
const OUTCOME_MESSAGE = {
  maintenance: "write.maintenance",
  readFailed: "failure.unexpectedPage",
  sessionGone: "write.sessionGone",
  invalidTarget: "write.invalidTarget",
  undoNotSaved: "write.undoNotSaved",
  stoppedBeforeWrite: "write.stoppedBeforeWrite",
  appliedNotSynced: "write.appliedNotSynced",
  outcomeUnknown: "write.outcomeUnknown",
  notSignedIn: "failure.notSignedIn",
  nothingToUndo: "write.nothingToUndo",
  interrupted: "write.interrupted",
  busy: "write.busy",
} as const satisfies Record<Exclude<WriteOutcomeView["kind"], KindDependent>, MessageKey>;

/** Each reason a save left the set as it was, worded; an unchanged one is the kind's own words. */
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

/**
 * What the app says of a code Hiroba refuses with and gives no message for, by kind of write: a
 * title's 1, 5 and 6 and a rename's 2. Hiroba's own words, when it gives some, follow them.
 */
const REFUSED_GLOSS: Readonly<Record<WriteKind, Readonly<Partial<Record<number, MessageKey>>>>> = {
  costume: {},
  title: { 1: "write.title.refused1", 5: "write.title.refused5", 6: "write.title.refused6" },
  name: { 2: "write.name.refused2" },
};

type InvalidField =
  | (typeof TITLE_FIELDS)[keyof typeof TITLE_FIELDS]
  | (typeof NAME_FIELDS)[keyof typeof NAME_FIELDS];

/** Each field the core refuses a title or a name by, worded: a costume part has its own label. */
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

/** The words of a refused target's `field`: a costume part's label, a title's or a name's phrase, or the code. */
export function invalidFieldText(field: string, { t }: Translator): string {
  if (isCostumePart(field)) {
    return t(PART_LABEL[field]);
  }
  return Object.hasOwn(INVALID_FIELD_MESSAGE, field)
    ? t(INVALID_FIELD_MESSAGE[field as InvalidField])
    : field;
}

/** One cell of the comparison: its text, and whether it is Hiroba's own words, which are never translated. */
export interface Cell {
  readonly text: string;
  readonly hirobas?: true;
}

/** One value of the set, as it was, as it was planned, and as it is now when that is known. */
export interface ComparisonRow {
  readonly label: Cell;
  readonly before: Cell;
  readonly planned: Cell;
  readonly now: Cell | null;
}

type Rows<S> = (before: S, planned: S, now: S | null, i18n: Translator) => readonly ComparisonRow[];

/** The costume's rows: each part the plan changed, and each the write changed that it did not mean to. */
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

/** The one row of a title or a name: Hiroba's own words, which are shown as it writes them. */
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

/** What a notice shows of a write that did not end as planned, over the values it moved. */
export interface Comparison {
  readonly rows: readonly ComparisonRow[];
  /** Whether the set could be read as it is now: a column for it. */
  readonly withNow: boolean;
}

export interface Described {
  readonly severity: AlertColor;
  readonly message: string;
  /** More sentences: Hiroba's own words, a code it answered with, the cross-check. */
  readonly notes: readonly string[];
  /** Report codes, shown to copy. Never page text. */
  readonly codes: readonly string[];
  readonly comparison: Comparison | null;
}

export interface DescribeOptions<K extends WriteKind> {
  /** Which kind of write ended: it words the sentences that name what was written. */
  readonly kind: K;
  /** The outcome is an undo's. */
  readonly asUndo?: boolean;
}

/** How a write ended, in words: what happened first, then Hiroba's own words and the codes. */
export function describeOutcome<K extends WriteKind>(
  outcome: WriteOutcomeView<WriteSets[K]>,
  i18n: Translator,
  { kind, asUndo = false }: DescribeOptions<K>,
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
    case "applied": {
      const notes =
        outcome.save.code !== null && outcome.save.code !== 0
          ? [t("write.siteNote", { code: outcome.save.code })]
          : [];
      return outcome.cross === "unknown"
        ? { ...plain("warning", wording(kind, "crossUnknown")), notes }
        : { ...plain("success", wording(kind, asUndo ? "undone" : "applied")), notes };
    }
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
      return plain("warning", wording(kind, asUndo ? "undoStale" : "changedSincePreview"));
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
