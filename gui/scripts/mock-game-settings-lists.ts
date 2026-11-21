/** The settings page's lists in Hiroba's words, and the made-up player's settings. */
import { GAME_SETTING_KEYS, GAME_SETTING_LISTS, type GameSettings } from "@abth/core";

type SettingChoices = readonly (readonly [value: string, label: string])[];

const YES_NO: SettingChoices = [
  ["0", "しない（デフォルト）"],
  ["1", "する"],
];
const NOT_SET = "設定しない（デフォルト）";
const EACH_TIME = "都度ゲーム中に設定する";
const FULL_WIDTH = "０１２３４５６７８９";
const fullWidth = (digits: string) =>
  digits.replace(/\d/g, (digit) => FULL_WIDTH[Number(digit)] ?? digit);
const speed = (tenths: number) =>
  `${fullWidth(String(Math.floor(tenths / 10)))}．${fullWidth(String(tenths % 10))}倍`;

/** Each list of the page by its name, in the page's order and words; the drum sounds a player's. */
export const SETTING_LISTS = {
  country_code: [
    ["NON", "設定しない(デフォルト)"],
    ["JPN", "日本"],
    ["TWN", "台湾"],
    ["KOR", "韓国"],
    ["MYS", "マレーシア"],
    ["HKG", "香港"],
    ["MAC", "マカオ"],
    ["SGP", "シンガポール"],
    ["AUS", "オーストラリア"],
    ["NZL", "ニュージーランド"],
    ["VNM", "ベトナム"],
    ["IND", "インド"],
    ["IDN", "インドネシア"],
    ["THA", "タイ"],
    ["PHL", "フィリピン"],
    ["KHM", "カンボジア"],
    ["BRN", "ブルネイ"],
    ["LKA", "スリランカ"],
    ["MMR", "ミャンマー"],
    ["USA", "北米"],
  ],
  open_status: [
    ["0", NOT_SET],
    ["1", "設定する"],
  ],
  disp_achievement: [
    ["1", "表示する（デフォルト）"],
    ["0", "表示しない"],
  ],
  disp_achievement_type: [
    ["0", NOT_SET],
    ["1", "かんたん"],
    ["2", "ふつう"],
    ["3", "むずかしい"],
    ["4", "おに"],
    ["5", "おに＋おに裏"],
  ],
  dan_disp: [
    ["0", "表示しない"],
    ["1", "表示する（デフォルト）"],
  ],
  op1: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25, 30, 35, 40].map(
    (tenths) =>
      [String(tenths), tenths === 10 ? `${speed(10)}（デフォルト）` : speed(tenths)] as const,
  ),
  op2: YES_NO,
  op3: YES_NO,
  op4: [
    ["0", "しない（デフォルト）"],
    ["1", "きまぐれ"],
    ["2", "でたらめ"],
  ],
  skip: YES_NO,
  notes_position: Array.from({ length: 11 }, (_, index) => {
    const at = index - 5;
    const label =
      at < 0
        ? `左${fullWidth(String(-at))}`
        : at > 0
          ? `右${fullWidth(String(at))}`
          : "０(デフォルト)";
    return [String(at), label] as const;
  }),
  voice: [
    ["1", "あり（デフォルト）"],
    ["0", "なし"],
  ],
  default_tone_setting: [
    ["0", "太鼓（デフォルト）"],
    ["1", "お祭り"],
    ["2", "いぬねこ"],
    ["3", "豪華な太鼓"],
    ["9", "8ビット太鼓"],
    ["13", "ラップ"],
    ["21", "闇のマキナ"],
  ],
  select_double_song_disp: [
    ["0", "表示しない（デフォルト）"],
    ["1", "表示する"],
  ],
  select_default_difficulty_course: [
    ["0", NOT_SET],
    ["99", EACH_TIME],
    ["1", "かんたん"],
    ["2", "ふつう"],
    ["3", "むずかしい"],
    ["4", "おに"],
    ["5", "おに裏"],
  ],
  select_default_difficulty_star: [
    ["0", NOT_SET],
    ["99", EACH_TIME],
    ...Array.from(
      { length: 10 },
      (_, index) => [String(index + 1), fullWidth(String(index + 1))] as const,
    ),
  ],
  select_default_difficulty_sort: [
    ["0", NOT_SET],
    ["99", EACH_TIME],
    ["1", "いつもどおり"],
    ["2", "未クリア優先"],
    ["3", "未フルコンボ優先"],
    ["4", "未ドンダフルコンボ優先"],
  ],
} as const satisfies Record<string, SettingChoices>;

export type SettingList = keyof typeof SETTING_LISTS;
export type GameSettingsState = Record<SettingList, string>;

/** The made-up player's settings at the start, most of them not the page's defaults. */
export const INITIAL_GAME_SETTINGS: Readonly<GameSettingsState> = {
  country_code: "JPN",
  open_status: "0",
  disp_achievement: "1",
  disp_achievement_type: "4",
  dan_disp: "1",
  op1: "20",
  op2: "0",
  op3: "0",
  op4: "1",
  skip: "0",
  notes_position: "1",
  voice: "1",
  default_tone_setting: "9",
  select_double_song_disp: "1",
  select_default_difficulty_course: "4",
  select_default_difficulty_star: "8",
  select_default_difficulty_sort: "2",
};

/** Settings by the page's list names, as the app names them. */
export const appSettingsOf = (state: Readonly<GameSettingsState>): GameSettings =>
  Object.fromEntries(
    GAME_SETTING_KEYS.map((key) => [key, state[GAME_SETTING_LISTS[key] as SettingList]]),
  ) as GameSettings;
