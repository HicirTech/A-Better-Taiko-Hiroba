/**
 * The mock's costume editor: mypage_kisekae.php, the two ajax posts a costume write sends, and the
 * hooks a test shapes them with. Stateful: a save changes what the page shows next.
 *
 * The page copies the real one's shape (reference/hiroba-pages/costume.html): the eight values in
 * `form#kisekae` with its `_tckt`, their `def_*` twins outside the form, a 63-swatch palette under
 * each of かお, どう and てあし, and five tabs of owned items, each an `a[name]` whose thumbnail's
 * `srctmp` names its slot. The ids, the colours and the token are placeholders, not a real account's.
 *
 * The save follows the server model the executed writes of 2026-08-09 fit: store the body, then, if
 * the posted きぐるみ (costume_1) is not 0, set the four pieces to 0 whatever the body said. So a
 * body naming a piece beside a きぐるみ moves nothing and still answers 0 (write #22).
 *
 * It also draws the editor's preview, imgsrc_mydon.php, as Hiroba does for a session only: a small
 * PNG made from the query's eight values, so two sets never share a picture, and without a session
 * the 43-byte GIF Hiroba draws nothing with, at 200. The items' thumbnails, imgsrc_kisekae.php, go
 * the same way: a PNG of its own for each item and slot (scripts/mock-pictures.ts), for a session
 * only.
 */
import { encode } from "fast-png";

import { NO_LABEL_GIF } from "./mock-dan-label";
import { thumbnailPng } from "./mock-pictures";

/** The eight values, in the order the page's form holds them after `_tckt`. */
export const COSTUME_FIELDS = [
  "color_body",
  "color_limb",
  "color_face",
  "costume_1",
  "costume_2",
  "costume_3",
  "costume_4",
  "costume_5",
] as const;

export type CostumeField = (typeof COSTUME_FIELDS)[number];
export type CostumeState = Record<CostumeField, number>;

/** Where the mock's costume starts, and returns to on /__state?reset=1. */
export const INITIAL_COSTUME: Readonly<CostumeState> = {
  color_body: 12,
  color_limb: 12,
  color_face: 5,
  costume_1: 0,
  costume_2: 21,
  costume_3: 68,
  costume_4: 37,
  costume_5: 140,
};

/**
 * The items owned in each slot, 1 to 5. As on the real page, one id can sit in several slots (21
 * here), so an id means something only with its slot.
 */
export const OWNED: Readonly<Record<1 | 2 | 3 | 4 | 5, readonly number[]>> = {
  1: [4, 14, 7, 36, 56],
  2: [59, 21, 60, 61],
  3: [68, 21, 70],
  4: [37, 21, 38],
  5: [126, 140, 143],
};

/**
 * What /__items?many=1 adds to the きぐるみ slot: forty ids more, so the slot holds more rows than
 * the app's grid shows at once, as real accounts' slots do (38 to 76 items).
 */
const MANY_MORE = Array.from({ length: 40 }, (_, at) => 200 + at);

/** A thumbnail as it was asked for: the item, its slot, and the page the request named. */
export interface ThumbnailRecord {
  readonly cos: number;
  readonly type: number;
  readonly referer: string | null;
}

const SLOT_TABS = ["kigu", "head", "body", "make", "acce"] as const;
const SLOT_LABELS = ["きぐるみ", "あたま", "からだ", "メイク", "ぷちキャラ"] as const;
const COLOUR_TABS = [
  ["face", "かお"],
  ["body", "どう"],
  ["limb", "てあし"],
] as const;
/** The real palette's size: ids 0 to 62. The colours are the mock's own. */
const PALETTE_SIZE = 63;

/** What the pre-check answers: the boolean false by default, as every recorded answer was. */
const PRECHECK_ANSWERS = ["false", "true", "1", "string1", "0", "null", "html"] as const;
type PrecheckAnswer = (typeof PRECHECK_ANSWERS)[number];

