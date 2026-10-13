import type { FileValidationResult } from "./types";
import { findFileTypeByExtension, getSupportedTypesLabel } from "./registry";

/**
 * Validates a file against the registry of supported file types - not just trusting the
 * file extension or the browser-reported MIME type, since both can be wrong or spoofed.
 */
export function validateFile(fileName: string, bytes: Uint8Array): FileValidationResult {
  const extension = fileName.toLowerCase().split(".").pop() ?? "";
  const fileType = findFileTypeByExtension(extension);

  if (!fileType) {
    return {
      valid: false,
      reason: `This file type isn't supported yet - uMeta currently only works with ${getSupportedTypesLabel()} files.`,
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

  return { valid: true, fileType };
}
