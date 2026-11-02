# Profile photo upload (plan)

Goal: a signed-in person uploads, changes and removes their own profile photo on `/account`. It then shows in the
places that already read `user.avatarUrl` (header menu, Donor Profile, Admin Panel). Nothing else (donor cards,
hospitals, camps) gets photos in this plan.

## Decisions (made, change only if the owner objects)
- **Storage:** Supabase Storage, one **public-read** bucket `avatars`. Path `{userId}/avatar.webp`, one file per
  person, overwritten on change. UUID paths, and only the owner's own photo is shown to the owner, so a public bucket
  is acceptable. (No other person's photo is shown anywhere in this plan.)
- **Upload goes through our server** (`POST /api/account/avatar`, multipart), not straight from the browser. The
  server holds the service key, so the bucket needs no write policies and every check is enforced server-side
  (project rule).
- **Checks on the server:** signed in, same-origin, rate limited, size at most 2 MB, type decided by the file's
  **magic bytes** (JPEG, PNG, WebP), never by the filename or `Content-Type`.
- **Re-encode on the server with `sharp`** (already installed): resize to at most 512x512 (cover, square), convert
  to WebP, strip EXIF (removes GPS location). The stored file is always our own output, never the raw upload.
- **Where the URL lives:** `user_metadata.avatar_url` (the field Google sign-in already uses, so every existing
  reader keeps working). Saved with the admin API, then the browser refreshes its session (same path as
  `updateAccount`).
- **Cache busting:** stored URL is `.../avatars/{userId}/avatar.webp?v=<timestamp>` so a new photo shows at once.
- **Remove:** deletes the object and clears `avatar_url` (the initials circle comes back). A Google user who removes
  their photo does not get the Google one back.
- **Demo mode** (no Supabase / no service key): the photo section is hidden.

## Work packages (test first for logic)
1. **`src/lib/avatarUpload.ts` (pure, tested).** `sniffImageType(bytes)` by magic bytes; `validateAvatar({ size, bytes })`
   (limit, type); `avatarPath(userId)`; `avatarUrlWithVersion(base, now)`. Tests: each type accepted, a renamed `.exe`
   or text file rejected, empty and over-limit rejected, SVG rejected (can carry script), path is always the caller's id.
2. **Storage seam `AvatarStorage`** (narrow interface: `upload(path, bytes, contentType)`, `remove(path)`, `publicUrl(path)`),
   a real implementation in `src/lib/supabase/admin.ts`, a fake in tests. `saveAvatar(storage, admin, userId, bytes)` and
   `removeAvatar(...)` in `avatarUpload.ts`, tested against the fakes (re-encode is injected so tests need no `sharp`).
3. **Routes** `POST` and `DELETE /api/account/avatar`. Route files export only HTTP methods; helpers live in `src/lib`.
   Statuses: 401 not signed in, 413 too large, 415 not an allowed image, 429 rate limit, 503 not configured.
4. **`AuthContext.updateAvatar(file)` / `removeAvatar()`**: send multipart, then `refreshSession()` like `updateAccount`.
5. **UI on `/account`:** round preview (photo or initials), "Choose photo" (`accept="image/jpeg,image/png,image/webp"`),
   instant local preview, "Remove photo", spinner and error line. Client side checks size and type first only for a
   fast message; the server is the real check. New strings under `src/locales/{en,bn}/account.ts`.
6. **Docs:** how to create the bucket in `docs/SETUP-SUPABASE.md` (below), user guide line, `docs/HANDOFF.md` log.

## Owner action needed (I cannot do this from here)
Create the bucket once in the Supabase project: Storage, new bucket `avatars`, **Public** on, file size limit 2 MB,
allowed types `image/jpeg, image/png, image/webp`. Or the SQL equivalent, which I will put in the setup doc and a
migration note. The service key (`SUPABASE_SERVICE_ROLE_KEY`) must already be set (account editing needs it too).

## Verification (definition of done)
`npm run lint`, `npm test`, `npm run build` clean. Real check needs a real Supabase project: upload each type,
upload a 5 MB file (expect 413), a renamed text file (expect 415), change photo (shows at once), remove photo,
sign out and in again (photo persists), EXIF location gone from the stored file. Everything unit-testable is tested
against fakes, same as the rest of the auth code.

## Risks and open points
- A public bucket means anyone with the exact URL can view the file. URLs are only used for the owner's own avatar.
  If a later plan shows photos to other people (donor cards), add moderation and a report path first.
- Re-encoding takes about 50 to 200 ms per upload on the server. Fine at this scale.
- Hosting: `sharp` is a native module. It works on Vercel's Node runtime, but the route must stay on `runtime = 'nodejs'`.
- Old Google photo is replaced, not kept as a fallback (keeps the rule simple).
