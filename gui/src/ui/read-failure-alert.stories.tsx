import type { MessageKey } from "@abth/i18n";
import { Typography } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { i18nOf } from "../story-kit/env";
import { ReadFailureAlert } from "./read-failure-alert";

interface Args {
  readonly message: MessageKey;
  readonly code: string | null;
}

const meta = {
  title: "Status/ReadFailureAlert",
  tags: ["ui"],
  render: ({ message, code }, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <ReadFailureAlert id="story-read-failure" message={i18n.t(message)} code={code} i18n={i18n} />
    );
  },
  args: {
    message: "failure.unexpectedPage",
    code: "path=/mypage_kisekae.php status=200 bytes=1204",
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A page of Hiroba that came back as something else, in the place of what it would show. */
export const HirobaPage: Story = {};

/** Hiroba's error in its daily maintenance hours: a refresh later may bring it. */
export const HirobaClosed: Story = {
  args: { message: "failure.siteErrorInMaintenance", code: null },
};

/** Hiroba's error at any other time. */
export const HirobaError: Story = { args: { message: "failure.siteError", code: null } };

/** A third party's data, here OurTaiko's for the rating. */
export const ThirdParty: Story = { args: { message: "rating.dataFailed", code: "unreachable" } };

export const WithoutCode: Story = { args: { message: "costume.preview.unavailable", code: null } };

/** With more about what is missing under it, as Recent plays says which page failed. */
export const WithMore: Story = {
  render: ({ message, code }, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <ReadFailureAlert id="story-read-failure" message={i18n.t(message)} code={code} i18n={i18n}>
        <Typography variant="body2" sx={{ mt: 1 }}>
          {i18n.t("history.failedPage", { page: 3 })}
        </Typography>
      </ReadFailureAlert>
    );
  },
};
