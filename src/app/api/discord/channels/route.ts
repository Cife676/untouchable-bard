import { NextRequest, NextResponse } from 'next/server';
import { proxyToBot } from '@/lib/discord/botProxy';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const guildId = searchParams.get('guildId') || '';
  const path = guildId ? `/api/channels?guildId=${encodeURIComponent(guildId)}` : '/api/channels';

  const { status, data } = await proxyToBot(path, { method: 'GET' });
  return NextResponse.json(data, { status });
}
