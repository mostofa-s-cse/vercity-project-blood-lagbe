import { NextResponse } from 'next/server';
import { claimsEmail, writeAuditLog } from '@/lib/auditLog';
import { requireHospitalManager } from '@/lib/hospitalGuard';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';

export const runtime = 'nodejs';

/** Deletes a camp. Only an admin, or the account tied to the hospital that scheduled it. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });
  const { id } = await params;
  try {
    const camp = await getPrisma().camp.findUnique({ where: { id } });
    if (!camp) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const guard = await requireHospitalManager(camp.hospitalId);
    if (guard.response) return guard.response;
    await getPrisma().camp.delete({ where: { id } });
    await writeAuditLog(claimsEmail(guard.claims), 'camp.delete', `${camp.hospitalId} camp "${camp.title}"`);
    return NextResponse.json({ id });
  } catch (error) {
    console.error('Could not delete camp', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
