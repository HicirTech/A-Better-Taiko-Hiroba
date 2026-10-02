import {
  endpointsFromOverrides,
  HIROBA_ENDPOINTS,
  type HirobaEndpoints,
} from "../src/hiroba-session";

/** The variables a desktop run was started with, as a map. */
export type Environment = Readonly<Record<string, string | undefined>>;

/** What the way a desktop run was started decides. Only a development run is decided by anything. */
export interface DesktopEnvironment {
  /** Where the renderer comes from: Vite's dev server; undefined for the bundle the app serves. */
  readonly devServerUrl: string | undefined;
  /** Hiroba, the ID host and the picture host: the real sites, or the stand-in in development. */
  readonly endpoints: HirobaEndpoints;
  /** A folder for the app's data in place of the system's, so a run keeps it from the installed app's. */
  readonly userData: string | undefined;
  /** The clock a write checks Hiroba's daily break against; development can fix it. */
  readonly now: () => Date;
}

/**
 * What the environment may decide, and only for a development run: the renderer's dev server, the
 * stand-in for Hiroba and the ID host (one of the two endpoint overrides alone throws, so the app
 * stops rather than half-reaching Hiroba; the picture host's is optional), a folder for the app's
 * data, and a fixed clock (an ISO time in `ABTH_DEV_NOW`, so a test runs at any hour and can try the
 * break itself). A packaged build takes none of it, whatever its environment says: it talks only to
 * the real sites, keeps its data where the system says and reads the clock.
 *
 * Nothing here shuts or opens a write: every kind is open in every build, packaged or not.
 */
export function desktopEnvironment(packaged: boolean, env: Environment): DesktopEnvironment {
  if (packaged) {
    return {
      devServerUrl: undefined,
      endpoints: HIROBA_ENDPOINTS,
      userData: undefined,
      now: () => new Date(),
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
  };
}
