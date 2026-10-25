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
});
