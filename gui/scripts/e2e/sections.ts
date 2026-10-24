import type { Section } from "./context";
import {
  costumeEditor,
  costumeEditorKeys,
  costumeWrite,
  costumeWriteKeys,
  portraitPreview,
  portraitPreviewKeys,
} from "./costume-editor";
import {
  costumeLayout,
  costumeLayoutKeys,
  costumePhone,
  costumePhoneKeys,
  costumeTiles,
  costumeTilesKeys,
} from "./costume-layout";
import {
  saveInPlace,
  saveInPlaceKeys,
  thumbnails,
  thumbnailsKeys,
  tileThumbnails,
  tileThumbnailsKeys,
} from "./costume-thumbnails";
import { dataFolder, dataFolderKeys } from "./data-folder";
import { favoriteWrites, favoriteWritesKeys } from "./favorite-writes";
import { favorites, favoritesKeys } from "./favorites";
import { knowYourself, knowYourselfKeys } from "./know-yourself";
import { menuSwipe, menuSwipeKeys } from "./menu-swipe";
import {
  namePlate,
  namePlateKeys,
  nameTitleWrites,
  nameTitleWritesKeys,
  nickname,
  nicknameKeys,
  title,
  titleKeys,
} from "./name-title";
import { overview, overviewKeys } from "./overview";
import { pageGone, pageGoneKeys } from "./page-gone";
import {
  medalPlate,
  medalPlateKeys,
  myDonFailure,
  myDonFailureKeys,
  pictures,
  picturesKeys,
  titlePlate,
  titlePlateKeys,
} from "./pictures";
import { pipelinesPage, pipelinesPageKeys } from "./pipelines-page";
import { rating, ratingKeys } from "./rating";
import { profileVariants, profileVariantsKeys, readAgain, readAgainKeys } from "./read-again";
import {
  recentPlayDetails,
  recentPlayDetailsKeys,
  recentPlaySets,
  recentPlaySetsKeys,
  recentPlays,
  recentPlaysKeys,
} from "./recent-plays";
import { scores, scoresKeys } from "./scores";
import {
  portraitRequests,
  portraitRequestsKeys,
  reopen,
  reopenKeys,
  sessionExpiry,
  sessionExpiryKeys,
  signedOutReopen,
  signedOutReopenKeys,
} from "./session";
import { language, languageKeys, settings, settingsKeys } from "./settings";
import { signedOut, signedOutKeys } from "./signed-out";
import { songSearch, songSearchKeys } from "./song-search";
import { updates, updatesKeys } from "./updates";
import {
  bridgeWrites,
  bridgeWritesKeys,
  firstReads,
  firstReadsKeys,
  heldWrites,
  heldWritesKeys,
} from "./writes";

