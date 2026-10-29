import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/adminGuard';
import { claimsEmail, writeAuditLog } from '@/lib/auditLog';
import { toOrganizationDto } from '@/lib/dto';
import { GrantError } from '@/lib/grantService';
import { getGrantService } from '@/lib/grants';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';
import { parseOrganizationDecisionInput, parseOrganizationUpdateInput } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Approves or rejects a pending organization application. Needs `panel.hospitals`. Approving also tries
 * to grant the built-in Hospital staff role, tied to this organization, to the applicant's email — this
 * only works when the applicant is a known profile (has signed in before) and a Supabase service key is
 * configured; otherwise the organization is still approved, just without a role grant (same as every
 * other "needs the service key" action in this app).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission('panel.hospitals');
  if (guard.response) return guard.response;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = parseOrganizationDecisionInput(body);
  if (parsed.error) return NextResponse.json({ error: 'invalid_input', field: parsed.error }, { status: 400 });

  try {
    const prisma = getPrisma();
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const actorEmail = claimsEmail(guard.claims);
    const approved = parsed.value.decision === 'approve';
    const updated = await prisma.organization.update({
      where: { id },
      data: {
        status: approved ? 'approved' : 'rejected',
        isVerified: approved ? true : org.isVerified,
        reviewedAt: new Date(),
        reviewedBy: actorEmail,
      },
    });

    let grantNote = '';
    if (approved && org.appliedBy) {
      const applicant = await prisma.profile.findUnique({ where: { id: org.appliedBy }, select: { email: true } });
      if (applicant?.email) {
        try {
          const hospitalRole = await prisma.role.findUnique({ where: { systemKey: 'hospital' } });
          if (hospitalRole) {
            await getGrantService().grant({ email: applicant.email, roleId: hospitalRole.id, hospitalId: id }, { email: actorEmail });
            grantNote = `, granted Hospital staff to ${applicant.email}`;
          }
        } catch (error) {
          // Same spirit as every other "needs the service key" action: the approval itself still succeeds.
          grantNote = error instanceof GrantError ? `, role grant skipped (${error.code})` : '';
        }
      }
    }

    await writeAuditLog(actorEmail, 'organization.review', `${org.name} (${id}) ${updated.status}${grantNote}`);
    return NextResponse.json({ organization: toOrganizationDto(updated) });
  } catch (error) {
    console.error('Could not review organization', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}

/** Edits an organization's details (only the fields sent change). Needs `panel.hospitals`. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission('panel.hospitals');
  if (guard.response) return guard.response;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = parseOrganizationUpdateInput(body);
  if (parsed.error) return NextResponse.json({ error: 'invalid_input', field: parsed.error }, { status: 400 });

  try {
    const prisma = getPrisma();
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const updated = await prisma.organization.update({ where: { id }, data: parsed.value });
    await writeAuditLog(claimsEmail(guard.claims), 'organization.update', `${org.name} (${id}): ${Object.keys(parsed.value).join(', ')}`);
    return NextResponse.json({ organization: toOrganizationDto(updated) });
  } catch (error) {
    console.error('Could not update organization', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}

/**
 * Deletes an organization together with its stock, batches, requisitions and camps. Needs `panel.hospitals`.
 * Role grants naming it are left alone: with the organization gone they open nothing (the stock routes 404).
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission('panel.hospitals');
  if (guard.response) return guard.response;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });

  const { id } = await params;
  try {
    const prisma = getPrisma();
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    await prisma.$transaction([
      prisma.hospitalStock.deleteMany({ where: { hospitalId: id } }),
      prisma.stockBatch.deleteMany({ where: { hospitalId: id } }),
      prisma.requisition.deleteMany({ where: { hospitalId: id } }),
      prisma.camp.deleteMany({ where: { hospitalId: id } }),
      prisma.organization.delete({ where: { id } }),
    ]);
    await writeAuditLog(claimsEmail(guard.claims), 'organization.delete', `${org.name} (${id})`);
    return NextResponse.json({ id });
  } catch (error) {
    console.error('Could not delete organization', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