/** A session, as the mock keeps one: whether a card was chosen, and the editor's live token. */
export interface MockSession {
  cardChosen: boolean;
  ticket?: string | undefined;
}

/** One ajax post as it arrived: its headers, its field names in order, and whether its token held. */
export interface PostRecord {
  readonly path: string;
  readonly xRequestedWith: string | null;
  readonly origin: string | null;
  readonly referer: string | null;
  readonly contentType: string | null;
  readonly fields: readonly string[];
  /** Every field but `_tckt`, whose value is never kept. */
  readonly values: Readonly<Record<string, string>>;
  readonly ticketMatched: boolean;
}

/** The site's error page, as Hiroba answered a post without X-Requested-With (2026-08-09). */
export const ERROR_SHELL_BODY =
  "<h1>エラー</h1><table><tr><td>リクエストされたページは存在しません</td></tr></table>";

const HEX = "0123456789abcdef";
const newTicket = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => HEX[b % 16]).join("");

/** A colour for each palette id, as red, green and blue: spread out, and the same on every run. */
const swatchRgb = (id: number) => [37, 91, 151].map((step) => (id * step) % 256);
const swatch = (id: number) =>
  `#${swatchRgb(id)
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();

/** The preview's parameters, in the order mydon.js writes them. */
export const PREVIEW_PARAMETERS = [
  "face",
  "body",
  "limb",
  "cos1",
  "cos2",
  "cos3",
  "cos4",
  "cos5",
] as const;
const PREVIEW_SIDE = 48;

/**
 * The preview for a query: かお over どう over てあし, a band of each one's swatch, with noise seeded
 * from all eight values in the low bits, so every set has its own picture and each is well over
 * the kilobyte the app asks of one. No Bandai Namco art.
 */
function previewPng(params: URLSearchParams): Uint8Array {
  let seed = 0x811c9dc5;
  for (const name of PREVIEW_PARAMETERS) {
    seed = Math.imul(seed ^ Number(params.get(name) ?? 0), 0x01000193) >>> 0;
  }
  const next = () => {
    seed = (seed ^ (seed << 13)) >>> 0;
    seed = (seed ^ (seed >>> 17)) >>> 0;
    seed = (seed ^ (seed << 5)) >>> 0;
    return seed;
  };
  const bands = ["face", "body", "limb"].map((name) => swatchRgb(Number(params.get(name) ?? 0)));
  const data = new Uint8Array(PREVIEW_SIDE * PREVIEW_SIDE * 4);
  for (let y = 0; y < PREVIEW_SIDE; y++) {
    const [r = 0, g = 0, b = 0] = bands[Math.floor((y * bands.length) / PREVIEW_SIDE)] ?? [];
    for (let x = 0; x < PREVIEW_SIDE; x++) {
      const noise = next();
      data.set(
        [r ^ (noise & 31), g ^ ((noise >>> 5) & 31), b ^ ((noise >>> 10) & 31), 255],
        (y * PREVIEW_SIDE + x) * 4,
      );
    }
  }
  return new Uint8Array(encode({ width: PREVIEW_SIDE, height: PREVIEW_SIDE, data, channels: 4 }));
}

export function createCostumeEditor() {
  let state: CostumeState = { ...INITIAL_COSTUME };
  const issued: string[] = [];
  const posts: PostRecord[] = [];
  let precheckAnswer: PrecheckAnswer = "false";
  /** Set while /__hold-precheck?on=1 holds every pre-check's answer back; lets them all go. */
  let releasePrechecks: (() => void) | null = null;
  let prechecksHeld: Promise<void> = Promise.resolve();
  let nextResult: number | null = null;
  let noopNext = false;
  let expireNext = false;
  /** The query of every preview asked for, in order, as it came. */
  const previews: string[] = [];
  let previewAnswer: "png" | "gif" = "png";
  /** Every thumbnail asked for, in order, as it came. */
  const thumbnails: ThumbnailRecord[] = [];
  let thumbnailAnswer: "png" | "gif" | "html" = "png";
  let many = false;
  /** The items owned in `slot` now: the fixed lists, and forty more in the first after /__items. */
  const ownedIn = (slot: 1 | 2 | 3 | 4 | 5): readonly number[] =>
    slot === 1 && many ? [...OWNED[1], ...MANY_MORE] : OWNED[slot];

  const json = (value: unknown) => Response.json(value);

  /** A fresh token for `session`, voiding the one it had: the one token the save accepts. */
  const issue = (session: MockSession): string => {
    const ticket = newTicket();
    session.ticket = ticket;
    issued.push(ticket);
    return ticket;
  };

  return {
    /**
     * Any other page with a form, my page included, issues the session a token too, and so voids the
     * editor's: taken to be how the real site behaves after a save whose token came from the editor,
     * with my page read in between, answered 705 (2026-09-28).
     */
    issueTicket: issue,

    /** The set saved now, in COSTUME_FIELDS' order: what the player's My Don portrait shows. */
    saved(): readonly number[] {
      return COSTUME_FIELDS.map((field) => state[field]);
    },

    /** The editor page for `session`, handing it a fresh token. */
    page(session: MockSession): string {
      const ticket = issue(session);
      const hidden = (id: string, name: string, value: number) =>
        `<input type="hidden" id="${id}" name="${name}" value="${value}">`;
      const palette = Array.from(
        { length: PALETTE_SIZE },
        (_, id) =>
          `<li><span class="color" title="${id}" style="background-color: ${swatch(id)};"></span></li>`,
      ).join("\n");
      const colourTabs = COLOUR_TABS.map(
        ([tab]) =>
          `<div id="tab-${tab}"><ul><li class="row clearfix"><ul>\n${palette}\n</ul></li></ul></div>`,
      ).join("\n");
      const slotTabs = SLOT_TABS.map((tab, index) => {
        const slot = (index + 1) as 1 | 2 | 3 | 4 | 5;
        const items = ownedIn(slot)
          .map(
            (id) =>
              `<li><a name="${id}"><img src="image/sp/640/ajax-loader_640.gif" srctmp="imgsrc_kisekae.php?cos=${id}&type=${slot}"></a></li>`,
          )
          .join("\n");
        return `<div id="tab-cos-${tab}"><div class="costumeThumbArea"><ul>\n${items}\n</ul></div>
