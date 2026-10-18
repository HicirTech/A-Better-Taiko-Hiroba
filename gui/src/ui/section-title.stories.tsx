import {
  Box,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Paper,
  Skeleton,
} from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { i18nOf } from "../story-kit/env";
import { TranslateIcon } from "./icons";
import { SectionTitle } from "./section-title";

// What a title stands over: the stories show the title, not what it titles.
const CONTENT = <Skeleton variant="rounded" height={48} animation={false} />;

const meta = {
  title: "Cards and sections/SectionTitle",
  tags: ["ui"],
  render: (_args, { globals }) => (
    <Box sx={{ maxWidth: 600 }}>
      <SectionTitle id="story-title">{i18nOf(globals).t("panel.ranks")}</SectionTitle>
      {CONTENT}
    </Box>
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A section's title over what it titles, 8 px apart, as the Overview's blocks stand. */
export const AboveItsContent: Story = {};

/** A card's title (h3 under the page's own), as the favourites' cards have. */
export const InACard: Story = {
  render: (_args, { globals }) => (
    <Card variant="outlined" sx={{ maxWidth: 600 }}>
      <CardContent>
        <SectionTitle level={3}>{i18nOf(globals).t("favorites.song.heading")}</SectionTitle>
        {CONTENT}
      </CardContent>
    </Card>
  ),
};

/** What belongs beside the title stands at the row's end, and wraps under it on a phone. */
export const WithThingsAtItsEnd: Story = {
  render: (_args, { globals }) => {
    const { t } = i18nOf(globals);
    return (
      <Card variant="outlined" sx={{ maxWidth: 600 }}>
        <CardContent>
          <SectionTitle
            level={3}
            end={
              <Button variant="outlined" size="small">
                {t("favorites.saveAsSet")}
              </Button>
            }
          >
            {t("favorites.folder.heading")}
          </SectionTitle>
          {CONTENT}
        </CardContent>
      </Card>
    );
  },
};

/** An icon before the words, as each settings section has. */
export const WithAnIconAtItsStart: Story = {
  render: (_args, { globals }) => {
    const { t } = i18nOf(globals);
    return (
      <Paper variant="outlined" sx={{ maxWidth: 600 }}>
        <Box sx={{ px: 2, pt: 2 }}>
          <SectionTitle start={<TranslateIcon fontSize="small" />}>
            {t("settings.language")}
          </SectionTitle>
        </Box>
        <List>
          <ListItem>
            <ListItemText primary={t("language.system", { name: "English" })} />
          </ListItem>
        </List>
      </Paper>
    );
  },
};
