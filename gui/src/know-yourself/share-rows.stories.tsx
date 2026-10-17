import type { Translator } from "@abth/i18n";
import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { touchOf } from "../story-kit/devices";
import { i18nOf, STORY_TOAST } from "../story-kit/env";
import { STORY_KNOWN } from "../story-kit/know";
import { STORY_LANE } from "../story-kit/story-pictures";
import { byStars, groupId } from "./groups";
import { clearCounts } from "./ladder";
import { clearSegments } from "./segments";
import { ShareRows } from "./share-rows";

function Rows({ i18n, toast }: { i18n: Translator; toast: boolean }) {
  const [opened, setOpened] = useState<string | null>(null);
  const groups = byStars(STORY_KNOWN);
  return (
    <Box sx={{ maxWidth: 720 }}>
      <ShareRows
        id="story-rows"
        segments={clearSegments(i18n)}
        rows={[
          { id: "all", label: i18n.t("picker.all"), counts: clearCounts(STORY_KNOWN), list: null },
          ...groups.map(({ key, charts }) => ({
            id: groupId(key),
            label:
              key.kind === "stars"
                ? i18n.t("picker.level", { level: key.stars })
                : i18n.t("know.unknown"),
            counts: clearCounts(charts),
            list: null,
          })),
        ]}
        legend={clearCounts(STORY_KNOWN)}
        opened={opened}
        onToggle={(row) => setOpened((now) => (now === row ? null : row))}
        lane={STORY_LANE}
        toast={toast ? STORY_TOAST : undefined}
        i18n={i18n}
      />
    </Box>
  );
}

const meta = {
  title: "Stats/ShareRows",
  tags: ["know-yourself"],
  render: (_args, { globals }) => <Rows i18n={i18nOf(globals)} toast={touchOf(globals)} />,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A share bar per row, such as the crowns at each star level, under one legend. */
export const ByStarLevel: Story = {};
