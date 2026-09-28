import type { Translator } from "@abth/i18n";
import { Box, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import { useRef } from "react";

import { HIROBA_LANG } from "../language/show-language";
import type { PictureLane } from "../pictures/picture-lane";
import { usePicture } from "../pictures/use-picture";
import type { PictureView, PictureWant, ProfileView } from "../session-port";
import { HIROBA_BLOCK, hirobaPx, ONE_LINE, VISUALLY_HIDDEN } from "./hiroba-px";

/** Hiroba's header, #mydon_area: the plate is 290 pixels wide. */
const PLATE_WIDTH = 290;
/** Lengths in the plate's pixels. */
const hp = hirobaPx(PLATE_WIDTH);
/**
 * The plate's height, as Hiroba's layout implies it: the title's 20 over the name row's 23, with
 * the few pixels around them. Reserved until the picture gives its own size, so text never moves.
 */
const RESERVED_HEIGHT = 47;
/** At most half again Hiroba's own size. */
const MAX_WIDTH = PLATE_WIDTH * 1.5;
/**
 * Hiroba's colours, the same in either theme, so the stand-in looks like the plate: its band, and
 * the name's and the dan's boxes, sampled from Hiroba's plate. The words over the plate are black
 * in either theme too.
 */
const ON_PLATE = "#000";
const BAND = "#fff1c2";
const NAME_BOX = "#f8f0e0";
const DAN_BOX = "#5a8df2";
/** A dan's name drawn without its label: white, outlined in a dark 1px line all round. */
const OUTLINED = ["-1px -1px", "1px -1px", "-1px 1px", "1px 1px"]
  .map((offset) => `${offset} 0 #1a1a1a`)
  .join(", ");
const PLATE: PictureWant = { kind: "titlePlate" };

export interface TitlePlateCardProps {
  readonly profile: ProfileView;
  readonly lane: PictureLane;
  readonly i18n: Translator;
}

/**
 * The identity card as Hiroba's header draws it, #mydon_area: the title plate, the title over it,
 * and the name row, the nickname in its cream box and the dan's label in its blue one. The plate and
 * the label are Hiroba's own pictures, as data: URLs; every word stays text, laid over them where
 * Hiroba lays its HTML. Until the plate comes, or if it does not, a plain band of the same geometry
 * stands in its place, and the card reads the same.
 *
 * The plate sits on the app's own surface, without the yellow Hiroba draws around it, and the region
 * is left off: the profile keeps it, the card does not (the user's calls, 2026-09-28).
 *
 * The dan is read off its label, which is shown as it is, and named in text for screen readers. A
 * label that did not read says so under the plate, with its code, as before.
 */
export function TitlePlateCard({ profile, lane, i18n }: TitlePlateCardProps) {
  const { t } = i18n;
  const { dan } = profile;
  const plateBox = useRef<HTMLDivElement>(null);
  const answer = usePicture(lane, PLATE, plateBox, { root: null, rootMargin: "0px", order: 0 });
  const plate = answer !== undefined && "view" in answer ? answer.view : null;
  const failure = answer !== undefined && "failure" in answer ? answer.failure : null;

  return (
    <Stack spacing={1} sx={{ alignItems: "center" }}>
      <Box sx={{ ...HIROBA_BLOCK, width: 1, maxWidth: MAX_WIDTH }}>
        <Box
          ref={plateBox}
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
      {dan !== null && "unreadable" in dan && (
        <Stack spacing={0.5} sx={{ alignItems: "center" }}>
          <Chip
            id="dan-unreadable"
            label={t("profile.danUnreadable")}
            size="small"
            variant="outlined"
          />
          <Typography
            id="dan-code"
            variant="body2"
            color="text.secondary"
            sx={{ fontFamily: "monospace", userSelect: "text", wordBreak: "break-all" }}
          >
            {t("profile.danCode", { code: dan.code })}
          </Typography>
        </Stack>
      )}
      {failure !== null && (
        <Stack id="pictures-unavailable" sx={{ alignItems: "center", textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            {t("pictures.unavailable")}
          </Typography>
          <Typography
            id="pictures-code"
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

/** The plate drawn plainly: a rounded band, and the name's and the dan's boxes where Hiroba's are. */
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

/**
 * The title, over the plate's band, as Hiroba lays it: 20 high, its foot 24 above the plate's.
 * Drawn as it is, and named for screen readers. No title leaves the band empty, as on Hiroba.
 */
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

/**
 * The name row: 270 wide, 23 high, its foot a pixel above the plate's. The nickname in the left
 * half, the card's heading, and the dan's label in the right; with no dan, the nickname across it.
 */
function NameRow({ profile, i18n }: { profile: ProfileView; i18n: Translator }) {
  const { t } = i18n;
  const { dan } = profile;
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
            "name" in dan && (
              <Box
                component="span"
                aria-hidden
                lang={HIROBA_LANG}
                sx={{ color: "#fff", fontWeight: "bold", fontSize: hp(13), textShadow: OUTLINED }}
              >
                {dan.name}
              </Box>
            )
          )}
          {"name" in dan && (
            <Box component="span" id="dan" sx={VISUALLY_HIDDEN}>
              {t("profile.dan", { dan: dan.name })}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

/** The dan's own label, as my page shows it: 21 high, its width as the picture gives it. */
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
