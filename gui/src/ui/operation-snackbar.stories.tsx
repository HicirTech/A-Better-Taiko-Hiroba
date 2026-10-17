import type { MessageKey } from "@abth/i18n";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { i18nOf } from "../story-kit/env";
import { OperationSnackbar } from "./operation-snackbar";

interface Args {
  readonly message: MessageKey;
  readonly onClose: () => void;
  readonly onExited: () => void;
}

const meta = {
  title: "Status/OperationSnackbar",
  tags: ["ui"],
  parameters: { layout: "fullscreen" },
  render: ({ message, onClose, onExited }, { globals }) => (
    <OperationSnackbar
      id="story-operation-failed"
      open
      message={i18nOf(globals).t(message)}
      onClose={onClose}
      onExited={onExited}
    />
  ),
  args: { message: "write.failed", onClose: fn(), onExited: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A sync to Hiroba that failed: the user syncs again. Held open here; the app's closes. */
export const SaveFailed: Story = {};
