/** Where the stand-in for Hiroba listens, and what points the stand-in and the app there. */
import { RATING_DATA_URL } from "../src/shared/rating-data/rating-links";
import {
  ABTH_CDN_URL,
  CHINESE_NAMES_URL,
  ESE_CHARTS_URL,
  ESE_MAPPING_URL,
  SONG_CATALOGUE_URL,
} from "../src/shared/song-catalogue";
import { ABTH_CDN_PATH } from "./mock-abth-cdn";
import { CHINESE_NAMES_PATH } from "./mock-chinese-names";
import { ESE_CHARTS_PATH, ESE_MAPPING_PATH } from "./mock-ese";
import { RATING_DATA_PATHS } from "./mock-rating-data";
import { SONG_CATALOGUE_PATH } from "./mock-song-catalogue";

/** One address and two ports: one for Hiroba and its pictures, one for the sign-in hosts. */
export interface MockAddress {
  readonly ip: string;
  readonly hirobaPort: number;
  readonly idpPort: number;
}

/** The dev run's stand-in; each lane of the end-to-end run takes ports of its own. */
export const DEV_ADDRESS: MockAddress = { ip: "127.0.0.1", hirobaPort: 8807, idpPort: 8808 };

/** The address a stand-in starts on, as its environment gives it: the dev run's by default. */
export function mockAddressOf(env: Readonly<Record<string, string | undefined>>): MockAddress {
  return {
    ip: env.ABTH_MOCK_IP ?? DEV_ADDRESS.ip,
    hirobaPort: Number(env.ABTH_MOCK_HIROBA_PORT ?? DEV_ADDRESS.hirobaPort),
    idpPort: Number(env.ABTH_MOCK_IDP_PORT ?? DEV_ADDRESS.idpPort),
  };
}

/** Each third party an unpackaged app is told of: its variable, real address and stand-in path. */
const THIRD_PARTIES = [
  ["ABTH_DEV_SONG_CATALOGUE", SONG_CATALOGUE_URL, SONG_CATALOGUE_PATH],
  ["ABTH_DEV_CHINESE_NAMES", CHINESE_NAMES_URL, CHINESE_NAMES_PATH],
  ["ABTH_DEV_RATING_DATA", RATING_DATA_URL.ourtaikoV1, RATING_DATA_PATHS.ourtaikoV1],
  ["ABTH_DEV_RATING_DATA_V2", RATING_DATA_URL.ourtaikoV2, RATING_DATA_PATHS.ourtaikoV2],
  ["ABTH_DEV_ESE_MAPPING", ESE_MAPPING_URL, ESE_MAPPING_PATH],
  ["ABTH_DEV_ESE_CHARTS", ESE_CHARTS_URL, ESE_CHARTS_PATH],
  ["ABTH_DEV_ABTH_CDN", ABTH_CDN_URL, ABTH_CDN_PATH],
] as const;
type ThirdPartyVariable = (typeof THIRD_PARTIES)[number][0];

/** Where an unpackaged app reads the third parties: the stand-in at `origin`, or the real sites. */
export function thirdPartyEnvironment(origin: string | null): Record<ThirdPartyVariable, string> {
  return Object.fromEntries(
    THIRD_PARTIES.map(([name, real, path]) => [name, origin === null ? real : `${origin}${path}`]),
  ) as Record<ThirdPartyVariable, string>;
}

/** Every origin and host of the stand-in at `address`, and the variables that point there. */
export function mockOrigins(address: MockAddress) {
  const { ip, hirobaPort, idpPort } = address;
  const hirobaHostName = `hiroba.${ip}.sslip.io`;
  const idpHostName = `id.${ip}.sslip.io`;
  const hiroba = `http://${hirobaHostName}:${hirobaPort}`;
  const idpHost = `${idpHostName}:${idpPort}`;
  // On Hiroba's server and port, and outside its cookie's Domain.
  const pictureHost = `img.${ip}.sslip.io:${hirobaPort}`;
  const img = `http://${pictureHost}`;
  // A service that refuses embedded browsers, off both sites, as Google is.
  const refusingHost = `refuses.${ip}.sslip.io:${idpPort}`;
  return {
    ...address,
    hirobaHostName,
    idpHostName,
    hiroba,
    idpHost,
    idp: `http://${idpHost}`,
    // The OAuth hop is on a second ID host, as the real one: allowing only the form's host
    // stops there.
    idpAuth: `http://auth.${idpHost}`,
    pictureHost,
    img,
    refusingHost,
    /** A sign-in page that is not on https. */
    offsiteHost: `offsite.${ip}.sslip.io:${idpPort}`,
    /** What the stand-in's own process is given, so it listens here. */
    mockEnvironment: {
      ABTH_MOCK_IP: ip,
      ABTH_MOCK_HIROBA_PORT: String(hirobaPort),
      ABTH_MOCK_IDP_PORT: String(idpPort),
    },
    /** What an unpackaged app is given, so it signs in and reads here alone. */
    appEnvironment: {
      ABTH_DEV_HIROBA_ORIGIN: hiroba,
      ABTH_DEV_IDP_HOST: idpHost,
      ABTH_DEV_IMG_ORIGIN: img,
      ABTH_DEV_REFUSING_HOST: refusingHost,
      ABTH_DEV_CHART_ORIGIN: hiroba,
      ...thirdPartyEnvironment(hiroba),
    },
  };
}
