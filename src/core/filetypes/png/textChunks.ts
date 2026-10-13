import type { MetadataCategory } from "../../metadata/types";
import { toArrayBuffer } from "../../files/bytes";

// Standard PNG text keywords (from the PNG spec's registered keyword list) mapped to the
// privacy category they belong to. Any non-standard/custom keyword falls back to "other".
const KEYWORD_CATEGORY: Partial<Record<string, MetadataCategory>> = {
  Author: "author",
  Copyright: "author",
  "Creation Time": "datetime",
  Software: "software",
  Source: "device", // "Device used to create the image" per spec
};

export function categorizeKeyword(keyword: string): MetadataCategory {
  return KEYWORD_CATEGORY[keyword] ?? "other";
}

function decodeLatin1(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
}

/** Reads just the keyword prefix shared by tEXt/zTXt/iTXt, without touching the (possibly
 * compressed) text payload - enough to categorize a chunk for cleaning without inflating it. */
export function readChunkKeyword(data: Uint8Array): string {
  const nullIndex = data.indexOf(0);
  return decodeLatin1(data.slice(0, nullIndex < 0 ? data.length : nullIndex));
}

async function inflateZlib(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([toArrayBuffer(bytes)]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export interface DecodedTextChunk {
  keyword: string;
  text: string;
}

/**
 * Decodes a tEXt, zTXt, or iTXt chunk into its keyword/value pair, inflating the
 * zlib-compressed payload for zTXt and compressed iTXt chunks.
 */
export async function decodeTextChunk(type: string, data: Uint8Array): Promise<DecodedTextChunk | null> {
  const nullIndex = data.indexOf(0);
  if (nullIndex < 0) return null;
  const keyword = decodeLatin1(data.slice(0, nullIndex));

  if (type === "tEXt") {
    return { keyword, text: decodeLatin1(data.slice(nullIndex + 1)) };
  }

  if (type === "zTXt") {
    const compressed = data.slice(nullIndex + 2); // skip null terminator + 1-byte compression method
    const inflated = await inflateZlib(compressed);
    return { keyword, text: decodeLatin1(inflated) };
  }

  // iTXt: keyword\0 compressionFlag(1) compressionMethod(1) languageTag\0 translatedKeyword\0 text
  let offset = nullIndex + 1;
  const compressionFlag = data[offset];
  offset += 2;
  const langEnd = data.indexOf(0, offset);
  if (langEnd < 0) return null;
  offset = langEnd + 1;
  const translatedEnd = data.indexOf(0, offset);
  if (translatedEnd < 0) return null;
  offset = translatedEnd + 1;
  const payload = data.slice(offset);
  const textBytes = compressionFlag === 1 ? await inflateZlib(payload) : payload;
  return { keyword, text: new TextDecoder("utf-8").decode(textBytes) };
}
