import type { Translator } from "@abth/i18n";
import { Box, Stack, Typography } from "@mui/material";
import { useRef } from "react";

import { HIROBA_BLOCK } from "../pictures/hiroba-px";
import type { PictureLane } from "../pictures/picture-lane";
import { IN_THE_WINDOW, usePicture } from "../pictures/use-picture";
import { MY_DON, MyDonTile } from "../profile/my-don-portrait";
import { PLATE_MAX_PX, TitlePlate } from "../profile/title-plate";
import { type Gift, giftCode } from "../shared/gifts/gift-code";
import type { PictureWant, ProfileView } from "../shared/session-port";
import type { ShownDifficulty } from "../shared/song-catalogue/shown-difficulty";
import type { SongLook } from "../shared/song-catalogue/song-look";
import { SnapshotFrame } from "../snapshots/snapshot-frame";
import { GIFT_CODE_PX } from "../snapshots/snapshot-picture";
import { SetSongs } from "../songs/set-songs";
import { CardGiftcardIcon } from "../ui/icons";
import { QrCode } from "../ui/qr-code";
import { SectionCard } from "../ui/section-card";

const PLATE: PictureWant = { kind: "titlePlate" };
/** About as tall as the plate and the gift's title beside it. */
const MY_DON_PX = 240;
const HEAD = {
  display: "grid",
  gridTemplateColumns: `${MY_DON_PX}px ${PLATE_MAX_PX}px`,
  columnGap: 4,
  alignItems: "center",
  justifyContent: "center",
} as const;
const CENTRED = { alignItems: "center", textAlign: "center" } as const;

export interface GiftSnapshotProps {
  /** Its parts' ids start with it; a preview's differs from the picture shared. */
  readonly id?: string;
  readonly gift: Gift;
  /** The giver's, for their plate and My Don. */
  readonly profile: ProfileView;
  readonly look: (songNo: string) => SongLook;
  readonly shownDifficulty: ShownDifficulty;
  readonly lane: PictureLane;
  readonly i18n: Translator;
}

/** A gift as a picture to share: its giver and title, its code, and its songs unless a mystery. */
export function GiftSnapshot({
  id = "gift-snapshot",
  gift,
  profile,
  look,
  shownDifficulty,
  lane,
  i18n,
}: GiftSnapshotProps) {
  const { t, dateTime, number } = i18n;
  const plateBox = useRef<HTMLDivElement>(null);
  const portraitBox = useRef<HTMLSpanElement>(null);
  const plate = usePicture(lane, PLATE, plateBox, { ...IN_THE_WINDOW, order: 0 });
  const myDon = usePicture(lane, MY_DON, portraitBox, { ...IN_THE_WINDOW, order: 1 });
  return (
    <SnapshotFrame
      id={id}
      title={t("gift.picture")}
      when={t("gift.givenAt", { time: dateTime(gift.madeAt) })}
      i18n={i18n}
    >
      <Box sx={HEAD}>
        <Box sx={HIROBA_BLOCK}>
          <MyDonTile id={`${id}-my-don`} ref={portraitBox} answer={myDon} i18n={i18n} />
        </Box>
        <Stack spacing={2} sx={CENTRED}>
          <TitlePlate
            id={`${id}-title-plate`}
            ref={plateBox}
            profile={profile}
            answer={plate}
            i18n={i18n}
          />
          {gift.title !== "" && (
            <Typography id={`${id}-message`} component="p" variant="h5">
              {gift.title}
            </Typography>
          )}
        </Stack>
      </Box>
      <Stack spacing={1} sx={CENTRED}>
        <QrCode
          id={`${id}-code`}
          text={giftCode(gift)}
          sizePx={GIFT_CODE_PX}
          label={t("gift.code")}
        />
        <Typography component="p" variant="body2" color="text.secondary">
          {t("gift.scanHint")}
        </Typography>
      </Stack>
      {gift.shown ? (
        <SectionCard>
          <SetSongs
            id={id}
            songs={gift.songs}
            look={look}
            shownDifficulty={shownDifficulty}
            i18n={i18n}
            scrolling={false}
          />
        </SectionCard>
      ) : (
        <Stack id={`${id}-mystery`} spacing={0.5} sx={CENTRED}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <CardGiftcardIcon color="primary" fontSize="large" />
            <Typography component="p" variant="h6">
              {t("gift.mystery")}
            </Typography>
          </Stack>
          <Typography component="p" variant="body2" color="text.secondary">
            {t("gift.mysterySongs", { count: number(gift.songs.length) })}
          </Typography>
        </Stack>
      )}
    </SnapshotFrame>
  );
}
