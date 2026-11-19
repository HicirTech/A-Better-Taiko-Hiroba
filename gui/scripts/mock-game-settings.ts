/** Stateful stand-in for Hiroba's settings page (その他設定・編集) and the one post that saves it. */
import { CONTROL } from "./mock-controls";
import { type MockSession, type PostRecord, postRecordOf } from "./mock-costume";
import {
  type GameSettingsState,
  INITIAL_GAME_SETTINGS,
  SETTING_LISTS,
  type SettingList,
} from "./mock-game-settings-lists";

/** Each pair's hidden half, which the page fills with what the pair holds. */
const HIDDEN_HALF: Readonly<Partial<Record<SettingList, string>>> = {
  select_double_song_disp: "double_song_disp",
  select_default_difficulty_course: "default_difficulty_course",
  select_default_difficulty_star: "default_difficulty_star",
  select_default_difficulty_sort: "default_difficulty_sort",
};

/** What the page's script posts again after the form. */
const SENT_AGAIN: readonly SettingList[] = ["op1", "op2", "op3", "op4", "notes_position"];
const STALE_MESSAGE = "更新に失敗しました。再度画面の読み込みを行ってください。";
export const BAD_SHAPE_MESSAGE = "パラメータが不正です。";
export const BAD_VALUE_MESSAGE = "不明な値が設定されています。再度設定してください。";
const MOST_STARS: Readonly<Record<string, number>> = { "1": 5, "2": 7, "3": 8, "4": 10, "5": 10 };
const LIST_NAMES = Object.keys(SETTING_LISTS) as SettingList[];

/** The ★ a difficulty of the folder takes, as Hiroba checks the body it gets. */
function legalStars(difficulty: string, stars: string): boolean {
  const most = MOST_STARS[difficulty];
  return stars === "0" || (most !== undefined && (stars === "99" || Number(stars) <= most));
}

function listMarkup(name: SettingList, chosen: string): string {
  const options = SETTING_LISTS[name]
    .map(
      ([value, label]) =>
        `    <option value="${value}"${value === chosen ? ` selected="selected"` : ""}>${label}</option>`,
    )
    .join("\n");
  return `<select name="${name}" id="${name}" class="other_select">\n${options}\n</select>`;
}

export interface GameSettingsEditorOptions {
  /** The costume editor's issuer: one token per session serves every page. */
  readonly issue: (session: MockSession) => string;
}

