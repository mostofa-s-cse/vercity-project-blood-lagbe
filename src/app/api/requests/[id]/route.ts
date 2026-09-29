import { NextResponse } from 'next/server';
import { toRequestDto, toResponseDto } from '@/lib/dto';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';
import { canManageRequest } from '@/lib/requestAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * One request with the people who answered it. Open to everyone; the answerers' phone numbers are only
 * included for whoever manages the request (`canManage`): the holder of its manage token, the signed-in
 * person who made it, or an admin-panel user with `panel.requests`.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });

  const { id } = await params;
  try {
    const row = await getPrisma().sosRequest.findUnique({
      where: { id },
      include: { _count: { select: { responses: true } }, responses: { orderBy: { createdAt: 'asc' } } },
    });
    if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const canManage = await canManageRequest(row, request.headers);
    return NextResponse.json(
      {
        request: toRequestDto(row),
        responses: row.responses.map((response) => toResponseDto(response, canManage)),
        canManage,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Could not load request', error);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
}
