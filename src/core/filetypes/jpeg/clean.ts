import type { CleaningResult, CleaningSelection, MetadataField } from "../../metadata/types";
import { parseSegments, type JpegSegment } from "./segments";
import { parseTiff, buildTiff, type IfdEntry } from "./tiff";
import { categorizeIfd0Tag, categorizeExifSubIfdTag, ORIENTATION_TAG } from "./exifTags";
import { concatUint8Arrays } from "../../files/bytes";

const APP1 = 0xe1;
const APP2 = 0xe2;
const APP13 = 0xed;
const COM = 0xfe;

const EXIF_SIGNATURE = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // "Exif\0\0"
const XMP_SIGNATURE_PREFIX = "http://ns.adobe.com/xap/";

function bytesStartWith(bytes: Uint8Array, start: number, pattern: number[]): boolean {
  if (start + pattern.length > bytes.length) return false;
  for (let i = 0; i < pattern.length; i++) {
    if (bytes[start + i] !== pattern[i]) return false;
  }
  return true;
}

function isExifSegment(bytes: Uint8Array, segment: JpegSegment): boolean {
  return segment.marker === APP1 && bytesStartWith(bytes, segment.dataStart, EXIF_SIGNATURE);
}

function isXmpSegment(bytes: Uint8Array, segment: JpegSegment): boolean {
  if (segment.marker !== APP1) return false;
  const text = new TextDecoder("latin1").decode(bytes.slice(segment.dataStart, segment.dataStart + 29));
  return text.startsWith(XMP_SIGNATURE_PREFIX);
}

/**
 * Cleans a JPEG's metadata losslessly: the compressed image data (everything from SOS
 * onward) is copied byte-for-byte unchanged. Only marker segments before SOS are
 * filtered/rewritten, so there is no re-compression and therefore no quality loss.
 */
export function cleanJpeg(
  bytes: Uint8Array,
  selection: CleaningSelection,
  fields: MetadataField[],
): CleaningResult {
  const segments = parseSegments(bytes);
  const removedFields: MetadataField[] = [];
  const keptFields: MetadataField[] = [];

  const removingAnyIdentifyingCategory =
    selection.location || selection.device || selection.datetime || selection.author || selection.other;

  const outputChunks: Uint8Array[] = [bytes.slice(0, 2)]; // SOI

  for (const segment of segments) {
    if (segment.isScanStart) {
      // Everything from here (SOS header + entropy-coded scan data + EOI) is untouched.
      outputChunks.push(bytes.slice(segment.offset));
      continue;
    }

    if (isExifSegment(bytes, segment)) {
      const tiffBytes = bytes.slice(segment.dataStart + EXIF_SIGNATURE.length, segment.dataEnd);
      const rebuilt = rebuildExifSegment(tiffBytes, selection, fields, removedFields, keptFields);

      if (rebuilt) {
        const payload = new Uint8Array(EXIF_SIGNATURE.length + rebuilt.byteLength);
        payload.set(EXIF_SIGNATURE, 0);
        payload.set(rebuilt, EXIF_SIGNATURE.length);
        outputChunks.push(wrapSegment(segment.marker, payload));
      }
      // If rebuilt is null, every EXIF field was removed - drop the whole segment.
      continue;
    }

    if (isXmpSegment(bytes, segment)) {
      if (removingAnyIdentifyingCategory) {
        continue; // drop - XMP commonly duplicates GPS/author/date/device info
      }
      outputChunks.push(bytes.slice(segment.offset, segment.dataEnd));
      continue;
    }

    if (segment.marker === APP13) {
      // Photoshop/IPTC block - same duplication concern as XMP.
      if (removingAnyIdentifyingCategory) continue;
      outputChunks.push(bytes.slice(segment.offset, segment.dataEnd));
      continue;
    }

    if (segment.marker === COM) {
      if (selection.other) continue;
      outputChunks.push(bytes.slice(segment.offset, segment.dataEnd));
      continue;
    }

    if (segment.marker === APP2) {
      // ICC color profile - not personally identifying, always kept.
      outputChunks.push(bytes.slice(segment.offset, segment.dataEnd));
      continue;
    }

    // Any other segment (APP0/JFIF, DQT, DHT, SOF, etc.) - structural, always kept.
    outputChunks.push(bytes.slice(segment.offset, segment.dataEnd));
  }

  const cleanedBytes = concatUint8Arrays(outputChunks);

  return {
    cleanedBytes,
    removedFields,
    keptFields,
  };
}

function wrapSegment(marker: number, payload: Uint8Array): Uint8Array {
  const length = payload.byteLength + 2; // length field includes itself
  const out = new Uint8Array(4 + payload.byteLength);
  out[0] = 0xff;
  out[1] = marker;
  out[2] = (length >> 8) & 0xff;
  out[3] = length & 0xff;
  out.set(payload, 4);
  return out;
}

/** Returns the rebuilt TIFF bytes, or null if nothing should remain (drop the segment). */
function rebuildExifSegment(
  tiffBytes: Uint8Array,
  selection: CleaningSelection,
  allFields: MetadataField[],
  removedFields: MetadataField[],
  keptFields: MetadataField[],
): Uint8Array | null {
  const parsed = parseTiff(tiffBytes);

  const keptIfd0: IfdEntry[] = [];
  for (const entry of parsed.ifd0) {
    if (entry.tag === ORIENTATION_TAG) {
      keptIfd0.push(entry); // always preserved for correct display
      continue;
    }
    const category = categorizeIfd0Tag(entry.tag);
    if (selection[category]) {
      markRemoved(allFields, category, entry.tag, removedFields);
    } else {
      keptIfd0.push(entry);
      markKept(allFields, category, entry.tag, keptFields);
    }
  }

  const keptExifSubIfd: IfdEntry[] = [];
  for (const entry of parsed.exifSubIfd) {
    const category = categorizeExifSubIfdTag(entry.tag);
    if (selection[category]) {
      markRemoved(allFields, category, entry.tag, removedFields);
    } else {
      keptExifSubIfd.push(entry);
      markKept(allFields, category, entry.tag, keptFields);
    }
  }

  const keptGpsIfd = selection.location ? [] : parsed.gpsIfd;

  if (parsed.gpsIfd.length > 0) {
    const field = allFields.find((f) => f.key === "location.coordinates");
    if (field) (selection.location ? removedFields : keptFields).push(field);
  }

  if (keptIfd0.length === 0 && keptExifSubIfd.length === 0 && keptGpsIfd.length === 0) {
    return null;
  }

  return buildTiff(parsed.littleEndian, keptIfd0, keptExifSubIfd, keptGpsIfd);
}

function markRemoved(allFields: MetadataField[], category: string, tag: number, removedFields: MetadataField[]) {
  const field = allFields.find((f) => f.key === `${category}.${tag}`);
  if (field) removedFields.push(field);
}

function markKept(allFields: MetadataField[], category: string, tag: number, keptFields: MetadataField[]) {
  const field = allFields.find((f) => f.key === `${category}.${tag}`);
  if (field) keptFields.push(field);
}
