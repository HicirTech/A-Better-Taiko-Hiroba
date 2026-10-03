// Not for CI: the captures are a real player's account and never enter git. The excerpt tests prove
// a parser matches what we believed a page looks like; this proves it matches the page.
import { join } from "node:path";
import type { Genre, Level } from "../src/index";
import {
  isErr,
  type ParseFailure,
  type Profile,
  parseCostumeEditorPage,
  parseCostumePage,
  parseDanBoardPage,
  parseDanDetailPage,
  parsePlayerRowsPage,
  parseProfilePage,
  parsePublicProfilePage,
  parsePublicScoreDetailPage,
  parseRankDetailPage,
  parseRankListPage,
  parseRecentPlaysPage,
  parseRenameEditorPage,
  parseScoreDetailPage,
  parseScoreListPage,
  parseTitleEditorPage,
} from "../src/index";

/** `ai-context/` sits beside the repository, so this holds on any machine with that layout. */
const DEFAULT_CORPUS = join(import.meta.dir, "../../../../ai-context/reference/hiroba-pages");
const TAIKO_NO = "000000000000";
const FETCHED_AT = "2026-01-01T00:00:00.000Z";

interface Outcome {
  readonly file: string;
  readonly parser: string;
  readonly failure: ParseFailure | null;
  readonly expected: string | null;
  /** Set when the page parsed but a field of it read as unrecognised: a code naming which. */
  readonly unrecognised: string | null;
  readonly value: unknown;
}

// Routing is by filename, as the corpus is named after what was fetched; every matching route
// runs, since one page can feed several parsers. A capture no route claims fails the run.
interface Route {
  readonly match: RegExp;
  readonly parser: string;
  readonly run: (html: string, file: string) => { failure: ParseFailure | null; value: unknown };
  /** The reason a refusal is expected from this capture; any other refusal fails the run. */
  readonly expect?: (file: string, failure: ParseFailure) => string | null;
  /** A code for a field kept as unrecognised: the page parsed, but one part has an unseen form. */
  readonly unrecognised?: (value: unknown) => string | null;
}

function genreOf(file: string): Genre {
  const digit = Number(file.match(/genre(\d)/)?.[1] ?? 1);
  return (digit >= 1 && digit <= 8 ? digit : 1) as Genre;
}

function chartOf(file: string): [string, Level] {
  const songNo = file.match(/score-detail-(\d+)/)?.[1] ?? "0";
  const level = Number(file.match(/lvl(\d)/)?.[1] ?? 4);
  return [songNo, (level >= 1 && level <= 5 ? level : 4) as Level];
}

/** Another player's capture is named after the player, so its chart comes from the page. */
function chartOnPage(html: string): [string, Level] {
  const link = html.match(/rank_detail\.php\?rank=\d&song_no=(\d+)&level=(\d)/);
  const level = Number(link?.[2] ?? 4);
  return [link?.[1] ?? "0", (level >= 1 && level <= 5 ? level : 4) as Level];
}

function subjectOf(html: string, file: string): string {
  return file.match(/(\d{12})/)?.[1] ?? html.match(/太鼓番：(\d{12})/)?.[1] ?? TAIKO_NO;
}

function attempt<T>(result: { ok: true; value: T } | { ok: false; error: ParseFailure }) {
  return isErr(result)
    ? { failure: result.error, value: null }
    : { failure: null, value: result.value };
}

/** The site's own error page is a property of the request, never of the parser. */
const SITE_ERROR = "the site's error page — a bad parameter or a value that does not exist";
const LOGGED_OUT = "captured while logged out, on purpose";
/** The same error page, carrying a privacy refusal rather than a bad request. */
const CLOSED_PROFILE = "the site's error page — this player has closed their profile";

