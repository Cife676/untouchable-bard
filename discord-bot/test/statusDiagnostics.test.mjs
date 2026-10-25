import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DiscordBotService } from '../dist/bot.js';
import { AssetStore } from '../dist/assetStore.js';
import { createApiServer } from '../dist/apiServer.js';

test('Discord Bot Diagnostics & Status Reporting Suite', async (t) => {
  await t.test('1. Reports missing token configuration explicitly when unconfigured', () => {
    const assetStore = new AssetStore();
    const botService = new DiscordBotService(assetStore);

    botService.setConfigError('DISCORD_BOT_TOKEN is not configured in Render environment variables.');
    const status = botService.getStatus();

    assert.equal(status.isOnline, false, 'isOnline must be false when token is not configured');
    assert.equal(status.botTag, null, 'botTag must be null');
    assert.match(
      status.lastError || '',
      /DISCORD_BOT_TOKEN is not configured/i,
      'lastError must explicitly indicate missing configuration'
    );
  });

  await t.test('2. start() with empty or placeholder token sets explicit config error', async () => {
    const assetStore = new AssetStore();
    const botService = new DiscordBotService(assetStore);

    const result = await botService.start('your_bot_token_here');
    assert.equal(result, false, 'start() must return false for placeholder token');

    const status = botService.getStatus();
    assert.equal(status.isOnline, false);
    assert.match(
      status.lastError || '',
      /DISCORD_BOT_TOKEN is not configured/i,
      'lastError must reflect unconfigured token'
    );
  });

  await t.test('3. Failed gateway login captures Discord error without leaking token', async () => {
    const assetStore = new AssetStore();
    const botService = new DiscordBotService(assetStore);

    const bogusToken = 'invalid.dummy.token.12345';
    const result = await botService.start(bogusToken);
    assert.equal(result, false, 'start() must return false on failed login');

    const status = botService.getStatus();
    assert.equal(status.isOnline, false);
    assert.ok(status.lastError && status.lastError.startsWith('Discord login failed:'), 'Must capture login failure');
    assert.equal(status.lastError.includes(bogusToken), false, 'Must not leak token in error message');
  });

  await t.test('4. API Server /api/status endpoint exposes status diagnostics unauthenticated', async () => {
    const assetStore = new AssetStore();
    const botService = new DiscordBotService(assetStore);
    botService.setConfigError('DISCORD_BOT_TOKEN is not configured in Render environment variables.');

    const secret = 'test_secret_abc123';
    const app = createApiServer(botService, assetStore, secret);

    let resStatus = 200;
    let resData = null;

    await new Promise((resolve) => {
      const req = {
        method: 'GET',
        url: '/api/status',
        path: '/api/status',
        headers: {},
        query: {},
      };
      const res = {
        status(code) {
          resStatus = code;
          return this;
        },
        json(data) {
          resData = data;
          resolve();
          return this;
        },
        setHeader() { return this; },
        getHeader() {},
      };

      app.handle(req, res, () => resolve());
    });

    assert.equal(resStatus, 200, '/api/status should return 200 without auth header');
    assert.equal(resData.isOnline, false);
    assert.match(resData.lastError, /DISCORD_BOT_TOKEN is not configured/i);
    assert.equal(JSON.stringify(resData).includes(secret), false, 'Response must never leak integration secret');
  });

  await t.test('5. Guild and channel selection lifecycle preserved', () => {
    const assetStore = new AssetStore();
    const botService = new DiscordBotService(assetStore, 'guild_test_123');

    const status = botService.getStatus('guild_test_123');
    assert.equal(status.connectionState, 'disconnected');
    assert.equal(status.guildId, 'guild_test_123');
    assert.equal(status.voiceChannelId, null);
    assert.deepEqual(status.availableChannels, []);
  });

  await t.test('6. Gateway handshake timeout captures failure and does not hang indefinitely', async () => {
    const assetStore = new AssetStore();
    const botService = new DiscordBotService(assetStore);

    // Mock client.login to simulate a hanging gateway connection (never resolves)
    botService.client.login = () => new Promise(() => {});

    // Use a short 150ms timeout to verify timeout rejection behavior
    const result = await botService.start('dummy_valid_format_token_12345', 150);
    assert.equal(result, false, 'start() must return false when gateway handshake times out');

    const status = botService.getStatus();
    assert.equal(status.isOnline, false);
    assert.match(
      status.lastError || '',
      /Gateway handshake timed out/i,
      'lastError must report timeout failure'
    );
  });

  await t.test('7. In-flight login attempt reports pending state in status response', async () => {
    const assetStore = new AssetStore();
    const botService = new DiscordBotService(assetStore);

    let resolveLogin;
    botService.client.login = () => new Promise((resolve) => { resolveLogin = resolve; });

    // Start login without awaiting immediately
    const loginPromise = botService.start('dummy_token_pending_123', 5000);

    // Query status while login is in-flight
    const pendingStatus = botService.getStatus();
    assert.equal(pendingStatus.isOnline, false, 'isOnline must be false while pending');
    assert.match(
      pendingStatus.lastError || '',
      /Discord gateway login is in progress/i,
      'Must report login in progress'
    );

    // Resolve login and clean up
    resolveLogin?.('token');
    await loginPromise;

    const resolvedStatus = botService.getStatus();
    assert.equal(resolvedStatus.isOnline, true, 'isOnline must be true once resolved');
    assert.equal(resolvedStatus.lastError, null, 'lastError must be null once online');
  });

  await t.test('8. Root / endpoint returns 200 OK for cloud liveness and browser visits', async () => {
    const assetStore = new AssetStore();
    const botService = new DiscordBotService(assetStore);
    const app = createApiServer(botService, assetStore, 'test_secret_123');

    let resStatus = 200;
    let resData = null;

    await new Promise((resolve) => {
      const req = {
        method: 'GET',
        url: '/',
        path: '/',
        headers: {},
        query: {},
      };
      const res = {
        status(code) { resStatus = code; return this; },
        json(data) { resData = data; resolve(); return this; },
        setHeader() { return this; },
        getHeader() {},
      };

      app.handle(req, res, () => resolve());
    });

    assert.equal(resStatus, 200, 'GET / must return 200 OK without requiring Authorization header');
    assert.equal(resData.ok, true);
    assert.equal(resData.service, 'Untouchable Bard Discord Bot');
  });
});
