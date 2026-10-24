import { NAME_FIELDS, TITLE_FIELDS } from "@abth/core";
import type { MessageKey, Translator } from "@abth/i18n";

import type { WriteKind, WriteSets } from "../shared/session-port";
import { isCostumePart, PART_LABEL } from "./costume-parts";
import type { Noticed } from "./write-ending";

// Hiroba's own words, never translated: what its pages say for refusal codes that come without
// words, from title.js, dialog.js and mydon.js.
const REFUSED_WORDS: Readonly<Record<WriteKind, Readonly<Partial<Record<number, string>>>>> = {
  costume: {},
  title: {
    1: "称号が選択されていません。",
    5: "選択した称号は獲得していません。",
    6: "エラーが発生しました。もう一度選択してください。",
  },
  name: { 2: "変更に失敗しました。" },
  folder: {},
  favoriteSong: {
    1: "この曲はまだ開放されていないため、設定できません。",
    2: "楽曲が公開されていません。",
  },
};

// What Hiroba's pages say for a save it kept but could not pass to the game server (result 3).
const GAME_SERVER_MISSED =
  "ゲームサーバーへの通信に失敗しました。設定が正しく行われていない可能性がありますので、再度設定してください。";

// The confirmations Hiroba's pre-checks ask, which this app does not give.
const CONFIRMATION_WORDS: Readonly<Partial<Record<WriteKind, string>>> = {
  costume:
    "これにきせかえますか？ ※組合せできない称号やきせかえが含まれています。OKするとあたらしく選んだもの以外は外れます。",
  title:
    "この称号に設定しますカッ？ ※組合せできない称号やきせかえが含まれています。OKするとあたらしく選んだもの以外は外れます。",
};

type InvalidField =
  | (typeof TITLE_FIELDS)[keyof typeof TITLE_FIELDS]
  | (typeof NAME_FIELDS)[keyof typeof NAME_FIELDS];

const INVALID_FIELD_MESSAGE = {
  [TITLE_FIELDS.notOwned]: "write.invalid.titleNotOwned",
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

/** What a write's ending says: it failed, with Hiroba's words if any, or Hiroba was read back. */
export type OutcomeWords =
  | { readonly said: "failed"; readonly hirobas: string | null }
  | { readonly said: "readBack" };

export function outcomeWords<K extends WriteKind>(
  kind: K,
  outcome: Noticed<WriteSets[K]>,
): OutcomeWords {
  const failed = (hirobas: string | null | undefined): OutcomeWords => ({
    said: "failed",
    hirobas: hirobas ?? null,
  });
  switch (outcome.kind) {
    case "diverged":
    case "changedSincePreview":
      return { said: "readBack" };
    case "appliedNotSynced":
      return failed(GAME_SERVER_MISSED);
    case "needsConfirmation":
      return failed(CONFIRMATION_WORDS[kind]);
    case "notApplied":
      return outcome.reason.kind === "refused"
        ? failed(outcome.reason.message ?? REFUSED_WORDS[kind][outcome.reason.code])
        : failed(null);
    default:
      return failed(null);
  }
}
