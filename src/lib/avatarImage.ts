import sharp from 'sharp';

/** The stored size: a square, big enough for the largest avatar on any screen. */
const SIZE = 512;
/** Refuses decompression bombs: a small file that unpacks into a huge bitmap. */
const MAX_INPUT_PIXELS = 40_000_000;

/**
 * Turns an uploaded photo into our own file: orientation applied (phones store it as metadata), cropped
 * square, at most 512x512, WebP. `sharp` drops all metadata by default, so EXIF such as GPS location does
 * not survive. Throws on a file that is not a decodable image. Server use only (native module); it holds
 * no secret, so unlike the service-key files it can be unit tested.
 */
export async function reencodeAvatar(bytes: Uint8Array): Promise<Uint8Array> {
  const out = await sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' })
    .rotate()
    .resize(SIZE, SIZE, { fit: 'cover' })
    .webp({ quality: 82 })
    .toBuffer();
  return new Uint8Array(out);
}
