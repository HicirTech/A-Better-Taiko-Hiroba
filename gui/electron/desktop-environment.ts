import {
  endpointsFromOverrides,
  HIROBA_ENDPOINTS,
  type HirobaEndpoints,
  type SiteAddresses,
} from "../src/hiroba-session";
import { RATING_DATA_URL } from "../src/shared/rating-data/rating-links";
import {
  ABTH_CDN_URL,
  CHINESE_NAMES_URL,
  catalogueUrlFor,
  chartOriginFor,
  ESE_CHARTS_URL,
  ESE_MAPPING_URL,
} from "../src/shared/song-catalogue";
import { feedUrlFor } from "../src/shared/updates";

export type Environment = Readonly<Record<string, string | undefined>>;

export interface DesktopEnvironment extends SiteAddresses {
  /** Where the renderer comes from: Vite's dev server; undefined for the bundle the app serves. */
  readonly devServerUrl: string | undefined;
  /** Hiroba, the ID host and the picture host: the real sites, or the stand-in in development. */
  readonly endpoints: HirobaEndpoints;
  /** A folder for the app's data in place of the system's, apart from the installed app's. */
  readonly userData: string | undefined;
  /** The clock a write checks Hiroba's daily break against; development can fix it. */
  readonly now: () => Date;
  /** Windows open off every display, out of the taskbar and unfocused, for runs nobody watches. */
  readonly offScreen: boolean;
  /** Where a saved picture goes without the save box asking; undefined asks the player where. */
  readonly picturesFolder: string | undefined;
}

/** Only a development run takes anything from the environment: a packaged build uses real sites,
 * whatever it says. One of the two endpoint overrides alone throws, so the app stops. */
export function desktopEnvironment(packaged: boolean, env: Environment): DesktopEnvironment {
  const updateFeedUrl = feedUrlFor(!packaged, env.ABTH_DEV_UPDATE_FEED);
  const songCatalogueUrl = catalogueUrlFor(!packaged, env.ABTH_DEV_SONG_CATALOGUE);
  const chineseNamesUrl = catalogueUrlFor(!packaged, env.ABTH_DEV_CHINESE_NAMES, CHINESE_NAMES_URL);
  const ratingDataUrls = {
    ourtaikoV1: catalogueUrlFor(!packaged, env.ABTH_DEV_RATING_DATA, RATING_DATA_URL.ourtaikoV1),
    ourtaikoV2: catalogueUrlFor(!packaged, env.ABTH_DEV_RATING_DATA_V2, RATING_DATA_URL.ourtaikoV2),
  };
  const chartOrigin = chartOriginFor(!packaged, env.ABTH_DEV_CHART_ORIGIN);
  const eseMappingUrl = catalogueUrlFor(!packaged, env.ABTH_DEV_ESE_MAPPING, ESE_MAPPING_URL);
  const eseChartsUrl = catalogueUrlFor(!packaged, env.ABTH_DEV_ESE_CHARTS, ESE_CHARTS_URL);
  const cdnUrl = catalogueUrlFor(!packaged, env.ABTH_DEV_ABTH_CDN, ABTH_CDN_URL);
  if (packaged) {
    return {
      devServerUrl: undefined,
      endpoints: HIROBA_ENDPOINTS,
      userData: undefined,
      now: () => new Date(),
      updateFeedUrl,
      songCatalogueUrl,
      chineseNamesUrl,
      ratingDataUrls,
      chartOrigin,
      eseMappingUrl,
      eseChartsUrl,
      cdnUrl,
      offScreen: false,
      picturesFolder: undefined,
    };
  }
  const fixed = Date.parse(env.ABTH_DEV_NOW ?? "");
  return {
    devServerUrl: env.ABTH_DEV_SERVER_URL,
    endpoints: endpointsFromOverrides(
      env.ABTH_DEV_HIROBA_ORIGIN,
      env.ABTH_DEV_IDP_HOST,
      env.ABTH_DEV_IMG_ORIGIN,
      env.ABTH_DEV_REFUSING_HOST,
    ),
    userData: env.ABTH_DEV_USER_DATA || undefined,
    now: Number.isNaN(fixed) ? () => new Date() : () => new Date(fixed),
    updateFeedUrl,
    songCatalogueUrl,
    chineseNamesUrl,
    ratingDataUrls,
    chartOrigin,
    eseMappingUrl,
    eseChartsUrl,
    cdnUrl,
    offScreen: env.ABTH_DEV_OFF_SCREEN === "1",
    picturesFolder: env.ABTH_DEV_PICTURES_FOLDER || undefined,
  };
}
