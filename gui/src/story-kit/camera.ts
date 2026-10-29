import type { SystemCamera } from "../platform";
import { type Gift, giftCode } from "../shared/gifts/gift-code";
import { qrCodePath } from "../shared/gifts/qr-codes";
import { FOLDER_SONGS } from "./favorites";

/** The gift a story's camera sees: four of the folder's songs, a mystery. */
export const STORY_GIFT: Gift = {
  songs: FOLDER_SONGS.slice(0, 4),
  giver: "ドン子ちゃん",
  title: "お誕生日おめでとう！",
  madeAt: Date.UTC(2026, 9, 29, 3, 15, 30),
  shown: false,
};

const VIEW_PX = { width: 720, height: 1280 } as const;
const CODE_PX = 420;

/** A camera that sees `text`'s code on a grey desk, as a phone held over a picture of one. */
export function cameraSeeing(text: string): SystemCamera {
  return {
    open: async () => {
      const canvas = document.createElement("canvas");
      Object.assign(canvas, VIEW_PX);
      const context = canvas.getContext("2d");
      if (context === null) {
        return null;
      }

      const { size, path } = qrCodePath(text);
      const module = Math.floor(CODE_PX / size);
      context.fillStyle = "gray";
      context.fillRect(0, 0, VIEW_PX.width, VIEW_PX.height);
      context.translate((VIEW_PX.width - size * module) / 2, (VIEW_PX.height - size * module) / 2);
      context.fillStyle = "white";
      context.fillRect(0, 0, size * module, size * module);
      context.scale(module, module);
      context.fillStyle = "black";
      context.fill(new Path2D(path));
      return canvas.captureStream(5);
    },
    focusAt: () => Promise.resolve(),
  };
}

/** The phone's camera in a story: it sees the story's gift. */
export const STORY_CAMERA = cameraSeeing(giftCode(STORY_GIFT));
