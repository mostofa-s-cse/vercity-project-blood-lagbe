/**
 * Shrinks a photo in the browser before upload: phone photos are often 3 to 8 MB, over the 2 MB the server
 * accepts, and the server only keeps a 512 px square anyway. Applies the camera's orientation, scales the
 * longest side down to `maxSide`, and returns a JPEG. If the browser cannot decode the file, the original is
 * returned and the server decides (it re-checks everything). Browser only.
 */
export async function downscaleImage(file: Blob, maxSide = 1024, quality = 0.9): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    return blob ?? file;
  } catch {
    return file;
  }
}
