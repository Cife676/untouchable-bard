import dotenv from 'dotenv';
import path from 'path';
import { AssetStore } from './assetStore.js';
import { DiscordBotService } from './bot.js';
import { createApiServer } from './apiServer.js';

// Load .env from project root or local directory
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const cleanEnv = (val?: string) => (val || '').trim().replace(/^["']|["']$/g, '');

const TOKEN = cleanEnv(process.env.DISCORD_BOT_TOKEN);
const GUILD_ID = cleanEnv(process.env.DISCORD_GUILD_ID);
const SECRET = cleanEnv(process.env.DISCORD_INTEGRATION_SECRET) || 'untouchable_bard_dev_secret_local';
const PORT = parseInt(process.env.PORT || process.env.DISCORD_BOT_PORT || '3001', 10);
const HOST = process.env.DISCORD_BOT_HOST || '0.0.0.0';

async function bootstrap() {
  console.log('====================================================');
  console.log('   UNTOUCHABLE BARD — DISCORD MULTI-SERVER SERVICE  ');
  console.log('====================================================');

  const assetStore = new AssetStore();
  const botService = new DiscordBotService(assetStore, GUILD_ID || undefined);

  // Create Express API server and start listening immediately (passes cloud health checks instantly)
  const app = createApiServer(botService, assetStore, SECRET);

  const server = app.listen(PORT, HOST, () => {
    console.log(`[DiscordService] API server listening at http://${HOST}:${PORT}`);
    console.log(`[DiscordService] Authenticated via DISCORD_INTEGRATION_SECRET`);
    console.log(`[DiscordService] Multi-server isolation active (per-guild audio mixers)`);
  });

  // Connect Discord bot to gateway asynchronously
  if (TOKEN && TOKEN !== 'your_bot_token_here') {
    console.log('[DiscordService] Authenticating bot with Discord gateway...');
    botService.start(TOKEN).catch((err) => {
      console.error('[DiscordService] Gateway connection error:', err?.message || err);
    });
  } else {
    console.warn('[DiscordService] DISCORD_BOT_TOKEN not provided in environment.');
    console.warn('[DiscordService] Service running in offline/API mode. Audio mixing & API active.');
  }

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n[DiscordService] Shutting down cleanly...');
    server.close(() => {
      console.log('[DiscordService] Process exited.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  console.error('[DiscordService] Fatal bootstrap error:', err);
  process.exit(1);
});
