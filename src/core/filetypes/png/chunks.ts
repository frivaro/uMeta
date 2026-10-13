export interface PngChunk {
  type: string;
  data: Uint8Array;
  /** Offset of this chunk's 4-byte length field (start of the whole chunk). */
  start: number;
  /** Exclusive end offset, including the trailing 4-byte CRC. */
  end: number;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function matchesPngSignature(bytes: Uint8Array): boolean {
  if (bytes.byteLength < PNG_SIGNATURE.length) return false;
  return PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

/**
 * Parses a PNG's chunk stream. Stops at IEND, or at the first malformed chunk since
 * anything after an inconsistent length field can't be located reliably anyway.
 */
export function parsePngChunks(bytes: Uint8Array): PngChunk[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunks: PngChunk[] = [];
  let offset = PNG_SIGNATURE.length;

  while (offset + 8 <= bytes.byteLength) {
    const length = view.getUint32(offset, false);
    const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const chunkEnd = dataEnd + 4; // past the trailing CRC
    if (chunkEnd > bytes.byteLength) break;

    chunks.push({ type, data: bytes.slice(dataStart, dataEnd), start: offset, end: chunkEnd });
    offset = chunkEnd;
    if (type === "IEND") break;
  }

  return chunks;
}
