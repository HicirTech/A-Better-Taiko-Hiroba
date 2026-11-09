import type { CostumeEditorView } from "@abth/core";

import { PICTURE_EPOCH, type PictureKey } from "../shared/picture-store";
import type { AskedPlace, PngRules } from "../shared/png-answer";
import type {
  CostumeSlot,
  CourseIconWant,
  IconWant,
  OptionIconWant,
  PictureWant,
} from "../shared/session-port";
import {
  courseIconPath,
  crownIconPath,
  MEDAL_PLATE_PATH,
  type MedalPlateSource,
  MY_DON_PATH,
  type MyDonSource,
  type NoPictureSource,
  optionIconPath,
  type PictureSources,
  rankIconPath,
  type ScorePanelSource,
  scorePanelPath,
  TITLE_PLATE_PATH,
  type TitlePlateSource,
} from "./picture-sources";
import type { HirobaEndpoints } from "./types";

const ITEM_PATH = "/imgsrc_kisekae.php";
// Size bounds that tell the picture from a placeholder (a 43-byte GIF is Hiroba's "nothing to
// draw") and from anything else.
const ITEM_RULES = { minBytes: 128, maxBytes: 64 * 1024, maxSide: 512 } as const;
const ICON_RULES = { ...ITEM_RULES, maxSide: 256 } as const;
const PLATE_RULES = { minBytes: 1024, maxBytes: 256 * 1024, maxSide: 1280, maxHeight: 400 };
const PANEL_RULES = { minBytes: 10 * 1024, maxBytes: 512 * 1024, maxSide: 1280, maxHeight: 800 };
const MY_DON_RULES = { minBytes: 5 * 1024, maxBytes: 512 * 1024, maxSide: 640 } as const;
const SLOT_FIELDS = ["costume1", "costume2", "costume3", "costume4", "costume5"] as const;

/** What the platform knows now that decides whether a picture may be asked for at all. */
export interface PictureReadState {
  readonly signedIn: boolean;
  /** The items the last costume editor read offered, as `offerKey` writes them. */
  readonly offered: ReadonlySet<string>;
  /** Whose my page this run last read: the taiko number. Null before the first read. */
  readonly owner: string | null;
  /** Where the pictures that page showed are, checked. Null before the first read. */
  readonly sources: PictureSources | null;
}

export const offerKey = (slot: CostumeSlot, id: number) => `${slot}:${id}`;

/** Each slot's owned items plus the worn one, which the owned list may lack: the only thumbnails
 * that may be asked for, so ids cannot be walked. */
export function offeredOf(editor: CostumeEditorView): ReadonlySet<string> {
  const offered = new Set<string>();
  SLOT_FIELDS.forEach((part, index) => {
    const slot = (index + 1) as CostumeSlot;
    for (const id of editor.slots[index] ?? []) {
      offered.add(offerKey(slot, id));
    }
    if (editor.state[part] !== 0) {
      offered.add(offerKey(slot, editor.state[part]));
    }
  });
  return offered;
}

/** One picture's request, built here from a checked want: never from anything the window sent. */
export interface PictureRequest {
  readonly kind: PictureWant["kind"];
  readonly url: string;
  readonly referer: string;
  /** The checks the answer passes, among them where it must come from. */
  readonly rules: PngRules & { readonly at: AskedPlace };
  readonly key: PictureKey;
  /** Kept only once a later read of my page finds the session good: for a session it has ended,
   * Hiroba draws the bare plate blank, a PNG no check can tell apart. */
  readonly keptAfterRead: boolean;
}

type Refusal = "notOffered" | "notRead" | "notShown" | "unexpectedSrc" | "noHost";

