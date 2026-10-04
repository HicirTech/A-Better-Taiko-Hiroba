/// <reference types="vite/client" />

/** The version in `gui/package.json`, which Vite's `define` puts in at build time. */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** The origin of a local Hiroba stand-in, e.g. http://hiroba.<ip>.sslip.io:8807. */
  readonly VITE_ABTH_DEV_HIROBA_ORIGIN?: string;
  /** The host (and port) of the stand-in for the Bandai Namco ID host. */
  readonly VITE_ABTH_DEV_IDP_HOST?: string;
  /** The origin of the stand-in's picture host, e.g. http://img.<ip>.sslip.io:8807. */
  readonly VITE_ABTH_DEV_IMG_ORIGIN?: string;
  /** The address of a stand-in update feed; without it a development run checks for no update. */
  readonly VITE_ABTH_DEV_UPDATE_FEED?: string;
}
