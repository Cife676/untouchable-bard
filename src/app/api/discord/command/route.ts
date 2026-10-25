import { NextRequest, NextResponse } from 'next/server';
import { proxyToBot } from '@/lib/discord/botProxy';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cmd = body?.command || body;

    if (!cmd || !cmd.type) {
      return NextResponse.json({ error: 'Valid command with type property is required' }, { status: 400 });
    }

    const { status, data } = await proxyToBot('/api/command', {
      method: 'POST',
      body,
      timeoutMs: 8000,
    });

    return NextResponse.json(data, { status });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Invalid request body' }, { status: 400 });
  }
}
