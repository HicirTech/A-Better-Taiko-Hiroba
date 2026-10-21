import { Box, List, ListItem, ListItemText } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { i18nOf } from "../story-kit/env";
import { AccountCircleIcon } from "../ui/icons";
import { SettingsSection } from "./settings-section";

const meta = {
  title: "Cards and sections/SettingsSection",
  tags: ["settings"],
  render: (_args, { globals }) => {
    const { t } = i18nOf(globals);
    return (
      <Box sx={{ maxWidth: 600 }}>
        <SettingsSection
          id="story-section"
          headingId="story-section-heading"
          icon={<AccountCircleIcon fontSize="small" />}
          title={t("settings.account")}
        >
          <List disablePadding>
            <ListItem>
              <ListItemText primary={t("settings.signedOut")} secondary={t("signOut.note")} />
            </ListItem>
          </List>
        </SettingsSection>
      </Box>
    );
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A settings section: an icon and a heading over the section's rows. */
export const Section: Story = {};
