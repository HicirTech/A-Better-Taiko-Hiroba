import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { i18nOf } from "../story-kit/env";
import { UpdateDialog, type UpdateDialogProps } from "./update-dialog";

type Args = Omit<UpdateDialogProps, "i18n">;

const meta = {
  title: "Dialogs/UpdateDialog",
  tags: ["updates"],
  parameters: { layout: "fullscreen" },
  render: (args, { globals }) => <UpdateDialog {...args} i18n={i18nOf(globals)} />,
  args: {
    offer: {
      open: true,
      feed: {
        version: "0.6.0",
        notes: {
          en: ["Song details open from every song row.", "Pages keep their place while reading."],
          ja: ["曲の詳細をどの曲の行からも開けます。", "読み込み中もページがその場に残ります。"],
          "zh-Hans": ["每一行歌曲都能打开歌曲详情。", "读取时页面保持在原处。"],
        },
      },
    },
    onDownload: fn(),
    onLater: fn(),
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** What is new in the latest release, in the app's language or English, with Download and Later. */
export const NewVersion: Story = {};
