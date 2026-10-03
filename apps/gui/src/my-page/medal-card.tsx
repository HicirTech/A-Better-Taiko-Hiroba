import type { MedalProgress } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { useRef } from "react";

import { HIROBA_LANG } from "../language/show-language";
import { type PictureLane, viewOf } from "../pictures/picture-lane";
import { usePicture } from "../pictures/use-picture";
import type { PictureWant, ProfileView } from "../session-port";
import { HIROBA_BLOCK, hirobaPx, MAX_BLOCK_SCALE, VISUALLY_HIDDEN } from "./hiroba-px";

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
      <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 500, mb: 1 }}>
        {t("medal.heading")}
      </Typography>
      {medal === null && (
        <Typography id="medal-none" color="text.secondary">
          {t("medal.none")}
        </Typography>
      )}
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
          <Typography id="medal-unrecognised" color="text.secondary" sx={{ mt: 0.5 }}>
            {t("medal.unrecognised")}
          </Typography>
          <Typography
            id="medal-code"
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, fontFamily: "monospace", userSelect: "text", wordBreak: "break-all" }}
          >
            {t("medal.code", { code: `medal=${progress.reason}` })}
          </Typography>
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
  const answer = usePicture(lane, PLATE, plateBox, { root: null, rootMargin: "0px", order: 0 });
  const plate = viewOf(answer);
  const failure = answer !== undefined && "failure" in answer ? answer.failure : null;

  return (
    <Stack spacing={1}>
      <Box sx={{ ...HIROBA_BLOCK, width: 1, maxWidth: MAX_WIDTH }}>
        <Box
          ref={plateBox}
          id="medal-plate"
          aria-busy={answer === undefined}
          sx={{
            position: "relative",
            width: 1,
            minHeight: hp(BLOCK_HEIGHT),
            color: ON_PLATE,
            // Hiroba's body text sets the line below the picture, which the words are lifted from.
            fontSize: hp(14),
            lineHeight: 1.5,
          }}
        >
          {plate === null ? (
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
          ) : (
            <Box
              component="img"
              id="medal-plate-image"
              src={plate.src}
              alt=""
              aria-hidden
              sx={{ width: 1 }}
            />
          )}
          {answer === undefined && (
            <CircularProgress
              id="medal-plate-loading"
              size={14}
              aria-label={t("pictures.loading")}
              sx={{ position: "absolute", top: 2, right: 4, color: ON_PLATE }}
            />
          )}
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
        </Box>
      </Box>
      {failure !== null && (
        <Stack id="medal-plate-unavailable">
          <Typography variant="body2" color="text.secondary">
            {t("pictures.unavailable")}
          </Typography>
          <Typography
            id="medal-plate-code"
            variant="body2"
            color="text.secondary"
            sx={{ fontFamily: "monospace", userSelect: "text", wordBreak: "break-all" }}
          >
            {t("pictures.code", { code: failure })}
          </Typography>
        </Stack>
      )}
    </Stack>
  );
}