const ROUTES: readonly Route[] = [
  {
    // The genre comes from the filename; a reading that disagrees would be a finding.
    match: /^score-list-(p\d+-)?genre\d/,
    parser: "parseScoreListPage",
    run: (html, file) => attempt(parseScoreListPage(html, TAIKO_NO, genreOf(file), FETCHED_AT)),
  },
  {
    // Another player's detail page: the subject comes from the filename, the chart from the page.
    // The closed profile is expected as `siteError` and nothing else.
    match: /^score-detail-\d{12}-/,
    parser: "parsePublicScoreDetailPage",
    run: (html, file) => {
      const [songNo, level] = chartOnPage(html);
      return attempt(
        parsePublicScoreDetailPage(html, subjectOf(html, file), songNo, level, FETCHED_AT),
      );
    },
    expect: (file, failure) =>
      file.includes("-private") && failure.kind === "siteError" ? CLOSED_PROFILE : null,
  },
  {
    match: /^score-detail-(?!\d{12}-)/,
    parser: "parseScoreDetailPage",
    run: (html, file) => {
      const [songNo, level] = chartOf(file);
      return attempt(parseScoreDetailPage(html, TAIKO_NO, songNo, level, FETCHED_AT));
    },
    expect: (file) => (file.includes("loggedout") ? LOGGED_OUT : null),
  },
  {
    match: /^history-recent/,
    parser: "parseRecentPlaysPage",
    run: (html) => attempt(parseRecentPlaysPage(html)),
  },
  {
    match: /^(profile|mypage-top)/,
    parser: "parseProfilePage",
    run: (html) => attempt(parseProfilePage(html, FETCHED_AT)),
    unrecognised: (value) => {
      const progress = (value as Profile).medal?.progress;
      return progress?.kind === "unrecognised" ? `medal=${progress.reason}` : null;
    },
  },
  {
    match: /^(profile|mypage-top)/,
    parser: "parseRenameEditorPage",
    run: (html) => attempt(parseRenameEditorPage(html)),
  },
  {
    // The subject must match the filename: a wrong one trips the parser's own mismatch check.
    match: /^user-profile-/,
    parser: "parsePublicProfilePage",
    run: (html, file) =>
      attempt(
        // `-p308` names no subject and falls back to the page, so its cross-check is vacuous.
        parsePublicProfilePage(html, subjectOf(html, file), FETCHED_AT),
      ),
  },
  {
    match: /^(costume|mypage-kisekae-\d|mypage-kisekae\.)/,
    parser: "parseCostumePage",
    run: (html) => attempt(parseCostumePage(html, TAIKO_NO, FETCHED_AT)),
  },
  {
    match: /^(costume|mypage-kisekae-\d|mypage-kisekae\.)/,
    parser: "parseCostumeEditorPage",
    run: (html) => attempt(parseCostumeEditorPage(html)),
  },
  {
    match: /^title-edit/,
    parser: "parseTitleEditorPage",
    run: (html) => attempt(parseTitleEditorPage(html)),
  },
  {
    match: /^(friend-|block-list|user-search-)/,
    parser: "parsePlayerRowsPage",
    run: (html) => attempt(parsePlayerRowsPage(html, "user_search.php")),
  },
  {
    match: /^dan-top/,
    parser: "parseDanBoardPage",
    run: (html) => attempt(parseDanBoardPage(html)),
  },
  {
    match: /^dan-detail-/,
    parser: "parseDanDetailPage",
    run: (html) => attempt(parseDanDetailPage(html, 1, TAIKO_NO, FETCHED_AT, "none")),
    expect: (file) => (/dan-detail-(1[6-9]|noparam)/.test(file) ? SITE_ERROR : null),
  },
  {
    match: /^rank-list-/,
    parser: "parseRankListPage",
    run: (html) => attempt(parseRankListPage(html)),
    expect: (file) => (file.includes("noparam") ? SITE_ERROR : null),
  },
  {
    match: /^rank-detail-/,
    parser: "parseRankDetailPage",
    run: (html) => attempt(parseRankDetailPage(html)),
    expect: (file) => (/nochart|pref48/.test(file) ? SITE_ERROR : null),
  },
];