function costumeItemRequest(
  want: Extract<PictureWant, { readonly kind: "costumeItem" }>,
  origin: string,
  state: PictureReadState,
): PictureRequest | Refusal {
  if (!state.offered.has(offerKey(want.slot, want.id))) {
    return "notOffered";
  }
  return {
    kind: want.kind,
    url: `${origin}${ITEM_PATH}?cos=${want.id}&type=${want.slot}`,
    referer: `${origin}/mypage_kisekae.php`,
    rules: { ...ITEM_RULES, at: { origin, path: ITEM_PATH } },
    // Shared by every account and kept for good: it names no player. The slot is in the key, as
    // one id sits in several slots.
    key: {
      scope: "shared",
      player: null,
      name: `${PICTURE_EPOCH}/item/${want.slot}/${want.id}`,
    },
    // A session gone gets a 43-byte GIF, which no check lets through.
    keptAfterRead: false,
  };
}

function titlePlateRequest(
  plate: TitlePlateSource | NoPictureSource,
  owner: string,
  origin: string,
): PictureRequest | Refusal {
  if (typeof plate === "string") {
    return plate;
  }
  // Bare is the plate of whoever holds the session; the other form names the taiko number.
  const query = plate.form === "bare" ? "" : `?taiko_no=${owner}`;
  return {
    kind: "titlePlate",
    url: `${origin}${TITLE_PLATE_PATH}${query}`,
    referer: `${origin}/mypage_top.php`,
    rules: { ...PLATE_RULES, at: { origin, path: TITLE_PLATE_PATH } },
    // Per player. The title and the form are in the name: a changed title is a plate of its own,
    // and the two forms are not known to draw the same.
    key: {
      scope: "player",
      player: owner,
      name: `${PICTURE_EPOCH}/titleplate/${plate.form}/${encodeURIComponent(plate.title)}`,
    },
    // Only the bare form depends on the session; the public one is the same without it.
    keptAfterRead: plate.form === "bare",
  };
}

type SharedIconWant = IconWant | CourseIconWant | OptionIconWant;

function iconSource(want: SharedIconWant): { path: string; name: string } {
  switch (want.kind) {
    case "rankIcon":
      return { path: rankIconPath(want.rank), name: `rank/${want.rank}` };
    case "crownIcon":
      return { path: crownIconPath(want.crown), name: `crown/${want.crown}` };
    case "courseIcon":
      return { path: courseIconPath(want.difficulty), name: `course/${want.difficulty}` };
    case "optionIcon":
      return { path: optionIconPath(want.option), name: `option/${want.option}` };
  }
}

function iconRequest(want: SharedIconWant, origin: string): PictureRequest {
  const { path, name } = iconSource(want);
  return {
    kind: want.kind,
    url: `${origin}${path}`,
    referer: `${origin}/mypage_top.php`,
    rules: { ...ICON_RULES, at: { origin, path } },
    // Shared and kept for good: static art that names no player, the same without a session.
    key: { scope: "shared", player: null, name: `${PICTURE_EPOCH}/${name}` },
    keptAfterRead: false,
  };
}

function scorePanelRequest(
  panel: ScorePanelSource | NoPictureSource,
  origin: string,
): PictureRequest | Refusal {
  if (typeof panel === "string") {
    return panel;
  }
  const path = scorePanelPath(panel.level);
  return {
    kind: "scorePanel",
    url: `${origin}${path}`,
    referer: `${origin}/mypage_top.php`,
    rules: { ...PANEL_RULES, at: { origin, path } },
    // Shared and kept for good: static art that names no player, the same without a session.
    key: { scope: "shared", player: null, name: `${PICTURE_EPOCH}/panel/${panel.level}` },
    keptAfterRead: false,
  };
}

function medalPlateRequest(
  plate: MedalPlateSource | NoPictureSource,
  owner: string,
  origin: string,
): PictureRequest | Refusal {
  if (typeof plate === "string") {
    return plate;
  }
  return {
    kind: "medalPlate",
    url: `${origin}${MEDAL_PLATE_PATH}?id=${plate.id}`,
    referer: `${origin}/mypage_top.php`,
    rules: { ...PLATE_RULES, at: { origin, path: MEDAL_PLATE_PATH } },
    // Per player. The season's id and progress are in the name: a new season is a plate of its
    // own, and the art may change once the set is complete (unverified).
    key: {
      scope: "player",
      player: owner,
      name: `${PICTURE_EPOCH}/tokenplate/${plate.id}/${plate.progress}`,
    },
    keptAfterRead: false,
  };
}

