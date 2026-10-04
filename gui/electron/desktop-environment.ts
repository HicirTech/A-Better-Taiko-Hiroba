import {
  endpointsFromOverrides,
  HIROBA_ENDPOINTS,
  type HirobaEndpoints,
} from "../src/hiroba-session";
import { catalogueUrlFor } from "../src/song-catalogue";
import { feedUrlFor } from "../src/updates";

export type Environment = Readonly<Record<string, string | undefined>>;

export interface DesktopEnvironment {
  /** Where the renderer comes from: Vite's dev server; undefined for the bundle the app serves. */
  readonly devServerUrl: string | undefined;
  /** Hiroba, the ID host and the picture host: the real sites, or the stand-in in development. */
  readonly endpoints: HirobaEndpoints;
  /** A folder for the app's data in place of the system's, apart from the installed app's. */
  readonly userData: string | undefined;
  /** The clock a write checks Hiroba's daily break against; development can fix it. */
  readonly now: () => Date;
  /** Where the update feed is read; undefined when this run checks for no update. */
  readonly updateFeedUrl: string | undefined;
  /** Where taiko.wiki's song list is read; undefined when this run reads none. */
  readonly songCatalogueUrl: string | undefined;
}

/** Only a development run takes anything from the environment: a packaged build uses real sites,
 * whatever it says. One of the two endpoint overrides alone throws, so the app stops. */
export function desktopEnvironment(packaged: boolean, env: Environment): DesktopEnvironment {
  const updateFeedUrl = feedUrlFor(!packaged, env.ABTH_DEV_UPDATE_FEED);
  const songCatalogueUrl = catalogueUrlFor(!packaged, env.ABTH_DEV_SONG_CATALOGUE);
  if (packaged) {
    return {
      devServerUrl: undefined,
      endpoints: HIROBA_ENDPOINTS,
      userData: undefined,
      now: () => new Date(),
      updateFeedUrl,
      songCatalogueUrl,
    };
  }
  const fixed = Date.parse(env.ABTH_DEV_NOW ?? "");
  return {
    devServerUrl: env.ABTH_DEV_SERVER_URL,
    endpoints: endpointsFromOverrides(
      env.ABTH_DEV_HIROBA_ORIGIN,
      env.ABTH_DEV_IDP_HOST,
      env.ABTH_DEV_IMG_ORIGIN,
    ),
    userData: env.ABTH_DEV_USER_DATA || undefined,
    now: Number.isNaN(fixed) ? () => new Date() : () => new Date(fixed),
    updateFeedUrl,
    songCatalogueUrl,
  };
}
