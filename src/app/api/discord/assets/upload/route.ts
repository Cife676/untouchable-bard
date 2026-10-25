import { NextRequest, NextResponse } from 'next/server';

const BOT_BASE_URL =
  process.env.DISCORD_BOT_API_URL ||
  process.env.DISCORD_BOT_URL ||
  `http://${process.env.DISCORD_BOT_HOST || '127.0.0.1'}:${process.env.DISCORD_BOT_PORT || '3001'}`;
const SECRET = process.env.DISCORD_INTEGRATION_SECRET || 'untouchable_bard_dev_secret_local';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const assetId = formData.get('assetId');

    if (!assetId) {
      return NextResponse.json({ error: 'assetId is required' }, { status: 400 });
    }

    const res = await fetch(`${BOT_BASE_URL}/api/assets/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SECRET}`,
      },
      body: formData,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to upload asset to Discord bot' },
      { status: 500 }
    );
  }
}
