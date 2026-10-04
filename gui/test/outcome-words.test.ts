import { describe, expect, test } from "bun:test";
import { createTranslator, type MessageKey } from "@abth/i18n";

import { describeOutcome } from "../src/my-page/outcome-words";
import type { Noticed } from "../src/my-page/write-ending";
import type { CostumeSet, NameState, TitleState } from "../src/session-port";
import { START_SET } from "./hiroba-stand-in";

const i18n = createTranslator("en");
const { t } = i18n;

const SAVE = { answer: "json", code: 0, message: null, report: "path=/ajax/x status=200" } as const;
const MOVED: CostumeSet = { ...START_SET, colorFace: 3 };
const THEN: TitleState = { title: "サンプルの称号" };
const NOW_TITLE: TitleState = { title: "別のサンプル称号" };
const OLD_NAME: NameState = { nickname: "サンプルどん" };
const NEW_NAME: NameState = { nickname: "あたらしい" };

type Case<S> = [label: string, outcome: Noticed<S>, base: MessageKey];

const outcomesOf = <S>(before: S, after: S): Case<S>[] => [
  [
    "saved and the site said nothing happened",
    {
      kind: "notApplied",
      before,
      after: before,
      reason: { kind: "unchanged" },
      save: SAVE,
      cross: "unchanged",
    },
    "write.notApplied.unchanged",
  ],
  [
    "diverged",
    { kind: "diverged", before, expectedAfter: after, after: before, save: SAVE, cross: "off" },
    "write.diverged",
  ],
  [
    "moved since the editor was read",
    { kind: "changedSincePreview", current: after },
    "write.changedSincePreview",
  ],
  ["nothing to change", { kind: "nothingToChange" }, "write.nothingToChange"],
  ["a confirmation asked for", { kind: "needsConfirmation" }, "write.needsConfirmation"],
];

/** A kind's own key for a base one is `write.<kind>.<name>`, where the kind words it itself. */
const BASE_NAME: Partial<Record<MessageKey, string>> = {
  "write.notApplied.unchanged": "unchanged",
  "write.diverged": "diverged",
  "write.changedSincePreview": "changedSincePreview",
  "write.nothingToChange": "nothingToChange",
  "write.needsConfirmation": "needsConfirmation",
};

describe("describeOutcome, the costume", () => {
  test.each(outcomesOf<CostumeSet>(START_SET, MOVED))(
    "words %s as the costume always has",
    (_label, outcome, base) => {
      expect(describeOutcome(outcome, i18n, { kind: "costume" }).message).toBe(t(base));
    },
  );

  test("says the title changed too when a diverged write moved it", () => {
    const outcome: Noticed<CostumeSet> = {
      kind: "diverged",
      before: START_SET,
      expectedAfter: MOVED,
      after: START_SET,
      save: SAVE,
      cross: "changed",
    };
    expect(describeOutcome(outcome, i18n, { kind: "costume" }).notes).toEqual([
      t("write.crossChanged"),
    ]);
  });

  test("shows each part the plan moved, and each the write moved that it did not mean to", () => {
    const outcome: Noticed<CostumeSet> = {
      kind: "diverged",
      before: START_SET,
      expectedAfter: MOVED,
      after: { ...START_SET, colorBody: 4 },
      save: SAVE,
      cross: "off",
    };
    const { comparison } = describeOutcome(outcome, i18n, { kind: "costume" });
    expect(comparison?.withNow).toBe(true);
    expect(
      comparison?.rows.map((row) => [
        row.label.text,
        row.before.text,
        row.planned.text,
        row.now?.text,
      ]),
    ).toEqual([
      ["Face", "#5", "#3", "#5"],
      ["Torso", "#12", "#12", "#4"],
    ]);
    expect(comparison?.rows.some((row) => row.label.hirobas === true)).toBe(false);
  });

  test("words a refused target by the part of the set at fault, and a code it does not know as it is", () => {
    const refused = (field: string): Noticed<CostumeSet> => ({
      kind: "invalidTarget",
      field,
    });
    expect(describeOutcome(refused("colorFace"), i18n, { kind: "costume" }).message).toBe(
      t("write.invalidTarget", { field: "Face" }),
    );
    expect(describeOutcome(refused("elsewhere"), i18n, { kind: "costume" }).message).toBe(
      t("write.invalidTarget", { field: "elsewhere" }),
    );
    expect(describeOutcome(refused("constructor"), i18n, { kind: "costume" }).message).toBe(
      t("write.invalidTarget", { field: "constructor" }),
    );
  });

  test("glosses no refused code of its own: Hiroba's message alone is shown", () => {
    const outcome: Noticed<CostumeSet> = {
      kind: "notApplied",
      before: START_SET,
      after: START_SET,
      reason: { kind: "refused", code: 5, message: "（モック）拒否" },
      save: SAVE,
      cross: "off",
    };
    const described = describeOutcome(outcome, i18n, { kind: "costume" });
    expect(described.message).toBe(t("write.notApplied.refused", { code: 5 }));
    expect(described.notes).toEqual([t("write.siteMessage", { message: "（モック）拒否" })]);
  });
});

