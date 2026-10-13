import type { SupportedFileType } from "./types";
import { jpegFileType } from "../filetypes/jpeg/fileType";
import { pngFileType } from "../filetypes/png/fileType";

export const SUPPORTED_FILE_TYPES: SupportedFileType[] = [jpegFileType, pngFileType];

export function findFileTypeByExtension(extension: string): SupportedFileType | undefined {
  return SUPPORTED_FILE_TYPES.find((type) => type.extensions.includes(extension));
}

/** Comma-separated extension list for an <input type="file" accept="..."> attribute. */
export function getAcceptAttribute(): string {
  return SUPPORTED_FILE_TYPES.flatMap((type) => type.extensions.map((extension) => `.${extension}`)).join(",");
}

/** Human-readable summary of supported file types, e.g. "JPG/JPEG". */
export function getSupportedTypesLabel(): string {
  return SUPPORTED_FILE_TYPES.map((type) => type.label).join(", ");
}
