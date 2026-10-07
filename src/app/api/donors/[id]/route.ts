import { NextResponse } from 'next/server';
import { toDonorDto } from '@/lib/dto';
import { canManageDonor, MANAGE_TOKEN_HEADER } from '@/lib/donorAccess';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';
import { getClaims } from '@/lib/supabase/server';
import { parseDonorUpdateInput } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Edits a donor's own profile (availability, last donation, contact details). Allowed for the holder of
 * its manage token, the signed-in person who registered it, or an admin-panel user with `panel.donors`.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = parseDonorUpdateInput(body);
  if (parsed.error) return NextResponse.json({ error: 'invalid_input', field: parsed.error }, { status: 400 });

  try {
    const prisma = getPrisma();
    const donor = await prisma.donor.findUnique({ where: { id } });
    if (!donor) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    if (!(await canManageDonor(donor, request.headers))) {
      // No credentials at all is a 401; credentials that do not fit this donor are a 403.
      const hasCredentials = Boolean(request.headers.get(MANAGE_TOKEN_HEADER)) || (await getClaims()) !== null;
      return NextResponse.json({ error: hasCredentials ? 'forbidden' : 'unauthorized' }, { status: hasCredentials ? 403 : 401 });
    }

    const updated = await prisma.donor.update({ where: { id }, data: parsed.value });
    return NextResponse.json({ donor: toDonorDto(updated) });
  } catch (error) {
    console.error('Could not update donor', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
