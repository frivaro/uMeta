import type { FileValidationResult } from "./types";
import { SUPPORTED_FILE_TYPES, findFileTypeByExtension } from "./registry";

/**
 * Validates a file against the registry of supported file types - not just trusting the
 * file extension or the browser-reported MIME type, since both can be wrong or spoofed.
 */
export function validateFile(fileName: string, bytes: Uint8Array): FileValidationResult {
  const extension = fileName.toLowerCase().split(".").pop() ?? "";
  const fileType = findFileTypeByExtension(extension);

  if (!fileType) {
    const supported = SUPPORTED_FILE_TYPES.map((type) => type.label).join(", ");
    return {
      valid: false,
      reason: `This file type isn't supported yet - Umeta currently only works with ${supported} files.`,
    };
  }

  if (bytes.byteLength === 0) {
    return { valid: false, reason: "The file is empty." };
  }

  if (bytes.byteLength > fileType.maxBytes) {
    return { valid: false, reason: `The file is larger than ${Math.round(fileType.maxBytes / (1024 * 1024))} MB.` };
  }

  if (!fileType.matchesSignature(bytes)) {
    return { valid: false, reason: `This file doesn't look like a valid ${fileType.label} file.` };
  }

  return { valid: true };
}
