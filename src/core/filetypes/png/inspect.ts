import type { InspectionResult, MetadataField } from "../../metadata/types";
import { parsePngChunks } from "./chunks";
import { decodeTextChunk, categorizeKeyword } from "./textChunks";
import { decodeTimeChunk } from "./time";
import { parseTiff } from "../jpeg/tiff";
import { tiffToMetadataFields } from "../jpeg/tiffToFields";
import { readImageDimensions } from "../../files/dimensions";

const TEXT_CHUNK_TYPES = new Set(["tEXt", "zTXt", "iTXt"]);

/**
 * Inspects a PNG's embedded metadata: standard text chunks (tEXt/zTXt/iTXt), the tIME
 * chunk, and - if present - a full embedded EXIF profile in an eXIf chunk (same TIFF/IFD
 * format as a JPEG's APP1 segment, just without the "Exif\0\0" prefix).
 */
export async function inspectPng(fileName: string, bytes: Uint8Array): Promise<InspectionResult> {
  const fields: MetadataField[] = [];
  const dimensions = await readImageDimensions(bytes, "image/png");

  let chunks: ReturnType<typeof parsePngChunks> = [];
  try {
    chunks = parsePngChunks(bytes);
  } catch {
    chunks = [];
  }

  for (const chunk of chunks) {
    try {
      if (TEXT_CHUNK_TYPES.has(chunk.type)) {
        const entry = await decodeTextChunk(chunk.type, chunk.data);
        if (!entry || !entry.text) continue;

        fields.push({
          key: `png.${chunk.type}.${entry.keyword}.${chunk.start}`,
          category: categorizeKeyword(entry.keyword),
          label: entry.keyword,
          value: entry.text,
        });
      } else if (chunk.type === "tIME") {
        const value = decodeTimeChunk(chunk.data);
        if (value) {
          fields.push({ key: "png.tIME", category: "datetime", label: "Last Modified", value });
        }
      } else if (chunk.type === "eXIf") {
        fields.push(...tiffToMetadataFields(parseTiff(chunk.data)));
      }
    } catch {
      // Malformed chunk - skip it, the rest of the file is still readable.
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
