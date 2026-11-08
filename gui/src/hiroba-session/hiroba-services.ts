import { err, ok, type RatingSystem, type Transport } from "@abth/core";

import type { PictureStore } from "../shared/picture-store";
import {
  createPipeline,
  createPipelineLog,
  EXTERNAL_READ_CONSUMERS,
  HISTORY_READ_CONSUMERS,
  IO_READ_CONSUMERS,
  type PipelineHistoryStore,
  SCORE_READ_CONSUMERS,
} from "../shared/pipelines";
import { readRatingData } from "../shared/rating-data/read-rating-data";
import type { CostumeSet, PortImplementation } from "../shared/session-port";
import {
  cdnChartReader,
  createChartDensityReader,
  createChartPictureReader,
  createChartTjaReader,
  createDrawnCharts,
  createEseChartFiles,
  readChineseNames,
  readSongCatalogue,
} from "../shared/song-catalogue";
import { readUpdateFeed } from "../shared/updates";
import {
  KEPT_COSTUME_HISTORY,
  KEPT_FOLDER_HISTORY,
  KEPT_RATING_HISTORY,
  KEPT_RECENT_PLAYS,
  KEPT_SCORE_CHANGES,
  KEPT_SCORES,
  type KeptStore,
  type KeptThing,
} from "./kept-things";
import type { WritePlatform } from "./live-checked-writes";
import type { PictureSources } from "./picture-sources";
import { previewCostume } from "./preview-costume";
import { keepHirobaEnded, type PortPipelines, viewOfPipelines } from "./queue-port";
import { createRatingHistory } from "./rating-history-store";
import { createPictureReader, offeredOf, type PictureLimits } from "./read-picture";
import { readOwnProfile } from "./read-profile";
import { createRecentPlaysReader } from "./read-recent-plays";
import { createScoresReader } from "./read-scores";
import { createRecentPreviews } from "./recent-previews";
import { sessionEnded } from "./session-ended";
import { createSessionWrites } from "./session-writes";
import type { HirobaEndpoints } from "./types";

/** Where a run reads the sites beside Hiroba; undefined where it reads none. */
export interface SiteAddresses {
  readonly updateFeedUrl: string | undefined;
  /** taiko.wiki's song list. */
  readonly songCatalogueUrl: string | undefined;
  /** The Chinese wiki's song names. */
  readonly chineseNamesUrl: string | undefined;
  readonly ratingDataUrls: Readonly<Record<RatingSystem, string | undefined>>;
  /** The stand-in's origin, which chart pictures are read from too. */
  readonly chartOrigin: string | undefined;
  /** The map of song numbers to chart files. */
  readonly eseMappingUrl: string | undefined;
  readonly eseChartsUrl: string | undefined;
  /** ABTH CDN's drawings and note counts. */
  readonly cdnUrl: string | undefined;
}

/** Where the services keep what they keep, as the shell's platform keeps it. */
export interface ServiceStores {
  /** A pipeline's history, by the pipeline's name. */
  pipeline(name: string): PipelineHistoryStore;
  kept<T, M>(thing: KeptThing<T, M>): KeptStore<T, M>;
  readonly pictures: PictureStore;
  readonly charts: PictureStore;
  readonly densities: PictureStore;
  readonly drawnCharts: PictureStore;
}

/** What a shell gives the services: its sites, transports, stores and its end of a session. */
export interface HirobaServiceParts {
  readonly endpoints: HirobaEndpoints;
  readonly sites: SiteAddresses;
  readonly platform: WritePlatform;
  /** The clock a write checks Hiroba's daily break against. */
  readonly now: () => Date;
  readonly hiroba: Transport;
  /** The other sites' transport, which holds no session. */
  readonly external: Transport;
  readonly pictureLimits: PictureLimits;
  readonly stores: ServiceStores;
  readonly signedIn: () => boolean;
  /** The shell's own end of a session: its cookie, and what remembers it across launches. */
  readonly endSession: () => void | Promise<void>;
  /** Runs after a read or a write of Hiroba that may have renewed the session. */
  readonly afterHiroba?: () => Promise<void>;
}

