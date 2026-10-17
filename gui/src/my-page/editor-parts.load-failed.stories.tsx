import { Typography } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import type { ReadFailure } from "../session-port";
import { i18nOf } from "../story-kit/env";
import { LoadFailed } from "./editor-parts";

interface Args {
  readonly failure: ReadFailure;
}

const meta = {
  title: "Status/LoadFailed",
  tags: ["my-page"],
  render: ({ failure }, { globals }) => (
    <LoadFailed id="story-load-failed" failure={failure} i18n={i18nOf(globals)} />
  ),
  args: { failure: { kind: "timedOut" } },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A page that could not be read: a warning in its place. */
export const TimedOut: Story = {};

export const WithCodes: Story = {
  args: {
    failure: { kind: "unexpectedPage", detail: "path=/mypage_kisekae.php status=200 bytes=1204" },
  },
};

/** With where the read stopped under it, as Recent plays says which page failed. */
export const WithWhereItStopped: Story = {
  render: ({ failure }, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <LoadFailed id="story-load-failed" failure={failure} i18n={i18n}>
        <Typography variant="body2" sx={{ mt: 1 }}>
          {i18n.t("history.failedPage", { page: 3 })}
        </Typography>
      </LoadFailed>
    );
  },
};
