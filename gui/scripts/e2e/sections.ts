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
import { profileVariants, profileVariantsKeys, readAgain, readAgainKeys } from "./read-again";
import {
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

/** Every section, in the order the report lists their checks. */
export const SECTIONS: readonly Section[] = [
  { name: "language", phase: "none", keys: languageKeys, run: language },
  { name: "updates", phase: "none", keys: updatesKeys, run: updates },
  { name: "signed-out", phase: "signedOut", keys: signedOutKeys, run: signedOut },
  { name: "overview", phase: "signedIn", keys: overviewKeys, run: overview },
  { name: "settings", phase: "signedIn", keys: settingsKeys, run: settings },
  { name: "menu-swipe", phase: "signedIn", keys: menuSwipeKeys, run: menuSwipe },
  { name: "my-don-failure", phase: "signedIn", keys: myDonFailureKeys, run: myDonFailure },
  { name: "costume-editor", phase: "signedIn", keys: costumeEditorKeys, run: costumeEditor },
  { name: "pictures", phase: "signedIn", keys: picturesKeys, run: pictures },
  { name: "read-again", phase: "signedIn", keys: readAgainKeys, run: readAgain },
  { name: "profile-variants", phase: "signedIn", keys: profileVariantsKeys, run: profileVariants },
  { name: "title-plate", phase: "signedIn", keys: titlePlateKeys, run: titlePlate },
  { name: "medal-plate", phase: "signedIn", keys: medalPlateKeys, run: medalPlate },
  { name: "portrait-preview", phase: "signedIn", keys: portraitPreviewKeys, run: portraitPreview },
  { name: "thumbnails", phase: "signedIn", keys: thumbnailsKeys, run: thumbnails },
  { name: "costume-write", phase: "signedIn", keys: costumeWriteKeys, run: costumeWrite },
  { name: "costume-layout", phase: "signedIn", keys: costumeLayoutKeys, run: costumeLayout },
  { name: "costume-tiles", phase: "signedIn", keys: costumeTilesKeys, run: costumeTiles },
  { name: "tile-thumbnails", phase: "signedIn", keys: tileThumbnailsKeys, run: tileThumbnails },
  { name: "save-in-place", phase: "signedIn", keys: saveInPlaceKeys, run: saveInPlace },
  { name: "costume-phone", phase: "signedIn", keys: costumePhoneKeys, run: costumePhone },
  { name: "bridge-writes", phase: "signedIn", keys: bridgeWritesKeys, run: bridgeWrites },
  { name: "title", phase: "signedIn", keys: titleKeys, run: title },
  { name: "nickname", phase: "signedIn", keys: nicknameKeys, run: nickname },
  { name: "name-title-writes", phase: "signedIn", keys: nameTitleWritesKeys, run: nameTitleWrites },
  { name: "name-plate", phase: "signedIn", keys: namePlateKeys, run: namePlate },
  { name: "favorite-writes", phase: "signedIn", keys: favoriteWritesKeys, run: favoriteWrites },
  { name: "favorites", phase: "signedIn", keys: favoritesKeys, run: favorites },
  { name: "song-search", phase: "signedIn", keys: songSearchKeys, run: songSearch },
  { name: "session-expiry", phase: "signedIn", keys: sessionExpiryKeys, run: sessionExpiry },
  { name: "reopen", phase: "signedIn", keys: reopenKeys, run: reopen },
  { name: "signed-out-reopen", phase: "signedIn", keys: signedOutReopenKeys, run: signedOutReopen },
  { name: "held-writes", phase: "signedIn", keys: heldWritesKeys, run: heldWrites },
  { name: "first-reads", phase: "signedIn", keys: firstReadsKeys, run: firstReads },
  { name: "data-folder", phase: "after", keys: dataFolderKeys, run: dataFolder },
];
