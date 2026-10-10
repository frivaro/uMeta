// Low-level JPEG marker-segment parsing. JPEG is a stream of 0xFF-prefixed markers; most
// carry a 2-byte big-endian length (including the length bytes themselves) followed by
// payload. Standalone markers (SOI, EOI, RSTn, TEM) carry no length/payload.
// Once SOS (Start of Scan) is reached, everything after it is entropy-coded image data
// (plus restart markers) until EOI - we never touch that region.

export interface JpegSegment {
  marker: number;
  /** Offset of the 0xFF marker byte in the source buffer. */
  offset: number;
  /** For markers with a payload: offset right after the 2-byte length field. */
  dataStart: number;
  /** For markers with a payload: exclusive end offset of the payload. */
  dataEnd: number;
  /** True for SOS - once hit, parsing stops; dataEnd marks the start of entropy data. */
  isScanStart: boolean;
}

const MARKER_PREFIX = 0xff;
const SOI = 0xd8;
const EOI = 0xd9;
const SOS = 0xda;

function hasNoPayload(marker: number): boolean {
  // TEM, RST0-RST7, SOI, EOI carry no length/payload.
  return marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9);
}

/**
 * Parses marker segments from a JPEG byte buffer, stopping at (and including) SOS.
 * Throws if the structure looks malformed - callers should treat that as "can't clean".
 */
export function parseSegments(bytes: Uint8Array): JpegSegment[] {
  if (bytes.length < 4 || bytes[0] !== MARKER_PREFIX || bytes[1] !== SOI) {
    throw new Error("Not a valid JPEG byte stream (missing SOI).");
  }

  const segments: JpegSegment[] = [];
  let offset = 2; // past SOI

  while (offset < bytes.length) {
    if (bytes[offset] !== MARKER_PREFIX) {
      throw new Error(`Expected marker at offset ${offset}, found 0x${bytes[offset].toString(16)}.`);
    }

    // Skip any fill bytes (0xFF padding before the real marker byte).
    let markerOffset = offset;
    let markerByte = bytes[markerOffset + 1];
    while (markerByte === MARKER_PREFIX) {
      markerOffset += 1;
      markerByte = bytes[markerOffset + 1];
    }

    const marker = markerByte;

    if (marker === EOI) {
      break;
    }

    if (hasNoPayload(marker)) {
      offset = markerOffset + 2;
      continue;
    }

    const lengthOffset = markerOffset + 2;
    const length = (bytes[lengthOffset] << 8) | bytes[lengthOffset + 1];
    const dataStart = lengthOffset + 2;
    const dataEnd = lengthOffset + length;

    if (marker === SOS) {
      segments.push({ marker, offset: markerOffset, dataStart, dataEnd, isScanStart: true });
      break;
    }

    segments.push({ marker, offset: markerOffset, dataStart, dataEnd, isScanStart: false });
    offset = dataEnd;
  }

  return segments;
}
