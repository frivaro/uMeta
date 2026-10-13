import type { InspectionResult } from "../../metadata/types";
import { parseSegments, type JpegSegment } from "./segments";
import { parseTiff } from "./tiff";
import { tiffToMetadataFields } from "./tiffToFields";
import { readImageDimensions } from "../../files/dimensions";

const APP1 = 0xe1;
const EXIF_SIGNATURE = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // "Exif\0\0"

function bytesStartWith(bytes: Uint8Array, start: number, pattern: number[]): boolean {
  if (start + pattern.length > bytes.length) return false;
  for (let i = 0; i < pattern.length; i++) {
    if (bytes[start + i] !== pattern[i]) return false;
  }
  return true;
}

/**
 * Inspects a JPEG's embedded metadata and returns a structured, human-readable report.
 * Pure function over bytes - no DOM state beyond the transient bitmap decode used to
 * read true pixel dimensions independent of whatever EXIF claims.
 */
export async function inspectJpeg(fileName: string, bytes: Uint8Array): Promise<InspectionResult> {
  const dimensions = await readImageDimensions(bytes, "image/jpeg");

  let segments: JpegSegment[];
  try {
    segments = parseSegments(bytes);
  } catch {
    segments = [];
  }

  const exifSegment = segments.find(
    (segment) => segment.marker === APP1 && bytesStartWith(bytes, segment.dataStart, EXIF_SIGNATURE),
  );

  let fields: ReturnType<typeof tiffToMetadataFields> = [];

  if (exifSegment) {
    try {
      const tiffBytes = bytes.slice(exifSegment.dataStart + EXIF_SIGNATURE.length, exifSegment.dataEnd);
      fields = tiffToMetadataFields(parseTiff(tiffBytes));
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
