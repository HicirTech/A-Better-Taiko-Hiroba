import type { Translator } from "@abth/i18n";
import { Stack, Typography } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";

import type { CostumeSet } from "../session-port";
import { i18nOf } from "../story-kit/env";
import { STORY_SET } from "../story-kit/profile";
import type { Noticed } from "./write-ending";
import { WriteOutcomeNotice } from "./write-outcome";

const PLANNED: CostumeSet = { ...STORY_SET, colorBody: 30, costume2: 59 };
const SAVE = { answer: "json", code: 0, message: null, report: "status=200 code=0" } as const;

/** Saved somewhere else than planned. */
const DIVERGED: Noticed<CostumeSet> = {
  kind: "diverged",
  before: STORY_SET,
  expectedAfter: PLANNED,
  after: { ...PLANNED, costume2: 60 },
  save: SAVE,
  cross: "changed",
};

/** Each way a costume write can end that the page says something about, by a name of its own. */
const ENDINGS: readonly (readonly [string, Noticed<CostumeSet>])[] = [
  ["maintenance", { kind: "maintenance" }],
  ["readFailed", { kind: "readFailed", failure: { kind: "timedOut" } }],
  ["sessionGone, before the save", { kind: "sessionGone", writeMayHaveHappened: false }],
  [
    "sessionGone, after the save",
    {
      kind: "sessionGone",
      writeMayHaveHappened: true,
      before: STORY_SET,
      expectedAfter: PLANNED,
      save: SAVE,
    },
  ],
  [
    "changedSincePreview",
    { kind: "changedSincePreview", current: { ...STORY_SET, colorFace: 44 } },
  ],
  [
    "stoppedBeforeWrite",
    {
      kind: "stoppedBeforeWrite",
      reason: "precheckRejected",
      code: "precheck=rejected status=200",
    },
  ],
  [
    "appliedNotSynced",
    {
      kind: "appliedNotSynced",
      before: STORY_SET,
      after: PLANNED,
      save: { ...SAVE, code: 2 },
      cross: "unchanged",
    },
  ],
  [
    "notApplied",
    {
      kind: "notApplied",
      before: STORY_SET,
      after: STORY_SET,
      reason: { kind: "refused", code: 12, message: "この着せかえは選択できません" },
      save: { ...SAVE, code: 12, message: "この着せかえは選択できません" },
      cross: "unchanged",
    },
  ],
  ["diverged", DIVERGED],
  [
    "outcomeUnknown",
    {
      kind: "outcomeUnknown",
      before: STORY_SET,
      expectedAfter: PLANNED,
      save: SAVE,
      failure: { kind: "timedOut" },
    },
  ],
  ["interrupted", { kind: "interrupted" }],
  ["busy", { kind: "busy" }],
  ["notSignedIn", { kind: "notSignedIn" }],
];

const notice = (outcome: Noticed<CostumeSet>, i18n: Translator) => (
  <WriteOutcomeNotice outcome={outcome} kind="costume" i18n={i18n} />
);

const meta = {
  title: "Status/WriteOutcomeNotice",
  tags: ["my-page"],
  render: (_args, { globals }) => {
    const i18n = i18nOf(globals);
    return (
      <Stack spacing={2} sx={{ maxWidth: 640 }}>
        {ENDINGS.map(([name, outcome]) => (
          <Stack key={name} spacing={0.5}>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
              {name}
            </Typography>
            {notice(outcome, i18n)}
          </Stack>
        ))}
      </Stack>
    );
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every ending a write can have that is not a plain save, one under another. */
export const EveryEnding: Story = {};

/** Saved somewhere else than planned: what it was, what was planned and what it is now. */
export const WithComparison: Story = {
  render: (_args, { globals }) => notice(DIVERGED, i18nOf(globals)),
};
