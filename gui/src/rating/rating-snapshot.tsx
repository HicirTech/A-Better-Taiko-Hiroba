import type { ChartRating, PlayerRating } from "@abth/core";
import type { MessageKey, Translator } from "@abth/i18n";
import { Box, Typography } from "@mui/material";
import { useMemo, useRef } from "react";

import { HIROBA_BLOCK } from "../pictures/hiroba-px";
import type { PictureLane } from "../pictures/picture-lane";
import { IN_THE_WINDOW, usePicture } from "../pictures/use-picture";
import { MY_DON, MyDonTile } from "../profile/my-don-portrait";
import { PLATE_BAND_MAX_PX, TitlePlate } from "../profile/title-plate";
import { RATING_SYSTEM_NAME } from "../shared/rating-data/rating-systems";
import type { PictureWant, ProfileView, ScoreView } from "../shared/session-port";
import type { SongCatalogue } from "../shared/song-catalogue/use-song-catalogue";
import { SnapshotFrame } from "../snapshots/snapshot-frame";
import { RATING_SNAPSHOT_WIDTH_PX } from "../snapshots/snapshot-picture";
import { RatedList } from "./rated-list";
import { COUNTED, ratingAndSkills, ratingFormats } from "./rating-figures";
import { RatingRadar } from "./rating-radar";

const PLATE: PictureWant = { kind: "titlePlate" };
/** As tall as the skills' radar beside it. */
const MY_DON_PX = 250;
// The rating level with the plate, the skills with My Don.
const HEAD = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gridTemplateAreas: '"plate rating" "portrait skills"',
  columnGap: 4,
  rowGap: 2,
  alignItems: "center",
  justifyItems: "center",
} as const;
const CENTRED = { width: 1, display: "flex", justifyContent: "center" } as const;
// Level with the plate's band, the bottom rows of its picture, not with the room for decorations
// above it: the figure's line is as tall as the band, at the row's foot as the band is.
const LEVEL_WITH_THE_BAND = {
  gridArea: "rating",
  alignSelf: "end",
  lineHeight: `${PLATE_BAND_MAX_PX}px`,
  fontWeight: "fontWeightBold",
} as const;

export interface RatingSnapshotProps {
  readonly profile: ProfileView;
  readonly rated: PlayerRating;
  /** Each kept score by its chart's key. */
  readonly scoreOf: ReadonlyMap<string, ScoreView>;
  /** taiko.wiki's song list: the names in the player's language. */
  readonly catalogue: SongCatalogue;
  readonly lane: PictureLane;
  /** When the scores were read. */
  readonly readAt: Date | number | string;
  readonly i18n: Translator;
}

/** The Rating page as a picture to share: the player, the rating and skills, then the charts. */
export function RatingSnapshot({
  profile,
  rated,
  scoreOf,
  catalogue,
  lane,
  readAt,
  i18n,
}: RatingSnapshotProps) {
  const { t, locale, dateTime } = i18n;
  const plateBox = useRef<HTMLDivElement>(null);
  const portraitBox = useRef<HTMLSpanElement>(null);
  const plate = usePicture(lane, PLATE, plateBox, { ...IN_THE_WINDOW, order: 0 });
  const myDon = usePicture(lane, MY_DON, portraitBox, { ...IN_THE_WINDOW, order: 1 });
  const formats = useMemo(() => ratingFormats(locale, rated.system), [locale, rated.system]);
  const { total, skills } = ratingAndSkills(rated, t);
  const list = (id: string, heading: MessageKey, shown: readonly ChartRating[]) => (
    <RatedList
      id={id}
      heading={heading}
      charts={shown}
      scoreOf={scoreOf}
      catalogue={catalogue}
      lane={lane}
      formats={formats}
      i18n={i18n}
      columns={4}
    />
  );

  return (
    <SnapshotFrame
      id="rating-snapshot"
      title={t(RATING_SYSTEM_NAME[rated.system])}
      width={RATING_SNAPSHOT_WIDTH_PX}
      when={t("profile.fetchedAt", { time: dateTime(readAt) })}
      i18n={i18n}
    >
      <Box sx={HEAD}>
        <Box sx={{ ...CENTRED, gridArea: "plate" }}>
          <TitlePlate
            id="rating-snapshot-title-plate"
            ref={plateBox}
            profile={profile}
            answer={plate}
            i18n={i18n}
          />
        </Box>
        {total !== null && (
          <Typography
            id="rating-snapshot-total"
            component="p"
            variant="h2"
            color="primary"
            sx={LEVEL_WITH_THE_BAND}
          >
            {formats.figure.format(total)}
          </Typography>
        )}
        <Box sx={{ ...HIROBA_BLOCK, gridArea: "portrait", width: MY_DON_PX }}>
          <MyDonTile id="rating-snapshot-my-don" ref={portraitBox} answer={myDon} i18n={i18n} />
        </Box>
        <Box sx={{ ...CENTRED, gridArea: "skills" }}>
          <RatingRadar figures={skills} format={(value) => formats.figure.format(value)} />
        </Box>
      </Box>
      {list("rating-snapshot-best", "rating.best", rated.charts.slice(0, COUNTED))}
      {list("rating-snapshot-next", "rating.next", rated.charts.slice(COUNTED, COUNTED * 2))}
    </SnapshotFrame>
  );
}
