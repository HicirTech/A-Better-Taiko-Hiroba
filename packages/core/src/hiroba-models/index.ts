/**
 * The domain model, shaped from the wiki's Data-Model page.
 *
 * Pages are viewports onto these entities, not entities themselves: several pages fill the same
 * entity at different fidelity, and one page can touch several entities. The wiki page records the
 * decisions; these files hold their shape. When the two disagree, the wiki settles it and both are
 * corrected in the same piece of work.
 *
 * Two rules hold across every file here. Identifiers are strings and quantities are numbers — a
 * taiko number is never arithmetic. And every value is JSON-serializable end to end: timestamps
 * are ISO 8601 strings, because the use-case boundary serializes everything it returns (see epic
 * #13). The one exception is `FormToken`, a write's credential, which serialises to a stand-in on
 * purpose and never crosses that boundary.
 *
 * Layout follows ownership: `vocabulary.ts` holds Hiroba's shared enumerations, and each entity
 * file owns one concept. Entity files depend only on the vocabulary, never on each other; a file
 * holding an operation over an entity, as `song-resolution.ts` does, imports that entity's type
 * and nothing further.
 *
 * Named but not shaped, on purpose: rewards and unlocks, friends, rankings, competitions and
 * challenges, news and title history, the settings surface, the login and card layer, and a
 * written composition's part ids. They are mapped in the wiki and get a file here the day something
 * consumes them — an addition then, not a rework now. The part ids are the one with a deadline,
 * since nothing on the site gives them back once written — see `Profile.title`. Friend rows and
 * ranking rows are read, but into the parsers' own row types, not into an entity here. Other
 * players left this list when their pages got readers: `PublicProfile` is their profile, and their
 * score detail is a `Score` whose record carries null for any play count the page does not print.
 */
export type { Costume, CostumeSet } from "./costume";
export { FormToken } from "./form-token";
export {
  DAN_CLEAR_STATE_ORDER,
  DAN_NAMES,
  danClearStateFromRowTier,
  danNumberFromName,
  isBetterDanClearState,
} from "./dan";
export type {
  DanClearState,
  DanCondition,
  DanConditionStep,
  DanRecord,
  DanSongCounts,
  DanSongResult,
} from "./dan";
export type { NameState, TitleOption, TitleState } from "./identity";
export type {
  CrownCounts,
  FavoriteSong,
  Medal,
  MedalProgress,
  MedalUnrecognisedReason,
  Player,
  Profile,
  ProfileSummary,
  ProfileVisibility,
  PublicProfile,
} from "./player";
export type { PlayOptions, RandomMode, Score, ScoreFidelity, ScoreRecord } from "./score";
export { mergeGenreIntoCatalogue, updateCatalogue } from "./song";
export type { Chart, GenreReading, Song } from "./song";
export { resolveSongTitle } from "./song-resolution";
export type { AmbiguousTitle, ResolvedSong, SongResolution, UnknownTitle } from "./song-resolution";
export { playedOrNone, SCORE_RANK_NAMES, SCORE_RANK_TIERS } from "./vocabulary";
export type {
  CrownState,
  Genre,
  Level,
  RenameState,
  ScoreRank,
  ScoreRankTier,
} from "./vocabulary";
