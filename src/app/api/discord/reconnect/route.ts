import { NextResponse } from 'next/server';
import { proxyToBot } from '@/lib/discord/botProxy';

export async function POST() {
  try {
    const { status, data } = await proxyToBot('/api/reconnect', {
      method: 'POST',
    });
    return NextResponse.json(data, { status });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to proxy reconnect request' },
      { status: 500 }
    );
  }
}
