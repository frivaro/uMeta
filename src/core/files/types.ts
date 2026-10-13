import type { CleaningResult, CleaningSelection, InspectionResult, MetadataField } from "../metadata/types";

export interface FileValidationResult {
  valid: boolean;
  reason?: string;
  fileType?: SupportedFileType;
}

export interface SupportedFileType {
  id: string;
  label: string;
  extensions: string[];
  mimeType: string;
  maxBytes: number;
  matchesSignature: (bytes: Uint8Array) => boolean;
  inspect: (fileName: string, bytes: Uint8Array) => Promise<InspectionResult>;
  clean: (bytes: Uint8Array, selection: CleaningSelection, fields: MetadataField[]) => CleaningResult;
}
