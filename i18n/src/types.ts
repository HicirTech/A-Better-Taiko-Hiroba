import type { en } from "./messages/en";

/** The locales the catalog carries, in the order a language picker lists them. */
export const LOCALES = ["en", "ja", "zh-Hans", "zh-Hant"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Each locale's name in its own language, so a reader of any language can find theirs. */
export const LOCALE_NAMES: Readonly<Record<Locale, string>> = {
  en: "English",
  ja: "日本語",
  "zh-Hans": "简体中文",
  "zh-Hant": "繁體中文",
};

/** Every message key, as the English catalog has them; every other catalog carries just these. */
export type MessageKey = keyof typeof en;

/** A catalog: every key, and no other, in one language's words. */
export type Messages = { readonly [Key in MessageKey]: string };

type PlaceholdersIn<Words extends string> = Words extends `${string}{${infer Name}}${infer Rest}`
  ? Name | PlaceholdersIn<Rest>
  : never;

/** The parameters a message takes: one for each `{name}` its English words carry. */
export type MessageParams<Key extends MessageKey> = {
  readonly [Name in PlaceholdersIn<(typeof en)[Key]>]: string | number;
};

/** What a message takes after its key: its parameters, for one whose words carry any. */
export type MessageArgs<Key extends MessageKey> = [PlaceholdersIn<(typeof en)[Key]>] extends [never]
  ? []
  : [params: MessageParams<Key>];

/** A key whose words take no parameters. */
export type PlainMessageKey = {
  [Key in MessageKey]: MessageArgs<Key> extends [] ? Key : never;
}[MessageKey];

/** A message kept to be said later: its key, with the parameters its words take, if any. */
export type Message =
  | { readonly key: PlainMessageKey }
  | {
      [Key in Exclude<MessageKey, PlainMessageKey>]: {
        readonly key: Key;
        readonly params: MessageParams<Key>;
      };
    }[Exclude<MessageKey, PlainMessageKey>];
