import type { IfdEntry } from "./tiff";

function dataViewOf(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function decodeAscii(bytes: Uint8Array): string {
  const nullIndex = bytes.indexOf(0);
  const slice = nullIndex >= 0 ? bytes.slice(0, nullIndex) : bytes;
  return new TextDecoder("ascii").decode(slice).trim();
}

function isPrintableAscii(bytes: Uint8Array): boolean {
  return Array.from(bytes).every((byte) => byte === 0 || (byte >= 0x20 && byte <= 0x7e));
}

const UNDEFINED_BYTE_LIST_LIMIT = 16;

/** UNDEFINED-type values (ExifVersion, ComponentsConfiguration, ...) are a mix of ASCII-encoded
 * version numbers and small raw byte codes, depending on the tag - EXIF doesn't give them a
 * consistent format. Decode as text when every byte is printable; list the raw bytes when short
 * (e.g. ComponentsConfiguration), but collapse to a summary for large proprietary blobs like
 * MakerNote, which can run into thousands of bytes and would otherwise dump an unreadable wall
 * of numbers. */
function decodeUndefined(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";
  if (isPrintableAscii(bytes)) return decodeAscii(bytes);
  if (bytes.length > UNDEFINED_BYTE_LIST_LIMIT) return `Binary data (${bytes.length.toLocaleString()} bytes)`;
  return Array.from(bytes).join(", ");
}

function decodeShorts(bytes: Uint8Array, count: number, littleEndian: boolean): number[] {
  const view = dataViewOf(bytes);
  const values: number[] = [];
  for (let i = 0; i < count; i++) values.push(view.getUint16(i * 2, littleEndian));
  return values;
}

function decodeSignedShorts(bytes: Uint8Array, count: number, littleEndian: boolean): number[] {
  const view = dataViewOf(bytes);
  const values: number[] = [];
  for (let i = 0; i < count; i++) values.push(view.getInt16(i * 2, littleEndian));
  return values;
}

function decodeLongs(bytes: Uint8Array, count: number, littleEndian: boolean): number[] {
  const view = dataViewOf(bytes);
  const values: number[] = [];
  for (let i = 0; i < count; i++) values.push(view.getUint32(i * 4, littleEndian));
  return values;
}

function decodeSignedLongs(bytes: Uint8Array, count: number, littleEndian: boolean): number[] {
  const view = dataViewOf(bytes);
  const values: number[] = [];
  for (let i = 0; i < count; i++) values.push(view.getInt32(i * 4, littleEndian));
  return values;
}

function decodeRationals(bytes: Uint8Array, count: number, littleEndian: boolean): [number, number][] {
  const view = dataViewOf(bytes);
  const values: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const numerator = view.getUint32(i * 8, littleEndian);
    const denominator = view.getUint32(i * 8 + 4, littleEndian);
    values.push([numerator, denominator]);
  }
  return values;
}

function decodeSignedRationals(bytes: Uint8Array, count: number, littleEndian: boolean): [number, number][] {
  const view = dataViewOf(bytes);
  const values: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const numerator = view.getInt32(i * 8, littleEndian);
    const denominator = view.getInt32(i * 8 + 4, littleEndian);
    values.push([numerator, denominator]);
  }
  return values;
}

/** Decodes an IFD entry into a plain JS value appropriate for its TIFF type. */
export function decodeEntryValue(entry: IfdEntry, littleEndian: boolean): string | number | number[] {
  switch (entry.type) {
    case 2: // ASCII
      return decodeAscii(entry.valueBytes);
    case 3: // SHORT
      return entry.count === 1
        ? decodeShorts(entry.valueBytes, 1, littleEndian)[0]
        : decodeShorts(entry.valueBytes, entry.count, littleEndian);
    case 4: // LONG
      return entry.count === 1
        ? decodeLongs(entry.valueBytes, 1, littleEndian)[0]
        : decodeLongs(entry.valueBytes, entry.count, littleEndian);
    case 5: {
      // RATIONAL
      const rationals = decodeRationals(entry.valueBytes, entry.count, littleEndian);
      const decimals = rationals.map(([n, d]) => (d === 0 ? 0 : n / d));
      return entry.count === 1 ? decimals[0] : decimals;
    }
    case 7: // UNDEFINED
      return decodeUndefined(entry.valueBytes);
    case 8: // SSHORT
      return entry.count === 1
        ? decodeSignedShorts(entry.valueBytes, 1, littleEndian)[0]
        : decodeSignedShorts(entry.valueBytes, entry.count, littleEndian);
    case 9: // SLONG
      return entry.count === 1
        ? decodeSignedLongs(entry.valueBytes, 1, littleEndian)[0]
        : decodeSignedLongs(entry.valueBytes, entry.count, littleEndian);
    case 10: {
      // SRATIONAL
      const rationals = decodeSignedRationals(entry.valueBytes, entry.count, littleEndian);
      const decimals = rationals.map(([n, d]) => (d === 0 ? 0 : n / d));
      return entry.count === 1 ? decimals[0] : decimals;
    }
    default:
      return "";
  }
}

/** Converts GPS degree/minute/second rational triples + a hemisphere ref into decimal degrees. */
export function dmsToDecimalDegrees(dms: number[], ref: string): number {
  const [deg = 0, min = 0, sec = 0] = dms;
  const decimal = deg + min / 60 + sec / 3600;
  return ref === "S" || ref === "W" ? -decimal : decimal;
}

export function formatDecimalDegrees(decimal: number, positiveRef: string, negativeRef: string): string {
  const ref = decimal >= 0 ? positiveRef : negativeRef;
  return `${Math.abs(decimal).toFixed(5)}° ${ref}`;
}