/** The sentences a kind words itself, by base key; the rest are the costume's. */
const OWN: Record<"title" | "name", readonly MessageKey[]> = {
  title: [
    "write.notApplied.unchanged",
    "write.diverged",
    "write.changedSincePreview",
    "write.nothingToChange",
    "write.needsConfirmation",
  ],
  name: [
    "write.notApplied.unchanged",
    "write.diverged",
    "write.changedSincePreview",
    "write.nothingToChange",
  ],
};

const keyOf = (kind: "title" | "name", base: MessageKey): MessageKey =>
  OWN[kind].includes(base) ? (`write.${kind}.${BASE_NAME[base]}` as MessageKey) : base;

describe("describeOutcome, the title", () => {
  test.each(outcomesOf<TitleState>(THEN, NOW_TITLE))(
    "words %s in the title's terms",
    (_label, outcome, base) => {
      expect(describeOutcome(outcome, i18n, { kind: "title" }).message).toBe(
        t(keyOf("title", base)),
      );
    },
  );

  test("says the costume changed too when a diverged write moved it", () => {
    const outcome: Noticed<TitleState> = {
      kind: "diverged",
      before: THEN,
      expectedAfter: NOW_TITLE,
      after: THEN,
      save: SAVE,
      cross: "changed",
    };
    expect(describeOutcome(outcome, i18n, { kind: "title" }).notes).toEqual([
      t("write.title.crossChanged"),
    ]);
  });

  test.each([
    [1, "write.title.refused1"],
    [5, "write.title.refused5"],
    [6, "write.title.refused6"],
  ] as const)("glosses Hiroba's code %i, which comes with no message", (code, gloss) => {
    const outcome: Noticed<TitleState> = {
      kind: "notApplied",
      before: THEN,
      after: THEN,
      reason: { kind: "refused", code, message: null },
      save: SAVE,
      cross: "off",
    };
    const described = describeOutcome(outcome, i18n, { kind: "title" });
    expect(described.message).toBe(t("write.notApplied.refused", { code }));
    expect(described.notes).toEqual([t(gloss)]);
  });

  test("shows the gloss before Hiroba's own words, and none for a code it has no gloss for", () => {
    const refused = (code: number, message: string | null): Noticed<TitleState> => ({
      kind: "notApplied",
      before: THEN,
      after: THEN,
      reason: { kind: "refused", code, message },
      save: SAVE,
      cross: "off",
    });
    expect(describeOutcome(refused(5, "ありえない"), i18n, { kind: "title" }).notes).toEqual([
      t("write.title.refused5"),
      t("write.siteMessage", { message: "ありえない" }),
    ]);
    expect(describeOutcome(refused(2, null), i18n, { kind: "title" }).notes).toEqual([]);
  });

  test("words a title the account does not own by its field", () => {
    const outcome: Noticed<TitleState> = { kind: "invalidTarget", field: "title.notOwned" };
    expect(describeOutcome(outcome, i18n, { kind: "title" }).message).toBe(
      t("write.invalidTarget", { field: t("write.invalid.titleNotOwned") }),
    );
  });

  test("compares the one title, in Hiroba's words, and a title not worn as no title", () => {
    const outcome: Noticed<TitleState> = {
      kind: "diverged",
      before: { title: "" },
      expectedAfter: NOW_TITLE,
      after: THEN,
      save: SAVE,
      cross: "off",
    };
    const { comparison } = describeOutcome(outcome, i18n, { kind: "title" });
    expect(comparison?.rows).toEqual([
      {
        label: { text: "Title" },
        before: { text: "No title" },
        planned: { text: "別のサンプル称号", hirobas: true },
        now: { text: "サンプルの称号", hirobas: true },
      },
    ]);
  });

  test("compares a save whose end is not known with no column for what it is now", () => {
    const outcome: Noticed<TitleState> = {
      kind: "sessionGone",
      writeMayHaveHappened: true,
      before: THEN,
      expectedAfter: NOW_TITLE,
      save: SAVE,
    };
    const { comparison, message } = describeOutcome(outcome, i18n, { kind: "title" });
    expect(message).toBe(t("write.sessionGoneAfterSave"));
    expect(comparison?.withNow).toBe(false);
    expect(comparison?.rows.map((row) => row.now)).toEqual([null]);
  });
});

