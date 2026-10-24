import { describe, expect, test } from "bun:test";
import { createTranslator } from "@abth/i18n";

import { invalidFieldText, outcomeWords } from "../src/my-page/outcome-words";
import type { Noticed } from "../src/my-page/write-ending";
import type { WriteKind, WriteSets } from "../src/shared/session-port";
import { START_SET } from "./hiroba-stand-in";

const i18n = createTranslator("en");
const { t } = i18n;

const KINDS: WriteKind[] = ["costume", "title", "name", "folder", "favoriteSong"];
const SAVE = { answer: "json", code: 0, message: null, report: "path=/ajax/x status=200" } as const;
const MOVED = { ...START_SET, colorFace: 3 };

type AnyOutcome = Noticed<WriteSets[WriteKind]>;
// The words never look at the sets, so any kind takes any set here.
const wordsOf = (kind: WriteKind, outcome: AnyOutcome) => outcomeWords(kind, outcome);

const refused = (code: number, message: string | null): AnyOutcome => ({
  kind: "notApplied",
  before: START_SET,
  after: START_SET,
  reason: { kind: "refused", code, message },
  save: SAVE,
  cross: "off",
});

// What Hiroba's pages say where its answer brings no words (title.js, dialog.js and mydon.js).
const GAME_SERVER_MISSED =
  "ゲームサーバーへの通信に失敗しました。設定が正しく行われていない可能性がありますので、再度設定してください。";
const PAGE_WORDS: readonly [kind: WriteKind, code: number, words: string][] = [
  ["title", 1, "称号が選択されていません。"],
  ["title", 5, "選択した称号は獲得していません。"],
  ["title", 6, "エラーが発生しました。もう一度選択してください。"],
  ["name", 2, "変更に失敗しました。"],
  ["favoriteSong", 1, "この曲はまだ開放されていないため、設定できません。"],
  ["favoriteSong", 2, "楽曲が公開されていません。"],
];

describe("outcomeWords", () => {
  test.each(KINDS)("says Hiroba was read back when a %s write found it elsewhere", (kind) => {
    expect(
      wordsOf(kind, {
        kind: "diverged",
        before: START_SET,
        expectedAfter: MOVED,
        after: START_SET,
        save: SAVE,
        cross: "off",
      }),
    ).toEqual({ said: "readBack" });
    expect(wordsOf(kind, { kind: "changedSincePreview", current: MOVED })).toEqual({
      said: "readBack",
    });
  });

  test("puts Hiroba's own words for a refusal in the failure", () => {
    expect(wordsOf("name", refused(1, "不適切です"))).toEqual({
      said: "failed",
      hirobas: "不適切です",
    });
  });

  test.each(PAGE_WORDS)(
    "gives a %s refusal %d with no words its page's sentence",
    (kind, code, words) => {
      expect(wordsOf(kind, refused(code, null))).toEqual({ said: "failed", hirobas: words });
    },
  );

  test("says a refusal its page has no sentence for failed, with no words", () => {
    expect(wordsOf("costume", refused(3, null))).toEqual({ said: "failed", hirobas: null });
    expect(wordsOf("title", refused(2, null))).toEqual({ said: "failed", hirobas: null });
  });

  test("gives a save the game server never heard of the page's sentence for it", () => {
    for (const kind of ["title", "name"] as const) {
      expect(
        wordsOf(kind, {
          kind: "appliedNotSynced",
          before: START_SET,
          after: MOVED,
          save: SAVE,
          cross: "off",
        }),
      ).toEqual({ said: "failed", hirobas: GAME_SERVER_MISSED });
    }
  });

  test("gives a confirmation the app does not give the question Hiroba's page asks", () => {
    expect(wordsOf("costume", { kind: "needsConfirmation" })).toEqual({
      said: "failed",
      hirobas:
        "これにきせかえますか？ ※組合せできない称号やきせかえが含まれています。OKするとあたらしく選んだもの以外は外れます。",
    });
    expect(wordsOf("title", { kind: "needsConfirmation" })).toEqual({
      said: "failed",
      hirobas:
        "この称号に設定しますカッ？ ※組合せできない称号やきせかえが含まれています。OKするとあたらしく選んだもの以外は外れます。",
    });
  });

  test.each(KINDS)("says every other %s ending failed, with no words", (kind) => {
    const others: AnyOutcome[] = [
      { kind: "maintenance" },
      { kind: "readFailed", failure: { kind: "unreachable" } },
      { kind: "sessionGone", writeMayHaveHappened: false },
      {
        kind: "sessionGone",
        writeMayHaveHappened: true,
        before: START_SET,
        expectedAfter: MOVED,
        save: SAVE,
      },
      { kind: "invalidTarget", field: "costume1" },
      { kind: "stoppedBeforeWrite", reason: "precheckRejected", code: "status=403" },
      { kind: "notStaged", before: START_SET, staged: START_SET, expectedAfter: MOVED },
      {
        kind: "outcomeUnknown",
        before: START_SET,
        expectedAfter: MOVED,
        save: SAVE,
        failure: { kind: "unreachable" },
      },
      { kind: "interrupted" },
      { kind: "busy" },
      { kind: "notSignedIn" },
      ...(["unchanged", "stale", "siteMaintenance", "noAnswer", "rejected"] as const).map(
        (reason): AnyOutcome => ({
          kind: "notApplied",
          before: START_SET,
          after: START_SET,
          reason: { kind: reason },
          save: SAVE,
          cross: "off",
        }),
      ),
    ];
    for (const outcome of others) {
      expect(wordsOf(kind, outcome)).toEqual({ said: "failed", hirobas: null });
    }
  });
});

describe("invalidFieldText", () => {
  test("words a refused field by the part of the set or the phrase for it, else as it is", () => {
    expect(invalidFieldText("colorFace", i18n)).toBe("Face");
    expect(invalidFieldText("title.notOwned", i18n)).toBe(t("write.invalid.titleNotOwned"));
    expect(invalidFieldText("elsewhere", i18n)).toBe("elsewhere");
    expect(invalidFieldText("constructor", i18n)).toBe("constructor");
  });
});
