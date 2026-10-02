/**
 * The mock's title and name: the title page, mypage_title_edit.php, the pieces of my page that
 * carry the rename dialog, and the two ajax posts the profile endpoint takes, ajax/check_ip_title.php
 * and ajax/change_mydon_profile.php. Stateful, like the costume's: a save changes the title and the
 * name my page shows next, and the title plate with them.
 *
 * The title page copies the real one's shape (reference/hiroba-pages/title-edit.html), unclosed
 * `<div>` included: the form's `div#titleFormArea` is never closed, so the page parsed as any other
 * has no form, which is the one thing its parser has to get right. The form is `form#titlepartsForm`,
 * with `mode`, the token, the heading `#title_parts_comp` that writes a space as `&nbsp;`, and
 * `select#newTitle` with no `name`: the "choose" entry, 称号をはずす, then one entry per title, whose
 * value is the title's id. The rename dialog is `#dialog > #renameFormArea > form#renameForm` at the
 * foot of my page, with the page's three `_tckt` inputs, and the flag the page hands its script.
 *
 * Titles, ids and names are placeholders. Two titles share a name and one holds a space, so the
 * undo of a shared name is refused and the list's `&nbsp;` is exercised.
 *
 * The saves follow what was executed on 2026-08-09: a title answers `detail.value` as a number and
 * an empty token; a rename answers the name and a fresh 32-character token, which is also the
 * session's token from then on; a refused name answers result 1 and the refusal in `err_message`,
 * with the rejected name echoed in `detail.value`. The shape of a 705 at this endpoint has not been
 * seen: the mock's is invented, with the costume's words.
 */
import { ERROR_SHELL_BODY, type MockSession, type PostRecord, postRecordOf } from "./mock-costume";

export interface OwnedTitle {
  readonly id: number;
  readonly label: string;
}

/** The titles the mock player owns, in the list's order. */
export const OWNED_TITLES: readonly OwnedTitle[] = [
  { id: 101, label: "サンプルの称号" },
  { id: 102, label: "別のサンプル称号" },
  { id: 103, label: "三つ目のサンプル称号" },
  { id: 104, label: "同じ名前のサンプル称号" },
  { id: 105, label: "同じ名前のサンプル称号" },
  { id: 106, label: "スペース 入りのサンプル称号" },
  { id: 107, label: "ﾊﾝｶｸのサンプル称号" },
  { id: 108, label: "最後のサンプル称号" },
];

/** Where the mock's title and name start, and return to on /__profile?reset=1. */
export const INITIAL_PROFILE = { title: "サンプルの称号", nickname: "サンプルどん" } as const;

/** A name the mock's filter refuses, with the words Hiroba refused a name with on 2026-08-09. */
export const REFUSED_NAME = "えぬじー";
export const FILTER_MESSAGE = "不適切用語は使用できません";
/** What a rename answers while /__rename-cooldown?on=1 is set: invented, as no limit has been seen. */
export const COOLDOWN_MESSAGE = "（モック）短い間に何度もドンだーネームは変更できません";
/** The longest name the mock's form takes, as the real form's `maxlength`. */
const NAME_MAX_LENGTH = 10;

/** What the title pre-check answers: the boolean false by default, as every recorded answer was. */
const PRECHECK_ANSWERS = ["false", "true", "1", "string1", "0", "null", "html"] as const;
type PrecheckAnswer = (typeof PRECHECK_ANSWERS)[number];

/** What my page hands its rename dialog: open, closed, or a script with no flag in it. */
const RENAME_STATES = ["open", "closed", "odd"] as const;
type RenameMockState = (typeof RENAME_STATES)[number];

export const escapeHtml = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/** A string as the single-quoted literal a page's inline script holds it in. */
const scriptLiteral = (text: string) =>
  `'${text.replaceAll("\\", "\\\\").replaceAll("'", "\\'").replaceAll("\n", "\\n")}'`;

export interface ProfileEditorOptions {
  /** Hands `session` a fresh token, voiding the one it had: the costume editor's, one for all. */
  readonly issue: (session: MockSession) => string;
}