<div class="buttonArea removeBtn"><span class="button purple remove">はずす</span></div></div>`;
      }).join("\n");
      return `<header><h1>きせかえ</h1></header>
<div id="content">
<div class="contentBox mydonArea">
  <form id="kisekae" name="kisekae" action="ajax/change_mydon.php" method="post">
    <span class="button purple changeButton">決定</span>
    <input type="hidden" id="_tckt" name="_tckt" value="${ticket}" />
    ${COSTUME_FIELDS.map((field) => hidden(field, field, state[field])).join("\n    ")}
  </form>
</div>
${hidden("def_body", "body", state.color_body)}
${hidden("def_limb", "limb", state.color_limb)}
${hidden("def_face", "face", state.color_face)}
${[1, 2, 3, 4, 5].map((n) => hidden(`def_costume_${n}`, `costume_${n}`, state[`costume_${n}` as CostumeField])).join("\n")}
<div id="palette">
  <ul class="tabMenu"><li href="#tab-color">いろ</li><li href="#tab-costume">きせかえ</li></ul>
  <ul class="tabMenu" id="tab-color">${COLOUR_TABS.map(([tab, label]) => `<li href="#tab-${tab}">${label}</li>`).join("")}</ul>
  <ul class="tabMenu" id="tab-costume">${SLOT_TABS.map((tab, i) => `<li href="#tab-cos-${tab}">${SLOT_LABELS[i]}</li>`).join("")}</ul>
  <div class="element">
${colourTabs}
${slotTabs}
  </div>
