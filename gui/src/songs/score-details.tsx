import type { Genre, RecentPlay } from "@abth/core";
import type { Translator } from "@abth/i18n";
import { Box, Stack, Typography } from "@mui/material";
import { type ReactNode, useRef, useState } from "react";
import { HirobaIcon } from "../pictures/hiroba-icon";
import type { PictureLane } from "../pictures/picture-lane";
import type { ListedScore } from "../shared/scores/score-order";
import type { ScoreView } from "../shared/session-port";
import { LargeModal, type ModalLook } from "../ui/large-modal";
import { PullToRead } from "../ui/pull-to-read";
import { ReadAgainButton } from "../ui/read-again-button";
import { SubsectionTitle } from "../ui/section-title";
import { SHUT_LOOK } from "../ui/shut-look";
import { useTouchFirst } from "../ui/use-touch-first";
import { CROWN_KEY, CROWN_RATIO } from "./play-marks";
import { PlayRow } from "./play-row";

const TITLE_ID = "score-details-title";
const SECTION_MARK_PX = 18;
const FACTS = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(9rem, 1fr))",
  gap: 1,
  m: 0,
  p: 0,
  listStyle: "none",
  "& > li": { display: "flex", justifyContent: "space-between", gap: 1 },
  "& .fact-name": { color: "text.secondary" },
} as const;
const ROW = { display: "flex", alignItems: "center", gap: 1 } as const;
// The head's words stand in line with the details' under them.
const HEAD_ROW = { px: 2 } as const;

/** A recent play whose chart's details are not here: its row, why, and a read of its song. */
export interface PlayNotice {
  readonly play: RecentPlay;
  readonly name: { readonly text: string; readonly lang: string };
  /** The song's genres and the chart's star level from the song list, as its row showed them. */
  readonly genres: readonly Genre[] | undefined;
  readonly stars: number | null;
  readonly why: ReactNode;
  /** Reads the play's song again; none when the app does not know the song. */
  readonly onRead: (() => void) | null;
}

/** A chart's scores in full, as Hiroba's own detail page has them, laid out the app's way. */
export function ScoreDetails({
  listed,
  notice = null,
  lane,
  reading,
  readingSong,
  modalLook,
  i18n,
  onReadSong,
  onClose,
}: {
  /** The chart shown; none shuts the dialog, unless there is a notice. */
  readonly listed: ListedScore | null;
  /** What the dialog shows of a recent play while its chart has no details to show. */
  readonly notice?: PlayNotice | null;
  readonly lane: PictureLane;
  readonly modalLook: ModalLook;
  /** A read is running, so the song's read again waits. */
  readonly reading: boolean;
  /** The running read is this song's own. */
  readonly readingSong: boolean;
  readonly i18n: Translator;
  readonly onReadSong: (score: ScoreView) => void;
  readonly onClose: () => void;
}) {
  const shown = listed ?? notice;
  // Kept while the modal slides away, so it does not go blank on its way.
  const [last, setLast] = useState(shown);
  if (shown !== null && shown !== last) {
    setLast(shown);
  }
  return last === null ? null : (
    <DetailsBody
      open={shown !== null}
      shown={last}
      lane={lane}
      reading={reading}
      readingSong={readingSong}
      modalLook={modalLook}
      i18n={i18n}
      onReadSong={onReadSong}
      onClose={onClose}
    />
  );
}

function DetailsBody({
  open,
  shown,
  lane,
  reading,
  readingSong,
  modalLook,
  i18n,
  onReadSong,
  onClose,
}: Omit<Parameters<typeof ScoreDetails>[0], "listed" | "notice"> & {
  readonly open: boolean;
  readonly shown: ListedScore | PlayNotice;
}) {
  const { t } = i18n;
  // A touch screen's pull reads it again, where a computer has the button.
  const touchFirst = useTouchFirst();
  const content = useRef<HTMLDivElement>(null);
  const readLabel = t("scores.readSong");
  const { play, name, readSong } =
    "score" in shown
      ? {
          play: shown.score,
          name: { text: shown.name, lang: shown.nameLang },
          readSong: () => onReadSong(shown.score),
        }
      : { play: shown.play, name: shown.name, readSong: shown.onRead };
  const { genres, stars } = shown;
  return (
    <LargeModal
      id="score-details"
      open={open}
      title={
        <PlayRow
          play={play}
          name={name}
          genres={genres}
          stars={stars}
          lane={lane}
          order={0}
          i18n={i18n}
          heading={TITLE_ID}
          sx={HEAD_ROW}
        />
      }
      actions={
        readSong !== null && (
          <ReadAgainButton
            id="score-details-read-song"
            label={readLabel}
            canRead={!reading}
            reading={readingSong}
            onRead={readSong}
          />
        )
      }
      pageLike
      contentRef={content}
      touchFirst={touchFirst}
      modalLook={modalLook}
      i18n={i18n}
      onClose={onClose}
    >
      {readSong !== null && (
        <PullToRead
          active={touchFirst}
          canRead={!reading}
          onRead={readSong}
          region={content}
          id="score-details-pull"
        />
      )}
      {"score" in shown ? (
        <ChartFacts score={shown.score} lane={lane} readingSong={readingSong} i18n={i18n} />
      ) : (
        <Box id="score-details-notice">{shown.why}</Box>
      )}
    </LargeModal>
  );
}

