import type { Page } from "../navigation/pages";
import { COSTUME_MODEL, COSTUME_PAGE } from "./costume";
import { FAVORITES_MODEL, FAVORITES_PAGE } from "./favorites";
import { KNOW_YOURSELF_MODEL, KNOW_YOURSELF_PAGE } from "./know-yourself";
import { NAME_TITLE_MODEL, NAME_TITLE_PAGE } from "./name-title";
import { OVERVIEW_MODEL, OVERVIEW_PAGE } from "./overview";
import type { PageEntry } from "./page";
import type { PageModel } from "./page-model";
import { RATING_MODEL, RATING_PAGE } from "./rating";
import { SCORES_MODEL, SCORES_PAGE } from "./scores";
import { SETTINGS_MODEL, SETTINGS_PAGE } from "./settings";

/** What each page reads, and when. */
export const PAGE_MODELS: Readonly<Record<Page, PageModel>> = {
  overview: OVERVIEW_MODEL,
  scores: SCORES_MODEL,
  rating: RATING_MODEL,
  knowYourself: KNOW_YOURSELF_MODEL,
  costume: COSTUME_MODEL,
  nameTitle: NAME_TITLE_MODEL,
  favorites: FAVORITES_MODEL,
  settings: SETTINGS_MODEL,
};

/** Every page: what it reads, and how the navigation lists it and the window draws it. */
export const PAGE_REGISTRY: Readonly<Record<Page, PageEntry>> = {
  overview: OVERVIEW_PAGE,
  scores: SCORES_PAGE,
  rating: RATING_PAGE,
  knowYourself: KNOW_YOURSELF_PAGE,
  costume: COSTUME_PAGE,
  nameTitle: NAME_TITLE_PAGE,
  favorites: FAVORITES_PAGE,
  settings: SETTINGS_PAGE,
};