</div>
</div>`;
    },

    /**
     * imgsrc_mydon.php: the picture of whatever set `search` names, for a session only. Without
     * one, or after /__preview?answer=gif, the 43-byte GIF Hiroba draws nothing with, at 200.
     */
    preview(search: string, signedIn: boolean): Response {
      previews.push(search.replace(/^\?/, ""));
      if (!signedIn || previewAnswer === "gif") {
        return new Response(NO_LABEL_GIF, { headers: { "content-type": "image/gif" } });
      }
      return new Response(previewPng(new URLSearchParams(search)), {
        headers: { "content-type": "image/png" },
      });
    },

    /**
     * imgsrc_kisekae.php: the thumbnail of item `cos` in slot `type`, for a session only. Without
     * one, or after /__thumb?answer=gif, the 43-byte GIF; after /__thumb?answer=html, the site's
     * error page, both at 200. The mock draws any item of any slot 1 to 5, owned or not: whether
     * Hiroba draws one the account does not own has not been seen.
     */
    thumbnail(params: URLSearchParams, signedIn: boolean, referer: string | null): Response {
      const cos = Number(params.get("cos") ?? "");
      const type = Number(params.get("type") ?? "");
      thumbnails.push({ cos, type, referer });
      if (thumbnailAnswer === "html") {
        return new Response(ERROR_SHELL_BODY, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
      const drawable = Number.isInteger(cos) && cos > 0 && [1, 2, 3, 4, 5].includes(type);
      if (!signedIn || thumbnailAnswer === "gif" || !drawable) {
        return new Response(NO_LABEL_GIF, { headers: { "content-type": "image/gif" } });
      }
      return new Response(thumbnailPng(type, cos), { headers: { "content-type": "image/png" } });
    },

    /** Keeps what a post to either endpoint carried, before anything answers it. */
    record(
      path: string,
      request: Request,
      form: URLSearchParams,
      session: MockSession | undefined,
    ) {
      const values: Record<string, string> = {};
      for (const [name, value] of form) {
        if (name !== "_tckt") {
          values[name] = value;
        }
      }
      posts.push({
        path,
        xRequestedWith: request.headers.get("x-requested-with"),
        origin: request.headers.get("origin"),
        referer: request.headers.get("referer"),
        contentType: request.headers.get("content-type"),
        fields: [...form.keys()],
        values,
        ticketMatched: session?.ticket !== undefined && form.get("_tckt") === session.ticket,
      });
    },

    /** Settles once pre-checks may be answered: at once, unless /__hold-precheck holds them. */
    precheckLetThrough(): Promise<void> {
      return prechecksHeld;
    },

    /** ajax/check_ip_kisekae.php: the boolean false, unless a test asked for another answer. */
    precheck(): Response {
      switch (precheckAnswer) {
        case "false":
          return json({ result: false });
        case "true":
          return json({ result: true });
        case "1":
          return json({ result: 1 });
        case "string1":
          return json({ result: "1" });
        case "0":
          return json({ result: 0 });
        case "null":
          return json({ result: null });
        case "html":
          return new Response(ERROR_SHELL_BODY, {
            headers: { "content-type": "text/html; charset=utf-8" },
          });
      }
    },

    /**
     * ajax/change_mydon.php. A token that is not the session's latest answers 705 with the message
     * the real site gave on 2026-09-28, and a new token, as the site's script expects; a right one
     * saves by the server model and is spent.
     */
    save(session: MockSession, form: URLSearchParams, endAllSessions: () => void): Response {
      if (session.ticket === undefined || form.get("_tckt") !== session.ticket) {
        const ticket = issue(session);
        return json({
          result: 705,
          errmsg: "更新に失敗しました。再度画面の読み込みを行ってください。",
          _tckt: ticket,
        });
      }
      if (nextResult !== null) {
        const result = nextResult;
        nextResult = null;
        return json({ result, errmsg: `（モック）コード ${result}`, _tckt: "" });
      }
      session.ticket = undefined;
      if (noopNext) {
        noopNext = false;
        return json({ result: 0, errmsg: "更新しました。", _tckt: "" });
      }
      const next = { ...state };
      for (const field of COSTUME_FIELDS) {
        const value = form.get(field);
        if (value !== null && /^\d+$/.test(value)) {
          next[field] = Number(value);
        }
      }
      if (next.costume_1 !== 0) {
        next.costume_2 = 0;
        next.costume_3 = 0;
        next.costume_4 = 0;
        next.costume_5 = 0;
      }
      state = next;
      if (expireNext) {
        expireNext = false;
        endAllSessions();
      }
      return json({ result: 0, errmsg: "更新しました。", _tckt: "" });
    },

    /**
     * The costume's test hooks, or null for a path that is not one:
     * /__state (the saved costume; with field=value pairs, set those, as a change made elsewhere;
     * with reset=1, back to the start), /__precheck?answer=false|true|1|string1|0|null|html (what
     * every pre-check answers from now on), /__hold-precheck?on=1 or 0 (pre-checks are held
     * unanswered, so a test can ask for more while a write waits in its middle; 0 lets every held
     * one go), /__next-result?code=N (the next valid save answers N and saves nothing),
     * /__noop-save (the next valid save answers 0 and saves nothing),
     * /__expire-on-save (the next valid save saves, then every session ends), /__tickets (every
     * token the editor handed out), /__posts (every ajax post as it arrived; ?reset=1 clears),
     * /__previews (the query of every preview asked for, in order; ?reset=1 clears),
     * /__preview?answer=png|gif (what every preview answers a session with from now on),
     * /__thumbs (every thumbnail asked for, in order, as {cos, type, referer}; ?reset=1 clears),
     * /__thumb?answer=png|gif|html (what every thumbnail answers a session with from now on) and
     * /__items (the items each slot owns; ?many=1 adds forty to the きぐるみ slot, ?many=0 takes
     * them away again).
     */
    hook(pathname: string, params: URLSearchParams): Response | null {
      switch (pathname) {
        case "/__state": {
          if (params.get("reset") === "1") {
            state = { ...INITIAL_COSTUME };
          }
          for (const field of COSTUME_FIELDS) {
            const value = params.get(field);
            if (value !== null && /^\d+$/.test(value)) {
              state[field] = Number(value);
            }
          }
          return json(state);
        }
        case "/__precheck": {
          const answer = params.get("answer");
          if (PRECHECK_ANSWERS.includes(answer as PrecheckAnswer)) {
            precheckAnswer = answer as PrecheckAnswer;
          }
          return new Response(precheckAnswer);
        }
        case "/__hold-precheck": {
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
        case "/__next-result": {
          const code = params.get("code") ?? "";
          nextResult = /^\d+$/.test(code) ? Number(code) : null;
          return new Response(String(nextResult));
        }
        case "/__noop-save":
          noopNext = true;
          return new Response("noop");
        case "/__expire-on-save":
          expireNext = true;
          return new Response("expiring");
        case "/__tickets":
          return json(issued);
        case "/__posts":
          if (params.get("reset") === "1") {
            posts.length = 0;
          }
          return json(posts);
        case "/__previews":
          if (params.get("reset") === "1") {
            previews.length = 0;
          }
          return json(previews);
        case "/__preview": {
          const answer = params.get("answer");
          if (answer === "png" || answer === "gif") {
            previewAnswer = answer;
          }
          return new Response(previewAnswer);
        }
        case "/__thumbs":
          if (params.get("reset") === "1") {
            thumbnails.length = 0;
          }
          return json(thumbnails);
        case "/__thumb": {
          const answer = params.get("answer");
          if (answer === "png" || answer === "gif" || answer === "html") {
            thumbnailAnswer = answer;
          }
          return new Response(thumbnailAnswer);
        }
        case "/__items": {
          const wanted = params.get("many");
          if (wanted === "1" || wanted === "0") {
            many = wanted === "1";
          }
          return json(
            Object.fromEntries(([1, 2, 3, 4, 5] as const).map((slot) => [slot, ownedIn(slot)])),
          );
        }
        default:
          return null;
      }
    },
  };
}
