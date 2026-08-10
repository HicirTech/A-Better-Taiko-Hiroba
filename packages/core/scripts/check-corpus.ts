/**
 * Runs every parser over every real captured page, and accounts for every refusal.
 *
 * **This is not part of CI and must not become part of it.** The pages it reads are a real player's
 * account — their taiko number, their nickname, their scores — and they never enter git. CI runs the
 * excerpt tests, which prove a parser matches *what we believed a page looks like*; this proves it
 * matches the page. Three times the first was green while the second was not: the score list's
 * two-l `donderfull`, the detail parser reading the 区間 blocks instead of the main record, and
 * `user_profile.php`'s `silver_crown_coun`.
 *
 *   bun run check:corpus                 # the default corpus location
 *   CORPUS=/some/where bun run check:corpus
 *
 * Exit code is 0 only when every refusal is explained. An unexplained refusal, or a capture no
 * parser claims, fails the run — that is the gate on closing E6.
 */
import type { Genre, Level } from "../src/index";
import {
  isErr,
  type ParseFailure,
  parseCostumePage,
  parseDanBoardPage,
  parseDanDetailPage,
  parsePlayerRowsPage,
  parseProfilePage,
  parsePublicProfilePage,
  parseRankDetailPage,
  parseRankListPage,
  parseRecentPlaysPage,
  parseScoreDetailPage,
  parseScoreListPage,
} from "../src/index";

const DEFAULT_CORPUS = "/root/hs_workspace/TaikoElaboation/ai-context/reference/hiroba-pages";
const TAIKO_NO = "000000000000";
const FETCHED_AT = "2026-01-01T00:00:00.000Z";

/** What a parser did with one capture. */
interface Outcome {
  readonly file: string;
  readonly parser: string;
  readonly failure: ParseFailure | null;
  /** Set when a failure is a known property of the page rather than a defect. */
  readonly expected: string | null;
  /** Whatever the reading produced, for the coverage pass. */
  readonly value: unknown;
}

/**
 * Which parser owns which capture, and which refusals that page is *supposed* to produce.
 *
 * Routing is by filename because the corpus is named after what was fetched. A capture matching no
 * rule is a finding in its own right — either a page nobody parses yet or a naming slip — so the
 * run fails on it rather than skipping it quietly.
 */
interface Route {
  readonly match: RegExp;
  readonly parser: string;
  readonly run: (html: string, file: string) => { failure: ParseFailure | null; value: unknown };
  /**
   * A refusal this capture is expected to produce, with the reason. Anything else from this route
   * is unexplained and fails the run.
   */
  readonly expect?: (file: string) => string | null;
}

/** The genre a score-list capture was fetched for, from its name. */
function genreOf(file: string): Genre {
  const digit = Number(file.match(/genre(\d)/)?.[1] ?? 1);
  return (digit >= 1 && digit <= 8 ? digit : 1) as Genre;
}

/** The chart a score-detail capture was fetched for, from its name. */
function chartOf(file: string): [string, Level] {
  const songNo = file.match(/score-detail-(\d+)/)?.[1] ?? "0";
  const level = Number(file.match(/lvl(\d)/)?.[1] ?? 4);
  return [songNo, (level >= 1 && level <= 5 ? level : 4) as Level];
}

/** The profile's subject: from the filename when it says, otherwise from the page itself. */
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

/**
 * Another player's `score_detail.php` is a **different shape**, exactly as their profile was.
 *
 * Measured: it carries no `.stage_cnt` and no `.clear_cnt` at all — no play count, no clear count —
 * and one record block where my page has six, because it has no 区間毎の成績 sections. So this is
 * not a defect in `parseScoreDetailPage`, which is my page's reader; it is a page nobody has
 * written a reader for. Reachable in practice: a ranking row links straight to it.
 */
const OTHER_PLAYERS_DETAIL =
  "another player's detail page — no .stage_cnt/.clear_cnt and no 区間 blocks; needs its own reader";

