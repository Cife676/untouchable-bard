import { NextResponse } from 'next/server';
import { proxyToBot } from '@/lib/discord/botProxy';

export async function GET() {
  const { status, data } = await proxyToBot('/api/guilds', { method: 'GET' });
  return NextResponse.json(data, { status });
}
