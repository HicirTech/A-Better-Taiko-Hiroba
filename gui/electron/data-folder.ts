/** What the app keeps in its data folder, by name: a renamed one loses what players kept in it. */
export const DATA_FOLDER = {
  session: "session.json",
  costumeHistory: "costume-history.json",
  folderHistory: "folder-history.json",
  recentPlays: "recent-plays.json",
  scores: "scores.json",
  scoreChanges: "score-changes-2.json",
  /** Where builds that logged no hits kept their score changes. */
  scoreChangesBeforeHits: "score-changes.json",
  ratingHistory: "rating-history.json",
  pipelines: "pipelines",
  pictures: "pictures",
  charts: "charts",
  densities: "densities",
  drawnCharts: "drawn-charts",
} as const;
