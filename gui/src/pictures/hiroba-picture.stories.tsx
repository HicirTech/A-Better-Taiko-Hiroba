import { Box, Stack } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { action } from "storybook/actions";

import { NO_PREVIEW, type PreviewState } from "../my-page/costume-preview";
import { CostumePreviewBox, PreviewFailure } from "../my-page/costume-preview-box";
import { MedalCard } from "../my-page/medal-card";
import { MY_DON, MyDonPortrait } from "../my-page/my-don-portrait";
import { ScorePanel } from "../my-page/score-panel";
import { TitlePlate } from "../my-page/title-plate";
import { previewOf } from "../story-kit/costume";
import { touchOf } from "../story-kit/devices";
import { i18nOf, type StoryGlobals } from "../story-kit/env";
import { STORY_PROFILE, STORY_SET } from "../story-kit/profile";
import { FAILING_LANE, STORY_LANE, storyAnswer, WAITING_LANE } from "../story-kit/story-pictures";
import type { PictureAnswer, PictureLane } from "./picture-lane";

interface Answers {
  readonly myDon: PictureAnswer | undefined;
  readonly plate: PictureAnswer | undefined;
  readonly panel: PictureAnswer | undefined;
}

const SHOWN: Answers = {
  myDon: storyAnswer(MY_DON),
  plate: storyAnswer({ kind: "titlePlate" }),
  panel: storyAnswer({ kind: "scorePanel" }),
};
const ON_ITS_WAY: Answers = { myDon: undefined, plate: undefined, panel: undefined };
const FAILED: Answers = {
  myDon: { failure: "myDon=notPng status=200" },
  plate: { failure: "titlePlate=notPng status=404" },
  panel: { failure: "scorePanel=notPng status=404" },
};

function EveryFrame({
  answers,
  lane,
  preview,
  globals,
}: {
  readonly answers: Answers;
  readonly lane: PictureLane;
  readonly preview: PreviewState;
  readonly globals: StoryGlobals;
}) {
  const i18n = i18nOf(globals);
  return (
    <Stack spacing={2} sx={{ maxWidth: 420 }}>
      <Box sx={{ width: 160 }}>
        <MyDonPortrait
          answer={answers.myDon}
          action={{ open: action("open the Costume page"), byLongPress: touchOf(globals) }}
          i18n={i18n}
          ref={null}
        />
      </Box>
      <TitlePlate profile={STORY_PROFILE} answer={answers.plate} i18n={i18n} ref={null} />
      <ScorePanel
        panel={STORY_PROFILE.panel}
        crowns={STORY_PROFILE.crowns}
        answer={answers.panel}
        i18n={i18n}
        ref={null}
      />
      <MedalCard medal={STORY_PROFILE.medal} lane={lane} i18n={i18n} />
      <Stack spacing={1} sx={{ width: 240 }}>
        <CostumePreviewBox preview={preview} i18n={i18n} />
        <PreviewFailure preview={preview} i18n={i18n} />
      </Stack>
    </Stack>
  );
}

const meta = {
  title: "Pictures/HirobaPicture",
  tags: ["pictures"],
  render: (_args, { globals }) => (
    <EveryFrame
      answers={ON_ITS_WAY}
      lane={WAITING_LANE}
      preview={{ ...NO_PREVIEW, loading: true }}
      globals={globals}
    />
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every large frame while its picture is on its way: its stand-in and one spinner, top right. */
export const OnItsWay: Story = {};

/** Every large frame with its picture. */
export const Shown: Story = {
  render: (_args, { globals }) => (
    <EveryFrame
      answers={SHOWN}
      lane={STORY_LANE}
      preview={previewOf(STORY_SET)}
      globals={globals}
    />
  ),
};

/** Every large frame whose picture did not come: silent stand-ins; the preview says why. */
export const Failed: Story = {
  render: (_args, { globals }) => (
    <EveryFrame
      answers={FAILED}
      lane={FAILING_LANE}
      preview={{ ...NO_PREVIEW, failure: "preview=notPng status=200" }}
      globals={globals}
    />
  ),
};
