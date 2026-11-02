import type { AccountAdmin } from './accountUpdate.ts';

/**
 * Profile photo upload. The browser sends the raw file to our server; the server checks it, re-encodes it
 * to a small square WebP (which also drops EXIF such as GPS location), stores it under the person's own
 * path and records the URL in `user_metadata.avatar_url`, the field every screen already reads.
 *
 * Pure on purpose: storage, the admin API, the image re-encoder and the clock are passed in
 * (`AvatarDeps`), so the rules are tested with fakes. The real ones live in `src/lib/supabase/admin.ts`
 * and `src/lib/avatarImage.ts`.
 */

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_BUCKET = 'avatars';

export type ImageType = 'jpeg' | 'png' | 'webp';

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  bytes.length >= offset + signature.length && signature.every((value, index) => bytes[offset + index] === value);

/**
 * What the file really is, from its first bytes. A filename or `Content-Type` is chosen by the sender and
 * means nothing. SVG is deliberately not accepted: it can carry script.
 */
export function sniffImageType(bytes: Uint8Array): ImageType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return 'webp';
  return null;
}

export type AvatarValidation = { ok: true; type: ImageType } | { ok: false; error: 'empty' | 'too_large' | 'unsupported_type' };

export function validateAvatar(bytes: Uint8Array): AvatarValidation {
  if (bytes.length === 0) return { ok: false, error: 'empty' };
  if (bytes.length > AVATAR_MAX_BYTES) return { ok: false, error: 'too_large' };
  const type = sniffImageType(bytes);
  if (!type) return { ok: false, error: 'unsupported_type' };
  return { ok: true, type };
}

const SAFE_ID = /^[A-Za-z0-9-]{1,64}$/;

/** One file per person, always under their own id. */
export function avatarPath(userId: string): string {
  if (!SAFE_ID.test(userId)) throw new Error('invalid user id');
  return `${userId}/avatar.webp`;
}

/** A new `?v=` each save, so browsers and CDNs do not keep showing the old photo. */
export function avatarUrlWithVersion(url: string, now: Date): string {
  return `${url}?v=${now.getTime()}`;
}

export interface AvatarStorage {
  upload(path: string, bytes: Uint8Array, contentType: string): Promise<{ error: { message: string } | null }>;
  remove(path: string): Promise<{ error: { message: string } | null }>;
  publicUrl(path: string): string;
}

export interface AvatarDeps {
  storage: AvatarStorage;
  admin: Pick<AccountAdmin, 'getUserById' | 'updateUserById'>;
  /** Resizes to at most 512x512, crops square, returns WebP with no metadata. */
  reencode(bytes: Uint8Array): Promise<Uint8Array>;
  now(): Date;
}

export type SaveAvatarResult =
  | { ok: true; url: string }
  | { ok: false; error: 'empty' | 'too_large' | 'unsupported_type' | 'process_failed' | 'upload_failed' | 'not_found' | 'update_failed' };

export async function saveAvatar(deps: AvatarDeps, userId: string, bytes: Uint8Array): Promise<SaveAvatarResult> {
  const checked = validateAvatar(bytes);
  if (checked.ok === false) return { ok: false, error: checked.error };

  let webp: Uint8Array;
  try {
    webp = await deps.reencode(bytes);
  } catch {
    return { ok: false, error: 'process_failed' };
  }

  const path = avatarPath(userId);
  const uploaded = await deps.storage.upload(path, webp, 'image/webp');
  if (uploaded.error) return { ok: false, error: 'upload_failed' };

  const existing = await deps.admin.getUserById(userId);
  if (existing.error || !existing.data.user) return { ok: false, error: existing.error ? 'update_failed' : 'not_found' };
  const url = avatarUrlWithVersion(deps.storage.publicUrl(path), deps.now());
  const { error } = await deps.admin.updateUserById(userId, {
    user_metadata: { ...(existing.data.user.user_metadata ?? {}), avatar_url: url },
  });
  if (error) return { ok: false, error: 'update_failed' };
  return { ok: true, url };
}

export type RemoveAvatarResult = { ok: true } | { ok: false; error: 'not_found' | 'update_failed' };

/** Deletes the file and clears both photo fields (a Google sign-in's `picture` too, so initials show). */
export async function removeAvatar(deps: AvatarDeps, userId: string): Promise<RemoveAvatarResult> {
  await deps.storage.remove(avatarPath(userId));
  const existing = await deps.admin.getUserById(userId);
  if (existing.error || !existing.data.user) return { ok: false, error: existing.error ? 'update_failed' : 'not_found' };
  const { error } = await deps.admin.updateUserById(userId, {
    user_metadata: { ...(existing.data.user.user_metadata ?? {}), avatar_url: null, picture: null },
  });
  return error ? { ok: false, error: 'update_failed' } : { ok: true };
}
