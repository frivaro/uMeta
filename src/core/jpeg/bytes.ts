/** Converts a (possibly offset/shared) Uint8Array view into a plain ArrayBuffer, suitable
 * for APIs like Blob/createImageBitmap that require a concrete ArrayBuffer type. */
export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return (bytes.buffer as ArrayBuffer).slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}
