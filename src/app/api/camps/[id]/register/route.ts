import { NextResponse } from 'next/server';
import { toCampDto } from '@/lib/dto';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';
import { getClaims } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/** "I will donate at this camp". Needs sign-in; each person counts once (a second call changes nothing). */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });
  const claims = await getClaims();
  const userId = typeof claims?.sub === 'string' ? claims.sub : null;
  if (!userId) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  const { id } = await params;
  try {
    const prisma = getPrisma();
    await prisma.camp.updateMany({
      where: { id, NOT: { registeredBy: { has: userId } } },
      data: { registeredBy: { push: userId } },
    });
    const camp = await prisma.camp.findUnique({ where: { id } });
    if (!camp) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ camp: toCampDto(camp) });
  } catch (error) {
    console.error('Could not register for camp', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
