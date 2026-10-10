import type { MetadataCategory } from "./types";

// Maps raw EXIF/TIFF tag IDs to the privacy category they belong to, for both display
// grouping and selective-removal purposes. Orientation is deliberately excluded - it's
// always preserved so the cleaned image still displays the right way up.

export const ORIENTATION_TAG = 0x0112;
export const EXIF_IFD_POINTER_TAG = 0x8769;
export const GPS_IFD_POINTER_TAG = 0x8825;

export const IFD0_TAG_CATEGORY: Record<number, MetadataCategory> = {
  0x010f: "device", // Make
  0x0110: "device", // Model
  0x0131: "software", // Software
  0x0132: "datetime", // DateTime (modified)
  0x013b: "author", // Artist
  0x8298: "author", // Copyright
};

export const EXIF_SUBIFD_TAG_CATEGORY: Record<number, MetadataCategory> = {
  0x9003: "datetime", // DateTimeOriginal
  0x9004: "datetime", // DateTimeDigitized
  0x9010: "datetime", // OffsetTime
  0x9011: "datetime", // OffsetTimeOriginal
  0x9012: "datetime", // OffsetTimeDigitized
  0xa430: "author", // CameraOwnerName
  0xa431: "device", // BodySerialNumber
  0xa433: "device", // LensMake
  0xa434: "device", // LensModel
  0xa435: "device", // LensSerialNumber
};

export const TAG_LABELS: Record<number, string> = {
  0x010f: "Camera Make",
  0x0110: "Camera Model",
  0x0131: "Editing Software",
  0x0132: "Last Modified Date",
  0x013b: "Author",
  0x8298: "Copyright",
  0x9003: "Date Taken",
  0x9004: "Date Digitized",
  0x9010: "UTC Offset",
  0x9011: "UTC Offset (Taken)",
  0x9012: "UTC Offset (Digitized)",
  0xa430: "Camera Owner",
  0xa431: "Camera Serial Number",
  0xa433: "Lens Make",
  0xa434: "Lens Model",
  0xa435: "Lens Serial Number",
  // Standard EXIF technical tags - usually benign (camera settings, not personally
  // identifying), but still labeled properly rather than left as raw hex tag numbers.
  0x011a: "Horizontal Resolution",
  0x011b: "Vertical Resolution",
  0x0128: "Resolution Unit",
  0x0213: "Chroma Position",
  0x829a: "Exposure Time",
  0x829d: "F-Number",
  0x8822: "Exposure Program",
  0x8827: "ISO Speed",
  0x8830: "Sensitivity Type",
  0x8832: "Recommended Exposure Index",
  0x9000: "Exif Version",
  0x9101: "Color Component Order",
  0x9201: "Shutter Speed (APEX)",
  0x9202: "Aperture (APEX)",
  0x9204: "Exposure Bias",
  0x9207: "Metering Mode",
  0x9209: "Flash",
  0x920a: "Focal Length",
  0x927c: "Maker Note",
  0x9286: "User Comment",
  0x9290: "Sub-Second Time",
  0x9291: "Sub-Second Time (Taken)",
  0x9292: "Sub-Second Time (Digitized)",
  0xa000: "FlashPix Version",
  0xa001: "Color Space",
  0xa002: "Image Width",
  0xa003: "Image Height",
  0xa005: "Interoperability Pointer",
  0xa20e: "Focal Plane Horizontal Resolution",
  0xa20f: "Focal Plane Vertical Resolution",
  0xa210: "Focal Plane Resolution Unit",
  0xa401: "Custom Rendered",
  0xa402: "Exposure Mode",
  0xa403: "White Balance",
  0xa406: "Scene Capture Type",
  0xa432: "Lens Specification",
};

export function categorizeIfd0Tag(tag: number): MetadataCategory {
  return IFD0_TAG_CATEGORY[tag] ?? "other";
}

export function categorizeExifSubIfdTag(tag: number): MetadataCategory {
  return EXIF_SUBIFD_TAG_CATEGORY[tag] ?? "other";
}
