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

/**
 * Only the kind leaves this module, plus the codes `describe` builds. A ParseFailure can carry page
 * text (the taiko-number line, the site's error message) in `raw`, so that is never shown, logged
 * or sent anywhere.
 */
const READ_FAILURE_OF_PARSE_FAILURE = {
  loggedOut: "loggedOut",
  siteError: "siteError",
  missingMarker: "unexpectedPage",
  unreadableValue: "unexpectedPage",
  wrongPage: "unexpectedPage",
} as const satisfies Record<ParseFailure["kind"], ReadFailureKind>;

/**
 * Reads the signed-in player's own page once and keeps what the interface shows.
 *
 * The starting point's only read, in the one file a later HirobaClient replaces. One request for
 * the page, no retry. The final URL is read before the body: Hiroba answers a lost session with its login page
 * at 200, and an unfinished card select would otherwise parse as a misleading unreadable value.
 *
 * My page shows the dan only as a picture, so a page that parsed and shows a dan label costs one
 * more request, for the label (`readDan`). Nothing that happens to that request fails the read: a
 * label that does not arrive or does not read is shown as such beside the rest of the page.
 */
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

/**
 * `readProfile` for a platform layer, which also learns whose page it read and where the page's
 * pictures are. Both stay with the platform and never reach the view: the taiko number, and every
 * source, the title plate's included.
 */
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
  const label = parsed.value.danLabelImageUrl;
  const dan = label === null ? null : await readDan(transport, endpoints, label);
  return ok({
    view: profileView(parsed.value, dan),
    taikoNo: parsed.value.taikoNo,
    pictures: pictureSourcesOf(parsed.value, endpoints),
  });
}

/**
 * What of my page crosses to the interface. Every field is copied by name, so nothing the parser
 * adds later crosses without a decision here: not the taiko number, and no URL, the dan label's
 * least of all, since it carries the taiko number in its query. Only the dan read off it crosses,
 * with the label's bytes as its picture: a data: URL, which names no address.
 */
function profileView(profile: Profile, dan: DanView | null): ProfileView {
  const { crownCounts, rankCounts, countLevel } = profile.summary;
  return {
    nickname: profile.nickname,
    title: profile.title,
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

/**
 * Codes for a report of a page this app did not expect: where the read ended, what came back, and
 * what the parser said. The path is kept and the query dropped; the parser's `marker` is a
 * selector this code wrote, and its `raw` (page text) is left out.
 */
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
