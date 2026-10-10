// Minimal TIFF/EXIF IFD reader and writer, scoped to exactly what Umeta needs:
// enumerate IFD0 / Exif SubIFD / GPS IFD / thumbnail (IFD1) entries, and rebuild a new,
// smaller TIFF buffer with selected entries dropped. This never touches the JPEG's
// compressed image data - it only operates on the APP1 "Exif\0\0" payload bytes.

export interface IfdEntry {
  tag: number;
  type: number;
  count: number;
  /** Resolved value bytes, in the file's own byte order - copied verbatim when rebuilding. */
  valueBytes: Uint8Array;
}

export interface ParsedTiff {
  littleEndian: boolean;
  ifd0: IfdEntry[];
  exifSubIfd: IfdEntry[];
  gpsIfd: IfdEntry[];
  /** Thumbnail IFD (IFD1) entries, if present. */
  ifd1: IfdEntry[];
  /** Raw thumbnail JPEG bytes, if IFD1 pointed to one. */
  thumbnailBytes: Uint8Array | null;
}

const TYPE_SIZES: Record<number, number> = {
  1: 1, // BYTE
  2: 1, // ASCII
  3: 2, // SHORT
  4: 4, // LONG
  5: 8, // RATIONAL
  6: 1, // SBYTE
  7: 1, // UNDEFINED
  8: 2, // SSHORT
  9: 4, // SLONG
  10: 8, // SRATIONAL
  11: 4, // FLOAT
  12: 8, // DOUBLE
};

function typeSize(type: number): number {
  return TYPE_SIZES[type] ?? 1;
}

function readIfd(
  bytes: Uint8Array,
  view: DataView,
  tiffStart: number,
  ifdOffset: number,
  littleEndian: boolean,
): { entries: IfdEntry[]; nextIfdOffset: number } {
  const absoluteIfdOffset = tiffStart + ifdOffset;
  const entryCount = view.getUint16(absoluteIfdOffset, littleEndian);
  const entries: IfdEntry[] = [];

  for (let i = 0; i < entryCount; i++) {
    const entryOffset = absoluteIfdOffset + 2 + i * 12;
    const tag = view.getUint16(entryOffset, littleEndian);
    const type = view.getUint16(entryOffset + 2, littleEndian);
    const count = view.getUint32(entryOffset + 4, littleEndian);
    const byteSize = typeSize(type) * count;

    let valueBytes: Uint8Array;

    if (byteSize <= 4) {
      valueBytes = bytes.slice(entryOffset + 8, entryOffset + 8 + byteSize);
    } else {
      const valueOffset = tiffStart + view.getUint32(entryOffset + 8, littleEndian);
      valueBytes = bytes.slice(valueOffset, valueOffset + byteSize);
    }

    entries.push({ tag, type, count, valueBytes });
  }

  const nextIfdOffsetFieldPos = absoluteIfdOffset + 2 + entryCount * 12;
  const nextIfdOffset = view.getUint32(nextIfdOffsetFieldPos, littleEndian);

  return { entries, nextIfdOffset };
}

function findEntry(entries: IfdEntry[], tag: number): IfdEntry | undefined {
  return entries.find((entry) => entry.tag === tag);
}

function readUint32FromEntry(entry: IfdEntry, littleEndian: boolean): number {
  const view = new DataView(entry.valueBytes.buffer, entry.valueBytes.byteOffset, entry.valueBytes.byteLength);
  return view.getUint32(0, littleEndian);
}

const EXIF_IFD_POINTER_TAG = 0x8769;
const GPS_IFD_POINTER_TAG = 0x8825;
const JPEG_THUMBNAIL_OFFSET_TAG = 0x0201;
const JPEG_THUMBNAIL_LENGTH_TAG = 0x0202;

