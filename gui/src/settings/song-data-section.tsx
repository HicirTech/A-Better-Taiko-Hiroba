import type { Translator } from "@abth/i18n";
import { List, ListItem, ListItemText, SvgIcon } from "@mui/material";
import { useId } from "react";

import { SettingsSection } from "./settings-section";

// Material's "music_note" icon (Apache 2.0), inline: the icons package is not a dependency.
function MusicNoteIcon() {
  return (
    <SvgIcon aria-hidden fontSize="small">
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3z" />
    </SvgIcon>
  );
}

/** Where the songs' artists, levels and names come from, as the Chinese wiki's licence asks. */
export function SongDataSection({ i18n }: { readonly i18n: Translator }) {
  const headingId = useId();
  return (
    <SettingsSection
      id="song-data"
      headingId={headingId}
      icon={<MusicNoteIcon />}
      title={i18n.t("settings.songData")}
    >
      <List disablePadding>
        <ListItem>
          <ListItemText
            secondary={i18n.t("settings.songDataSources")}
            slotProps={{ secondary: { id: "song-data-sources" } }}
          />
        </ListItem>
      </List>
    </SettingsSection>
  );
}
