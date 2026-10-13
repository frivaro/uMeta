import { toArrayBuffer } from "./bytes";

/** Reads true pixel dimensions via the browser's own image decoder, independent of
 * whatever a file's embedded metadata claims (e.g. EXIF orientation/size tags). */
export async function readImageDimensions(
  bytes: Uint8Array,
  mimeType: string,
): Promise<{ width: number; height: number } | null> {
  try {
    const blob = new Blob([toArrayBuffer(bytes)], { type: mimeType });
    const bitmap = await createImageBitmap(blob);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  } catch {
    return null;
  }
}
