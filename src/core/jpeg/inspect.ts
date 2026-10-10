import type { InspectionResult, MetadataField } from "./types";
import { parseSegments, type JpegSegment } from "./segments";
import { toArrayBuffer } from "./bytes";
import { parseTiff } from "./tiff";
import { categorizeIfd0Tag, categorizeExifSubIfdTag, TAG_LABELS, ORIENTATION_TAG } from "./exifTags";
import { decodeEntryValue, dmsToDecimalDegrees, formatDecimalDegrees } from "./decode";

const APP1 = 0xe1;
const EXIF_SIGNATURE = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // "Exif\0\0"

function bytesStartWith(bytes: Uint8Array, start: number, pattern: number[]): boolean {
  if (start + pattern.length > bytes.length) return false;
  for (let i = 0; i < pattern.length; i++) {
    if (bytes[start + i] !== pattern[i]) return false;
  }
  return true;
}

function tagLabel(tag: number): string {
  return TAG_LABELS[tag] ?? `Tag 0x${tag.toString(16).padStart(4, "0")}`;
}

function valueToDisplayString(value: string | number | number[]): string {
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

async function readImageDimensions(bytes: Uint8Array): Promise<{ width: number; height: number } | null> {
  try {
    const blob = new Blob([toArrayBuffer(bytes)], { type: "image/jpeg" });
    const bitmap = await createImageBitmap(blob);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  } catch {
    return null;
  }
}

/**
 * Inspects a JPEG's embedded metadata and returns a structured, human-readable report.
 * Pure function over bytes - no DOM state beyond the transient bitmap decode used to
 * read true pixel dimensions independent of whatever EXIF claims.
 */
export async function inspectJpeg(fileName: string, bytes: Uint8Array): Promise<InspectionResult> {
  const fields: MetadataField[] = [];

  const dimensions = await readImageDimensions(bytes);

  let segments: JpegSegment[];
  try {
    segments = parseSegments(bytes);
  } catch {
    segments = [];
  }

  const exifSegment = segments.find(
    (segment) => segment.marker === APP1 && bytesStartWith(bytes, segment.dataStart, EXIF_SIGNATURE),
  );

  if (exifSegment) {
    try {
      const tiffBytes = bytes.slice(exifSegment.dataStart + EXIF_SIGNATURE.length, exifSegment.dataEnd);
      const parsed = parseTiff(tiffBytes);

      for (const entry of parsed.ifd0) {
        if (entry.tag === ORIENTATION_TAG) continue;

        const category = categorizeIfd0Tag(entry.tag);
        const value = decodeEntryValue(entry, parsed.littleEndian);
        const displayValue = valueToDisplayString(value);
        if (!displayValue) continue; // skip tags we couldn't decode into anything meaningful

        fields.push({
          key: `${category}.${entry.tag}`,
          category,
          label: tagLabel(entry.tag),
          value: displayValue,
        });
      }

      for (const entry of parsed.exifSubIfd) {
        const category = categorizeExifSubIfdTag(entry.tag);
        const value = decodeEntryValue(entry, parsed.littleEndian);
        const displayValue = valueToDisplayString(value);
        if (!displayValue) continue;

        fields.push({
          key: `${category}.${entry.tag}`,
          category,
          label: tagLabel(entry.tag),
          value: displayValue,
        });
      }

      if (parsed.gpsIfd.length > 0) {
        const byTag = new Map(parsed.gpsIfd.map((entry) => [entry.tag, entry]));
        const latEntry = byTag.get(0x0002);
        const latRefEntry = byTag.get(0x0001);
        const lonEntry = byTag.get(0x0004);
        const lonRefEntry = byTag.get(0x0003);

        if (latEntry && latRefEntry && lonEntry && lonRefEntry) {
          const latDms = decodeEntryValue(latEntry, parsed.littleEndian);
          const lonDms = decodeEntryValue(lonEntry, parsed.littleEndian);
          const latRef = decodeEntryValue(latRefEntry, parsed.littleEndian);
          const lonRef = decodeEntryValue(lonRefEntry, parsed.littleEndian);

          if (Array.isArray(latDms) && Array.isArray(lonDms) && typeof latRef === "string" && typeof lonRef === "string") {
            const latDecimal = dmsToDecimalDegrees(latDms, latRef);
            const lonDecimal = dmsToDecimalDegrees(lonDms, lonRef);

            fields.push({
              key: "location.coordinates",
              category: "location",
              label: "GPS Location",
              value: `${formatDecimalDegrees(latDecimal, "N", "S")}, ${formatDecimalDegrees(lonDecimal, "E", "W")}`,
            });
          }
        }
      }

      if (parsed.thumbnailBytes) {
        fields.push({
          key: "thumbnail.embedded",
          category: "thumbnail",
          label: "Embedded Thumbnail",
          value: `Present (${parsed.thumbnailBytes.byteLength.toLocaleString()} bytes)`,
        });
      }
    } catch {
      // Malformed EXIF block - treat as "no readable metadata" rather than failing the whole inspection.
    }
  }

  return {
    fileName,
    fileSizeBytes: bytes.byteLength,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
    fields,
    hasAnyMetadata: fields.length > 0,
  };
}
