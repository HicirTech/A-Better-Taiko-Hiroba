import { type ReactNode, useEffect, useState } from "react";
import { action } from "storybook/actions";

import { type CostumeEditor, useCostumeEditor } from "../my-page/use-costume-editor";
import { type NameEditor, useNameEditor } from "../name-title/use-name-editor";
import { type TitleEditor, useTitleEditor } from "../name-title/use-title-editor";
import type { HirobaSessionPort } from "../shared/session-port";
import { STORY_PROFILE } from "./profile";
import { STORY_LANE } from "./story-pictures";
import { createStoryPort } from "./story-port";

// Made once, as the app makes its own: the editors build their callbacks on them.
const SESSION_GONE = action("session gone");
const NICKNAME_READ = action("nickname read back");
const TITLE_READ = action("title read back");
const MOVED = action("moved");

/** A story port that lasts as long as the story: the editors keep what they read by their port. */
function useStoryPort(changes: Partial<HirobaSessionPort>): HirobaSessionPort {
  const [port] = useState(() => createStoryPort(changes));
  return port;
}

/** The Costume page's editor on a story port, read as the page reads it when shown. */
export function WithCostumeEditor({
  changes = {},
  children,
}: {
  readonly changes?: Partial<HirobaSessionPort>;
  readonly children: (editor: CostumeEditor) => ReactNode;
}) {
  const port = useStoryPort(changes);
  const editor = useCostumeEditor({
    port,
    lane: STORY_LANE,
    shown: true,
    onSessionGone: SESSION_GONE,
  });
  const { read } = editor;
  // Once, as the app reads it, while it is unread: `read` itself changes with every step.
  const unread = editor.step.name === "unread";
  useEffect(() => {
    if (unread) {
      void read();
    }
  }, [unread, read]);
  return children(editor);
}

/** The Nickname and title page's two editors on a story port, for the made-up player. */
export function WithNameAndTitle({
  changes = {},
  children,
}: {
  readonly changes?: Partial<HirobaSessionPort>;
  readonly children: (name: NameEditor, title: TitleEditor) => ReactNode;
}) {
  const port = useStoryPort(changes);
  const name = useNameEditor({
    port,
    lane: STORY_LANE,
    profile: STORY_PROFILE,
    onSessionGone: SESSION_GONE,
    onNickname: NICKNAME_READ,
  });
  const title = useTitleEditor({
    port,
    lane: STORY_LANE,
    profile: STORY_PROFILE,
    onSessionGone: SESSION_GONE,
    onTitle: TITLE_READ,
    onMoved: MOVED,
  });
  return children(name, title);
}
