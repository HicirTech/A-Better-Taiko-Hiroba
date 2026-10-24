import type { Translator } from "@abth/i18n";
import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import type { PipelinesView } from "../shared/session-port";
import { i18nOf } from "../story-kit/env";
import { createStoryPort } from "../story-kit/story-port";
import { GroupDetails } from "./group-details";
import { pickedNow } from "./pipeline-rows";

/** The details of a group of Hiroba's pipeline: one running, or one that ended in a failure. */
function Details({ i18n, ended }: { i18n: Translator; ended: boolean }) {
  const [view, setView] = useState<PipelinesView | null>(null);
  useEffect(() => {
    void createStoryPort().readPipelines(10).then(setView);
  }, []);
  const io = view?.io;
  const running = io?.running[0];
  const failed = io?.ended.find((group) => group.outcome !== "succeeded");
  const picked = ended
    ? failed === undefined
      ? null
      : { kind: "ended" as const, group: failed }
    : running === undefined
      ? null
      : pickedNow(running);
  return (
    <Box sx={{ maxWidth: 480 }}>
      {io !== undefined && picked !== null && (
        <GroupDetails id="story-group" i18n={i18n} picked={picked} view={io} />
      )}
    </Box>
  );
}

const meta = {
  title: "Cards and sections/GroupDetails",
  tags: ["pipelines-page"],
  render: (_args, { globals }) => <Details i18n={i18nOf(globals)} ended={false} />,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A running group: what it asked for, and for how long. */
export const Running: Story = {};

/** A group that failed: its code, and the request it ended at. */
export const Failed: Story = {
  render: (_args, { globals }) => <Details i18n={i18nOf(globals)} ended />,
};
