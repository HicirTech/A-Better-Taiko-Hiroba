import { CostumePage, CostumePageSkeleton } from "../my-page/costume-page";
import { CheckroomIcon } from "../ui/icons";
import { dueFirst, picturesOf, readsFirst } from "./model-parts";
import type { PageEntry } from "./page";
import type { PageModel } from "./page-model";
import { askPictures } from "./page-parts";

const COSTUME_PICTURES = picturesOf(["costumeItem"]);

export const COSTUME_MODEL: PageModel = {
  label: "nav.costume",
  readLabel: "costume.reading",
  namesSongs: false,
  needsSongs: false,
  firstRead: ({ editor, writing }) => dueFirst(editor, writing),
  waits: ({ editor }) => readsFirst(editor),
  reading: ({ editor }) => editor.reading,
  readAgain: ({ editor }) => editor.read(true),
  follows: ({ editor }) => editor,
  leaves: ({ editor }) => [editor.dropEdits],
  readsEvery: () => COSTUME_PICTURES,
};

export const COSTUME_PAGE: PageEntry = {
  ...COSTUME_MODEL,
  icon: <CheckroomIcon />,
  skeleton: CostumePageSkeleton,
  wider: true,
  askEvery: askPictures,
  draw: (data) => (
    <CostumePage
      editor={data.editor}
      lane={data.lane}
      touchFirst={data.touchFirst}
      wide={data.wide}
      modalLook={data.modalLook}
      i18n={data.i18n}
    />
  ),
};
