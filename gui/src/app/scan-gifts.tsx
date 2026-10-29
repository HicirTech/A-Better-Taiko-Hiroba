import type { Translator } from "@abth/i18n";

import type { FavoritesEditor } from "../favorites/use-favorites";
import type { PickableReading } from "../favorites/use-pickable-songs";
import type { PageData } from "../pages/page";
import type { SystemCamera } from "../platform";
import { type GiftAccepted, ScanFlow } from "../scan/scan-flow";
import type { Gift } from "../shared/gifts/gift-code";
import { filledSlots, setWithSongs } from "../shared/sets/favorite-sets";
import type { FavoriteSets } from "../shared/sets/use-favorite-sets";
import { resolveSong } from "../shared/song-catalogue/song-look";

const NONE_REMEMBERED = new Map<never, never>();

/** The navigation's scan for a signed-in player: a gift it reads is offered and taken on Hiroba. */
export function ScanGifts({
  data,
  camera,
  scanning,
  onScanned,
}: {
  readonly data: PageData;
  readonly camera: SystemCamera | null;
  readonly scanning: boolean;
  readonly onScanned: () => void;
}) {
  const { catalogue, i18n } = data;
  return (
    <ScanFlow
      scanning={scanning}
      camera={camera}
      look={(songNo) => resolveSong(songNo, catalogue.songs, NONE_REMEMBERED, i18n.locale)}
      shownDifficulty={data.shownDifficulty}
      touchFirst={data.touchFirst}
      modalLook={data.modalLook}
      i18n={i18n}
      accept={giftAccept(data.favorites, data.keptSets, data.pickable, i18n)}
      onScanned={onScanned}
    />
  );
}

/** Puts a gift's songs in Hiroba's folder, the one before kept in its history by its set's name. */
function giftAccept(
  favorites: FavoritesEditor,
  keptSets: FavoriteSets,
  pickable: PickableReading,
  i18n: Translator,
): (gift: Gift) => Promise<GiftAccepted> {
  return async (gift) => {
    // The player's own picker decides; a list that cannot be read leaves it to the write.
    const offered = await pickable.offeredNow();
    const notOffered =
      offered === null ? [] : gift.songs.filter((songNo) => !offered.songs.has(songNo));
    if (notOffered.length > 0) {
      return { kind: "notOffered", songs: notOffered };
    }
    const target = gift.title === "" ? i18n.t("gift.from", { giver: gift.giver }) : gift.title;
    const outcome = await favorites.replaceFolder(gift.songs, (replaced) => ({
      expected: setWithSongs(keptSets.sets, filledSlots(replaced))?.name ?? null,
      target,
    }));
    // The scan says how it ended; the Favourites page would say it a second time.
    favorites.closeNotice();
    return { kind: "written", outcome };
  };
}
