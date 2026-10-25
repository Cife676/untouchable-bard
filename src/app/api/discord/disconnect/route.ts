import { NextRequest, NextResponse } from 'next/server';
import { proxyToBot } from '@/lib/discord/botProxy';

export async function POST(request: NextRequest) {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is allowed for legacy requests
  }

  const { status, data } = await proxyToBot('/api/voice/disconnect', {
    method: 'POST',
    body,
  });
  return NextResponse.json(data, { status });
}
