/** The data folder's other names; each kept thing names its own file. Renaming one loses data. */
export const DATA_FOLDER = {
  session: "session.json",
  pipelines: "pipelines",
  pictures: "pictures",
  charts: "charts",
  densities: "densities",
  drawnCharts: "drawn-charts",
} as const;
