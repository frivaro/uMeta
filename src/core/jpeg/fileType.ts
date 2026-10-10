import type { SupportedFileType } from "../files/types";

const SOI = 0xffd8;
const EOI = 0xffd9;

export const jpegFileType: SupportedFileType = {
  id: "jpeg",
  label: "JPG/JPEG",
  extensions: ["jpg", "jpeg"],
  maxBytes: 50 * 1024 * 1024, // 50 MB - generous for a photo, protects the tab from huge uploads
  matchesSignature(bytes) {
    if (bytes.byteLength < 4) return false;
    const soi = (bytes[0] << 8) | bytes[1];
    const eoi = (bytes[bytes.byteLength - 2] << 8) | bytes[bytes.byteLength - 1];
    return soi === SOI && eoi === EOI;
  },
};
