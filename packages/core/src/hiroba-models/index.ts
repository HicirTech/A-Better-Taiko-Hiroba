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
 * #13).
 *
 * Layout follows ownership: `vocabulary.ts` holds Hiroba's shared enumerations, and each entity
 * file owns one concept. Entity files depend only on the vocabulary, never on each other; a file
 * holding an operation over an entity, as `song-resolution.ts` does, imports that entity's type
 * and nothing further.
 *
 * Named but not shaped, on purpose: rewards and unlocks, friends, competitions and challenges,
 * news and title history. They are mapped in the wiki's Reading pages and get a file here the day
 * something consumes them — an addition then, not a rework now.
 */
export type { Costume } from "./costume";
export { DAN_CLEAR_STATE_ORDER, isBetterDanClearState } from "./dan";
export type { DanClearState, DanCondition, DanRecord, DanSongResult } from "./dan";
export type { CrownCounts, FavoriteSong, Medal, Player, Profile, ProfileSummary } from "./player";
export type { PlayOptions, RandomMode, Score, ScoreFidelity, ScoreRecord } from "./score";
export { mergeGenreIntoCatalogue, updateCatalogue } from "./song";
export type { Chart, GenreReading, Song } from "./song";
export { resolveSongTitle } from "./song-resolution";
export type { AmbiguousTitle, ResolvedSong, SongResolution, UnknownTitle } from "./song-resolution";
export { playedOrNone } from "./vocabulary";
export type { CrownState, Genre, Level, ScoreRank } from "./vocabulary";
