/** Decodes a tIME chunk (2-byte year, then month/day/hour/minute/second as single bytes, UTC). */
export function decodeTimeChunk(data: Uint8Array): string | null {
  if (data.byteLength < 7) return null;

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const year = view.getUint16(0, false);
  const month = data[2];
  const day = data[3];
  const hour = data[4];
  const minute = data[5];
  const second = data[6];

  const pad = (value: number) => String(value).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)} UTC`;
}
