import type { Translator } from "@abth/i18n";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";

import type { WriteKind, WriteSets } from "../shared/session-port";
import type { Noticed } from "../shared/writes/write-ending";
import { i18nOf } from "../story-kit/env";
import { STORY_SET } from "../story-kit/profile";
import { WriteOutcomeSnackbar } from "./write-outcome";

const PLANNED = { ...STORY_SET, colorBody: 30, costume2: 59 };
const SAVE = { answer: "json", code: 0, message: null, report: "status=200 code=0" } as const;

type AnyOutcome = Noticed<WriteSets[WriteKind]>;

interface Args {
  readonly kind: WriteKind;
  readonly outcome: AnyOutcome;
  readonly onClosed: () => void;
}

/** Says the ending again each time the snackbar has gone, so the story keeps it in view. */
function SaidAgain({ kind, outcome, onClosed, i18n }: Args & { readonly i18n: Translator }) {
  const [round, setRound] = useState(0);
  return (
    <WriteOutcomeSnackbar
      key={round}
      kind={kind}
      outcome={outcome}
      i18n={i18n}
      onClosed={() => {
        onClosed();
        setRound((said) => said + 1);
      }}
    />
  );
}

const refused = (code: number, message: string | null): AnyOutcome => ({
  kind: "notApplied",
  before: STORY_SET,
  after: STORY_SET,
  reason: { kind: "refused", code, message },
  save: { ...SAVE, code, message },
  cross: "unchanged",
});

const meta = {
  title: "Status/WriteOutcomeSnackbar",
  tags: ["my-page"],
  parameters: { layout: "fullscreen" },
  render: (args, { globals }) => <SaidAgain {...args} i18n={i18nOf(globals)} />,
  args: { kind: "costume", outcome: { kind: "maintenance" }, onClosed: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A sync that failed with no word from Hiroba, here in its daily maintenance. */
export const Failed: Story = {};

/** A nickname Hiroba refused in words of its own, quoted as it wrote them. */
export const RefusedInHirobasWords: Story = {
  args: { kind: "name", outcome: refused(1, "使用できない言葉が含まれています") },
};

/** A title Hiroba refused with a code alone, in the sentence its page shows for that code. */
export const RefusedInItsPagesWords: Story = { args: { kind: "title", outcome: refused(5, null) } };

/** Saved on Hiroba, but the game server was not told: the long sentence Hiroba's page shows. */
export const GameServerMissed: Story = {
  args: {
    kind: "title",
    outcome: {
      kind: "appliedNotSynced",
      before: STORY_SET,
      after: PLANNED,
      save: { ...SAVE, code: 3 },
      cross: "unchanged",
    },
  },
};

/** Saved somewhere else than planned: the page now shows what Hiroba holds. */
export const ReadBack: Story = {
  args: {
    outcome: {
      kind: "diverged",
      before: STORY_SET,
      expectedAfter: PLANNED,
      after: { ...PLANNED, costume2: 60 },
      save: SAVE,
      cross: "unchanged",
    },
  },
};
