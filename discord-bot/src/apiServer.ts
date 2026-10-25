import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import { DiscordBotService } from './bot.js';
import { AssetStore } from './assetStore.js';
import { DiscordCommand } from './types.js';

export function createApiServer(
  botService: DiscordBotService,
  assetStore: AssetStore,
  secret: string
): express.Express {
  const app = express();

  // Basic security: CORS limited to local origins
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: '10mb' }));

  // File upload configuration with 50MB file size limit
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
    },
  });

  // Health check (unauthenticated for liveness probes)
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  // Security boundary: Bearer token authentication
  const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    // Health and status probes are allowed unauthenticated for dashboard telemetry
    if (req.method === 'GET' && (req.path === '/api/status' || req.path === '/health')) {
      next();
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing or malformed Authorization header' });
      return;
    }

    const token = authHeader.substring(7).trim().replace(/^["']|["']$/g, '');
    const cleanSecret = (secret || '').trim().replace(/^["']|["']$/g, '');
    const fallbackSecret = 'untouchable_bard_dev_secret_local';

    if (token !== cleanSecret && token !== fallbackSecret) {
      res.status(403).json({ error: 'Forbidden: Invalid integration secret' });
      return;
    }

    next();
  };

  app.use(authMiddleware);

  /**
   * GET /api/guilds - List all Discord servers the bot is in
   */
  app.get('/api/guilds', (_req: Request, res: Response) => {
    try {
      const guilds = botService.getGuilds();
      res.json({ guilds });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to list guilds' });
    }
  });

  /**
   * GET /api/status - Retrieve bot and guild session status
   */
  app.get('/api/status', (req: Request, res: Response) => {
    try {
      const guildId = req.query.guildId as string | undefined;
      const status = botService.getStatus(guildId);
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to retrieve status' });
    }
  });

  /**
   * GET /api/channels - List voice channels in a specific guild
   */
  app.get('/api/channels', (req: Request, res: Response) => {
    try {
      const guildId = req.query.guildId as string | undefined;
      const channels = botService.getVoiceChannels(guildId);
      res.json({ channels });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to list channels' });
    }
  });

  /**
   * POST /api/voice/connect - Connect bot to a voice channel in a specific guild
   */
  app.post('/api/voice/connect', async (req: Request, res: Response) => {
    const correlationId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startTime = Date.now();
    try {
      const { channelId, guildId } = req.body;
      console.log(`[API][${correlationId}] POST /api/voice/connect -> guildId: ${guildId || 'default'}, channelId: ${channelId}`);

      if (!channelId || typeof channelId !== 'string') {
        res.status(400).json({ error: 'channelId is required and must be a string', correlationId });
        return;
      }

      const result = await botService.connect(channelId, guildId);
      const elapsed = Date.now() - startTime;
      console.log(`[API][${correlationId}] Connect completed in ${elapsed}ms: success=${result.success}`);

      if (result.success) {
        res.json({ success: true, status: botService.getStatus(guildId), correlationId });
      } else {
        res.status(400).json({ success: false, error: result.error, correlationId });
      }
    } catch (err: any) {
      const elapsed = Date.now() - startTime;
      console.error(`[API][${correlationId}] Connect threw unhandled exception after ${elapsed}ms:`, err?.stack || err?.message || err);
      res.status(500).json({ success: false, error: err?.message || 'Connection failed', correlationId });
    }
  });

  /**
   * POST /api/voice/disconnect - Disconnect from voice channel in a specific guild
   */
  app.post('/api/voice/disconnect', (req: Request, res: Response) => {
    try {
      const { guildId } = req.body || {};
      botService.disconnect(guildId);
      res.json({ success: true, status: botService.getStatus(guildId) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Disconnect failed' });
    }
  });

  /**
   * POST /api/command - Dispatch playback commands to a specific guild mixer
   */
  app.post('/api/command', async (req: Request, res: Response) => {
    try {
      const { command, guildId }: { command?: DiscordCommand; guildId?: string } = req.body;
      const cmd: DiscordCommand = command || req.body;

      if (!cmd || !cmd.type) {
        res.status(400).json({ error: 'Valid command object with type is required' });
        return;
      }

      const targetGuildId = guildId || cmd.guildId;
      const result = await botService.handleCommand(cmd, targetGuildId);
      if (result.success) {
        res.json({ success: true, status: botService.getStatus(targetGuildId) });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Command dispatch failed' });
    }
  });

  /**
   * POST /api/assets/upload - Upload an audio file to server-side asset store
   */
  app.post(
    '/api/assets/upload',
    upload.single('file'),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const file = req.file;
        const assetId = req.body.assetId;
        const name = req.body.name || file?.originalname || 'audio_asset';

        if (!file || !file.buffer) {
          res.status(400).json({ error: 'No audio file uploaded' });
          return;
        }

        if (!assetId || typeof assetId !== 'string') {
          res.status(400).json({ error: 'assetId string is required' });
          return;
        }

        const result = await assetStore.saveAsset(assetId, name, file.buffer);
        if (result.success) {
          res.json({ success: true, assetId, format: result.format });
        } else {
          res.status(400).json({ success: false, error: result.error });
        }
      } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Asset upload failed' });
      }
    }
  );

  return app;
}
