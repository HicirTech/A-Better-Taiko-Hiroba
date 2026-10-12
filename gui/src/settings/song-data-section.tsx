import type { MessageKey, Translator } from "@abth/i18n";
import {
  List,
  ListItem,
  ListItemText,
  SvgIcon,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { useId, useState } from "react";

import {
  CHART_SOURCES,
  type ChartSource,
  keepChartSource,
  keptChartSource,
} from "../songs/chart-source";
import { SettingsSection } from "./settings-section";

// Material's "music_note" icon (Apache 2.0), inline: the icons package is not a dependency.
function MusicNoteIcon() {
  return (
    <SvgIcon aria-hidden fontSize="small">
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3z" />
    </SvgIcon>
  );
}

/** Each source, and what of the songs it gives. */
const SOURCES: readonly { id: string; name: MessageKey; gives: MessageKey }[] = [
  { id: "taiko-wiki", name: "settings.taikoWiki", gives: "settings.taikoWikiGives" },
  { id: "chinese-wiki", name: "settings.chineseWiki", gives: "settings.chineseWikiGives" },
  { id: "chart-wiki", name: "settings.chartWiki", gives: "settings.chartWikiGives" },
  { id: "ourtaiko", name: "settings.ourTaiko", gives: "settings.ourTaikoGives" },
  { id: "fumendb", name: "settings.fumenDb", gives: "settings.fumenDbGives" },
  { id: "ese", name: "settings.ese", gives: "settings.eseGives" },
  { id: "tja-renderer", name: "settings.tjaRenderer", gives: "settings.tjaRendererGives" },
];

const SOURCE_LABEL: Readonly<Record<ChartSource, MessageKey>> = {
  tja: "settings.chartSource.tja",
  wiki: "settings.chartSource.wiki",
};

/** Which chart pictures a song's details show, and where the song data comes from, as asked. */
export function SongDataSection({ i18n }: { readonly i18n: Translator }) {
  const { t } = i18n;
  const headingId = useId();
  const labelId = useId();
  const [source, setSource] = useState(keptChartSource);
  const choose = (next: ChartSource | null) => {
    // A second press on the chosen one would leave none.
    if (next === null) {
      return;
    }

    keepChartSource(next);
    setSource(next);
  };
  return (
    <SettingsSection
      id="song-data"
      headingId={headingId}
      icon={<MusicNoteIcon />}
      title={t("settings.songData")}
    >
      <List disablePadding>
        <ListItem id="chart-source" sx={{ flexWrap: "wrap", columnGap: 2 }}>
          <ListItemText
            primary={t("settings.chartSource")}
            secondary={t("settings.chartSourceHint")}
            slotProps={{ primary: { id: labelId } }}
            sx={{ flex: "1 1 240px" }}
          />
          <ToggleButtonGroup
            exclusive
            size="small"
            color="primary"
            value={source}
            aria-labelledby={labelId}
            onChange={(_event, next: ChartSource | null) => choose(next)}
          >
            {CHART_SOURCES.map((one) => (
              <ToggleButton
                key={one}
                id={`chart-source-${one}`}
                value={one}
                sx={{ px: 1.5, textTransform: "none" }}
              >
                {t(SOURCE_LABEL[one])}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </ListItem>
        {SOURCES.map(({ id, name, gives }) => (
          <ListItem key={id} id={`song-data-${id}`}>
            <ListItemText primary={t(name)} secondary={t(gives)} />
          </ListItem>
        ))}
      </List>
    </SettingsSection>
  );
}
