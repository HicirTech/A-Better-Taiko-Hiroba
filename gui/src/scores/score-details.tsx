import type { Translator } from "@abth/i18n";
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useContext, useRef, useState } from "react";

import { CloseIcon } from "../favorites/favorites-icons";
import { CROWN_KEY, CROWN_RATIO, HistoryRow } from "../history/history-row";
import { useBackLeaves } from "../navigation/back-closers";
import { PipelinesShownContext } from "../navigation/pipelines-shown";
import { useTouchFirst } from "../navigation/use-touch-first";
import { HirobaIcon } from "../pictures/hiroba-icon";
import type { PictureLane } from "../pictures/picture-lane";
import { PullToRead } from "../read-again/pull-to-read";
import { RefreshIcon } from "../read-again/read-again-foot";
import { SHUT_LOOK } from "../read-again/shut-look";
import type { ScoreView } from "../session-port";
import type { ListedScore } from "./score-order";

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

/** A chart's scores in full, as Hiroba's own detail page has them, laid out the app's way. */
export function ScoreDetails({
  listed,
  lane,
  reading,
  readingSong,
  i18n,
  onReadSong,
  onClose,
}: {
  /** The chart shown; none shuts the dialog. */
  readonly listed: ListedScore | null;
  readonly lane: PictureLane;
  /** A read is running, so the song's read again waits. */
  readonly reading: boolean;
  /** The running read is this song's own. */
  readonly readingSong: boolean;
  readonly i18n: Translator;
  readonly onReadSong: (score: ScoreView) => void;
  readonly onClose: () => void;
}) {
  const narrow = useMediaQuery(useTheme().breakpoints.down("sm"), { noSsr: true });
  // Kept while the dialog fades out, so it does not go blank on its way.
  const [last, setLast] = useState(listed);
  if (listed !== null && listed !== last) {
    setLast(listed);
  }
  useBackLeaves(listed !== null, onClose);
  const covered = useContext(PipelinesShownContext);
  return (
    <Dialog
      id="score-details"
      open={listed !== null && !covered}
      onClose={onClose}
      fullScreen={narrow}
      fullWidth
      maxWidth="sm"
      aria-labelledby={TITLE_ID}
    >
      {last !== null && (
        <DetailsBody
          listed={last}
          lane={lane}
          reading={reading}
          readingSong={readingSong}
          i18n={i18n}
          onReadSong={onReadSong}
          onClose={onClose}
        />
      )}
    </Dialog>
  );
}

function DetailsBody({
  listed,
  lane,
  reading,
  readingSong,
  i18n,
  onReadSong,
  onClose,
}: Omit<Parameters<typeof ScoreDetails>[0], "listed"> & { readonly listed: ListedScore }) {
  const { t, number, dateTime } = i18n;
  // A touch screen's Back shuts the dialog and a pull reads it again, so it draws no buttons.
  const touchFirst = useTouchFirst();
  const content = useRef<HTMLDivElement>(null);
  const { score } = listed;
  const { record } = score;
  const readLabel = t("scores.readSong");
  const readSong = () => onReadSong(score);
  const fact = (id: string, label: string, value: number | null) => (
    <li id={id}>
      <span className="fact-name">{label}</span>
      <span>{value === null ? "—" : number(value)}</span>
    </li>
  );
  return (
    <>
      <Box sx={{ pt: 1, pl: 1, pr: touchFirst ? 1 : 9 }}>
        <HistoryRow
          play={score}
          name={{ text: listed.name, lang: listed.nameLang }}
          lane={lane}
          order={0}
          i18n={i18n}
          heading={TITLE_ID}
        />
      </Box>
      {!touchFirst && (
        <Box sx={{ position: "absolute", right: 8, top: 8, display: "flex" }}>
          {/* None while it is shut: a disabled button sends no event to open or close it. */}
          <Tooltip title={reading ? "" : readLabel}>
            <IconButton
              id="score-details-read-song"
              aria-label={readLabel}
              disabled={reading}
              onClick={readSong}
            >
              {readingSong ? <CircularProgress size={20} aria-hidden /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
          <IconButton aria-label={t("picker.close")} onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      )}
      <DialogContent ref={content} sx={{ pt: 1 }}>
        <PullToRead
          active={touchFirst}
          canRead={!reading}
          onRead={readSong}
          region={content}
          id="score-details-pull"
        />
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
              <Typography variant="subtitle2" gutterBottom>
                {t("scores.sections")}
              </Typography>
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
      </DialogContent>
    </>
  );
}
