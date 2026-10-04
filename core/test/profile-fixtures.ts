// The fake issues the session a new token with every page that has a form, and a save carrying
// any but the latest answers 705 and changes nothing, as on the real site.
import {
  type CostumeSet,
  ok,
  type Transport,
  type TransportPost,
  type TransportRequest,
} from "../src/index";

export const ORIGIN = "https://hiroba.test";
/** 12:00 JST, outside the daily break. */
export const NOON_JST = new Date("2026-09-27T03:00:00Z");

export interface OwnedTitle {
  readonly id: number;
  readonly label: string;
}

/** Four owned titles: two with a name of their own, and two that share one. */
export const OWNED: readonly OwnedTitle[] = [
  { id: 106, label: "サンプル称号A" },
  { id: 39, label: "サンプル称号B" },
  { id: 40, label: "サンプル 称号" },
  { id: 41, label: "サンプル 称号" },
];
export const NICKNAME = "サンプルどん";
export const WORN: string = "サンプル称号A";

export const COSTUME: CostumeSet = {
  colorBody: 12,
  colorLimb: 12,
  colorFace: 5,
  costume1: 0,
  costume2: 21,
  costume3: 68,
  costume4: 37,
  costume5: 140,
};

/** A page's text with its ordinary spaces as the title page writes them: `&nbsp;`. */
const asHeading = (text: string) => text.replaceAll(" ", "&nbsp;");

export function myPage(options: {
  readonly title: string;
  readonly nickname: string;
  readonly token: string;
  readonly flag: string | null;
}): string {
  const script =
    options.flag === null
      ? ""
      : `<script type="text/javascript">
jQuery(function($){
	$( '#rename_img' ).rename( '#dialog', '${options.nickname}', $( '#_tckt' ).val(),  '${options.flag}' );
	$( '.rename_label' ).rename( '#dialog', '${options.nickname}', $( '#_tckt' ).val(),  '${options.flag}' );
});
</script>`;
  return `<html><head>${script}</head><body>
<div id="mydon_area"><img src="imgsrc_titleplate.php"><div>\n\t\t${options.title}\t\t</div>
<div style="height:24px;">${options.nickname}</div>
<div><div class="detail"><p>国・地域 ：サンプル</p><p>太鼓番：000000000000</p></div></div>
<div class="total_score"><img src="image/sp/640/total_score_image_5.png">
${[8, 7, 6, 5, 4, 3, 2].map((rank) => `<div class="best_rank_score_${rank}">1</div>`).join("")}
<div class="silver_crown_count">1</div><div class="gold_crown_count">1</div><div class="donderful_crown_count">1</div></div>
</div>
<div class="favoriteSong"><h2 class="subtitleMypage">大好きな曲</h2><div class="mypageInfoArea">
<ul id="songList"><li><div class="name"><span class="songName songNameFont">未設定</span></div></li></ul></div></div>
<div class="favoriteSong"><h2 class="subtitleMypage">お気に入りの曲</h2><div class="mypageInfoArea">
<ul id="songList"></ul></div></div>
<input type="hidden" id="_tckt" name="_tckt" value="${options.token}" />
<div id="dialog"><div id="renameFormArea" class="formArea">
<form name="renameForm" id="renameForm" method="post" action="ajax/change_mydon_profile.php">
<input type="hidden" id="_tckt" name="_tckt" value="${options.token}" />
<input type="hidden" id="mode"    name="mode" value="name">
<input type="hidden" id="oldName" name="oldName" value="">
<input type="text"   id="newName" name="newName" value="" maxlength="10"><br />
</form></div></div>
</body></html>`;
}

/** The title page, cut from the real one's shape: the form's `<div>` is opened and never closed. */
export function titleEditorPage(options: {
  readonly title: string;
  readonly owned: readonly OwnedTitle[];
  readonly token: string;
}): string {
  const owned = options.owned
    .map((one) => `<option value="${one.id}">${one.label}</option>`)
    .join("\n");
  return `<html><body>
<header><h1>称号編集</h1></header>
<div id="content">
<form name="titlepartsForm" id="titlepartsForm" method="post" action="ajax/change_mydon_profile.php">
<div id="titleFormArea" class="formArea">
  <input type="hidden" id="mode" name="mode" value="title">
  <input type="hidden" id="_tckt" name="_tckt" value="${options.token}" />
  <div style="margin-top:-28px;"><div id="title_parts_comp">${asHeading(options.title)}</div></div>
  <div style="background: #FFCC00; padding: 5px;">
    <div style="text-align:center;margin:10px">
      <select id="newTitle">
        <option selected value="">(称号を選択してください)</option>
        <option value="-">(称号をはずす)</option>
        ${owned}
      </select>
    </div>
    <div class="radio title_chk"><ul><li class="clearfix"><label>
      <input type="hidden" name="getStatus" class="getStatus" value="1">
      <input type="hidden" name="setTitle" class="setTitle" value="on">
    </label></li></ul></div>
  </div>
</form>
</div>
</body></html>`;
}

const FIELD_OF: Record<keyof CostumeSet, string> = {
  colorBody: "color_body",
  colorLimb: "color_limb",
  colorFace: "color_face",
  costume1: "costume_1",
  costume2: "costume_2",
  costume3: "costume_3",
  costume4: "costume_4",
  costume5: "costume_5",
};
const TWIN_OF: Record<keyof CostumeSet, string> = {
  colorBody: "def_body",
  colorLimb: "def_limb",
  colorFace: "def_face",
  costume1: "def_costume_1",
  costume2: "def_costume_2",
  costume3: "def_costume_3",
  costume4: "def_costume_4",
  costume5: "def_costume_5",
};
const SLOTS = [[4, 36], [59, 21], [68, 21], [37], [126, 140]];

