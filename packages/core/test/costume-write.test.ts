import { describe, expect, test } from "bun:test";

import {
  type CostumeSet,
  changeCostume,
  ok,
  openCostumeEditor,
  type Transport,
  type TransportRequest,
  type WriteOutcome,
} from "../src/index";

const ORIGIN = "https://hiroba.test";
const NOON_JST = new Date("2026-09-27T03:00:00Z");

const WORN: CostumeSet = {
  colorBody: 12,
  colorLimb: 12,
  colorFace: 5,
  costume1: 0,
  costume2: 21,
  costume3: 68,
  costume4: 37,
  costume5: 140,
};
const SLOTS = [[4, 36], [59, 21], [68, 21], [37], [126, 140]];
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

function editorPage(set: CostumeSet, token: string): string {
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

const myPage = (title: string) => `<div id="mydon_area"><div>${title}</div>
<div><div>サンプルどん</div></div>
<div><div class="detail"><p>国・地域 ：サンプル</p><p>太鼓番：000000000000</p></div></div>
<div class="total_score"><img src="image/sp/640/total_score_image_5.png">
${[8, 7, 6, 5, 4, 3, 2].map((rank) => `<div class="best_rank_score_${rank}">1</div>`).join("")}
<div class="silver_crown_count">1</div><div class="gold_crown_count">1</div><div class="donderful_crown_count">1</div></div>
</div>
<div class="favoriteSong"><h2 class="subtitleMypage">大好きな曲</h2><div class="mypageInfoArea">
<ul id="songList"><li><div class="name"><span class="songName songNameFont">未設定</span></div></li></ul></div></div>
<div class="favoriteSong"><h2 class="subtitleMypage">お気に入りの曲</h2><div class="mypageInfoArea">
<ul id="songList"></ul></div></div>`;

type Answer = Awaited<ReturnType<Transport["send"]>>;
const answer = (path: string, body: string, type: string): Answer =>
  ok({
    status: 200,
    url: `${ORIGIN}/${path}`,
    headers: { "content-type": type },
    body: new TextEncoder().encode(body),
  });

function fakeHiroba() {
  const hiroba = {
    set: { ...WORN },
    title: "サンプルの称号",
    token: "0",
    tokens: 0,
    requests: [] as TransportRequest[],
    saveCode: 0,
    /** Run just after a save is stored, as a change made at that moment elsewhere. */
    afterSave: () => {},
  };
  const transport: Transport = {
    async send(request) {
      hiroba.requests.push(request);
      const path = new URL(request.url).pathname.slice(1);
      if (request.method === "GET" && path === "mypage_kisekae.php") {
        hiroba.token = `${++hiroba.tokens}`.padStart(32, "0");
        return answer(path, editorPage(hiroba.set, hiroba.token), "text/html");
      }
      if (request.method === "GET" && path === "mypage_top.php") {
        return answer(path, myPage(hiroba.title), "text/html");
      }
      if (request.method === "POST" && path === "ajax/check_ip_kisekae.php") {
        return answer(path, `{"result":false}`, "application/json");
      }
      if (request.method === "POST" && path === "ajax/change_mydon.php") {
        const form = new Map(request.form);
        const read = (field: string) => Number(form.get(field));
        const next: CostumeSet = {
          colorBody: read("color_body"),
          colorLimb: read("color_limb"),
          colorFace: read("color_face"),
          costume1: read("costume_1"),
          costume2: read("costume_2"),
          costume3: read("costume_3"),
          costume4: read("costume_4"),
          costume5: read("costume_5"),
        };
        if (hiroba.saveCode === 0 || hiroba.saveCode === 5) {
          hiroba.set =
            next.costume1 !== 0
              ? { ...next, costume2: 0, costume3: 0, costume4: 0, costume5: 0 }
              : next;
        }
        hiroba.afterSave();
        return answer(
          path,
          JSON.stringify({ result: hiroba.saveCode, errmsg: "更新しました。", _tckt: "" }),
          "application/json",
        );
      }
      return answer(path, "not found", "text/plain");
    },
  };
  return { hiroba, transport };
}

async function change(
  transport: Transport,
  target: CostumeSet,
  crossCheck = false,
  expected: CostumeSet = WORN,
): Promise<WriteOutcome<CostumeSet>> {
  return changeCostume(
    { expected, target },
    { transport, hirobaOrigin: ORIGIN, now: () => NOON_JST, crossCheck },
  );
}

const routeOf = (request: TransportRequest) =>
  `${request.method} ${new URL(request.url).pathname.slice(1)}`;

describe("openCostumeEditor", () => {
  test("reads the set and the page's lists with one GET, and leaves the token behind", async () => {
    const { hiroba, transport } = fakeHiroba();
    const opened = await openCostumeEditor({ transport, hirobaOrigin: ORIGIN });
    expect(hiroba.requests.map(routeOf)).toEqual(["GET mypage_kisekae.php"]);
    expect(opened.ok && opened.value.state).toEqual(WORN);
    expect(opened.ok && opened.value.slots).toEqual(SLOTS);
    expect(opened.ok && Object.keys(opened.value)).toEqual(["state", "palette", "slots"]);
    expect(JSON.stringify(opened)).not.toContain(hiroba.token);
  });
});

describe("changeCostume", () => {
  test("a colour alone: the editor, the pre-check, one save and the read-back, in form order", async () => {
    const { hiroba, transport } = fakeHiroba();
    const outcome = await change(transport, { ...WORN, colorFace: 3 });
    expect(hiroba.requests.map(routeOf)).toEqual([
      "GET mypage_kisekae.php",
      "POST ajax/check_ip_kisekae.php",
      "POST ajax/change_mydon.php",
      "GET mypage_kisekae.php",
    ]);
    const posts = hiroba.requests.filter((request) => request.method === "POST");
    for (const post of posts) {
      expect(post.method === "POST" && post.form).toEqual([
        ["_tckt", "1".padStart(32, "0")],
        ["color_body", "12"],
        ["color_limb", "12"],
        ["color_face", "3"],
        ["costume_1", "0"],
        ["costume_2", "21"],
        ["costume_3", "68"],
        ["costume_4", "37"],
        ["costume_5", "140"],
      ]);
      expect(post.headers?.Referer).toBe(`${ORIGIN}/mypage_kisekae.php`);
      expect(post.headers?.["X-Requested-With"]).toBe("XMLHttpRequest");
    }
    expect(outcome).toMatchObject({ kind: "applied", after: { ...WORN, colorFace: 3 } });
  });

  test("a きぐるみ: the pieces come off, as planned, and the title is checked on my page", async () => {
    const { hiroba, transport } = fakeHiroba();
    const suited = { ...WORN, costume1: 36, costume2: 0, costume3: 0, costume4: 0, costume5: 0 };
    const outcome = await change(transport, suited, true);
    // My page first: its forms issue a token too, so the editor must be read last before the posts.
    expect(hiroba.requests.map(routeOf)).toEqual([
      "GET mypage_top.php",
      "GET mypage_kisekae.php",
      "POST ajax/check_ip_kisekae.php",
      "POST ajax/change_mydon.php",
      "GET mypage_kisekae.php",
      "GET mypage_top.php",
    ]);
    expect(outcome).toMatchObject({ kind: "applied", after: suited, cross: "unchanged" });
  });

  test("#22: a piece beside a きぐるみ is refused before any post", async () => {
    const { hiroba, transport } = fakeHiroba();
    const outcome = await change(transport, { ...WORN, costume1: 36 });
    expect(outcome).toEqual({ kind: "invalidTarget", field: "costume1" });
    expect(hiroba.requests.map(routeOf)).toEqual(["GET mypage_kisekae.php"]);
  });

  test("#23: one post puts all eight values back", async () => {
    const { hiroba, transport } = fakeHiroba();
    const suited = { ...WORN, costume1: 36, costume2: 0, costume3: 0, costume4: 0, costume5: 0 };
    hiroba.set = { ...suited };
    const outcome = await change(transport, WORN, false, suited);
    expect(outcome).toMatchObject({ kind: "applied", after: WORN });
    expect(hiroba.set).toEqual(WORN);
  });

  test("a code the set contradicts is a note: 5 with the change read back is applied", async () => {
    const { hiroba, transport } = fakeHiroba();
    hiroba.saveCode = 5;
    const outcome = await change(transport, { ...WORN, colorFace: 3 });
    expect(outcome.kind).toBe("applied");
    expect(outcome.kind === "applied" && outcome.save.code).toBe(5);
  });

  test("1 to 999 with nothing moved is refused, with the site's message as text", async () => {
    const { hiroba, transport } = fakeHiroba();
    hiroba.saveCode = 12;
    const outcome = await change(transport, { ...WORN, colorFace: 3 });
    expect(outcome.kind === "notApplied" && outcome.reason).toEqual({
      kind: "refused",
      code: 12,
      message: "更新しました。",
    });
  });

  test("3 means nothing special here: the costume's script has no such branch", async () => {
    const { hiroba, transport } = fakeHiroba();
    hiroba.saveCode = 3;
    expect((await change(transport, { ...WORN, colorFace: 3 })).kind).toBe("notApplied");
  });

  test("a title that moved during the write is diverged, though the costume is as planned", async () => {
    const { hiroba, transport } = fakeHiroba();
    hiroba.afterSave = () => {
      hiroba.title = "";
    };
    const outcome = await change(transport, { ...WORN, colorFace: 3 }, true);
    expect(outcome).toMatchObject({ kind: "diverged", cross: "changed" });
  });
});