/** Captures no parser is meant to claim, and why: being listed is a decision, not an oversight. */
const UNROUTED: readonly { readonly match: RegExp; readonly reason: string }[] = [
  { match: /^logged-out/, reason: "the logged-out page itself — the shape every parser refuses" },
  { match: /^index/, reason: "index.php is the portal, not my page — nothing parses it" },
  { match: /^login-select/, reason: "the card-select page; no parser reads it (E8's job)" },
  { match: /^(reward|mypage-kisekae-favorite)/, reason: "reward catalogues — no parser yet (E11)" },
  {
    match: /^(campaign|other-faq|message|history-mynews|history-gettitle)/,
    reason: "out of scope",
  },
  { match: /^(compe|challenge)/, reason: "competitions and challenges are out of scope" },
  { match: /^(settings|mypage-other|mypage-titleparts)/, reason: "write pages — E12's job" },
  {
    match: /^title-parts/,
    reason: "the parts composer is a separate feature, not in the first title and name writes",
  },
  { match: /^(select-song|form-data|portal-|favorite-)/, reason: "favourite write flow — E12" },
  { match: /^(rank-list-noparam)/, reason: "routed above" },
];

async function main(): Promise<number> {
  const corpus = process.env.CORPUS ?? DEFAULT_CORPUS;
  // The glob answers in the platform's separator; routing and the report both read `/`.
  const files = [...new Bun.Glob("**/*.html").scanSync(corpus)]
    .map((file) => file.replaceAll("\\", "/"))
    .sort();
  if (files.length === 0) {
    console.error(`no captures under ${corpus} — set CORPUS to where they live`);
    return 1;
  }

  const outcomes: Outcome[] = [];
  const unrouted: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    const base = file.replace(/^.*\//, "");
    const routes = ROUTES.filter((candidate) => candidate.match.test(base));
    if (routes.length === 0) {
      const known = UNROUTED.find((candidate) => candidate.match.test(base));
      (known === undefined ? unrouted : skipped).push(file);
      continue;
    }
    const html = await Bun.file(`${corpus}/${file}`).text();
    for (const route of routes) {
      const { failure, value } = route.run(html, base);
      outcomes.push({
        file,
        parser: route.parser,
        failure,
        expected: failure === null ? null : (route.expect?.(base, failure) ?? null),
        unrecognised: failure === null ? (route.unrecognised?.(value) ?? null) : null,
        value,
      });
    }
  }

  report(outcomes, unrouted, skipped, files.length);

  const unexplained = outcomes.filter(
    (one) => (one.failure !== null && one.expected === null) || one.unrecognised !== null,
  );
  return unexplained.length === 0 && unrouted.length === 0 ? 0 : 1;
}

function report(
  outcomes: readonly Outcome[],
  unrouted: readonly string[],
  skipped: readonly string[],
  total: number,
): void {
  const parsed = outcomes.filter((one) => one.failure === null);
  const explained = outcomes.filter((one) => one.failure !== null && one.expected !== null);
  const unexplained = outcomes.filter((one) => one.failure !== null && one.expected === null);
  const unrecognised = parsed.filter((one) => one.unrecognised !== null);

  console.log(`corpus: ${total} captures under review`);
  console.log(`  ${parsed.length - unrecognised.length} parsed`);
  console.log(`  ${explained.length} refused as expected`);
  console.log(`  ${skipped.length} not routed to any parser, by decision`);
  console.log(`  ${unexplained.length + unrecognised.length} unexplained`);
  console.log(`  ${unrouted.length} claimed by nothing at all`);

  if (explained.length > 0) {
    console.log("\nexpected refusals:");
    for (const one of explained) {
      console.log(redact(`  ${one.file}\n    ${describe(one.failure)}\n    ↳ ${one.expected}`));
    }
  }

  if (unexplained.length > 0) {
    console.log("\nUNEXPLAINED REFUSALS — each is a parser defect or a value nobody has seen:");
    for (const one of unexplained) {
      console.log(redact(`  ${one.file}  [${one.parser}]\n    ${describe(one.failure)}`));
    }
  }

  if (unrecognised.length > 0) {
    console.log(
      "\nUNRECOGNISED FIELDS — the page parsed, but part of it has a shape nobody has seen:",
    );
    for (const one of unrecognised) {
      console.log(redact(`  ${one.file}  [${one.parser}]\n    ${one.unrecognised}`));
    }
  }

  if (unrouted.length > 0) {
    console.log("\nCAPTURES NO PARSER CLAIMS — add a route or say why not:");
    for (const file of unrouted) {
      console.log(redact(`  ${file}`));
    }
  }

  reportCoverage(parsed);
}

/** Capture names carry other players' taiko numbers; they are public but not ours to repeat. */
function redact(text: string): string {
  return text.replace(/(?<![0-9])[0-9]{12}(?![0-9])/g, "<taiko-no>");
}