export function costumeEditorPage(set: CostumeSet, token: string): string {
  const keys = Object.keys(FIELD_OF) as (keyof CostumeSet)[];
  const palette = Array.from(
    { length: 63 },
    (_, id) =>
      `<li><span class="color" title="${id}" style="background-color: #000000;"></span></li>`,
  ).join("");
  const tabs = ["kigu", "head", "body", "make", "acce"]
    .map(
      (tab, index) =>
        `<div id="tab-cos-${tab}"><ul>${(SLOTS[index] ?? [])
          .map(
            (id) =>
              `<li><a name="${id}"><img srctmp="imgsrc_kisekae.php?cos=${id}&type=${index + 1}"></a></li>`,
          )
          .join("")}</ul></div>`,
    )
    .join("");
  return `<form id="kisekae" action="ajax/change_mydon.php" method="post">
<input type="hidden" id="_tckt" name="_tckt" value="${token}" />
${keys.map((key) => `<input type="hidden" id="${FIELD_OF[key]}" name="${FIELD_OF[key]}" value="${set[key]}">`).join("")}
</form>
${keys.map((key) => `<input type="hidden" id="${TWIN_OF[key]}" value="${set[key]}">`).join("")}
<div id="tab-face"><ul>${palette}</ul></div><div id="tab-body"><ul>${palette}</ul></div><div id="tab-limb"><ul>${palette}</ul></div>
${tabs}`;
}

export type Answer = Awaited<ReturnType<Transport["send"]>>;
export const answer = (path: string, body: string, type: string): Answer =>
  ok({
    status: 200,
    url: `${ORIGIN}/${path}`,
    headers: { "content-type": type },
    body: new TextEncoder().encode(body),
  });

export interface SaveBehaviour {
  readonly code: number;
  readonly stores: boolean;
  /** The answer's `err_message`. */
  readonly message: string;
}

export const MESSAGE_FOR_NAME_FILTER = "不適切用語は使用できません";

export function fakeHiroba() {
  const hiroba = {
    title: WORN,
    nickname: NICKNAME,
    costume: { ...COSTUME },
    owned: [...OWNED],
    /** The flag my page hands its rename dialog; null leaves the script out. */
    renameFlag: "0" as string | null,
    /** The newest token issued: the only one a save accepts. */
    token: "",
    tokens: 0,
    requests: [] as TransportRequest[],
    precheck: { result: false } as unknown,
    save: { code: 0, stores: true, message: "" } as SaveBehaviour,
    /** Names the filter refuses, with result 1 and its message. */
    refusedNames: [] as string[],
    /** Run just after a save is handled, as a change made at that moment elsewhere. */
    afterSave: () => {},
  };
  const issue = () => {
    hiroba.token = `${++hiroba.tokens}`.padStart(32, "0");
    return hiroba.token;
  };
  const json = (path: string, value: unknown) =>
    answer(path, JSON.stringify(value), "application/json");

  const save = (request: TransportPost): Answer => {
    const path = "ajax/change_mydon_profile.php";
    const form = new Map(request.form);
    const mode = form.get("mode") ?? "";
    const body = (
      value: unknown,
      valueName: string,
      result: number,
      message: string,
      tckt = "",
    ) => ({
      result,
      mode,
      detail: { value, value_name: valueName, _tckt: tckt },
      err_reason: 0,
      err_message: message,
    });
    if (form.get("_tckt") !== hiroba.token) {
      issue();
      return json(path, body("", "", 705, ""));
    }
    hiroba.token = "";
    const { code, stores, message } = hiroba.save;
    if (mode === "title") {
      const chosen = hiroba.owned.find((one) => String(one.id) === form.get("newTitle"));
      if (chosen === undefined) {
        return json(path, body("", "", 5, ""));
      }
      if (stores) {
        hiroba.title = chosen.label;
      }
      hiroba.afterSave();
      return json(path, body(chosen.id, chosen.label, code, message));
    }
    const newName = form.get("newName") ?? "";
    if (hiroba.refusedNames.includes(newName)) {
      return json(path, body(newName, newName, 1, MESSAGE_FOR_NAME_FILTER));
    }
    if (stores) {
      hiroba.nickname = newName;
    }
    hiroba.afterSave();
    return json(path, body(newName, newName, code, message, code === 0 ? issue() : ""));
  };

  const transport: Transport = {
    async send(request) {
      hiroba.requests.push(request);
      const path = new URL(request.url).pathname.slice(1);
      if (request.method === "GET") {
        switch (path) {
          case "mypage_top.php":
            return answer(
              path,
              myPage({
                title: hiroba.title,
                nickname: hiroba.nickname,
                token: issue(),
                flag: hiroba.renameFlag,
              }),
              "text/html",
            );
          case "mypage_title_edit.php":
            return answer(
              path,
              titleEditorPage({ title: hiroba.title, owned: hiroba.owned, token: issue() }),
              "text/html",
            );
          case "mypage_kisekae.php":
            return answer(path, costumeEditorPage(hiroba.costume, issue()), "text/html");
        }
      }
      if (request.method === "POST" && path === "ajax/check_ip_title.php") {
        return json(path, hiroba.precheck);
      }
      if (request.method === "POST" && path === "ajax/change_mydon_profile.php") {
        return save(request);
      }
      return answer(path, "not found", "text/plain");
    },
  };
  /** Every request so far, as "METHOD path". */
  const routes = () =>
    hiroba.requests.map((request) => `${request.method} ${new URL(request.url).pathname.slice(1)}`);
  const postsTo = (path: string) =>
    hiroba.requests.filter(
      (request): request is TransportPost =>
        request.method === "POST" && request.url === `${ORIGIN}/${path}`,
    );
  return { hiroba, transport, routes, postsTo };
}
