import type { ScoreRank } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Box, CircularProgress } from "@mui/material";
import type { Ref } from "react";

import type { PictureAnswer } from "../pictures/picture-lane";
import type { PictureWant, ProfileView } from "../session-port";
import { HIROBA_BLOCK, hirobaPx, OUTLINED, VISUALLY_HIDDEN } from "./hiroba-px";
import { CROWN_COLOUR, RANK_COLOUR } from "./panel-colours";

/** Hiroba's score panel, .total_score: 280 pixels wide, #mydon_area's 290 less its margins. */
const PANEL_WIDTH = 280;
/** Lengths in the panel's pixels. */
const hp = hirobaPx(PANEL_WIDTH);
/** The art's size as my page's layout implies it, reserved until the picture gives its own. */
const ART_WIDTH = 600;
const ART_HEIGHT = 356;
/** At most half again Hiroba's own size, as the plate. */
const MAX_WIDTH = PANEL_WIDTH * 1.5;
/**
 * Where my page writes each count over total_score_image_5, in the panel's pixels, as its inline
 * styles place them: the left of each of three columns, and the top of each of four rows, each a
 * line 21 high. The numbers are 14 pixels, the size a 21-pixel line implies.
 */
const COLUMN_LEFT = [57, 141, 230] as const;
const ROW_TOP = [18, 54, 85, 121] as const;
const ROW_HEIGHT = 21;
const COUNT_SIZE = 14;
/** A count's place on the panel: its column, left to right, and its row, top to bottom. */
type Spot = readonly [column: 0 | 1 | 2, row: 0 | 1 | 2 | 3];
type Crown = keyof ProfileView["crowns"];
/** What a count counts: a score rank, or a crown. */
type Counted = { readonly rank: ScoreRank } | { readonly crown: Crown };
/**
 * Each count my page writes over the art, where, in the order it is read, row by row: 虹極 alone at
 * the right of the top row, then the 雅s, the 粋s and the crowns, each row worst first.
 */
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
/**
 * The panels whose layout is known, by level: total_score_image_5 is the only one ever seen. Any
 * other is drawn as the stand-in, its art never asked for, so no count sits on art it may not fit.
 */
const LAID_OUT_LEVELS: ReadonlySet<number> = new Set([5]);
const ART: PictureWant = { kind: "scorePanel" };
/**
 * How each kind of count is written, the same in either theme, as on Hiroba: a rank's in white
 * outlined in a dark line, on the art's dark rows; a crown's in black, on its pale one.
 */
const TONE = {
  rank: { color: "#fff", textShadow: OUTLINED },
  crown: { color: "#000" },
} as const;
/**
 * The stand-in's grounds, plain on purpose, so it is not taken for Hiroba's art: dark under the
 * ranks and pale under the crowns, split where the art splits them, and the name of what each
 * count counts on a chip of its colour where the art has its icon.
 */
const STAND_IN_RANKS = "#37474f";
const STAND_IN_CROWNS = "#eceff1";
const CROWNS_FROM = 113;

/** The picture to ask for, for a panel of `level`: none unless its layout is known. */
export const scorePanelWant = (level: number): PictureWant | null =>
  LAID_OUT_LEVELS.has(level) ? ART : null;

/** One count, where the panel writes it. */
interface PanelCount {
  /** The part of its id after `score-panel-`: rank-8, crowns-silver. */
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
  /** What the picture lane has of the art: the picture, why it did not come, or nothing yet. */
  readonly answer: PictureAnswer | undefined;
  readonly i18n: Translator;
  /** The panel, whose art is asked for only once it is on screen. */
  readonly ref: Ref<HTMLDivElement>;
}

/**
 * Hiroba's score panel as my page draws it, .total_score: its art, as a data: URL, with the seven
 * score ranks' counts and the three crowns' written over it where my page writes them. Every count
 * stays text, to copy and for screen readers, each after its name, which only they read: the art
 * shows it. Until the art comes, if it does not, or for a panel whose layout is not known, a plain
 * panel of the same geometry stands in, and names what each count counts.
 */
export function ScorePanel({ panel, crowns, answer, i18n, ref }: ScorePanelProps) {
  const { t, number } = i18n;
  const art = answer !== undefined && "view" in answer ? answer.view : null;
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
          aspectRatio:
            art !== null ? `${art.width} / ${art.height}` : `${ART_WIDTH} / ${ART_HEIGHT}`,
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

/** The ten counts, where the panel writes them, in the order they are read. */
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

/**
 * The panel drawn plainly, as the art lays it out: a dark ground under the ranks and a pale one
 * under the crowns, and left of each count, where the art has an icon, a chip of its colour with
 * its name, so a number never stands without what it counts.
 */
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