/** A failure with the raw token it carried — that token is what separates a bug from a gap. */
function describe(failure: ParseFailure | null): string {
  if (failure === null) {
    return "parsed";
  }
  switch (failure.kind) {
    case "loggedOut":
      return `loggedOut on ${failure.page}`;
    case "missingMarker":
      return `missingMarker on ${failure.page}: ${failure.marker}`;
    case "unreadableValue":
      return `unreadableValue on ${failure.page}: ${failure.marker} held ${JSON.stringify(failure.raw)}`;
    case "wrongPage":
      return `wrongPage: ${failure.page} looks like ${failure.looksLike} (${failure.marker})`;
    case "siteError":
      return `siteError on ${failure.page}: ${JSON.stringify(failure.message)}`;
  }
}

/** Which values of each enumerable field the corpus exercised: that range verifies a parser. */
function reportCoverage(parsed: readonly Outcome[]): void {
  const seen = new Map<string, Map<string, number>>();
  const note = (field: string, value: unknown) => {
    if (value === undefined || value === null) {
      return;
    }
    const key = String(value);
    const bucket = seen.get(field) ?? new Map<string, number>();
    bucket.set(key, (bucket.get(key) ?? 0) + 1);
    seen.set(field, bucket);
  };

  for (const { value } of parsed) {
    walk(value, note);
  }

  console.log("\nvalues the corpus exercised, against the domain each field is declared to have:");
  const gaps: string[] = [];
  for (const field of Object.keys(ENUMERABLE).sort()) {
    const bucket = seen.get(field) ?? new Map<string, number>();
    const domain = ENUMERABLE[field] ?? [];
    const missing = domain.filter((value) => !bucket.has(String(value)));
    const values = [...bucket.entries()]
      .sort((left, right) => right[1] - left[1])
      .map(([value, count]) => `${value}×${count}`)
      .join("  ");
    const coverage =
      domain.length === 0 ? "(open domain)" : `${domain.length - missing.length}/${domain.length}`;
    console.log(`  ${field.padEnd(12)} ${coverage.padEnd(14)} ${values || "(none)"}`);
    if (missing.length > 0) {
      gaps.push(`${field}: ${missing.join(", ")}`);
    }
  }

  if (gaps.length === 0) {
    console.log("\n  every declared domain is fully exercised by the corpus.");
  } else {
    console.log("\n  values no capture has ever shown a parser:");
    for (const gap of gaps) {
      console.log(`    ${gap}`);
    }
  }

  const thin = [...seen.entries()].flatMap(([field, bucket]) =>
    [...bucket.entries()].filter(([, count]) => count === 1).map(([value]) => `${field}=${value}`),
  );
  if (thin.length > 0) {
    console.log(`\n  seen exactly once, so proved by one page: ${thin.join("  ")}`);
  }
}

/** The enumerable fields worth counting, each with its declared domain; an empty domain is open. */
const ENUMERABLE: Readonly<Record<string, readonly (string | number)[]>> = {
  crown: ["none", "played", "silver", "gold", "donderful"],
  scoreRank: [2, 3, 4, 5, 6, 7, 8],
  level: [1, 2, 3, 4, 5],
  genre: [1, 2, 3, 4, 5, 6, 7, 8],
  clearState: [
    "none",
    "redClear",
    "redFullCombo",
    "redDonderful",
    "goldClear",
    "goldFullCombo",
    "goldDonderful",
  ],
  visibility: ["open", "achievementsHidden", "closed"],
  rename: ["open", "closed", "unknown"],
  scope: ["japan", "prefecture", "world"],
  // Two unions share this key: a player row's dan state and a dan condition's shape.
  kind: ["dan", "none", "notShown", "course", "perSong"],
  fidelity: ["list", "detail", "recent"],
  countLevel: [],
};

function walk(node: unknown, note: (field: string, value: unknown) => void, depth = 0): void {
  if (depth > 6 || node === null || typeof node !== "object") {
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      walk(item, note, depth + 1);
    }
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key in ENUMERABLE && (typeof value === "string" || typeof value === "number")) {
      note(key, value);
    } else {
      walk(value, note, depth + 1);
    }
  }
}

process.exit(await main());
