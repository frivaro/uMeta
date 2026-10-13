// Pure data types shared by every file-type engine (JPEG/EXIF, PNG chunks, ...). No React,
// no component state, no network - everything here operates on bytes in, structured data out.

export type MetadataCategory =
  | "location"
  | "device"
  | "datetime"
  | "author"
  | "software"
  | "thumbnail"
  | "other";

export interface MetadataField {
  /** Stable key, e.g. "gps.latitude" or "exif.make" */
  key: string;
  category: MetadataCategory;
  /** Human-readable label, e.g. "GPS Location" */
  label: string;
  /** Human-readable value, e.g. "52.5200, 13.4050 (Berlin, Germany area)" */
  value: string;
}

export interface InspectionResult {
  fileName: string;
  fileSizeBytes: number;
  width: number | null;
  height: number | null;
  fields: MetadataField[];
  hasAnyMetadata: boolean;
}

export interface CleaningSelection {
  location: boolean;
  device: boolean;
  datetime: boolean;
  author: boolean;
  software: boolean;
  thumbnail: boolean;
  other: boolean;
}

export interface CleaningResult {
  cleanedBytes: Uint8Array;
  removedFields: MetadataField[];
  keptFields: MetadataField[];
}
