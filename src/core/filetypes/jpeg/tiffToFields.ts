import type { MetadataField } from "../../metadata/types";
import type { ParsedTiff } from "./tiff";
import { categorizeIfd0Tag, categorizeExifSubIfdTag, TAG_LABELS, ORIENTATION_TAG } from "./exifTags";
import { decodeEntryValue, dmsToDecimalDegrees, formatDecimalDegrees } from "./decode";

function tagLabel(tag: number): string {
  return TAG_LABELS[tag] ?? `Tag 0x${tag.toString(16).padStart(4, "0")}`;
}

function valueToDisplayString(value: string | number | number[]): string {
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

/**
 * Walks a parsed TIFF/EXIF structure and emits human-readable metadata fields. Shared
 * between JPEG (APP1 "Exif\0\0" segment) and PNG (eXIf chunk) - both embed the identical
 * TIFF/IFD format.
 */
export function tiffToMetadataFields(parsed: ParsedTiff): MetadataField[] {
  const fields: MetadataField[] = [];

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

  return fields;
}
