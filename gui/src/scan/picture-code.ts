import { qrTextIn } from "../shared/gifts/qr-codes";

/** A picture's longer side as it is read: a camera's photo is shrunk, a shared picture is not. */
const READ_PX = 2048;

/** The text of the QR code in a picture file; null where none reads, or the file is no picture. */
export async function qrTextOfPicture(picture: Blob): Promise<string | null> {
  const bitmap = await createImageBitmap(picture).catch(() => null);
  if (bitmap === null) {
    return null;
  }

  const scale = Math.min(1, READ_PX / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const context = new OffscreenCanvas(width, height).getContext("2d");
  context?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return context === null
    ? null
    : qrTextIn(context.getImageData(0, 0, width, height).data, width, height);
}
