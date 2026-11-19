// A made-up settings page in the real one's shape: each list inside a box that has its id, the best
// score block commented out, and a hidden twin before the drum sound's list and each pair's list.
import {
  GAME_SETTING_KEYS,
  type GameSettingChoice,
  type GameSettingKey,
  type GameSettings,
  type Transport,
  type TransportPost,
  type TransportRequest,
} from "../src/index";
import { type Answer, answer, type SaveBehaviour } from "./profile-fixtures";

export const PAGE_PATH = "mypage_other_setting.php";
export const SAVE_PATH = "ajax/mypage_other.php";
export const TOKEN = "0123456789abcdef0123456789abcdef";
const STALE_MESSAGE = "更新に失敗しました。再度画面の読み込みを行ってください。";
const BAD_SHAPE_MESSAGE = "パラメータが不正です。";
export const BAD_VALUE_MESSAGE = "不明な値が設定されています。再度設定してください。";

type List = readonly (readonly [value: string, label: string])[];

const YES_NO: List = [
  ["0", "しない（デフォルト）"],
  ["1", "する"],
];
const SPEEDS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25, 30, 35, 40];
const STARS = Array.from({ length: 10 }, (_, index) => String(index + 1));

/** Each setting's list as the real page lists it, but the drum sounds: a made-up player's few. */
export const LISTS: Readonly<Record<GameSettingKey, List>> = {
  region: [
    ["NON", "設定しない(デフォルト)"],
    ["JPN", "日本"],
    ["TWN", "台湾"],
    ["SGP", "シンガポール"],
    ["USA", "北米"],
  ],
  visibility: [
    ["0", "設定しない（デフォルト）"],
    ["1", "設定する"],
  ],
  scoresShown: [
    ["1", "表示する（デフォルト）"],
    ["0", "表示しない"],
  ],
  scoresDifficulty: [
    ["0", "設定しない（デフォルト）"],
    ["1", "かんたん"],
    ["2", "ふつう"],
    ["3", "むずかしい"],
    ["4", "おに"],
    ["5", "おに＋おに裏"],
  ],
  danShown: [
    ["0", "表示しない"],
    ["1", "表示する（デフォルト）"],
  ],
  speed: SPEEDS.map((speed) => [String(speed), `${(speed / 10).toFixed(1)}倍`] as const),
  doron: YES_NO,
  abekobe: YES_NO,
  random: [
    ["0", "しない（デフォルト）"],
    ["1", "きまぐれ"],
    ["2", "でたらめ"],
  ],
  skip: YES_NO,
  notePosition: Array.from({ length: 11 }, (_, index) => {
    const at = index - 5;
    return [String(at), at < 0 ? `左${-at}` : at > 0 ? `右${at}` : "0"] as const;
  }),
  voice: [
    ["1", "あり（デフォルト）"],
    ["0", "なし"],
  ],
  tone: [
    ["0", "太鼓（デフォルト）"],
    ["1", "お祭り"],
    ["9", "8ビット太鼓"],
    ["21", "闇のマキナ"],
  ],
  doubleCharts: [
    ["0", "表示しない（デフォルト）"],
    ["1", "表示する"],
  ],
  folderDifficulty: [
    ["0", "設定しない（デフォルト）"],
    ["99", "都度ゲーム中に設定する"],
    ["1", "かんたん"],
    ["2", "ふつう"],
    ["3", "むずかしい"],
    ["4", "おに"],
    ["5", "おに裏"],
  ],
  folderStars: [
    ["0", "設定しない（デフォルト）"],
    ["99", "都度ゲーム中に設定する"],
    ...STARS.map((stars) => [stars, stars] as const),
  ],
  folderOrder: [
    ["0", "設定しない（デフォルト）"],
    ["99", "都度ゲーム中に設定する"],
    ["1", "いつもどおり"],
    ["2", "未クリア優先"],
    ["3", "未フルコンボ優先"],
    ["4", "未ドンダフルコンボ優先"],
  ],
};

/** The lists as the parser gives them. */
export const CHOICES = Object.fromEntries(
  GAME_SETTING_KEYS.map((key) => [key, LISTS[key].map(([value, label]) => ({ value, label }))]),
) as Record<GameSettingKey, GameSettingChoice[]>;

/** A made-up player's settings, most of them not the page's defaults. */
export const SETTINGS: GameSettings = {
  region: "SGP",
  visibility: "1",
  scoresShown: "1",
  scoresDifficulty: "4",
  danShown: "0",
  speed: "20",
  doron: "0",
  abekobe: "1",
  random: "2",
  skip: "1",
  notePosition: "-2",
  voice: "0",
  tone: "9",
  doubleCharts: "1",
  folderDifficulty: "4",
  folderStars: "8",
  folderOrder: "2",
};