/** Parses the TIFF structure inside an APP1 "Exif\0\0" payload (payload starts at the TIFF header). */
export function parseTiff(tiffBytes: Uint8Array): ParsedTiff {
  const view = new DataView(tiffBytes.buffer, tiffBytes.byteOffset, tiffBytes.byteLength);
  const byteOrderMark = String.fromCharCode(tiffBytes[0], tiffBytes[1]);

  if (byteOrderMark !== "II" && byteOrderMark !== "MM") {
    throw new Error("Not a valid TIFF/EXIF byte order marker.");
  }

  const littleEndian = byteOrderMark === "II";
  const ifd0Offset = view.getUint32(4, littleEndian);

  const { entries: ifd0WithPointers, nextIfdOffset } = readIfd(tiffBytes, view, 0, ifd0Offset, littleEndian);

  const exifPointerEntry = findEntry(ifd0WithPointers, EXIF_IFD_POINTER_TAG);
  const gpsPointerEntry = findEntry(ifd0WithPointers, GPS_IFD_POINTER_TAG);

  const exifSubIfd = exifPointerEntry
    ? readIfd(tiffBytes, view, 0, readUint32FromEntry(exifPointerEntry, littleEndian), littleEndian).entries
    : [];

  const gpsIfd = gpsPointerEntry
    ? readIfd(tiffBytes, view, 0, readUint32FromEntry(gpsPointerEntry, littleEndian), littleEndian).entries
    : [];

  let ifd1: IfdEntry[] = [];
  let thumbnailBytes: Uint8Array | null = null;

  if (nextIfdOffset !== 0) {
    ifd1 = readIfd(tiffBytes, view, 0, nextIfdOffset, littleEndian).entries;

    const thumbOffsetEntry = findEntry(ifd1, JPEG_THUMBNAIL_OFFSET_TAG);
    const thumbLengthEntry = findEntry(ifd1, JPEG_THUMBNAIL_LENGTH_TAG);

    if (thumbOffsetEntry && thumbLengthEntry) {
      const thumbOffset = readUint32FromEntry(thumbOffsetEntry, littleEndian);
      const thumbLength = readUint32FromEntry(thumbLengthEntry, littleEndian);
      thumbnailBytes = tiffBytes.slice(thumbOffset, thumbOffset + thumbLength);
    }
  }

  const ifd0 = ifd0WithPointers.filter(
    (entry) => entry.tag !== EXIF_IFD_POINTER_TAG && entry.tag !== GPS_IFD_POINTER_TAG,
  );

  return { littleEndian, ifd0, exifSubIfd, gpsIfd, ifd1, thumbnailBytes };
}

interface IfdPlan {
  /** Entries to write, excluding the Exif/GPS pointer tags (those get added automatically). */
  entries: IfdEntry[];
  includeExifPointer: boolean;
  includeGpsPointer: boolean;
}

function writeUint16(target: Uint8Array, offset: number, value: number, littleEndian: boolean) {
  const view = new DataView(target.buffer, target.byteOffset, target.byteLength);
  view.setUint16(offset, value, littleEndian);
}

function writeUint32(target: Uint8Array, offset: number, value: number, littleEndian: boolean) {
  const view = new DataView(target.buffer, target.byteOffset, target.byteLength);
  view.setUint32(offset, value, littleEndian);
}

/**
 * Serializes one IFD plus the extra out-of-line value data it needs, starting at
 * `startOffset` (TIFF-relative). Returns the bytes for this IFD+overflow block and the
 * TIFF-relative offset the IFD itself starts at, so callers can point other IFDs at it.
 */
