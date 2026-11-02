import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { reencodeAvatar } from './avatarImage.ts';
import { sniffImageType } from './avatarUpload.ts';

const jpeg = (width: number, height: number, exif?: Record<string, Record<string, string>>) => {
  const image = sharp({ create: { width, height, channels: 3, background: '#cc0000' } }).jpeg();
  return (exif ? image.withExif(exif) : image).toBuffer();
};

test('a big photo becomes a 512 px square WebP', async () => {
  const out = await reencodeAvatar(await jpeg(3000, 1800));
  assert.equal(sniffImageType(out), 'webp');
  const meta = await sharp(out).metadata();
  assert.equal(meta.format, 'webp');
  assert.equal(meta.width, 512);
  assert.equal(meta.height, 512);
});

test('a small photo is cropped square too', async () => {
  const meta = await sharp(await reencodeAvatar(await jpeg(200, 100))).metadata();
  assert.equal(meta.width, 512);
  assert.equal(meta.height, 512);
});

test('EXIF (such as a GPS location or camera owner) does not survive', async () => {
  const input = await jpeg(800, 600, { IFD0: { Copyright: 'secret owner', Artist: 'someone' } });
  assert.ok((await sharp(input).metadata()).exif, 'the test input really carries EXIF');
  const out = await reencodeAvatar(input);
  const meta = await sharp(out).metadata();
  assert.equal(meta.exif, undefined);
  assert.equal(Buffer.from(out).includes(Buffer.from('secret owner')), false);
});

test('a file that only starts like an image is refused', async () => {
  const fake = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, ...new TextEncoder().encode('this is not really a jpeg body')]);
  await assert.rejects(() => reencodeAvatar(fake));
});

test('a decompression bomb (tiny file, enormous bitmap) is refused', async () => {
  // 10000 x 10000 = 100 million pixels, over the 40 million limit, but compresses to a few KB.
  const bomb = await sharp({ create: { width: 10000, height: 10000, channels: 3, background: '#ffffff' } }).png({ compressionLevel: 9 }).toBuffer();
  assert.ok(bomb.length < 2 * 1024 * 1024, 'the bomb fits under the upload limit');
  await assert.rejects(() => reencodeAvatar(bomb));
});