/** The form's names, as the real page posts them. */
const NAME_OF: Readonly<Record<GameSettingKey, string>> = {
  region: "country_code",
  visibility: "open_status",
  scoresShown: "disp_achievement",
  scoresDifficulty: "disp_achievement_type",
  danShown: "dan_disp",
  speed: "op1",
  doron: "op2",
  abekobe: "op3",
  random: "op4",
  skip: "skip",
  notePosition: "notes_position",
  voice: "voice",
  tone: "default_tone_setting",
  doubleCharts: "double_song_disp",
  folderDifficulty: "default_difficulty_course",
  folderStars: "default_difficulty_star",
  folderOrder: "default_difficulty_sort",
};
const PAIRED: readonly GameSettingKey[] = [
  "doubleCharts",
  "folderDifficulty",
  "folderStars",
  "folderOrder",
];
const listName = (key: GameSettingKey) =>
  PAIRED.includes(key) ? `select_${NAME_OF[key]}` : NAME_OF[key];

export interface SettingsPageOptions {
  readonly settings?: GameSettings;
  readonly token?: string;
  /** What a pair's hidden half holds where it is not what the pair's list holds. */
  readonly halves?: Partial<Record<GameSettingKey, string>>;
  /** The hidden twin before the drum sound's list, which the real page fills with 0. */
  readonly toneTwin?: string;
  /** What the page's script does to the 双打 list as it loads; null leaves the line out. */
  readonly doubleChartsShut?: boolean | null;
}

function list(key: GameSettingKey, chosen: string): string {
  const options = LISTS[key]
    .map(
      ([value, label]) =>
        `    <option value="${value}"${value === chosen ? ` selected="selected"` : ""}>${label}</option>`,
    )
    .join("\n");
  const name = listName(key);
  return `<div style=""><select name="${name}" id="${name}" class="other_select">\n${options}\n</select></div>`;
}

function row(key: GameSettingKey, settings: GameSettings, hidden = ""): string {
  return `<div class="pull" id="${NAME_OF[key]}">${hidden}
  <div style="width:200px;">◆${key}</div>
  ${list(key, settings[key])}
</div>`;
}

const half = (key: GameSettingKey, value: string) =>
  `<input type="hidden" name="${NAME_OF[key]}" value="${value}" />`;

export function settingsPage({
  settings = SETTINGS,
  token = TOKEN,
  halves = {},
  toneTwin = "0",
  doubleChartsShut = false,
}: SettingsPageOptions = {}): string {
  const halfOf = (key: GameSettingKey) => half(key, halves[key] ?? settings[key]);
  const lock =
    doubleChartsShut === null
      ? ""
      : `$('select[name="select_double_song_disp"]').prop('disabled', ${doubleChartsShut});`;
  return `<html><head><script type="text/javascript">
    //<!--
    jQuery(function($){
		$( '#config' ).find( 'label.setting' ).settingComp();
			${lock}
    });
    //-->
</script></head><body>
<div id="content">
<div id="config" class="contentBox formArea otherConfigArea">
<form name="setting" method="post" action="ajax/mypage_other.php">
<input type="hidden" id="_tckt" name="_tckt" value="${token}" />
<input type="hidden" name="area_id" value="0" />
${["region", "visibility", "scoresShown", "scoresDifficulty"].map((key) => row(key as GameSettingKey, settings)).join("\n")}
<!-- <div class="pull">
  <div><select name="pull_chassis" id="pull_chassis" class="other_select">
    <option value="0" selected="selected">設定しない（デフォルト）</option>
  </select></div>
</div>
<div class="radio" id="level">
  <input type="radio" value="1" name="disp_level_self" id="ume">
</div> -->
${["danShown", "speed", "doron", "abekobe", "random", "skip", "notePosition", "voice"].map((key) => row(key as GameSettingKey, settings)).join("\n")}
${row("tone", settings, `<input type="hidden" name="default_tone_setting" value="${toneTwin}" />`)}
<div class="pull" id="double_song_disp">
  <input type="hidden" id="double_song_hidden" name="double_song_disp" value="${halves.doubleCharts ?? settings.doubleCharts}"/>
  ${list("doubleCharts", settings.doubleCharts)}
</div>
<input type="hidden" name="applicable_flg" value="1" />
${(["folderDifficulty", "folderStars", "folderOrder"] as const).map((key) => row(key, settings, halfOf(key))).join("\n")}
<div style="width:100px;margin:0 auto;clear:both;"><label class="setting"><div class="buttonLabel shadowLabel">設定する</div></label></div>
</form>
</div>
</div>
</body></html>`;
}

const LISTS_ALONE = [
  "region",
  "visibility",
  "scoresShown",
  "scoresDifficulty",
  "danShown",
  "speed",
  "doron",
  "abekobe",
  "random",
  "skip",
  "notePosition",
  "voice",
] as const;