export function createProfileEditor({ issue }: ProfileEditorOptions) {
  let title: string = INITIAL_PROFILE.title;
  let nickname: string = INITIAL_PROFILE.nickname;
  const posts: PostRecord[] = [];
  let precheckAnswer: PrecheckAnswer = "false";
  /** Set while /__title-hold-precheck?on=1 holds every pre-check's answer back; lets them all go. */
  let releasePrechecks: (() => void) | null = null;
  let prechecksHeld: Promise<void> = Promise.resolve();
  /** The same for the saves, which a rename, with no pre-check, can be held at alone. */
  let releaseSaves: (() => void) | null = null;
  let savesHeld: Promise<void> = Promise.resolve();
  let nextResult: { code: number; message: string } | null = null;
  let noopNext = false;
  let expireNext = false;
  let renameState: RenameMockState = "open";
  let cooldown = false;

  const answer = (
    mode: string,
    result: number,
    value: string | number,
    valueName: string,
    message: string,
    ticket = "",
  ) =>
    Response.json({
      result,
      mode,
      detail: { value, value_name: valueName, _tckt: ticket },
      err_reason: 0,
      err_message: message,
    });

  return {
    /** The title now, as my page and the title page show it. */
    title: () => title,
    /** The name now, as my page shows it. */
    nickname: () => nickname,
    /** Sets the title, as /__variant?title= and a change made elsewhere do. */
    setTitle(next: string) {
      title = next;
    },

    /** The script of my page that wires the rename buttons, with the flag the page hands it. */
    renameScript(): string {
      const name = scriptLiteral(nickname);
      const calls =
        renameState === "odd"
          ? `$( '#rename_img' ).rename( '#dialog' );`
          : `$( '#rename_img' ).rename( '#dialog', ${name}, $( '#_tckt' ).val(),  '${renameState === "open" ? "0" : "1"}' );
	$( '.rename_label' ).rename( '#dialog', ${name}, $( '#_tckt' ).val(),  '${renameState === "open" ? "0" : "1"}' );`;
      return `<script type="text/javascript">
jQuery(function($){
	${calls}
});
</script>`;
    },

    /** The rename dialog at the foot of my page, its form carrying the session's token. */
    renameDialog(ticket: string): string {
      return `<div id="dialog">
	<div class="contentBox errorArea"></div>
	<div id="renameFormArea" class="formArea">
		<p>新しいドンだーネームを入力するドン！<br>
			<span style="font-size:10px; display: block;">
				※本名などの個人情報の入力は、おやめください<br>
				※Do not enter any personal information.
			</span>
		</p>
		<form name="renameForm" id="renameForm" method="post" action="ajax/change_mydon_profile.php">
			<input type="hidden" id="_tckt" name="_tckt" value="${ticket}" />
			<input type="hidden" id="mode"    name="mode" value="name">
			<input type="hidden" id="oldName" name="oldName" value="">
			<input type="text"   id="newName" name="newName" value="" maxlength="${NAME_MAX_LENGTH}"><br />
		</form>
	</div>
</div>`;
    },

    /** The title page for `session`, handing it a fresh token. */
    titlePage(session: MockSession): string {
      const ticket = issue(session);
      const options = OWNED_TITLES.map(
        (owned) => `<option value="${owned.id}">${escapeHtml(owned.label)}</option>`,
      ).join("\n\t\t\t\t");
      // A space is written as &nbsp; in the heading, and as an ordinary one in the list.
      const heading = escapeHtml(title).replaceAll(" ", "&nbsp;");
      return `<header style="background-image:url(image/sp/640/menu_03_640.png);color:#ffffff;">
	<h1>称号編集</h1>
</header>
<div id="content" style="padding-bottom: 45px;">
<form name="titlepartsForm" id="titlepartsForm" method="post" action="ajax/change_mydon_profile.php">
<div id="titleFormArea" class="formArea" style="width:300px;margin:0 auto;padding:0;">
	<input type="hidden" id="mode" name="mode" value="title">
	<input type="hidden" id="_tckt" name="_tckt" value="${ticket}" />
	<img style="height: 70px;vertical-align: top;width: 300px;" src="image/sp/640/now_titleimage_640.png">
	<div style="margin-top:-28px;text-align: center;position:relative;font-size:12px;">
		<img width="280px" src="image/sp/640/titleparts_complete_640.png">
		<div style="position:absolute; top:42px;width:290px;text-align:center;" id="title_parts_comp">${heading}</div>
	</div>
	<div style="background: #FFCC00; padding: 5px;">
		<h2 class="subtitleMypage">称号パーツを組み合わせる</h2>
		<div style="padding:0px;width:120px;margin-left:77px;">
			<label><a href="mypage_titleparts_edit_sp.php"><div class="buttonLabel shadowLabel">設定画面へ</div></a></label>
		</div>
		<h2 class="subtitleMypage">称号を選ぶ</h2>
		<div style="text-align:center;margin:10px">
			<select id="newTitle">
				<option selected value="">(称号を選択してください)</option>
				<option value="-">(称号をはずす)</option>
				${options}
			</select>
		</div>
		<div class="radio title_chk" style="padding:0px;width:130px;margin-left:70px;">
			<ul><li class="clearfix"><label>
				<div class="buttonLabel shadowLabel">称号を設定する</div>
				<input type="hidden" name="getStatus" class="getStatus" value="1">
				<input type="hidden" name="setTitle" class="setTitle" value="on">
			</label></li></ul>
		</div>
	</div>
</form>
	</div>
<div class="button_area clearfix"><a href="mypage_top.php">マイページ</a></div>`;
    },

    /** Keeps what a post to either endpoint carried, before anything answers it. */
    record(
      path: string,
      request: Request,
      form: URLSearchParams,
      session: MockSession | undefined,
    ) {
      posts.push(postRecordOf(path, request, form, session));
    },

    /** Settles once pre-checks may be answered: at once, unless /__title-hold-precheck holds them. */
    precheckLetThrough(): Promise<void> {
      return prechecksHeld;
    },

    /** Settles once saves may be answered: at once, unless /__profile-hold-save holds them. */
    saveLetThrough(): Promise<void> {
      return savesHeld;
    },

    /** ajax/check_ip_title.php: the boolean false, unless a test asked for another answer. */
    precheck(): Response {
      switch (precheckAnswer) {
        case "false":
          return Response.json({ result: false });
        case "true":
          return Response.json({ result: true });
        case "1":
          return Response.json({ result: 1 });
        case "string1":
          return Response.json({ result: "1" });
        case "0":
          return Response.json({ result: 0 });
        case "null":
          return Response.json({ result: null });
        case "html":
          return new Response(ERROR_SHELL_BODY, {
            headers: { "content-type": "text/html; charset=utf-8" },
          });
      }
    },

    /**
     * ajax/change_mydon_profile.php. A token that is not the session's latest answers 705 and a new
     * token, and saves nothing; a right one is spent, and saves by `mode`: a title the account
     * owns, or a name the filter and the form's length allow.
     */
    save(session: MockSession, form: URLSearchParams, endAllSessions: () => void): Response {
      const mode = form.get("mode") ?? "";
      if (session.ticket === undefined || form.get("_tckt") !== session.ticket) {
        return answer(
          mode,
          705,
          "",
          "",
          "更新に失敗しました。再度画面の読み込みを行ってください。",
          issue(session),
        );
      }
      if (nextResult !== null) {
        const { code, message } = nextResult;
        nextResult = null;
        return answer(mode, code, "", "", message);
      }
      session.ticket = undefined;
      if (noopNext) {
        noopNext = false;
        return answer(
          mode,
          0,
          mode === "title" ? title : nickname,
          mode === "title" ? title : nickname,
          "",
        );
      }
      const saved = mode === "title" ? saveTitle(form) : saveName(form, session);
      if (saved.stored && expireNext) {
        expireNext = false;
        endAllSessions();
      }
      return saved.response;
    },

    /**
     * The profile's test hooks, or null for a path that is not one:
     * /__profile (the title and the name; with title= and nickname=, set those, as a change made
     * elsewhere; with reset=1, back to the start), /__title-precheck?answer=false|true|1|string1|
     * 0|null|html (what every title pre-check answers from now on), /__title-hold-precheck?on=1 or
     * 0 and /__profile-hold-save?on=1 or 0 (pre-checks, or saves, are held unanswered, so a test can
     * ask for more while a write waits in its middle; 0 lets every held one go),
     * /__profile-next-result?code=N&message= (the next valid save answers N with that message and
     * saves nothing), /__profile-noop-save (the next valid save answers 0 and saves nothing),
     * /__profile-expire-on-save (the next valid save saves, then every session ends),
     * /__rename?state=open|closed|odd (the flag my page hands its rename dialog: 0, 1, or a script
     * with no readable flag), /__rename-cooldown?on=1 or 0 (every rename answers 1 with a message
     * of the mock's own), and /__profile-posts (every post to the profile's two endpoints as it
     * arrived; ?reset=1 clears).
     */
    hook(pathname: string, params: URLSearchParams): Response | null {
      switch (pathname) {
        case "/__profile": {
          if (params.get("reset") === "1") {
            title = INITIAL_PROFILE.title;
            nickname = INITIAL_PROFILE.nickname;
          }
          title = params.get("title") ?? title;
          nickname = params.get("nickname") ?? nickname;
          return Response.json({ title, nickname });
        }
        case "/__title-precheck": {
          const wanted = params.get("answer");
          if (PRECHECK_ANSWERS.includes(wanted as PrecheckAnswer)) {
            precheckAnswer = wanted as PrecheckAnswer;
          }
          return new Response(precheckAnswer);
        }
        case "/__title-hold-precheck": {
          const on = params.get("on");
          if (on === "1" && releasePrechecks === null) {
            prechecksHeld = new Promise((resolve) => {
              releasePrechecks = resolve;
            });
          } else if (on === "0") {
            releasePrechecks?.();
            releasePrechecks = null;
            prechecksHeld = Promise.resolve();
          }
          return new Response(releasePrechecks === null ? "flowing" : "holding");
        }
        case "/__profile-hold-save": {
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
        case "/__profile-next-result": {
          const code = params.get("code") ?? "";
          nextResult = /^\d+$/.test(code)
            ? { code: Number(code), message: params.get("message") ?? "" }
            : null;
          return new Response(String(nextResult?.code ?? null));
        }
        case "/__profile-noop-save":
          noopNext = true;
          return new Response("noop");
        case "/__profile-expire-on-save":
          expireNext = true;
          return new Response("expiring");
        case "/__rename": {
          const state = params.get("state");
          if (RENAME_STATES.includes(state as RenameMockState)) {
            renameState = state as RenameMockState;
          }
          return new Response(renameState);
        }
        case "/__rename-cooldown":
          cooldown = params.get("on") === "1";
          return new Response(cooldown ? "cooling down" : "open");
        case "/__profile-posts":
          if (params.get("reset") === "1") {
            posts.length = 0;
          }
          return Response.json(posts);
        default:
          return null;
      }
    },
  };

  /** A title save: the title the account owns by its id, or the refusals the site's script words. */
  function saveTitle(form: URLSearchParams): { response: Response; stored: boolean } {
    const id = form.get("newTitle") ?? "";
    if (id === "") {
      return { response: answer("title", 1, "", "", ""), stored: false };
    }
    const chosen = OWNED_TITLES.find((owned) => String(owned.id) === id);
    if (chosen === undefined) {
      return { response: answer("title", 5, "", "", ""), stored: false };
    }
    title = chosen.label;
    return { response: answer("title", 0, chosen.id, chosen.label, ""), stored: true };
  }

  /** A rename: refused with the site's words for a name the filter or the form does not take. */
  function saveName(
    form: URLSearchParams,
    session: MockSession,
  ): { response: Response; stored: boolean } {
    const next = form.get("newName") ?? "";
    const refusal = cooldown
      ? COOLDOWN_MESSAGE
      : next.includes(REFUSED_NAME)
        ? FILTER_MESSAGE
        : next.length > NAME_MAX_LENGTH
          ? "（モック）ドンだーネームが長すぎます"
          : null;
    if (refusal !== null) {
      // The rejected name is echoed, with no token, as the executed refusal was.
      return { response: answer("name", 1, next, next, refusal), stored: false };
    }
    nickname = next;
    return { response: answer("name", 0, next, next, "", issue(session)), stored: true };
  }
}

export type ProfileEditor = ReturnType<typeof createProfileEditor>;