function ChartFacts({
  score,
  lane,
  readingSong,
  i18n,
}: {
  readonly score: ScoreView;
  readonly lane: PictureLane;
  readonly readingSong: boolean;
  readonly i18n: Translator;
}) {
  const { t, number, dateTime } = i18n;
  const { record } = score;
  const fact = (id: string, label: string, value: number | null) => (
    <li id={id}>
      <span className="fact-name">{label}</span>
      <span>{value === null ? "—" : number(value)}</span>
    </li>
  );
  return (
    <Stack spacing={2.5} inert={readingSong} sx={SHUT_LOOK(readingSong)}>
      <Typography id="score-details-ranking" color="text.secondary">
        {t("scores.ranking")} ·{" "}
        {score.ranking === null
          ? t("scores.noPlace")
          : t("scores.place", { place: number(score.ranking) })}
      </Typography>

      <Box component="ul" id="score-details-hits" sx={FACTS}>
        {fact("score-details-good", t("history.good"), record.good)}
        {fact("score-details-ok", t("history.ok"), record.ok)}
        {fact("score-details-bad", t("history.bad"), record.bad)}
        {fact("score-details-roll", t("history.roll"), record.drumroll)}
      </Box>

      <Box component="ul" id="score-details-counts" sx={FACTS}>
        {fact("score-details-plays", t("scores.plays"), record.stageCount)}
        {fact("score-details-clears", t("scores.clears"), record.clearCount)}
        {fact("score-details-full-combos", t("scores.fullCombos"), record.fullComboCount)}
        {fact("score-details-donderfuls", t("scores.donderfuls"), record.donderfulComboCount)}
      </Box>

      {score.sections.length > 0 && (
        <Box>
          <SubsectionTitle>{t("scores.sections")}</SubsectionTitle>
          <Stack component="ol" id="score-details-sections" spacing={1} sx={{ m: 0, p: 0 }}>
            {score.sections.map((section, index) => (
              <Box
                // biome-ignore lint/suspicious/noArrayIndexKey: a section is its place
                key={index}
                component="li"
                className="score-section"
                sx={{ listStyle: "none" }}
              >
                <Box sx={{ ...ROW, minHeight: SECTION_MARK_PX }}>
                  <Typography>{t("scores.section", { number: index + 1 })}</Typography>
                  <Box className="section-crown" sx={{ ml: "auto", display: "flex" }}>
                    {section.crown !== "none" && section.crown !== "played" && (
                      <HirobaIcon
                        want={{ kind: "crownIcon", crown: section.crown }}
                        width={Math.round(SECTION_MARK_PX * CROWN_RATIO)}
                        height={SECTION_MARK_PX}
                        label={t(CROWN_KEY[section.crown])}
                        lane={lane}
                        order={1}
                      />
                    )}
                  </Box>
                </Box>
                <Box sx={{ ...ROW, alignItems: "baseline" }}>
                  <Typography variant="body2" color="text.secondary">
                    {[
                      `${t("history.good")} ${number(section.good)}`,
                      `${t("history.ok")} ${number(section.ok)}`,
                      `${t("history.bad")} ${number(section.bad)}`,
                      `${t("history.roll")} ${number(section.drumroll)}`,
                    ].join(" · ")}
                  </Typography>
                  <Typography className="section-score" sx={{ ml: "auto" }}>
                    {number(section.score)}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      <Typography id="score-details-read-at" variant="body2" color="text.secondary">
        {t("scores.readAt", { time: dateTime(score.fetchedAt) })}
      </Typography>
    </Stack>
  );
}
