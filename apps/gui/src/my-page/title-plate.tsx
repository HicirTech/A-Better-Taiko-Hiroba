import type { Translator } from "@abth/i18n";
import { Box, CircularProgress, Typography } from "@mui/material";
import type { Ref } from "react";

import { HIROBA_LANG } from "../language/show-language";
import type { PictureAnswer } from "../pictures/picture-lane";
import type { PictureView, ProfileView } from "../session-port";
import {
  HIROBA_BLOCK,
  hirobaPx,
  MAX_BLOCK_SCALE,
  ONE_LINE,
  OUTLINED,
  VISUALLY_HIDDEN,
} from "./hiroba-px";

// Hiroba's #mydon_area: the plate is 290 pixels wide.
const PLATE_WIDTH = 290;
const hp = hirobaPx(PLATE_WIDTH);
// Title 20 over name row 23, plus margins; reserved so text never moves as the picture comes.
const RESERVED_HEIGHT = 47;
const MAX_WIDTH = PLATE_WIDTH * MAX_BLOCK_SCALE;
// Hiroba's colours, sampled from its plate; the same in either theme.
const ON_PLATE = "#000";
const BAND = "#fff1c2";
const NAME_BOX = "#f8f0e0";
const DAN_BOX = "#5a8df2";

export interface TitlePlateProps {
  readonly profile: ProfileView;
  readonly answer: PictureAnswer | undefined;
  readonly i18n: Translator;
  /** The plate; its picture is asked for once it is on screen. */
  readonly ref: Ref<HTMLDivElement>;
}

export function TitlePlate({ profile, answer, i18n, ref }: TitlePlateProps) {
  const { t } = i18n;
  const plate = answer !== undefined && "view" in answer ? answer.view : null;
  return (
    <Box sx={{ ...HIROBA_BLOCK, width: 1, maxWidth: MAX_WIDTH }}>
      <Box
        ref={ref}
        id="title-plate"
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
          <PlateStandIn />
        ) : (
          <Box
            component="img"
            id="title-plate-image"
            src={plate.src}
            alt=""
            aria-hidden
            sx={{ position: "absolute", inset: 0, width: 1, height: 1, display: "block" }}
          />
        )}
        {answer === undefined && (
          <CircularProgress
            id="title-plate-loading"
            size={14}
            aria-label={t("pictures.loading")}
            sx={{ position: "absolute", top: 2, right: 4, color: ON_PLATE }}
          />
        )}
        <Title title={profile.title} i18n={i18n} />
        <NameRow profile={profile} i18n={i18n} />
      </Box>
    </Box>
  );
}

function PlateStandIn() {
  const box = { position: "absolute", bottom: hp(1), height: hp(23), borderRadius: hp(3) } as const;
  return (
    <Box
      id="title-plate-stand-in"
      aria-hidden
      sx={{ position: "absolute", inset: 0, bgcolor: BAND, borderRadius: hp(10) }}
    >
      <Box sx={{ ...box, left: hp(10), width: hp(135), bgcolor: NAME_BOX }} />
      <Box sx={{ ...box, left: hp(145), width: hp(135), bgcolor: DAN_BOX }} />
    </Box>
  );
}

function Title({ title, i18n }: { title: string; i18n: Translator }) {
  const { t } = i18n;
  return (
    <Box
      sx={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: hp(24),
        height: hp(20),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {title === "" ? (
        <Box component="span" id="no-title" sx={VISUALLY_HIDDEN}>
          {t("profile.noTitle")}
        </Box>
      ) : (
        <>
          <Box
            component="span"
            aria-hidden
            lang={HIROBA_LANG}
            sx={{ ...ONE_LINE, fontWeight: "bold", fontSize: hp(13), px: hp(8) }}
          >
            {title}
          </Box>
          <Box component="span" id="profile-title" sx={VISUALLY_HIDDEN}>
            {t("profile.title", { title })}
          </Box>
        </>
      )}
    </Box>
  );
}

function NameRow({ profile, i18n }: { profile: ProfileView; i18n: Translator }) {
  const { t } = i18n;
  const { dan } = profile;
  const danName = dan !== null && "board" in dan ? t(`dan.${dan.board}`) : null;
  return (
    <Box
      sx={{
        position: "absolute",
        left: hp(10),
        bottom: hp(1),
        width: hp(270),
        height: hp(23),
        display: "flex",
      }}
    >
      <Typography
        component="h2"
        lang={HIROBA_LANG}
        sx={{
          ...ONE_LINE,
          width: dan === null ? 1 : hp(135),
          pt: hp(3),
          px: hp(4),
          textAlign: "center",
          fontWeight: "bold",
          fontSize: hp(12),
          lineHeight: 1.2,
          color: ON_PLATE,
        }}
      >
        {profile.nickname}
      </Typography>
      {dan !== null && (
        <Box
          sx={{
            width: hp(135),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {dan.picture !== null ? (
            <DanLabel picture={dan.picture} />
          ) : (
            danName !== null && (
              <Box
                component="span"
                aria-hidden
                sx={{ color: "#fff", fontWeight: "bold", fontSize: hp(13), textShadow: OUTLINED }}
              >
                {danName}
              </Box>
            )
          )}
          {danName !== null && (
            <Box component="span" id="dan" sx={VISUALLY_HIDDEN}>
              {t("profile.dan", { dan: danName })}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

function DanLabel({ picture }: { picture: PictureView }) {
  return (
    <Box
      component="img"
      id="dan-label"
      src={picture.src}
      alt=""
      aria-hidden
      sx={{
        height: hp(21),
        aspectRatio: `${picture.width} / ${picture.height}`,
        my: hp(1),
        display: "block",
      }}
    />
  );
}