export function createGameSettingsEditor({ issue }: GameSettingsEditorOptions) {
  let state: GameSettingsState = { ...INITIAL_GAME_SETTINGS };
  const posts: PostRecord[] = [];
  /** Whether the page's script shuts the 双打 list, as during a competition with 双打 charts. */
  let doubleChartsShut = false;
  let nextResult: { code: number; message: string } | null = null;
  let noopNext = false;
  let expireNext = false;
  /** Set while /__game-settings-hold-save?on=1 holds every save's answer back; 0 lets them go. */
  let releaseSaves: (() => void) | null = null;
  let savesHeld: Promise<void> = Promise.resolve();

  const row = (name: SettingList, title: string, hidden = "", box: string = name) =>
    `<div class="pull" id="${box}">${hidden}
  <div style="width:200px;">${title}</div>
  <div style="">${listMarkup(name, state[name])}</div>
</div>`;
  const half = (name: SettingList) =>
    `<input type="hidden" name="${HIDDEN_HALF[name] ?? ""}" value="${state[name]}" />`;

  /** The body's values as Hiroba takes them: a repeated name's last, and each pair's read half. */
  function posted(form: URLSearchParams): GameSettingsState | null {
    const last = (name: string) => form.getAll(name).at(-1);
    const next = { ...state };
    for (const name of LIST_NAMES) {
      const value = name === "select_double_song_disp" ? last("double_song_disp") : last(name);
      if (value === undefined || !SETTING_LISTS[name].some(([offered]) => offered === value)) {
        return null;
      }
      next[name] = value;
    }
    const legal = legalStars(
      next.select_default_difficulty_course,
      next.select_default_difficulty_star,
    );
    return legal ? next : null;
  }

  return {
    state: (): Readonly<GameSettingsState> => state,

    page(session: MockSession): string {
      const ticket = issue(session);
      return `<script type="text/javascript">
    jQuery(function($){
		$( '#config' ).find( 'label.setting' ).settingComp();
			$('select[name="select_double_song_disp"]').prop('disabled', ${doubleChartsShut});
    });
</script>
<header><h1>その他設定・編集</h1></header>
<div id="content">
<div id="config" class="contentBox formArea otherConfigArea">
<form name="setting" method="post" action="ajax/mypage_other.php">
<input type="hidden" id="_tckt" name="_tckt" value="${ticket}" />
<input type="hidden" name="area_id" value="0" />
${row("country_code", "◆国・地域")}
${row("open_status", "◆プロフィール公開設定")}
${row("disp_achievement", "◆成績表示")}
${row("disp_achievement_type", "◆成績表示のむずかしさ")}
<!-- <div class="pull">
  <div style="width:200px;">◆ベストスコア表示を設定</div>
  <div><select name="pull_chassis" id="pull_chassis" class="other_select">
    <option value="0" selected="selected">設定しない（デフォルト）</option>
    <option value="1">設定する</option>
  </select></div>
</div>
<div class="radio" id="level" style="margin-left:10px;">
  <input type="radio" value="1" name="disp_level_self" id="ume">
</div> -->
${row("dan_disp", "◆段位表示設定")}
<div class="pull"><div style="width:200px;">◆デフォルト演奏オプション</div></div>
${row("op1", "はやさ")}
${row("op2", "ドロン")}
${row("op3", "あべこべ")}
${row("op4", "ランダム")}
${row("skip", "演奏スキップ")}
${row("notes_position", "音符位置調整")}
${row("voice", "ボイス")}
<div class="pull" id="tone_disp">
  <div style="width:200px;">音色</div>
  <input type="hidden" name="default_tone_setting" value="0" />
  <div style="">${listMarkup("default_tone_setting", state.default_tone_setting)}</div>
</div>
<div class="pull" id="double_song_disp">
  <input type="hidden" id="double_song_hidden" name="double_song_disp" value="${state.select_double_song_disp}"/>
  <div style="width:200px;">◆双打譜面表示設定</div>
  <div style="">${listMarkup("select_double_song_disp", state.select_double_song_disp)}</div>
</div>
<div class="pull"><div style="font-size:14px;">◆「むずかしさからえらぶ」フォルダ設定</div></div>
<input type="hidden" name="applicable_flg" value="1" />
${row("select_default_difficulty_course", "むずかしさ", half("select_default_difficulty_course"), "difficulty_course")}
${row("select_default_difficulty_star", "★の数", half("select_default_difficulty_star"), "difficulty_star")}
${row("select_default_difficulty_sort", "表示順", half("select_default_difficulty_sort"), "difficulty_sort")}
<div style="width:100px;margin:0 auto;clear:both;"><label class="setting"><div class="buttonLabel shadowLabel">設定する</div></label></div>
</form>
</div>
</div>`;
    },

    record(
      path: string,
      request: Request,
      form: URLSearchParams,
      session: MockSession | undefined,
    ) {
      posts.push(postRecordOf(path, request, form, session));
    },

    saveLetThrough(): Promise<void> {
      return savesHeld;
    },

    save(session: MockSession, form: URLSearchParams, endAllSessions: () => void): Response {
      if (session.ticket === undefined || form.get("_tckt") !== session.ticket) {
        return Response.json({ result: 705, errmsg: STALE_MESSAGE });
      }
      session.ticket = undefined;
      // Hiroba refuses the form without the fields the page's script adds to it.
      const appended =
        form.has("disp_level_self") &&
        form.has("disp_level_chassis") &&
        SENT_AGAIN.every((name) => form.getAll(name).length === 2);
      if (!appended) {
        return Response.json({ result: 600, errmsg: BAD_SHAPE_MESSAGE });
      }
      if (nextResult !== null) {
        const { code, message } = nextResult;
        nextResult = null;
        return Response.json({ result: code, errmsg: message });
      }
      if (noopNext) {
        noopNext = false;
        return Response.json({ result: 0, errmsg: "" });
      }
      const next = posted(form);
      if (next === null) {
        return Response.json({ result: 25, errmsg: BAD_VALUE_MESSAGE });
      }
      state = next;
      if (expireNext) {
        expireNext = false;
        endAllSessions();
      }
      return Response.json({ result: 0, errmsg: "" });
    },

    /** A test hook's answer, or null when the path is none of the settings' hooks. */
    hook(pathname: string, params: URLSearchParams): Response | null {
      switch (pathname) {
        case CONTROL.gameSettings: {
          if (params.get("reset") === "1") {
            state = { ...INITIAL_GAME_SETTINGS };
            doubleChartsShut = false;
          }
          for (const name of LIST_NAMES) {
            const value = params.get(name);
            if (value !== null && SETTING_LISTS[name].some(([offered]) => offered === value)) {
              state[name] = value;
            }
          }
          const shut = params.get("shut");
          if (shut === "0" || shut === "1") {
            doubleChartsShut = shut === "1";
          }
          return Response.json({ ...state, shut: doubleChartsShut });
        }
        case CONTROL.gameSettingsNextResult: {
          const code = params.get("code") ?? "";
          nextResult = /^\d+$/.test(code)
            ? { code: Number(code), message: params.get("message") ?? "" }
            : null;
          return new Response(String(nextResult?.code ?? null));
        }
        case CONTROL.gameSettingsNoopSave:
          noopNext = true;
          return new Response("noop");
        case CONTROL.gameSettingsExpireOnSave:
          expireNext = true;
          return new Response("expiring");
        case CONTROL.gameSettingsHoldSave: {
          const on = params.get("on");
          if (on === "1" && releaseSaves === null) {
            savesHeld = new Promise((resolve) => {
              releaseSaves = resolve;
            });
          } else if (on === "0") {
            releaseSaves?.();
            releaseSaves = null;
            savesHeld = Promise.resolve();
          }
          return new Response(releaseSaves === null ? "flowing" : "holding");
        }
        case CONTROL.gameSettingsPosts:
          if (params.get("reset") === "1") {
            posts.length = 0;
          }
          return Response.json(posts);
        default:
          return null;
      }
    },
  };
}

export type GameSettingsEditor = ReturnType<typeof createGameSettingsEditor>;
