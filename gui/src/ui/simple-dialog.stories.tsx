import type { Translator } from "@abth/i18n";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";

import { newSetName, SET_NAME_MAX_LENGTH } from "../shared/sets/favorite-sets";
import { notesFor } from "../shared/updates/update-feed";
import { i18nOf } from "../story-kit/env";
import { STORY_SCORES } from "../story-kit/scores";
import { STORY_SETS } from "../story-kit/sets";
import * as UpdateDialogStories from "../updates/update-dialog.stories";
import { SimpleDialog } from "./simple-dialog";

interface Args {
  readonly onClose: () => void;
  readonly onAction: () => void;
}

const SET_NAME = STORY_SETS[0]?.name ?? "";

function TypedName({ args, i18n }: { readonly args: Args; readonly i18n: Translator }) {
  const { t } = i18n;
  const [name, setName] = useState(() =>
    newSetName(STORY_SETS, (number) => t("favorites.setName", { number })),
  );
  return (
    <SimpleDialog
      id="story-name"
      open
      title={t("favorites.newSet")}
      field={{
        id: "story-name-field",
        label: t("favorites.set.nameLabel"),
        value: name,
        maxLength: SET_NAME_MAX_LENGTH,
        onChange: setName,
        onEnter: args.onAction,
      }}
      cancel={{ id: "story-name-cancel", label: t("favorites.delete.cancel") }}
      actions={[
        {
          id: "story-name-save",
          label: t("favorites.saveSet"),
          disabled: name.trim() === "",
          onClick: args.onAction,
        },
      ]}
      onClose={args.onClose}
    />
  );
}

const meta = {
  title: "Dialogs/SimpleDialog",
  tags: ["ui"],
  parameters: { layout: "fullscreen" },
  render: (args, { globals }) => {
    const { t, number } = i18nOf(globals);
    return (
      <SimpleDialog
        id="story-question"
        open
        title={t("scores.readEvery.title")}
        message={t("scores.readEvery.body", { count: number(STORY_SCORES.scores.length) })}
        cancel={{ id: "story-question-cancel", label: t("scores.readEvery.cancel") }}
        actions={[
          {
            id: "story-question-yes",
            label: t("scores.readEvery.confirm"),
            onClick: args.onAction,
          },
        ]}
        onClose={args.onClose}
      />
    );
  },
  args: { onClose: fn(), onAction: fn() },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A question in a paragraph, with Cancel and the one thing to do, as before reading every score. */
export const AQuestion: Story = {};

/** An action that deletes or replaces something is said in red, as deleting a set. */
export const ADeletion: Story = {
  render: (args, { globals }) => {
    const { t } = i18nOf(globals);
    return (
      <SimpleDialog
        id="story-deletion"
        open
        title={t("favorites.delete.title")}
        message={t("favorites.delete.body", { name: SET_NAME })}
        cancel={{ id: "story-deletion-cancel", label: t("favorites.delete.cancel") }}
        actions={[
          {
            id: "story-deletion-delete",
            label: t("favorites.delete"),
            destructive: true,
            onClick: args.onAction,
          },
        ]}
        onClose={args.onClose}
      />
    );
  },
};

/** Several lines as points, as what is new in a release. */
export const Points: Story = {
  render: (args, { globals }) => {
    const i18n = i18nOf(globals);
    const { feed } = UpdateDialogStories.default.args.offer;
    return (
      <SimpleDialog
        id="story-points"
        open
        title={`${i18n.t("app.title")} ${feed.version}`}
        message={notesFor(feed, i18n.locale)}
        cancel={{ id: "story-points-later", label: i18n.t("update.later") }}
        actions={[
          { id: "story-points-download", label: i18n.t("update.download"), onClick: args.onAction },
        ]}
        onClose={args.onClose}
      />
    );
  },
};

/** Two things to do and no words, as a set's actions after a long press. */
export const TwoActions: Story = {
  render: (args, { globals }) => {
    const { t } = i18nOf(globals);
    return (
      <SimpleDialog
        id="story-actions"
        open
        title={SET_NAME}
        cancel={{ id: "story-actions-cancel", label: t("favorites.delete.cancel") }}
        actions={[
          { id: "story-actions-rename", label: t("favorites.rename"), onClick: args.onAction },
          {
            id: "story-actions-delete",
            label: t("favorites.delete"),
            destructive: true,
            onClick: args.onAction,
          },
        ]}
        onClose={args.onClose}
      />
    );
  },
};

/** One line to type, as a set's name; Save stays shut while the name is blank. */
export const ALineToType: Story = {
  render: (args, { globals }) => <TypedName args={args} i18n={i18nOf(globals)} />,
};