function serializeIfd(
  plan: IfdPlan,
  startOffset: number,
  littleEndian: boolean,
  nextIfdOffset: number,
  exifIfdOffsetIfAny: number,
  gpsIfdOffsetIfAny: number,
): Uint8Array {
  const entries = [...plan.entries];

  if (plan.includeExifPointer) {
    const bytes = new Uint8Array(4);
    writeUint32(bytes, 0, exifIfdOffsetIfAny, littleEndian);
    entries.push({ tag: EXIF_IFD_POINTER_TAG, type: 4, count: 1, valueBytes: bytes });
  }

  if (plan.includeGpsPointer) {
    const bytes = new Uint8Array(4);
    writeUint32(bytes, 0, gpsIfdOffsetIfAny, littleEndian);
    entries.push({ tag: GPS_IFD_POINTER_TAG, type: 4, count: 1, valueBytes: bytes });
  }

  entries.sort((a, b) => a.tag - b.tag);

  const entryCount = entries.length;
  const ifdHeaderSize = 2 + entryCount * 12 + 4;

  const overflowChunks: Uint8Array[] = [];
  let overflowCursor = startOffset + ifdHeaderSize;

  const entryWrites: { tag: number; type: number; count: number; inline: Uint8Array | null; overflowAt: number | null }[] =
    [];

  for (const entry of entries) {
    if (entry.valueBytes.byteLength <= 4) {
      entryWrites.push({ tag: entry.tag, type: entry.type, count: entry.count, inline: entry.valueBytes, overflowAt: null });
    } else {
      entryWrites.push({ tag: entry.tag, type: entry.type, count: entry.count, inline: null, overflowAt: overflowCursor });
      overflowChunks.push(entry.valueBytes);
      overflowCursor += entry.valueBytes.byteLength;
    }
  }

  const totalSize = ifdHeaderSize + overflowChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const out = new Uint8Array(totalSize);

  writeUint16(out, 0, entryCount, littleEndian);

  entryWrites.forEach((write, i) => {
    const entryOffset = 2 + i * 12;
    writeUint16(out, entryOffset, write.tag, littleEndian);
    writeUint16(out, entryOffset + 2, write.type, littleEndian);
    writeUint32(out, entryOffset + 4, write.count, littleEndian);

    if (write.inline) {
      out.set(write.inline, entryOffset + 8);
    } else if (write.overflowAt !== null) {
      writeUint32(out, entryOffset + 8, write.overflowAt, littleEndian);
    }
  });

  writeUint32(out, 2 + entryCount * 12, nextIfdOffset, littleEndian);

  let cursor = ifdHeaderSize;
  for (const chunk of overflowChunks) {
    out.set(chunk, cursor);
    cursor += chunk.byteLength;
  }

  return out;
}

/**
 * Rebuilds a full TIFF buffer (byte-order header + IFD0 [+ Exif SubIFD] [+ GPS IFD]) from
 * the given entry plans. Thumbnail (IFD1) is intentionally not re-attached here - callers
 * that want to keep the thumbnail handle it by including thumbnail entries in ifd0Plan's
 * chain via `buildTiffWithThumbnail` instead.
 */
export function buildTiff(
  littleEndian: boolean,
  ifd0Entries: IfdEntry[],
  exifSubIfdEntries: IfdEntry[],
  gpsIfdEntries: IfdEntry[],
): Uint8Array {
  const header = new Uint8Array(8);
  header.set(littleEndian ? [0x49, 0x49] : [0x4d, 0x4d], 0);
  writeUint16(header, 2, 42, littleEndian);
  // IFD0 always starts right after this 8-byte header.
  writeUint32(header, 4, 8, littleEndian);

  const hasExif = exifSubIfdEntries.length > 0;
  const hasGps = gpsIfdEntries.length > 0;

  // First pass: serialize IFD0 assuming placeholder sub-IFD offsets, to learn its size.
  const ifd0Plan: IfdPlan = { entries: ifd0Entries, includeExifPointer: hasExif, includeGpsPointer: hasGps };
  const probe = serializeIfd(ifd0Plan, 8, littleEndian, 0, 0, 0);
  const ifd0Size = probe.byteLength;

  const exifIfdOffset = 8 + ifd0Size;
  const exifBlock = hasExif
    ? serializeIfd({ entries: exifSubIfdEntries, includeExifPointer: false, includeGpsPointer: false }, exifIfdOffset, littleEndian, 0, 0, 0)
    : new Uint8Array(0);

  const gpsIfdOffset = exifIfdOffset + exifBlock.byteLength;
  const gpsBlock = hasGps
    ? serializeIfd({ entries: gpsIfdEntries, includeExifPointer: false, includeGpsPointer: false }, gpsIfdOffset, littleEndian, 0, 0, 0)
    : new Uint8Array(0);

  const ifd0Block = serializeIfd(ifd0Plan, 8, littleEndian, 0, exifIfdOffset, gpsIfdOffset);

  const out = new Uint8Array(header.byteLength + ifd0Block.byteLength + exifBlock.byteLength + gpsBlock.byteLength);
  out.set(header, 0);
  out.set(ifd0Block, header.byteLength);
  out.set(exifBlock, header.byteLength + ifd0Block.byteLength);
  out.set(gpsBlock, header.byteLength + ifd0Block.byteLength + exifBlock.byteLength);

  return out;
}
