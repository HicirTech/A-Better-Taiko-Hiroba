/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Development only: the origin of a local stand-in for Hiroba, e.g. http://hiroba.<ip>.sslip.io:8807. */
  readonly VITE_ABTH_DEV_HIROBA_ORIGIN?: string;
  /** Development only: the host (and port) of the stand-in for the Bandai Namco ID host. */
  readonly VITE_ABTH_DEV_IDP_HOST?: string;
  /** Development only, and optional: the origin of the stand-in's picture host, e.g. http://img.<ip>.sslip.io:8807. */
  readonly VITE_ABTH_DEV_IMG_ORIGIN?: string;
}