/** Every section in the order they run: in a serial run all of them, in a lane its own. */
export const SECTIONS: readonly Section[] = [
  { name: "language", phase: "none", lane: "names", keys: languageKeys, run: language },
  { name: "updates", phase: "none", lane: "names", keys: updatesKeys, run: updates },
  { name: "page-gone", phase: "none", lane: "names", keys: pageGoneKeys, run: pageGone },
  { name: "signed-out", phase: "signedOut", lane: "names", keys: signedOutKeys, run: signedOut },
  { name: "overview", phase: "signedIn", lane: "profile", keys: overviewKeys, run: overview },
  { name: "settings", phase: "signedIn", lane: "profile", keys: settingsKeys, run: settings },
  { name: "menu-swipe", phase: "signedIn", lane: "profile", keys: menuSwipeKeys, run: menuSwipe },
  {
    name: "my-don-failure",
    phase: "signedIn",
    lane: "profile",
    keys: myDonFailureKeys,
    run: myDonFailure,
  },
  {
    name: "costume-editor",
    phase: "signedIn",
    lane: "profile",
    keys: costumeEditorKeys,
    run: costumeEditor,
  },
  { name: "pictures", phase: "signedIn", lane: "profile", keys: picturesKeys, run: pictures },
  { name: "read-again", phase: "signedIn", lane: "profile", keys: readAgainKeys, run: readAgain },
  {
    name: "profile-variants",
    phase: "signedIn",
    lane: "profile",
    keys: profileVariantsKeys,
    run: profileVariants,
  },
  {
    name: "title-plate",
    phase: "signedIn",
    lane: "profile",
    keys: titlePlateKeys,
    run: titlePlate,
  },
  {
    name: "medal-plate",
    phase: "signedIn",
    lane: "profile",
    keys: medalPlateKeys,
    run: medalPlate,
  },
  {
    name: "portrait-preview",
    phase: "signedIn",
    lane: "costume",
    keys: portraitPreviewKeys,
    run: portraitPreview,
  },
  { name: "thumbnails", phase: "signedIn", lane: "costume", keys: thumbnailsKeys, run: thumbnails },
  {
    name: "costume-write",
    phase: "signedIn",
    lane: "costume",
    keys: costumeWriteKeys,
    run: costumeWrite,
  },
  {
    name: "costume-layout",
    phase: "signedIn",
    lane: "costume",
    keys: costumeLayoutKeys,
    run: costumeLayout,
  },
  {
    name: "costume-tiles",
    phase: "signedIn",
    lane: "costume",
    keys: costumeTilesKeys,
    run: costumeTiles,
  },
  {
    name: "tile-thumbnails",
    phase: "signedIn",
    lane: "costume",
    keys: tileThumbnailsKeys,
    run: tileThumbnails,
  },
  {
    name: "save-in-place",
    phase: "signedIn",
    lane: "costume",
    keys: saveInPlaceKeys,
    run: saveInPlace,
  },
  {
    name: "costume-phone",
    phase: "signedIn",
    lane: "costume",
    keys: costumePhoneKeys,
    run: costumePhone,
  },
  {
    name: "bridge-writes",
    phase: "signedIn",
    lane: "costume",
    keys: bridgeWritesKeys,
    run: bridgeWrites,
  },
  { name: "title", phase: "signedIn", lane: "names", keys: titleKeys, run: title },
  { name: "nickname", phase: "signedIn", lane: "names", keys: nicknameKeys, run: nickname },
  {
    name: "name-title-writes",
    phase: "signedIn",
    lane: "names",
    keys: nameTitleWritesKeys,
    run: nameTitleWrites,
  },
  { name: "name-plate", phase: "signedIn", lane: "names", keys: namePlateKeys, run: namePlate },
  {
    name: "favorite-writes",
    phase: "signedIn",
    lane: "names",
    keys: favoriteWritesKeys,
    run: favoriteWrites,
  },
  { name: "favorites", phase: "signedIn", lane: "names", keys: favoritesKeys, run: favorites },
  { name: "song-search", phase: "signedIn", lane: "songs", keys: songSearchKeys, run: songSearch },
  {
    name: "recent-plays",
    phase: "signedIn",
    lane: "songs",
    keys: recentPlaysKeys,
    run: recentPlays,
  },
  { name: "scores", phase: "signedIn", lane: "songs", keys: scoresKeys, run: scores },
  {
    name: "pipelines-page",
    phase: "signedIn",
    lane: "songs",
    keys: pipelinesPageKeys,
    run: pipelinesPage,
  },
  { name: "rating", phase: "signedIn", lane: "songs", keys: ratingKeys, run: rating },
  {
    name: "recent-play-details",
    phase: "signedIn",
    lane: "songs",
    keys: recentPlayDetailsKeys,
    run: recentPlayDetails,
  },
  {
    name: "recent-play-sets",
    phase: "signedIn",
    lane: "songs",
    keys: recentPlaySetsKeys,
    run: recentPlaySets,
  },
  {
    name: "know-yourself",
    phase: "signedIn",
    lane: "songs",
    keys: knowYourselfKeys,
    run: knowYourself,
  },
  {
    name: "session-expiry",
    phase: "signedIn",
    lane: "costume",
    keys: sessionExpiryKeys,
    run: sessionExpiry,
  },
  { name: "reopen", phase: "signedIn", lane: "costume", keys: reopenKeys, run: reopen },
  {
    name: "signed-out-reopen",
    phase: "signedIn",
    lane: "costume",
    keys: signedOutReopenKeys,
    run: signedOutReopen,
  },
  {
    name: "held-writes",
    phase: "signedIn",
    lane: "costume",
    keys: heldWritesKeys,
    run: heldWrites,
  },
  {
    name: "first-reads",
    phase: "signedIn",
    lane: "costume",
    keys: firstReadsKeys,
    run: firstReads,
  },
  { name: "portrait-requests", phase: "after", keys: portraitRequestsKeys, run: portraitRequests },
  { name: "data-folder", phase: "after", keys: dataFolderKeys, run: dataFolder },
];
