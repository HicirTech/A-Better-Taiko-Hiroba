import type { Translator } from "@abth/i18n";
import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { fn } from "storybook/test";

import type { PipelinesView } from "../session-port";
import { i18nOf } from "../story-kit/env";
import { createStoryPort } from "../story-kit/story-port";
import { PipelineSection } from "./pipeline-section";

interface Args {
  readonly onListed: (listed: boolean) => void;
}

/** Hiroba's pipeline as the story port has it now. */
function IoSection({ args, i18n, first }: { args: Args; i18n: Translator; first: boolean }) {
  const [view, setView] = useState<PipelinesView | null>(null);
  const [listed, setListed] = useState(first);
  useEffect(() => {
    void createStoryPort().readPipelines(10).then(setView);
  }, []);
  return (
    <Box sx={{ maxWidth: 640 }}>
      <PipelineSection
        id="story-pipeline"
        i18n={i18n}
        name="pipelines.io"
        view={view?.io ?? null}
        listed={listed}
        onListed={(next) => {
          setListed(next);
          args.onListed(next);
        }}
      />
    </Box>
  );
}

const meta = {
  title: "Cards and sections/PipelineSection",
  tags: ["pipelines-page"],
  render: (args, { globals }) => <IoSection args={args} i18n={i18nOf(globals)} first={false} />,
  args: { onListed: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A pipeline's groups running and waiting, and the newest that ended, as cells. */
export const Cells: Story = {};

/** Listed: every group kept, a row each. */
export const Listed: Story = {
  render: (args, { globals }) => <IoSection args={args} i18n={i18nOf(globals)} first />,
};
