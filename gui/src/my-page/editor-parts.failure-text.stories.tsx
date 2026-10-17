import { FormHelperText } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import type { ReadFailure } from "../session-port";
import { i18nOf } from "../story-kit/env";
import { FailureText } from "./editor-parts";

interface Args {
  readonly failure: ReadFailure;
}

const meta = {
  title: "Status/FailureText",
  tags: ["my-page"],
  render: ({ failure }, { globals }) => (
    <FormHelperText error>
      <FailureText failure={failure} i18n={i18nOf(globals)} />
    </FormHelperText>
  ),
  args: { failure: { kind: "unreachable" } },
  argTypes: {
    failure: {
      control: "select",
      options: [
        "notSignedIn",
        "loggedOut",
        "cardSelectUnfinished",
        "unreachable",
        "timedOut",
        "cancelled",
        "siteError",
        "unexpectedPage",
        "maintenance",
        "notRefreshed",
      ],
      mapping: Object.fromEntries(
        [
          "notSignedIn",
          "loggedOut",
          "cardSelectUnfinished",
          "unreachable",
          "timedOut",
          "cancelled",
          "siteError",
          "unexpectedPage",
          "maintenance",
          "notRefreshed",
        ].map((kind) => [kind, { kind }]),
      ),
    },
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** What went wrong, inline, so it fits a control's helper text. */
export const Unreachable: Story = {};

/** With the codes a user can copy into a report. */
export const WithCodes: Story = {
  args: {
    failure: {
      kind: "unexpectedPage",
      detail: "path=/score_list.php status=200 type=text/html bytes=48213 parser=missingMarker",
    },
  },
};
