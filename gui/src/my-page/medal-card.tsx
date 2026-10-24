import type { MedalProgress } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Box, Skeleton, Typography } from "@mui/material";
import { useRef } from "react";
import { HirobaPicture } from "../pictures/hiroba-picture";
import { HIROBA_BLOCK, hirobaPx, MAX_BLOCK_SCALE } from "../pictures/hiroba-px";
import { type PictureLane, viewOf } from "../pictures/picture-lane";
import { usePicture } from "../pictures/use-picture";
import { HIROBA_LANG } from "../shared/language/show-language";
import type { PictureWant, ProfileView } from "../shared/session-port";
import { ReadFailureAlert } from "../ui/read-failure-alert";
import { SectionTitle, SectionTitleSkeleton } from "../ui/section-title";
import { StatusNote } from "../ui/status-note";
import { VISUALLY_HIDDEN } from "../ui/visually-hidden";

// Hiroba's どんメダル block: a picture across the 290-pixel area, in a block 52 high at least, with
// its words lifted onto the picture from the line below it, by these offsets.
const PLATE_WIDTH = 290;
const hp = hirobaPx(PLATE_WIDTH);
const BLOCK_HEIGHT = 52;
// What stands in for the picture, until it gives its own size.
const STAND_IN_HEIGHT = 50;
const MAX_WIDTH = PLATE_WIDTH * MAX_BLOCK_SCALE;
const WORDS_LIFT = 39;
const NAME_LEFT = 50;
const NAME_WIDTH = 165;
const COUNT_LEFT = 215;
const COMPLETE_LEFT = 190;
// As on Hiroba, black words over a pale gold that stays pale in either theme.
const ON_PLATE = "#000";
const STAND_IN = "#f6e7b4";
const WORDS = { fontSize: hp(12), fontWeight: "bold" } as const;
const PLATE: PictureWant = { kind: "medalPlate" };

export interface MedalCardProps {
  readonly medal: ProfileView["medal"];
  readonly lane: PictureLane;
  readonly i18n: Translator;
}

/** The plate's name is the site's own text, shown as written: nothing reads a season out of it. */
export function MedalCard({ medal, lane, i18n }: MedalCardProps) {
  const { t } = i18n;
  const progress = medal?.progress;
  return (
    <Box id="medal" component="section">
      <SectionTitle>{t("medal.heading")}</SectionTitle>
      {medal === null && <StatusNote id="medal-none">{t("medal.none")}</StatusNote>}
      {medal !== null && medal.progress.kind !== "unrecognised" && (
        <MedalPlate name={medal.name} progress={medal.progress} lane={lane} i18n={i18n} />
      )}
      {medal !== null && progress?.kind === "unrecognised" && (
        <>
          {medal.name !== "" && (
            <Typography id="medal-name" lang={HIROBA_LANG}>
              {medal.name}
            </Typography>
          )}
          <ReadFailureAlert
            id="medal-unrecognised"
            message={t("medal.unrecognised")}
            code={`medal=${progress.reason}`}
            codeId="medal-code"
            mayClear={false}
            i18n={i18n}
          />
        </>
      )}
    </Box>
  );
}

interface MedalPlateProps {
  readonly name: string;
  readonly progress: Exclude<MedalProgress, { kind: "unrecognised" }>;
  readonly lane: PictureLane;
  readonly i18n: Translator;
}

function MedalPlate({ name, progress, lane, i18n }: MedalPlateProps) {
  const { t, number } = i18n;
  const plateBox = useRef<HTMLDivElement>(null);
  const answer = usePicture(lane, PLATE, plateBox, { rootMargin: "0px", order: 0 });
  const plate = viewOf(answer);

  return (
    <Box sx={{ ...HIROBA_BLOCK, width: 1, maxWidth: MAX_WIDTH }}>
      <HirobaPicture
        ref={plateBox}
        id="medal-plate"
        src={plate?.src ?? null}
        onItsWay={answer === undefined}
        standIn={
          <Box
            id="medal-plate-stand-in"
            aria-hidden
            sx={{
              display: "inline-block",
              width: 1,
              height: hp(STAND_IN_HEIGHT),
              bgcolor: STAND_IN,
              borderRadius: hp(25),
            }}
          />
        }
        wordsColour={ON_PLATE}
        sx={{
          width: 1,
          minHeight: hp(BLOCK_HEIGHT),
          color: ON_PLATE,
          // Hiroba's body text sets the line below the picture, which the words are lifted from.
          fontSize: hp(14),
          lineHeight: 1.5,
        }}
        imageSx={{ width: 1 }}
        i18n={i18n}
      >
        <Box sx={{ position: "absolute", left: 0, right: 0, mt: hp(-WORDS_LIFT) }}>
          <Box
            id="medal-name"
            lang={HIROBA_LANG}
            sx={{ ...WORDS, ml: hp(NAME_LEFT), width: hp(NAME_WIDTH), wordBreak: "break-all" }}
          >
            {name}
          </Box>
          {progress.kind === "collecting" ? (
            <>
              <Box
                id="medal-count-shown"
                aria-hidden
                sx={{ ...WORDS, position: "absolute", top: 0, left: hp(COUNT_LEFT) }}
              >
                {number(progress.count)}
              </Box>
              <Box component="span" id="medal-count" sx={VISUALLY_HIDDEN}>
                {t("medal.count", { count: number(progress.count) })}
              </Box>
            </>
          ) : (
            <Box
              id="medal-complete"
              sx={{ ...WORDS, position: "absolute", top: 0, left: hp(COMPLETE_LEFT) }}
            >
              {t("medal.complete")}
            </Box>
          )}
        </Box>
      </HirobaPicture>
    </Box>
  );
}

/** The どんメダル block's shape while the page's first read runs: its heading and its plate. */
export function MedalCardSkeleton() {
  return (
    <Box aria-hidden>
      <SectionTitleSkeleton width={110} />
      <Box sx={{ ...HIROBA_BLOCK, width: 1, maxWidth: MAX_WIDTH }}>
        <Skeleton
          variant="rounded"
          sx={{ width: 1, height: hp(STAND_IN_HEIGHT), borderRadius: hp(25) }}
        />
      </Box>
    </Box>
  );
}