const ROUTES: readonly Route[] = [
  {
    // The corpus is named after what was fetched, so the genre comes from the filename — and a
    // reading that disagrees with it would be a finding rather than a detail.
    match: /^score-list-(p\d+-)?genre\d/,
    parser: "parseScoreListPage",
    run: (html, file) => attempt(parseScoreListPage(html, TAIKO_NO, genreOf(file), FETCHED_AT)),
  },
  {
    match: /^score-detail-/,
    parser: "parseScoreDetailPage",
    run: (html, file) => {
      const [songNo, level] = chartOf(file);
      return attempt(parseScoreDetailPage(html, TAIKO_NO, songNo, level, FETCHED_AT));
    },
    expect: (file) =>
      file.includes("loggedout")
        ? LOGGED_OUT
        : file.includes("private")
          ? SITE_ERROR
          : file.includes("-public")
            ? OTHER_PLAYERS_DETAIL
            : null,
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
  },
  {
    // The subject is in the filename; passing the wrong one would trip the parser's own
    // fetched-one-player-got-another check, which is the harness lying rather than a finding.
    match: /^user-profile-/,
    parser: "parsePublicProfilePage",
    run: (html, file) =>
      attempt(
        // Most captures name their subject; the one that does not (`-p308`) falls back to what the
        // page prints, which makes the parser's cross-check vacuous for that file alone.
        parsePublicProfilePage(html, subjectOf(html, file), FETCHED_AT),
      ),
  },
  {
    match: /^(costume|mypage-kisekae-\d|mypage-kisekae\.)/,
    parser: "parseCostumePage",
    run: (html) => attempt(parseCostumePage(html, TAIKO_NO, FETCHED_AT)),
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

/**
 * Captures no parser is meant to claim, and why.
 *
 * Being on this list is a decision, not an oversight — that is the difference between "we have not
 * written that parser" and "nobody noticed this page".
 */
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
  { match: /^(settings|mypage-other|title-|mypage-titleparts)/, reason: "write pages — E12's job" },
  { match: /^(select-song|form-data|portal-|favorite-)/, reason: "favourite write flow — E12" },
  { match: /^(rank-list-noparam)/, reason: "routed above" },
];

async function main(): Promise<number> {
  const corpus = process.env.CORPUS ?? DEFAULT_CORPUS;
  const files = [...new Bun.Glob("**/*.html").scanSync(corpus)].sort();
  if (files.length === 0) {
    console.error(`no captures under ${corpus} — set CORPUS to where they live`);
    return 1;
  }

  const outcomes: Outcome[] = [];
  const unrouted: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    const base = file.replace(/^.*\//, "");
    const route = ROUTES.find((candidate) => candidate.match.test(base));
    if (route === undefined) {
      const known = UNROUTED.find((candidate) => candidate.match.test(base));
      (known === undefined ? unrouted : skipped).push(file);
      continue;
    }
    const html = await Bun.file(`${corpus}/${file}`).text();
    const { failure, value } = route.run(html, base);
    outcomes.push({
      file,
      parser: route.parser,
      failure,
      expected: failure === null ? null : (route.expect?.(base) ?? null),
      value,
    });
  }

  report(outcomes, unrouted, skipped, files.length);

  const unexplained = outcomes.filter((one) => one.failure !== null && one.expected === null);
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

  console.log(`corpus: ${total} captures under review`);
  console.log(`  ${parsed.length} parsed`);
  console.log(`  ${explained.length} refused as expected`);
  console.log(`  ${skipped.length} not routed to any parser, by decision`);
  console.log(`  ${unexplained.length} unexplained`);
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

  if (unrouted.length > 0) {
    console.log("\nCAPTURES NO PARSER CLAIMS — add a route or say why not:");
    for (const file of unrouted) {
      console.log(redact(`  ${file}`));
    }
  }

  reportCoverage(parsed);
}

/**
 * Capture names carry other players' taiko numbers, and this report goes to a terminal and from
 * there into notes and issues. The numbers are public, but they are not ours to repeat, and the
 * lint rule this script is exempted from exists precisely so identifiers do not reach log lines.
 */
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

/**
 * Which values of each enumerable field the corpus actually exercised.
 *
 * This is the generated input epic #60 asks for: a parser is not verified by its tests passing but
 * by the range it has been shown, and until now that range was a hand count.
 */
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

/**
 * The enumerable fields worth counting, and the domain each is declared to have.
 *
 * Declaring the domain is the point: counting what was *seen* only says the corpus is non-empty,
 * while comparing it against what *exists* says which values nobody has ever shown a parser. An
 * empty array means the domain is open — `countLevel` is whatever number the site put on the panel
 * — so those are counted but never reported as short.
 */
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
