import { NextRequest, NextResponse } from 'next/server';
import { proxyToBot } from '@/lib/discord/botProxy';

export async function POST(request: NextRequest) {
  const correlationId = `web_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const start = Date.now();
  try {
    const body = await request.json();
    console.log(`[NextAPI][${correlationId}] POST /api/discord/connect for guild: ${body?.guildId || 'default'}, channel: ${body?.channelId}`);
    if (!body || !body.channelId) {
      return NextResponse.json({ error: 'channelId is required', correlationId }, { status: 400 });
    }

    const { status, data } = await proxyToBot('/api/voice/connect', {
      method: 'POST',
      body,
      timeoutMs: 25000, // voice handshake and discovery can take up to ~15-20s
    });

    const elapsed = Date.now() - start;
    console.log(`[NextAPI][${correlationId}] Bot responded in ${elapsed}ms with status ${status}`);
    return NextResponse.json(data, { status });
  } catch (err: any) {
    const elapsed = Date.now() - start;
    console.error(`[NextAPI][${correlationId}] Request failed after ${elapsed}ms:`, err?.message || err);
    return NextResponse.json({ error: err?.message || 'Invalid request body', correlationId }, { status: 400 });
  }
}
