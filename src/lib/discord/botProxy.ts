/**
 * Secure Server-Side Proxy Helper for communicating with Discord Bot Service
 * Only runs on the Next.js Node.js server side.
 */

const rawBotUrl =
  process.env.DISCORD_BOT_API_URL ||
  process.env.DISCORD_BOT_URL ||
  `http://${process.env.DISCORD_BOT_HOST || '127.0.0.1'}:${process.env.DISCORD_BOT_PORT || '3001'}`;
const BOT_BASE_URL = rawBotUrl.trim().replace(/\/+$/, '');

const rawSecret = process.env.DISCORD_INTEGRATION_SECRET || 'untouchable_bard_dev_secret_local';
const SECRET = rawSecret.trim().replace(/^["']|["']$/g, '');

export async function proxyToBot(
  path: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    timeoutMs?: number;
  } = {}
): Promise<{ status: number; data: any }> {
  const method = options.method || 'GET';
  const timeoutMs = options.timeoutMs || 5000;
  const url = `${BOT_BASE_URL}${path}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${SECRET}`,
    ...(options.headers || {}),
  };

  if (options.body && !(options.body instanceof FormData) && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers,
      body:
        options.body && typeof options.body === 'object' && !(options.body instanceof FormData)
          ? JSON.stringify(options.body)
          : options.body,
      signal: controller.signal,
    });

    clearTimeout(timer);

    let data;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    return { status: res.status, data };
  } catch (err: any) {
    clearTimeout(timer);
    const isOffline = err.name === 'AbortError' || err.code === 'ECONNREFUSED' || err.message?.includes('fetch failed');
    return {
      status: 503,
      data: {
        error: isOffline
          ? 'Discord bot service is not running or unreachable on localhost.'
          : err.message || 'Service proxy error',
        isServiceReachable: false,
      },
    };
  }
}
