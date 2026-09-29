-- Supabase exposes every table in the `public` schema through its REST API (PostgREST),
-- and the browser-side publishable key can call it. Turning row-level security on with NO
-- policies means that key can read and write nothing.
-- The app reads and writes these tables only on the server through Prisma, which connects
-- with the database owner role and is not affected by row-level security.
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "donors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sos_requests" ENABLE ROW LEVEL SECURITY;