/** The form's fields after `_tckt`, in the page's order, as `settingComp` serialises them. */
export function servedFields(settings: GameSettings = SETTINGS): [string, string][] {
  const fields: [string, string][] = [["area_id", "0"]];
  for (const key of LISTS_ALONE) {
    fields.push([NAME_OF[key], settings[key]]);
  }
  fields.push(
    ["default_tone_setting", "0"],
    ["default_tone_setting", settings.tone],
    ["double_song_disp", settings.doubleCharts],
    ["select_double_song_disp", settings.doubleCharts],
    ["applicable_flg", "1"],
  );
  for (const key of ["folderDifficulty", "folderStars", "folderOrder"] as const) {
    fields.push([NAME_OF[key], settings[key]], [listName(key), settings[key]]);
  }
  return fields;
}

/** What `settingComp` adds after the form: two fields with no control, and five again. */
export function appendedFields(settings: GameSettings = SETTINGS): [string, string][] {
  return [
    ["disp_level_self", "0"],
    ["disp_level_chassis", "0"],
    ["op1", settings.speed],
    ["op2", settings.doron],
    ["op3", settings.abekobe],
    ["op4", settings.random],
    ["notes_position", settings.notePosition],
  ];
}

const MOST_STARS: Readonly<Record<string, number>> = { "1": 5, "2": 7, "3": 8, "4": 10, "5": 10 };

/** Whether the folder's ★ is one its difficulty takes, as Hiroba checks the body it gets. */
function legalStars(difficulty: string, stars: string): boolean {
  const most = MOST_STARS[difficulty];
  return stars === "0" || (most !== undefined && (stars === "99" || Number(stars) <= most));
}

// Every page with the form issues a new token, and a save carrying any but the newest answers 705
// and changes nothing, as on the real site.
export function fakeGameSettings() {
  const hiroba = {
    settings: { ...SETTINGS } as Record<GameSettingKey, string>,
    token: "",
    tokens: 0,
    doubleChartsShut: false,
    requests: [] as TransportRequest[],
    /** The answer to a save; `message` goes into `errmsg`. */
    save: { code: 0, stores: true, message: "" } as SaveBehaviour,
    /** Run just after a save is handled, as a change made at that moment elsewhere. */
    afterSave: () => {},
  };
  const issue = () => {
    hiroba.token = `${++hiroba.tokens}`.padStart(32, "0");
    return hiroba.token;
  };
  const json = (value: unknown) => answer(SAVE_PATH, JSON.stringify(value), "application/json");

  const save = (request: TransportPost): Answer => {
    const form = new URLSearchParams(
      request.form.map(([name, value]): [string, string] => [name, value]),
    );
    const last = (name: string) => form.getAll(name).at(-1) ?? null;
    if (form.get("_tckt") !== hiroba.token) {
      issue();
      return json({ result: 705, errmsg: STALE_MESSAGE });
    }
    hiroba.token = "";
    if (!form.has("disp_level_self") || !form.has("disp_level_chassis")) {
      return json({ result: 600, errmsg: BAD_SHAPE_MESSAGE });
    }
    const posted = Object.fromEntries(
      (Object.keys(NAME_OF) as GameSettingKey[]).map((key) => [
        key,
        // Hiroba reads the list's half of the folder's pairs and the hidden half of the 双打 pair.
        key === "doubleCharts" ? last(NAME_OF[key]) : last(listName(key)),
      ]),
    ) as Record<GameSettingKey, string | null>;
    const stars = posted.folderStars ?? "";
    if (!legalStars(posted.folderDifficulty ?? "", stars)) {
      return json({ result: 25, errmsg: BAD_VALUE_MESSAGE });
    }
    const { code, stores, message } = hiroba.save;
    if (stores) {
      for (const [key, value] of Object.entries(posted)) {
        if (value !== null) {
          hiroba.settings[key as GameSettingKey] = value;
        }
      }
    }
    hiroba.afterSave();
    return json({ result: code, errmsg: message });
  };

  const transport: Transport = {
    async send(request) {
      hiroba.requests.push(request);
      const path = new URL(request.url).pathname.slice(1);
      if (request.method === "GET" && path === PAGE_PATH) {
        const page = settingsPage({
          settings: hiroba.settings,
          token: issue(),
          doubleChartsShut: hiroba.doubleChartsShut,
        });
        return answer(path, page, "text/html");
      }
      if (request.method === "POST" && path === SAVE_PATH) {
        return save(request);
      }
      return answer(path, "not found", "text/plain");
    },
  };
  /** Every request so far, as "METHOD path". */
  const routes = () =>
    hiroba.requests.map((request) => `${request.method} ${new URL(request.url).pathname.slice(1)}`);
  const posts = () =>
    hiroba.requests.filter((request): request is TransportPost => request.method === "POST");
  return { hiroba, transport, routes, posts };
}
