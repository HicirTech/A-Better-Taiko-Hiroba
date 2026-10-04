import type { Section } from "./context";
import { costumeEditor, costumeWrite, portraitPreview } from "./costume-editor";
import { costumeLayout, costumePhone, costumeTiles } from "./costume-layout";
import { saveInPlace, thumbnails, tileThumbnails } from "./costume-thumbnails";
import { dataFolder } from "./data-folder";
import { namePlate, nameTitleWrites, nickname, title } from "./name-title";
import { overview } from "./overview";
import { medalPlate, myDonFailure, pictures, titlePlate } from "./pictures";
import { profileVariants, readAgain } from "./read-again";
import { reopen, sessionExpiry, signedOutReopen } from "./session";
import { language, settings } from "./settings";
import { signedOut } from "./signed-out";
import { bridgeWrites, firstReads, heldWrites } from "./writes";

/** Every section, in the order the report lists their checks. */
export const SECTIONS: readonly Section[] = [
  { name: "language", phase: "none", run: language },
  { name: "signed-out", phase: "signedOut", run: signedOut },
  { name: "overview", phase: "signedIn", run: overview },
  { name: "settings", phase: "signedIn", run: settings },
  { name: "my-don-failure", phase: "signedIn", run: myDonFailure },
  { name: "costume-editor", phase: "signedIn", run: costumeEditor },
  { name: "pictures", phase: "signedIn", run: pictures },
  { name: "read-again", phase: "signedIn", run: readAgain },
  { name: "profile-variants", phase: "signedIn", run: profileVariants },
  { name: "title-plate", phase: "signedIn", run: titlePlate },
  { name: "medal-plate", phase: "signedIn", run: medalPlate },
  { name: "portrait-preview", phase: "signedIn", run: portraitPreview },
  { name: "thumbnails", phase: "signedIn", run: thumbnails },
  { name: "costume-write", phase: "signedIn", run: costumeWrite },
  { name: "costume-layout", phase: "signedIn", run: costumeLayout },
  { name: "costume-tiles", phase: "signedIn", run: costumeTiles },
  { name: "tile-thumbnails", phase: "signedIn", run: tileThumbnails },
  { name: "save-in-place", phase: "signedIn", run: saveInPlace },
  { name: "costume-phone", phase: "signedIn", run: costumePhone },
  { name: "bridge-writes", phase: "signedIn", run: bridgeWrites },
  { name: "title", phase: "signedIn", run: title },
  { name: "nickname", phase: "signedIn", run: nickname },
  { name: "name-title-writes", phase: "signedIn", run: nameTitleWrites },
  { name: "name-plate", phase: "signedIn", run: namePlate },
  { name: "session-expiry", phase: "signedIn", run: sessionExpiry },
  { name: "reopen", phase: "signedIn", run: reopen },
  { name: "signed-out-reopen", phase: "signedIn", run: signedOutReopen },
  { name: "held-writes", phase: "signedIn", run: heldWrites },
  { name: "first-reads", phase: "signedIn", run: firstReads },
  { name: "data-folder", phase: "after", run: dataFolder },
];
