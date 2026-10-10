import type { SupportedFileType } from "./types";
import { jpegFileType } from "../jpeg/fileType";

export const SUPPORTED_FILE_TYPES: SupportedFileType[] = [jpegFileType];

export function findFileTypeByExtension(extension: string): SupportedFileType | undefined {
  return SUPPORTED_FILE_TYPES.find((type) => type.extensions.includes(extension));
}
