import type { MessageKey } from "@abth/i18n";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { i18nOf } from "../story-kit/env";
import { NoteAlert } from "./note-alert";

interface Args {
  readonly words: MessageKey;
  readonly warns: boolean;
}

const meta = {
  title: "Status/NoteAlert",
  tags: ["ui"],
  render: ({ words, warns }, { globals }) => (
    <NoteAlert id="story-note" warns={warns}>
      {i18nOf(globals).t(words)}
    </NoteAlert>
  ),
  args: { words: "costume.kigurumiWarning", warns: false },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The costume's note that a kigurumi takes off the other parts. */
export const Informing: Story = {};

/** The nickname that cannot be changed now. */
export const Warning: Story = { args: { words: "name.closed", warns: true } };

/** The sign-in card's notice after an attempt, here a cancelled one. */
export const OnTheSignInCard: Story = { args: { words: "signIn.cancelled" } };

/** A build that runs outside the desktop and Android apps. */
export const UnsupportedPlatform: Story = { args: { words: "platform.unsupported" } };
