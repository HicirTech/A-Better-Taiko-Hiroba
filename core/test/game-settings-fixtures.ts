// A made-up settings page in the real one's shape: each list inside a box that has its id, the best
// score block commented out, and a hidden twin before the drum sound's list and each pair's list.
import type { GameSettingKey, GameSettings } from "../src/index";

export const TOKEN = "0123456789abcdef0123456789abcdef";

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