describe("describeOutcome, the name", () => {
  test.each(outcomesOf<NameState>(OLD_NAME, NEW_NAME))(
    "words %s in the name's terms, and the costume's where it has none",
    (_label, outcome, base) => {
      expect(describeOutcome(outcome, i18n, { kind: "name" }).message).toBe(t(keyOf("name", base)));
    },
  );

  test("says the title changed too, in the base's words: the title is what a rename cross-checks", () => {
    const outcome: Noticed<NameState> = {
      kind: "diverged",
      before: OLD_NAME,
      expectedAfter: NEW_NAME,
      after: OLD_NAME,
      save: SAVE,
      cross: "changed",
    };
    expect(describeOutcome(outcome, i18n, { kind: "name" }).notes).toEqual([
      t("write.crossChanged"),
    ]);
  });

  test("glosses code 2, which comes with no message, and leaves code 1's own message alone", () => {
    const refused = (code: number, message: string | null): Noticed<NameState> => ({
      kind: "notApplied",
      before: OLD_NAME,
      after: OLD_NAME,
      reason: { kind: "refused", code, message },
      save: SAVE,
      cross: "off",
    });
    expect(describeOutcome(refused(2, null), i18n, { kind: "name" }).notes).toEqual([
      t("write.name.refused2"),
    ]);
    expect(describeOutcome(refused(1, "不適切です"), i18n, { kind: "name" }).notes).toEqual([
      t("write.siteMessage", { message: "不適切です" }),
    ]);
  });

  test.each([
    ["name.empty", "write.invalid.nameEmpty"],
    ["name.edge", "write.invalid.nameEdge"],
    ["name.tooLong", "write.invalid.nameTooLong"],
    ["name.control", "write.invalid.nameControl"],
    ["name.closed", "write.invalid.nameClosed"],
  ] as const)("words the refused field %s", (field, phrase) => {
    const outcome: Noticed<NameState> = { kind: "invalidTarget", field };
    expect(describeOutcome(outcome, i18n, { kind: "name" }).message).toBe(
      t("write.invalidTarget", { field: t(phrase) }),
    );
  });

  test("compares the one name, in Hiroba's words", () => {
    const outcome: Noticed<NameState> = {
      kind: "outcomeUnknown",
      before: OLD_NAME,
      expectedAfter: NEW_NAME,
      save: SAVE,
      failure: { kind: "unreachable" },
    };
    const { comparison } = describeOutcome(outcome, i18n, { kind: "name" });
    expect(comparison?.rows).toEqual([
      {
        label: { text: "Nickname" },
        before: { text: "サンプルどん", hirobas: true },
        planned: { text: "あたらしい", hirobas: true },
        now: null,
      },
    ]);
  });
});

describe("describeOutcome, whatever the kind", () => {
  test.each(["costume", "title", "name"] as const)(
    "words the outcomes no kind words alike for %s",
    (kind) => {
      const words: [Noticed<never>, MessageKey][] = [
        [{ kind: "maintenance" }, "write.maintenance"],
        [{ kind: "busy" }, "write.busy"],
        [{ kind: "interrupted" }, "write.interrupted"],
        [{ kind: "notSignedIn" }, "failure.notSignedIn"],
        [{ kind: "sessionGone", writeMayHaveHappened: false }, "write.sessionGone"],
      ];
      for (const [outcome, key] of words) {
        expect(describeOutcome(outcome, i18n, { kind }).message).toBe(t(key));
      }
    },
  );
});
