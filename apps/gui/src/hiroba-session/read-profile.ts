import {
  err,
  isErr,
  ok,
  type ParseFailure,
  type Profile,
  parseProfilePage,
  type Result,
  type Transport,
  type TransportResponse,
} from "@abth/core";

import type { DanView, ProfileView, ReadFailure, ReadFailureKind } from "../session-port";
import { myPageUrl } from "./endpoints";
import { type PictureSources, pictureSourcesOf } from "./picture-sources";
import { readDan } from "./read-dan";
import { signInStep } from "./sign-in-step";
import type { HirobaEndpoints, SignInStep } from "./types";

// Only the kind leaves this module, plus the codes `describe` builds. A ParseFailure's `raw` can
// carry page text (the taiko-number line, the site's error message): never shown, logged or sent.
const READ_FAILURE_OF_PARSE_FAILURE = {
  loggedOut: "loggedOut",
  siteError: "siteError",
  missingMarker: "unexpectedPage",
  unreadableValue: "unexpectedPage",
  wrongPage: "unexpectedPage",
} as const satisfies Record<ParseFailure["kind"], ReadFailureKind>;

/** Reads the signed-in player's own page once, with no retry, keeping what the interface shows. */
export async function readProfile(
  transport: Transport,
  endpoints: HirobaEndpoints,
  now: () => Date = () => new Date(),
): Promise<Result<ProfileView, ReadFailure>> {
  const read = await readOwnProfile(transport, endpoints, now);
  return isErr(read) ? read : ok(read.value.view);
}

/** What a platform layer learns from reading my page, beside what the interface shows. */
export interface OwnProfileRead {
  readonly view: ProfileView;
  /** Whose page it was: tells whose undo record is whose, and whose pictures are whose. */
  readonly taikoNo: string;
  /** Where the pictures the page showed are, checked, for the platform to fetch them from. */
  readonly pictures: PictureSources;
}

/** `readProfile` for a platform layer, which also learns whose page it read and where its pictures
 * are. Both stay with the platform and never reach the view. */
export async function readOwnProfile(
  transport: Transport,
  endpoints: HirobaEndpoints,
  now: () => Date = () => new Date(),
): Promise<Result<OwnProfileRead, ReadFailure>> {
  const sent = await transport.send({ method: "GET", url: myPageUrl(endpoints) });
  if (isErr(sent)) {
    return err({ kind: sent.error.kind });
  }
  const response = sent.value;
  // The final URL is read before the body: a lost session answers with the login page at 200.
  const step = signInStep(response.url, endpoints);
  switch (step) {
    case "hirobaLogin":
      return err({ kind: "loggedOut" });
    case "cardSelect":
      return err({ kind: "cardSelectUnfinished" });
    case "otherHiroba":
      break;
    default:
      return err({ kind: "unexpectedPage", detail: describe(response, step) });
  }
  const html = new TextDecoder("utf-8").decode(response.body);
  const parsed = parseProfilePage(html, now().toISOString());
  if (isErr(parsed)) {
    const kind = READ_FAILURE_OF_PARSE_FAILURE[parsed.error.kind];
    return err(
      kind === "unexpectedPage"
        ? { kind, detail: describe(response, step, parsed.error) }
        : { kind },
    );
  }
  // A dan label that does not arrive or does not read is shown as such; it never fails the read.
  const label = parsed.value.danLabelImageUrl;
  const dan = label === null ? null : await readDan(transport, endpoints, label);
  return ok({
    view: profileView(parsed.value, dan),
    taikoNo: parsed.value.taikoNo,
    pictures: pictureSourcesOf(parsed.value, endpoints),
  });
}

/** What of my page crosses to the interface. Every field is copied by name, so nothing the parser
 * adds later crosses undecided: no taiko number, no URL (the dan label's carries the number). */
function profileView(profile: Profile, dan: DanView | null): ProfileView {
  const { crownCounts, rankCounts, countLevel } = profile.summary;
  return {
    nickname: profile.nickname,
    title: profile.title,
    rename: profile.rename,
    region: profile.region,
    dan,
    crowns: {
      silver: crownCounts.silver,
      gold: crownCounts.gold,
      donderful: crownCounts.donderful,
    },
    panel: {
      countLevel,
      ranks: {
        2: rankCounts[2],
        3: rankCounts[3],
        4: rankCounts[4],
        5: rankCounts[5],
        6: rankCounts[6],
        7: rankCounts[7],
        8: rankCounts[8],
      },
    },
    medal:
      profile.medal === null
        ? null
        : { name: profile.medal.name, progress: profile.medal.progress },
    favoriteSong: profile.favoriteSong?.title ?? null,
    favoriteFolder: profile.favoriteFolderTitles,
    fetchedAt: profile.fetchedAt,
  };
}

// Codes for a report of an unexpected page. The path is kept and the query dropped; the parser's
// `marker` is a selector this code wrote, and its `raw` (page text) is left out.
function describe(response: TransportResponse, step: SignInStep, parse?: ParseFailure): string {
  let path = "?";
  try {
    path = new URL(response.url).pathname;
  } catch {
    // The final URL did not parse; "?" says so.
  }
  const parts = [
    `step=${step}`,
    `path=${path}`,
    `status=${response.status}`,
    `type=${response.headers["content-type"] ?? "-"}`,
    `bytes=${response.body.byteLength}`,
  ];
  if (parse !== undefined) {
    parts.push(`parse=${parse.kind}${"marker" in parse ? `@${parse.marker}` : ""}`);
  }
  return parts.join(" ");
}
