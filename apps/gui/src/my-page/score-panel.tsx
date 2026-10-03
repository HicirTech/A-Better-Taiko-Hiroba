import type { ScoreRank } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Box, CircularProgress } from "@mui/material";
import type { Ref } from "react";

import { type PictureAnswer, viewOf } from "../pictures/picture-lane";
import type { PictureView, PictureWant, ProfileView } from "../session-port";
import { HIROBA_BLOCK, hirobaPx, MAX_BLOCK_SCALE, OUTLINED, VISUALLY_HIDDEN } from "./hiroba-px";
import { CROWN_COLOUR, RANK_COLOUR } from "./panel-colours";

// Hiroba's .total_score: 280 wide, #mydon_area's 290 less its margins.
const PANEL_WIDTH = 280;
const hp = hirobaPx(PANEL_WIDTH);
const RESERVED_ART_WIDTH = 600;
const RESERVED_ART_HEIGHT = 356;
const MAX_WIDTH = PANEL_WIDTH * MAX_BLOCK_SCALE;
// Hiroba's inline styles place each count over total_score_image_5, in panel pixels.
const COLUMN_LEFT = [57, 141, 230] as const;
const ROW_TOP = [18, 54, 85, 121] as const;
const ROW_HEIGHT = 21;
const COUNT_SIZE = 14;
type Spot = readonly [column: 0 | 1 | 2, row: 0 | 1 | 2 | 3];
type Crown = keyof ProfileView["crowns"];
type Counted = { readonly rank: ScoreRank } | { readonly crown: Crown };
const PANEL_SPOTS: readonly (readonly [Counted, Spot])[] = [
  [{ rank: 8 }, [2, 0]],
  [{ rank: 5 }, [0, 1]],
  [{ rank: 6 }, [1, 1]],
  [{ rank: 7 }, [2, 1]],
  [{ rank: 2 }, [0, 2]],
  [{ rank: 3 }, [1, 2]],
  [{ rank: 4 }, [2, 2]],
  [{ crown: "silver" }, [0, 3]],
  [{ crown: "gold" }, [1, 3]],
  [{ crown: "donderful" }, [2, 3]],
];
// total_score_image_5 is the only panel ever seen; any other level gets the stand-in, so no count
// sits on art it may not fit.
const LAID_OUT_LEVELS: ReadonlySet<number> = new Set([5]);
const ART: PictureWant = { kind: "scorePanel" };
// As on Hiroba, in either theme: white outlined on the art's dark rows, black on its pale one.
const TONE = {
  rank: { color: "#fff", textShadow: OUTLINED },
  crown: { color: "#000" },
} as const;
// The stand-in is plain on purpose, so it is not taken for Hiroba's art.
const STAND_IN_RANKS = "#37474f";
const STAND_IN_CROWNS = "#eceff1";
const CROWNS_FROM = 113;

export const scorePanelWant = (level: number): PictureWant | null =>
  LAID_OUT_LEVELS.has(level) ? ART : null;

/** The art's height over its width: the picture's own, or the proportions reserved for it. */
export const panelHeightRatio = (art: PictureView | null): number =>
  art === null ? RESERVED_ART_HEIGHT / RESERVED_ART_WIDTH : art.height / art.width;

interface PanelCount {
  readonly id: string;
  readonly name: string;
  readonly count: number;
  readonly spot: Spot;
  readonly tone: keyof typeof TONE;
  readonly colour: string;
}

export interface ScorePanelProps {
  readonly panel: ProfileView["panel"];
  readonly crowns: ProfileView["crowns"];
  readonly answer: PictureAnswer | undefined;
  readonly i18n: Translator;
  /** The panel; its art is asked for once it is on screen. */
  readonly ref: Ref<HTMLDivElement>;
}

export function ScorePanel({ panel, crowns, answer, i18n, ref }: ScorePanelProps) {
  const { t, number } = i18n;
  const art = viewOf(answer);
  const asking = scorePanelWant(panel.countLevel) !== null && answer === undefined;
  const counts = countsOf(panel.ranks, crowns, i18n);
  return (
    <Box sx={{ ...HIROBA_BLOCK, width: 1, maxWidth: MAX_WIDTH }}>
      <Box
        ref={ref}
        id="score-panel"
        role="group"
        aria-label={t("panel.art")}
        aria-busy={asking}
        sx={{
          position: "relative",
          width: 1,
          aspectRatio: 1 / panelHeightRatio(art),
        }}
      >
        {art === null ? (
          <PanelStandIn counts={counts} />
        ) : (
          <Box
            component="img"
            id="score-panel-image"
            src={art.src}
            alt=""
            aria-hidden
            sx={{ position: "absolute", inset: 0, width: 1, height: 1, display: "block" }}
          />
        )}
        {asking && (
          <CircularProgress
            id="score-panel-loading"
            size={14}
            aria-label={t("pictures.loading")}
            sx={{ position: "absolute", top: 4, left: 4, color: "#fff" }}
          />
        )}
        <Box component="dl" sx={{ m: 0 }}>
          {counts.map(({ id, name, count, spot: [column, row], tone }) => (
            <Box
              key={id}
              sx={{
                position: "absolute",
                left: hp(COLUMN_LEFT[column]),
                top: hp(ROW_TOP[row]),
                height: hp(ROW_HEIGHT),
                lineHeight: hp(ROW_HEIGHT),
                fontSize: hp(COUNT_SIZE),
                fontWeight: "bold",
                whiteSpace: "nowrap",
                ...TONE[tone],
              }}
            >
              <Box component="dt" sx={VISUALLY_HIDDEN}>
                {name}
              </Box>
              <Box component="dd" id={`score-panel-${id}`} sx={{ m: 0 }}>
                {number(count)}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function countsOf(
  ranks: ProfileView["panel"]["ranks"],
  crowns: ProfileView["crowns"],
  { t }: Translator,
): PanelCount[] {
  return PANEL_SPOTS.map(([counted, spot]): PanelCount => {
    if ("rank" in counted) {
      const { rank } = counted;
      return {
        id: `rank-${rank}`,
        name: t(`scoreRank.${rank}`),
        count: ranks[rank],
        spot,
        tone: "rank",
        colour: RANK_COLOUR[rank],
      };
    }
    const { crown } = counted;
    return {
      id: `crowns-${crown}`,
      name: t(`crowns.${crown}`),
      count: crowns[crown],
      spot,
      tone: "crown",
      colour: CROWN_COLOUR[crown],
    };
  });
}

function PanelStandIn({ counts }: { counts: readonly PanelCount[] }) {
  return (
    <Box
      id="score-panel-stand-in"
      aria-hidden
      sx={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        borderRadius: hp(6),
        bgcolor: STAND_IN_CROWNS,
      }}
    >
      <Box sx={{ height: hp(CROWNS_FROM), bgcolor: STAND_IN_RANKS }} />
      {counts.map(({ id, name, spot: [column, row], colour }) => (
        <Box
          key={id}
          sx={{
            position: "absolute",
            left: hp(COLUMN_LEFT[column] - 46),
            top: hp(ROW_TOP[row] - 1),
            width: hp(42),
            height: hp(ROW_HEIGHT + 2),
            // A name of two words, as English writes the ranks, takes the chip's two lines.
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            lineHeight: 1.1,
            borderRadius: hp(4),
            background: colour,
            color: "#000",
            fontSize: hp(9),
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          {name}
        </Box>
      ))}
    </Box>
  );
}
