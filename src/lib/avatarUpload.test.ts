import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AVATAR_MAX_BYTES,
  avatarPath,
  avatarUrlWithVersion,
  removeAvatar,
  saveAvatar,
  sniffImageType,
  validateAvatar,
  type AvatarDeps,
} from './avatarUpload.ts';

const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46]);
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const WEBP = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]);
const text = (s: string) => new TextEncoder().encode(s);

test('type comes from the first bytes, not from a name or header', () => {
  assert.equal(sniffImageType(JPEG), 'jpeg');
  assert.equal(sniffImageType(PNG), 'png');
  assert.equal(sniffImageType(WEBP), 'webp');
});

test('anything else is not an image we accept', () => {
  assert.equal(sniffImageType(text('MZ\u0090 an exe renamed to .jpg')), null);
  assert.equal(sniffImageType(text('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')), null);
  assert.equal(sniffImageType(text('GIF89a')), null);
  assert.equal(sniffImageType(new Uint8Array(0)), null);
  assert.equal(sniffImageType(Uint8Array.from([0xff, 0xd8])), null); // too short to be sure
  // RIFF but not WEBP (a WAV file)
  assert.equal(sniffImageType(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45])), null);
});

test('validateAvatar: empty, too big and wrong type are refused with a code', () => {
  assert.deepEqual(validateAvatar(JPEG), { ok: true, type: 'jpeg' });
  assert.deepEqual(validateAvatar(new Uint8Array(0)), { ok: false, error: 'empty' });
  const big = new Uint8Array(AVATAR_MAX_BYTES + 1);
  big.set(JPEG);
  assert.deepEqual(validateAvatar(big), { ok: false, error: 'too_large' });
  const atLimit = new Uint8Array(AVATAR_MAX_BYTES);
  atLimit.set(PNG);
  assert.deepEqual(validateAvatar(atLimit), { ok: true, type: 'png' });
  assert.deepEqual(validateAvatar(text('hello world, not an image')), { ok: false, error: 'unsupported_type' });
});

test('the storage path is always the caller\'s own id', () => {
  assert.equal(avatarPath('11111111-2222-3333-4444-555555555555'), '11111111-2222-3333-4444-555555555555/avatar.webp');
  assert.throws(() => avatarPath('../other/user'));
  assert.throws(() => avatarPath(''));
});

test('the saved URL carries a version so a new photo shows at once', () => {
  assert.equal(avatarUrlWithVersion('https://x.co/a.webp', new Date(1730000000000)), 'https://x.co/a.webp?v=1730000000000');
});

function fakeDeps(opts: { uploadError?: boolean; updateError?: boolean; reencodeError?: boolean; noUser?: boolean } = {}) {
  const log: unknown[] = [];
  const deps: AvatarDeps = {
    storage: {
      async upload(path, bytes, contentType) {
        log.push({ upload: path, contentType, size: bytes.length });
        return { error: opts.uploadError ? { message: 'boom' } : null };
      },
      async remove(path) {
        log.push({ remove: path });
        return { error: null };
      },
      publicUrl: (path) => `https://cdn.test/avatars/${path}`,
    },
    admin: {
      async getUserById() {
        return {
          data: { user: opts.noUser ? null : { id: 'u1', user_metadata: { name: 'Rahim', picture: 'https://google/p.jpg' } } },
          error: null,
        };
      },
      async updateUserById(id, attrs) {
        log.push({ update: id, attrs });
        return { error: opts.updateError ? { message: 'boom' } : null };
      },
    },
    async reencode(bytes) {
      if (opts.reencodeError) throw new Error('bad image');
      log.push({ reencode: bytes.length });
      return Uint8Array.from([1, 2, 3]);
    },
    now: () => new Date(1730000000000),
  };
  return { deps, log };
}

test('saveAvatar re-encodes, stores under the user\'s own path, then records the versioned URL', async () => {
  const { deps, log } = fakeDeps();
  const result = await saveAvatar(deps, 'u1', JPEG);
  assert.deepEqual(result, { ok: true, url: 'https://cdn.test/avatars/u1/avatar.webp?v=1730000000000' });
  assert.deepEqual(log, [
    { reencode: JPEG.length },
    { upload: 'u1/avatar.webp', contentType: 'image/webp', size: 3 },
    {
      update: 'u1',
      attrs: { user_metadata: { name: 'Rahim', picture: 'https://google/p.jpg', avatar_url: 'https://cdn.test/avatars/u1/avatar.webp?v=1730000000000' } },
    },
  ]);
});

test('saveAvatar refuses a bad file before touching storage', async () => {
  const { deps, log } = fakeDeps();
  assert.deepEqual(await saveAvatar(deps, 'u1', text('not an image at all')), { ok: false, error: 'unsupported_type' });
  assert.deepEqual(log, []);
});

test('saveAvatar reports each later failure with its own code', async () => {
  assert.deepEqual(await saveAvatar(fakeDeps({ reencodeError: true }).deps, 'u1', PNG), { ok: false, error: 'process_failed' });
  assert.deepEqual(await saveAvatar(fakeDeps({ uploadError: true }).deps, 'u1', PNG), { ok: false, error: 'upload_failed' });
  assert.deepEqual(await saveAvatar(fakeDeps({ updateError: true }).deps, 'u1', PNG), { ok: false, error: 'update_failed' });
  assert.deepEqual(await saveAvatar(fakeDeps({ noUser: true }).deps, 'u1', PNG), { ok: false, error: 'not_found' });
});

test('removeAvatar deletes the file and clears both photo fields (Google\'s too)', async () => {
  const { deps, log } = fakeDeps();
  assert.deepEqual(await removeAvatar(deps, 'u1'), { ok: true });
  assert.deepEqual(log, [
    { remove: 'u1/avatar.webp' },
    { update: 'u1', attrs: { user_metadata: { name: 'Rahim', picture: null, avatar_url: null } } },
  ]);
});
