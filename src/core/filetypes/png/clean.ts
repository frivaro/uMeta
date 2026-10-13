import type { CleaningResult, CleaningSelection, MetadataCategory, MetadataField } from "../../metadata/types";
import { parsePngChunks, type PngChunk } from "./chunks";
import { readChunkKeyword, categorizeKeyword } from "./textChunks";
import { parseTiff } from "../jpeg/tiff";
import { tiffToMetadataFields } from "../jpeg/tiffToFields";
import { concatUint8Arrays } from "../../files/bytes";

const TEXT_CHUNK_TYPES = new Set(["tEXt", "zTXt", "iTXt"]);
const PNG_SIGNATURE_LENGTH = 8;

/** Categories a chunk carries, if it's a metadata chunk at all - empty for structural
 * chunks (IHDR, PLTE, IDAT, IEND, pHYs, ...), which are always kept. */
function chunkCategories(chunk: PngChunk): MetadataCategory[] {
  if (TEXT_CHUNK_TYPES.has(chunk.type)) {
    return [categorizeKeyword(readChunkKeyword(chunk.data))];
  }

  if (chunk.type === "tIME") return ["datetime"];

  if (chunk.type === "eXIf") {
    try {
      return [...new Set(tiffToMetadataFields(parseTiff(chunk.data)).map((field) => field.category))];
    } catch {
      return [];
    }
  }

  return [];
}

/**
 * Cleans a PNG's metadata losslessly: IDAT (compressed pixel data) and every other
 * structural chunk is copied byte-for-byte unchanged. PNG text/time chunks each carry
 * exactly one category, so whole-chunk removal loses nothing there. The one exception is
 * eXIf (a full embedded EXIF/TIFF block, which can span several categories) - like JPEG's
 * XMP/IPTC handling, that chunk is dropped entirely if any of its categories are selected,
 * rather than partially rewritten.
 */
export function cleanPng(bytes: Uint8Array, selection: CleaningSelection, fields: MetadataField[]): CleaningResult {
  const chunks = parsePngChunks(bytes);
  const outputChunks: Uint8Array[] = [bytes.slice(0, PNG_SIGNATURE_LENGTH)];

  for (const chunk of chunks) {
    const categories = chunkCategories(chunk);
    const shouldDrop = categories.length > 0 && categories.some((category) => selection[category]);
    if (shouldDrop) continue;
    outputChunks.push(bytes.slice(chunk.start, chunk.end));
  }

  return {
    cleanedBytes: concatUint8Arrays(outputChunks),
    removedFields: fields.filter((field) => selection[field.category]),
    keptFields: fields.filter((field) => !selection[field.category]),
  };
}
