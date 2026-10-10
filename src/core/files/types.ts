export interface FileValidationResult {
  valid: boolean;
  reason?: string;
}

export interface SupportedFileType {
  id: string;
  label: string;
  extensions: string[];
  maxBytes: number;
  matchesSignature: (bytes: Uint8Array) => boolean;
}