/** The verbs only a shell can answer: whether it holds a session, and its sign-in. */
type SessionVerbs = "isSignedIn" | "signIn" | "cancelSignIn";

export interface HirobaServices {
  readonly pipelines: PortPipelines;
  /** Every verb but the shell's own three, before `queuePort` puts each in its pipeline. */
  readonly verbs: Omit<PortImplementation, SessionVerbs>;
  /** Ends the session: Hiroba's pipelines stop and the player's data held here is let go. */
  forget(): Promise<void>;
}

/** The services both shells answer alike, built from the parts each shell has. */
export function createHirobaServices(parts: HirobaServiceParts): HirobaServices {
  const { endpoints, sites, stores, signedIn } = parts;
  const logs = {
    io: createPipelineLog({ store: stores.pipeline("io") }),
    pictures: createPipelineLog({ store: stores.pipeline("pictures") }),
    history: createPipelineLog({ store: stores.pipeline("history") }),
    scores: createPipelineLog({ store: stores.pipeline("scores") }),
    external: createPipelineLog({ store: stores.pipeline("external") }),
  };
  // Hiroba is asked through `io`, so no read lands inside a write, but for its play history and
  // score details: those pages carry no form token.
  const pipelines = {
    io: createPipeline({
      readConsumers: IO_READ_CONSUMERS,
      transport: parts.hiroba,
      ended: keepHirobaEnded(logs),
    }),
    history: createPipeline({
      readConsumers: HISTORY_READ_CONSUMERS,
      transport: parts.hiroba,
      ended: logs.history.add,
    }),
    scores: createPipeline({
      readConsumers: SCORE_READ_CONSUMERS,
      transport: parts.hiroba,
      ended: logs.scores.add,
    }),
    external: createPipeline({
      readConsumers: EXTERNAL_READ_CONSUMERS,
      transport: parts.external,
      ended: logs.external.add,
    }),
  };
  // Whose my page was last read (the taiko number), where its pictures are, and which costume
  // items the editor offered: forgotten with the session.
  let owner: string | null = null;
  let sources: PictureSources | null = null;
  let offered: ReadonlySet<string> = new Set();

  // A kept picture answers at once, even while a write runs; only a fetch waits in the pipeline.
  const pictures = createPictureReader({
    endpoints,
    store: stores.pictures,
    pipeline: pipelines.io,
    limits: parts.pictureLimits,
    state: () => ({ signedIn: signedIn(), offered, owner, sources }),
  });
  const chartPictures = createChartPictureReader({
    store: stores.charts,
    pipeline: pipelines.external,
    chartOrigin: sites.chartOrigin,
  });
  const chartFiles = createEseChartFiles({
    mappingUrl: sites.eseMappingUrl,
    chartsUrl: sites.eseChartsUrl,
  });
  const chartDensities = createChartDensityReader({
    store: stores.densities,
    pipeline: pipelines.external,
    cdnUrl: sites.cdnUrl,
    files: chartFiles,
  });
  const chartTja = createChartTjaReader({ pipeline: pipelines.external, files: chartFiles });
  const drawnCharts = createDrawnCharts(stores.drawnCharts);
  const previews = createRecentPreviews((set, picture) => void writes.previewKept(set, picture));
  const servedPreview = (hiroba: Transport) =>
    previews.keeping(async (set: CostumeSet) => {
      if (!signedIn()) {
        return err({ code: "preview=notSignedIn" });
      }
      return previewCostume(hiroba, endpoints, set);
    });

  const forget = async () => {
    pipelines.io.stop();
    pipelines.history.stop();
    pipelines.scores.stop();
    owner = null;
    sources = null;
    offered = new Set();
    pictures.forget();
    previews.clear();
    await parts.endSession();
  };
  const { afterHiroba } = parts;
  /** Runs, then lets the shell keep what Hiroba renewed, however the call ended. */
  const renewing = <A extends unknown[], R>(run: (...args: A) => Promise<R>) =>
    afterHiroba === undefined
      ? run
      : async (...args: A): Promise<R> => {
          try {
            return await run(...args);
          } finally {
            await afterHiroba();
          }
        };

  const writes = createSessionWrites({
    endpoints,
    platform: parts.platform,
    now: parts.now,
    historyStore: stores.kept(KEPT_COSTUME_HISTORY),
    folderHistoryStore: stores.kept(KEPT_FOLDER_HISTORY),
    recentPreview: previews.pictureOf,
    signedIn,
    endSession: forget,
    owner: () => owner,
    costumeChanged: (worn) => {
      pictures.costumeChanged();
      previews.wear(worn);
    },
  });
  const recentPlays = createRecentPlaysReader({
    endpoints,
    pipeline: pipelines.history,
    store: stores.kept(KEPT_RECENT_PLAYS),
    owner: () => owner,
    endSession: forget,
    walked: (taikoNo, reading) => scores.noteWalk(taikoNo, reading),
  });
  const scores = createScoresReader({
    endpoints,
    io: pipelines.io,
    pipeline: pipelines.scores,
    store: stores.kept(KEPT_SCORES),
    changes: stores.kept(KEPT_SCORE_CHANGES),
    owner: () => owner,
    endSession: forget,
    walk: recentPlays.readRecentPlays,
    walkProgress: recentPlays.recentPlaysProgress,
    recentPlays: recentPlays.recentPlays,
  });
  const ratings = createRatingHistory({
    store: stores.kept(KEPT_RATING_HISTORY),
    owner: () => owner,
  });

  return {
    pipelines,
    forget,
    verbs: {
      readProfile: async (hiroba, options) => {
        if (!signedIn()) {
          return err({ kind: "notSignedIn" });
        }
        if (options?.renewsPortrait !== false) {
          pictures.myPageAsked();
        }
        const read = await readOwnProfile(hiroba, endpoints);
        if (!read.ok && sessionEnded(read.error)) {
          await forget();
        } else {
          await afterHiroba?.();
        }
        if (!read.ok) {
          return read;
        }
        owner = read.value.taikoNo;
        sources = read.value.pictures;
        await pictures.confirm(read.value.taikoNo);
        return ok(read.value.view);
      },
      signOut: forget,
      openCostumeEditor: renewing(async (hiroba) => {
        const read = await writes.openCostumeEditor(hiroba);
        if (read.ok) {
          previews.wear(read.value.state);
          offered = offeredOf(read.value);
        }
        return read;
      }),
      openTitleEditor: renewing(writes.openTitleEditor),
      // Its failure forgets nothing: the next page read says whether the session is over.
      previewCostume: (hiroba, set) => servedPreview(hiroba)(set),
      readPicture: (want, again) => pictures.read(want, again),
      changeCostume: renewing(writes.changeCostume),
      changeTitle: renewing(writes.changeTitle),
      changeName: renewing(writes.changeName),
      costumeHistory: writes.costumeHistory,
      readUpdateFeed: (site) => readUpdateFeed(site, sites.updateFeedUrl),
      openFavorites: renewing(writes.openFavorites),
      changeFolder: renewing(writes.changeFolder),
      changeFavoriteSong: renewing(writes.changeFavoriteSong),
      folderHistory: writes.folderHistory,
      readSongPicker: renewing(writes.readSongPicker),
      refreshHiroba: renewing(writes.refreshHiroba),
      scores: scores.scores,
      listedCharts: scores.listedCharts,
      readScores: renewing(scores.readScores),
      readEveryScore: renewing(scores.readEveryScore),
      readSongScores: renewing(scores.readSongScores),
      scoresProgress: scores.scoresProgress,
      ratingHistory: ratings.ratingHistory,
      keepRating: ratings.keepRating,
      readSongCatalogue: (site, since) => readSongCatalogue(site, sites.songCatalogueUrl, since),
      readChineseNames: (site) => readChineseNames(site, sites.chineseNamesUrl),
      readRatingData: (site, system) => readRatingData(site, system, sites.ratingDataUrls[system]),
      readChartPicture: chartPictures,
      readCdnChart: cdnChartReader(sites.cdnUrl, chartPictures),
      readChartDensity: chartDensities,
      readChartTja: chartTja,
      readDrawnChart: drawnCharts.read,
      keepDrawnChart: drawnCharts.keep,
      readPipelines: async (history) => viewOfPipelines(pipelines, logs, history),
    },
  };
}
