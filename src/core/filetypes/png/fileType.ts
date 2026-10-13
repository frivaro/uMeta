import type { SupportedFileType } from "../../files/types";
import { matchesPngSignature } from "./chunks";
import { inspectPng } from "./inspect";
import { cleanPng } from "./clean";

export const pngFileType: SupportedFileType = {
  id: "png",
  label: "PNG",
  extensions: ["png"],
  mimeType: "image/png",
  maxBytes: 50 * 1024 * 1024,
  matchesSignature: matchesPngSignature,
  inspect: inspectPng,
  clean: cleanPng,
};
