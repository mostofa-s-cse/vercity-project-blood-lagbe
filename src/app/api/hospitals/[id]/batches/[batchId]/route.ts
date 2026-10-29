import { NextResponse } from 'next/server';
import { claimsEmail, writeAuditLog } from '@/lib/auditLog';
import { requireHospitalManager } from '@/lib/hospitalGuard';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/** Discards a batch (expired or spoiled): removes it and takes its remaining units out of that group's stock. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; batchId: string }> }) {
  const { id, batchId } = await params;
  const guard = await requireHospitalManager(id);
  if (guard.response) return guard.response;

  try {
    const prisma = getPrisma();
    const batch = await prisma.stockBatch.findFirst({ where: { id: batchId, hospitalId: id } });
    if (!batch) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const stock = await prisma.hospitalStock.findUnique({ where: { hospitalId_bloodGroup: { hospitalId: id, bloodGroup: batch.bloodGroup } } });
    const left = Math.max(0, (stock?.units ?? 0) - batch.units);
    await prisma.$transaction([
      prisma.stockBatch.delete({ where: { id: batchId } }),
      ...(stock ? [prisma.hospitalStock.update({ where: { hospitalId_bloodGroup: { hospitalId: id, bloodGroup: batch.bloodGroup } }, data: { units: left } })] : []),
    ]);
    await writeAuditLog(claimsEmail(guard.claims), 'stock.discard', `${id} discarded ${batch.units} bags (batch ${batchId}, expires ${batch.expiresAt})`);
    return NextResponse.json({ id: batchId, units: left });
  } catch (error) {
    console.error('Could not discard stock batch', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
