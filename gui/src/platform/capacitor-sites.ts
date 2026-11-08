import {
  endpointsFromOverrides,
  HIROBA_ENDPOINTS,
  type HirobaEndpoints,
  type SiteAddresses,
} from "../hiroba-session";
import { RATING_DATA_URL } from "../shared/rating-data/rating-links";
import {
  ABTH_CDN_URL,
  CHINESE_NAMES_URL,
  catalogueUrlFor,
  chartOriginFor,
  ESE_CHARTS_URL,
  ESE_MAPPING_URL,
} from "../shared/song-catalogue";
import { feedUrlFor } from "../shared/updates";

export const CAPACITOR_ENDPOINTS: HirobaEndpoints = import.meta.env.DEV
  ? endpointsFromOverrides(
      import.meta.env.VITE_ABTH_DEV_HIROBA_ORIGIN,
      import.meta.env.VITE_ABTH_DEV_IDP_HOST,
      import.meta.env.VITE_ABTH_DEV_IMG_ORIGIN,
      import.meta.env.VITE_ABTH_DEV_REFUSING_HOST,
    )
  : HIROBA_ENDPOINTS;

const DEV = Boolean(import.meta.env.DEV);
// Each variable is named outright: Vite fills in only the names it can see.
export const CAPACITOR_SITES: SiteAddresses = {
  updateFeedUrl: feedUrlFor(DEV, import.meta.env.VITE_ABTH_DEV_UPDATE_FEED),
  songCatalogueUrl: catalogueUrlFor(DEV, import.meta.env.VITE_ABTH_DEV_SONG_CATALOGUE),
  chineseNamesUrl: catalogueUrlFor(
    DEV,
    import.meta.env.VITE_ABTH_DEV_CHINESE_NAMES,
    CHINESE_NAMES_URL,
  ),
  ratingDataUrls: {
    ourtaikoV1: catalogueUrlFor(
      DEV,
      import.meta.env.VITE_ABTH_DEV_RATING_DATA,
      RATING_DATA_URL.ourtaikoV1,
    ),
    ourtaikoV2: catalogueUrlFor(
      DEV,
      import.meta.env.VITE_ABTH_DEV_RATING_DATA_V2,
      RATING_DATA_URL.ourtaikoV2,
    ),
  },
  chartOrigin: chartOriginFor(DEV, import.meta.env.VITE_ABTH_DEV_CHART_ORIGIN),
  eseMappingUrl: catalogueUrlFor(DEV, import.meta.env.VITE_ABTH_DEV_ESE_MAPPING, ESE_MAPPING_URL),
  eseChartsUrl: catalogueUrlFor(DEV, import.meta.env.VITE_ABTH_DEV_ESE_CHARTS, ESE_CHARTS_URL),
  cdnUrl: catalogueUrlFor(DEV, import.meta.env.VITE_ABTH_DEV_ABTH_CDN, ABTH_CDN_URL),
};
