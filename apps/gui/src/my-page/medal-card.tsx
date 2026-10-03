import type { MedalProgress } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Box, Card, CardContent, CircularProgress, Stack, Typography } from "@mui/material";
import { useRef } from "react";

import { HIROBA_LANG } from "../language/show-language";
import type { PictureLane } from "../pictures/picture-lane";
import { usePicture } from "../pictures/use-picture";
import type { PictureWant, ProfileView } from "../session-port";
import { HIROBA_BLOCK, hirobaPx, MAX_BLOCK_SCALE, ONE_LINE, VISUALLY_HIDDEN } from "./hiroba-px";

// Hiroba's どんメダル block: the plate is 290 pixels wide.
const PLATE_WIDTH = 290;
const hp = hirobaPx(PLATE_WIDTH);
// The height Hiroba's block reserves, kept until the picture gives its own size.
const RESERVED_HEIGHT = 50;
const MAX_WIDTH = PLATE_WIDTH * MAX_BLOCK_SCALE;
// As on Hiroba, black words over a pale gold that stays pale in either theme.
const ON_PLATE = "#000";
const STAND_IN = "#f6e7b4";
const ON_ROW = {
  position: "absolute",
  top: hp(11),
  height: hp(17),
  lineHeight: hp(17),
  fontSize: hp(12),
  fontWeight: "bold",
  ...ONE_LINE,
} as const;
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
    <Card id="medal" variant="outlined">
      <CardContent>
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
      </CardContent>
    </Card>
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
  const plate = answer !== undefined && "view" in answer ? answer.view : null;
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
            color: ON_PLATE,
            aspectRatio:
              plate !== null
                ? `${plate.width} / ${plate.height}`
                : `${PLATE_WIDTH} / ${RESERVED_HEIGHT}`,
          }}
        >
          {plate === null ? (
            <Box
              id="medal-plate-stand-in"
              aria-hidden
              sx={{ position: "absolute", inset: 0, bgcolor: STAND_IN, borderRadius: hp(25) }}
            />
          ) : (
            <Box
              component="img"
              id="medal-plate-image"
              src={plate.src}
              alt=""
              aria-hidden
              sx={{ position: "absolute", inset: 0, width: 1, height: 1, display: "block" }}
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
          <Box
            component="span"
            id="medal-name"
            lang={HIROBA_LANG}
            sx={{ ...ON_ROW, left: hp(50), width: hp(165) }}
          >
            {name}
          </Box>
          {progress.kind === "collecting" ? (
            <>
              <Box component="span" aria-hidden sx={{ ...ON_ROW, left: hp(215), right: hp(10) }}>
                {number(progress.count)}
              </Box>
              <Box component="span" id="medal-count" sx={VISUALLY_HIDDEN}>
                {t("medal.count", { count: number(progress.count) })}
              </Box>
            </>
          ) : (
            <Box
              component="span"
              id="medal-complete"
              sx={{ ...ON_ROW, left: hp(190), right: hp(10) }}
            >
              {t("medal.complete")}
            </Box>
          )}
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