// Asked of the picture host, never with the session: the transports keep that for Hiroba.
function myDonRequest(
  portrait: MyDonSource | NoPictureSource,
  owner: string,
  endpoints: HirobaEndpoints,
): PictureRequest | Refusal {
  const origin = endpoints.imgOrigin;
  if (origin === null) {
    return "noHost";
  }
  if (typeof portrait === "string") {
    return portrait;
  }
  return {
    kind: "myDon",
    url: `${origin}${MY_DON_PATH}?v=${portrait.v}&kind=mydon&fn=mydon_${owner}`,
    // What a browser sends another site from my page: Hiroba's origin alone.
    referer: `${endpoints.hirobaOrigin}/`,
    rules: { ...MY_DON_RULES, at: { origin, path: MY_DON_PATH } },
    // Per player, and only the last one fetched: a changed costume leaves it behind, so it is
    // fetched anew then.
    key: { scope: "player", player: owner, name: `${PICTURE_EPOCH}/mydon` },
    keptAfterRead: false,
  };
}

/** What a request is built from: the fixed endpoints, and what the platform knows now. */
interface RequestPlace {
  readonly endpoints: HirobaEndpoints;
  readonly state: PictureReadState;
}

type RequestOf<K extends PictureWant["kind"]> = (
  want: Extract<PictureWant, { readonly kind: K }>,
  place: RequestPlace,
) => PictureRequest | Refusal;

/** A picture my page shows: none may be asked for until a read of it has said whose and where. */
const fromMyPage =
  (
    request: (
      owner: string,
      sources: PictureSources,
      endpoints: HirobaEndpoints,
    ) => PictureRequest | Refusal,
  ) =>
  (_want: PictureWant, { endpoints, state }: RequestPlace): PictureRequest | Refusal =>
    state.owner === null || state.sources === null
      ? "notRead"
      : request(state.owner, state.sources, endpoints);

const sharedIcon = (want: SharedIconWant, { endpoints }: RequestPlace) =>
  iconRequest(want, endpoints.hirobaOrigin);

// A record, so a kind of picture the port gains is a type error here until it has its request.
const REQUESTS: { readonly [K in PictureWant["kind"]]: RequestOf<K> } = {
  costumeItem: (want, { endpoints, state }) =>
    costumeItemRequest(want, endpoints.hirobaOrigin, state),
  titlePlate: fromMyPage((owner, { titlePlate }, { hirobaOrigin }) =>
    titlePlateRequest(titlePlate, owner, hirobaOrigin),
  ),
  scorePanel: fromMyPage((_owner, { scorePanel }, { hirobaOrigin }) =>
    scorePanelRequest(scorePanel, hirobaOrigin),
  ),
  medalPlate: fromMyPage((owner, { medalPlate }, { hirobaOrigin }) =>
    medalPlateRequest(medalPlate, owner, hirobaOrigin),
  ),
  myDon: fromMyPage((owner, { myDon }, endpoints) => myDonRequest(myDon, owner, endpoints)),
  rankIcon: sharedIcon,
  crownIcon: sharedIcon,
  courseIcon: sharedIcon,
  optionIcon: sharedIcon,
};

/** The request for `want` from a fixed path and `state`, or why there is none. */
export function requestOf(
  want: PictureWant,
  endpoints: HirobaEndpoints,
  state: PictureReadState,
): PictureRequest | Refusal {
  const request = REQUESTS[want.kind] as (
    want: PictureWant,
    place: RequestPlace,
  ) => PictureRequest | Refusal;
  return request(want, { endpoints, state });
}
