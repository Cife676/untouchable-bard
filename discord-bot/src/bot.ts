import {
  Client,
  GatewayIntentBits,
  ChannelType,
  VoiceBasedChannel,
} from 'discord.js';
import { GuildSession } from './guildSession.js';
import { AssetStore } from './assetStore.js';
import { BotStatus, DiscordCommand, GuildInfo, GuildSessionStatus, VoiceChannelInfo } from './types.js';

export class DiscordBotService {
  private client: Client;
  private assetStore: AssetStore;
  private sessions: Map<string, GuildSession> = new Map();
  private configuredGuildId: string | null = null;
  private isOnline: boolean = false;
  private botTag: string | null = null;
  private initError: string | null = null;
  private loginState: 'unconfigured' | 'pending' | 'online' | 'failed' = 'unconfigured';

  constructor(assetStore: AssetStore, defaultGuildId?: string) {
    this.assetStore = assetStore;
    this.configuredGuildId = defaultGuildId || null;

    // Minimum required intents: Guilds & GuildVoiceStates (NO privileged intents, NO admin)
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
      ],
    });

    this.setupEvents();
  }

  private setupEvents(): void {
    this.client.once('ready', () => {
      this.isOnline = true;
      this.loginState = 'online';
      this.botTag = this.client.user?.tag || null;
      this.initError = null;
      console.log(`[DiscordBot] Gateway ready: Logged in successfully as ${this.botTag} (${this.client.guilds.cache.size} servers)`);
    });

    this.client.on('error', (err) => {
      console.error('[DiscordBot] General client error:', err?.message || err);
      this.initError = `Discord client error: ${err?.message || err}`;
    });

    this.client.on('shardError', (err, shardId) => {
      console.error(`[DiscordBot] Shard ${shardId} gateway error:`, err?.message || err);
      this.initError = `Discord gateway error (Shard ${shardId}): ${err?.message || err}`;
      this.isOnline = false;
      this.loginState = 'failed';
    });

    this.client.on('shardDisconnect', (event, shardId) => {
      console.warn(`[DiscordBot] Shard ${shardId} disconnected from gateway (code: ${event.code}, reason: ${event.reason || 'none'})`);
      this.isOnline = false;
      this.loginState = 'failed';
      this.initError = `Discord gateway disconnected (code: ${event.code})`;
    });

    this.client.on('shardReconnecting', (shardId) => {
      console.log(`[DiscordBot] Shard ${shardId} reconnecting to Discord gateway...`);
      this.loginState = 'pending';
    });

    this.client.on('shardResume', (shardId, replayedEvents) => {
      this.isOnline = true;
      this.loginState = 'online';
      this.initError = null;
      console.log(`[DiscordBot] Shard ${shardId} resumed session (${replayedEvents} events replayed)`);
    });

    this.client.on('invalidated', () => {
      console.error('[DiscordBot] Discord session invalidated. Bot token may have been revoked.');
      this.isOnline = false;
      this.loginState = 'failed';
      this.initError = 'Discord session invalidated. Please verify bot token.';
    });

    this.client.on('debug', (info) => {
      // Safe gateway logging with all tokens redacted
      const safe = info.replace(/[a-zA-Z0-9_\-\.]{24,}/g, '[REDACTED]');
      if (safe.includes('[WS') || safe.includes('gateway') || safe.includes('Heartbeat') || safe.includes('Connecting')) {
        console.log(`[DiscordGateway] ${safe}`);
      }
    });

    this.client.on('warn', (warning) => {
      console.warn(`[DiscordBot] Gateway warning: ${warning}`);
    });

    this.client.on('guildDelete', (guild) => {
      // Clean up session if bot was kicked from server
      const session = this.sessions.get(guild.id);
      if (session) {
        session.destroy();
        this.sessions.delete(guild.id);
      }
    });
  }

  public setConfigError(error: string): void {
    this.initError = error;
    this.loginState = 'unconfigured';
  }

  public async start(token: string, timeoutMs: number = 60000): Promise<boolean> {
    if (!token || token.trim() === '' || token === 'your_bot_token_here') {
      this.loginState = 'failed';
      this.initError = 'DISCORD_BOT_TOKEN is not configured in environment variables.';
      console.warn('[DiscordBot] Token not configured. Running in offline/API mode.');
      return false;
    }

    this.loginState = 'pending';
    this.initError = null;
    console.log('[DiscordBot] Initiating Discord gateway handshake...');

    try {
      const loginPromise = this.client.login(token);
      let timeoutHandle: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`Gateway handshake timed out after ${Math.round(timeoutMs / 1000)}s`));
        }, timeoutMs);
      });

      await Promise.race([loginPromise, timeoutPromise]);
      if (timeoutHandle) clearTimeout(timeoutHandle);

      this.isOnline = true;
      this.loginState = 'online';
      this.initError = null;
      this.botTag = this.client.user?.tag || this.botTag;
      console.log(`[DiscordBot] Gateway login Promise resolved. Logged in as ${this.botTag || 'bot'}`);
      return true;
    } catch (err: any) {
      this.isOnline = false;
      this.loginState = 'failed';
      this.initError = `Discord login failed: ${err?.message || err}`;
      console.error('[DiscordBot] Gateway login failure:', err?.message || err);
      return false;
    }
  }

  /**
   * Get all servers (guilds) the bot is a member of
   */
  public getGuilds(): GuildInfo[] {
    if (!this.isOnline) return [];
    const list: GuildInfo[] = [];
    this.client.guilds.cache.forEach((g) => {
      list.push({
        id: g.id,
        name: g.name,
        icon: g.iconURL() || null,
        memberCount: g.memberCount,
      });
    });
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get or create isolated session for a specific guild
   */
  public getOrCreateSession(guildId: string): GuildSession {
    let session = this.sessions.get(guildId);
    if (!session) {
      const guild = this.client.guilds.cache.get(guildId);
      session = new GuildSession(guildId, guild?.name);
      this.sessions.set(guildId, session);
    }
    return session;
  }

  /**
   * List voice channels in a specific guild
   */
  public getVoiceChannels(specificGuildId?: string): VoiceChannelInfo[] {
    const targetGuildId = specificGuildId || this.configuredGuildId || this.client.guilds.cache.first()?.id;
    if (!targetGuildId) return [];

    const guild = this.client.guilds.cache.get(targetGuildId);
    if (!guild) return [];

    const channels: VoiceChannelInfo[] = [];
    guild.channels.cache.forEach((ch) => {
      if (ch.type === ChannelType.GuildVoice || ch.type === ChannelType.GuildStageVoice) {
        channels.push({
          id: ch.id,
          name: ch.name,
          userCount: (ch as VoiceBasedChannel).members?.size ?? 0,
        });
      }
    });

    return channels.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Connect bot to a voice channel in a specific guild
   */
  public async connect(channelId: string, specificGuildId?: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isOnline) {
      return { success: false, error: 'Discord bot is not currently logged in / online.' };
    }

    const targetGuildId = specificGuildId || this.configuredGuildId || this.client.guilds.cache.first()?.id;
    console.log(`[DiscordBot] Connect request received for channel: ${channelId}, targetGuildId: ${targetGuildId || 'none'}`);

    if (!targetGuildId) {
      console.warn('[DiscordBot] Connect failed: No target guild specified or found');
      return { success: false, error: 'No Discord server specified or configured.' };
    }

    const guild = this.client.guilds.cache.get(targetGuildId);
    if (!guild) {
      console.warn(`[DiscordBot] Connect failed: Bot is not a member of guild ID ${targetGuildId}`);
      return { success: false, error: `Bot is not a member of server ID: ${targetGuildId}` };
    }

    const channel = guild.channels.cache.get(channelId) as VoiceBasedChannel;
    if (!channel || (channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildStageVoice)) {
      console.warn(`[DiscordBot] Connect failed: Channel ${channelId} is not a valid voice channel in guild ${guild.name}`);
      return { success: false, error: `Voice channel ID ${channelId} not found in server ${guild.name}` };
    }

    // Verify channel permissions
    const permissions = channel.permissionsFor(this.client.user!);
    const hasConnect = permissions?.has('Connect');
    const hasSpeak = permissions?.has('Speak');
    console.log(`[DiscordBot] Permissions in #${channel.name}: Connect=${hasConnect}, Speak=${hasSpeak}`);

    if (!permissions || !hasConnect || !hasSpeak) {
      console.warn(`[DiscordBot] Connect failed: Missing permissions in #${channel.name}`);
      return { success: false, error: `Bot lacks 'Connect' or 'Speak' permission in #${channel.name}` };
    }

    const session = this.getOrCreateSession(targetGuildId);
    session.guildName = guild.name;

    return session.voiceManager.connect(
      targetGuildId,
      channelId,
      channel.name,
      guild.voiceAdapterCreator
    );
  }

  /**
   * Disconnect voice in a specific guild
   */
  public disconnect(specificGuildId?: string): void {
    const targetGuildId = specificGuildId || this.configuredGuildId || this.client.guilds.cache.first()?.id;
    console.log(`[DiscordBot] Disconnect request for guild: ${targetGuildId || 'none'}`);
    if (!targetGuildId) return;

    const session = this.sessions.get(targetGuildId);
    if (session) {
      session.destroy();
    }
  }

  /**
   * Retrieve bot & guild session status
   */
  public getStatus(specificGuildId?: string): BotStatus {
    const availableGuilds = this.getGuilds();
    const activeGuildId =
      specificGuildId ||
      this.configuredGuildId ||
      availableGuilds[0]?.id ||
      null;

    const activeGuild = activeGuildId ? this.client.guilds.cache.get(activeGuildId) : null;
    const session = activeGuildId ? this.sessions.get(activeGuildId) : null;
    const availableChannels = activeGuildId ? this.getVoiceChannels(activeGuildId) : [];

    let sessionStatus: GuildSessionStatus;
    if (session) {
      sessionStatus = session.getStatus(availableChannels);
    } else {
      sessionStatus = {
        guildId: activeGuildId,
        guildName: activeGuild?.name || null,
        voiceChannelId: null,
        voiceChannelName: null,
        connectionState: 'disconnected',
        lastError: this.initError,
        playbackState: 'stopped',
        currentScene: null,
        activeLayers: [],
        masterVolume: 0.9,
        isMasterMuted: false,
        channelVolumes: { music: 0.8, ambience: 0.8, environment: 0.8, sfx: 0.85 },
        channelMutes: { music: false, ambience: false, environment: false, sfx: false },
        availableChannels,
      };
    }

    const effectiveError =
      this.initError ||
      (this.loginState === 'pending' ? 'Discord gateway login is in progress (connecting to WebSocket gateway)...' : null) ||
      sessionStatus.lastError;

    return {
      isOnline: this.isOnline,
      botTag: this.botTag,
      availableGuilds,
      activeSessionsCount: this.sessions.size,
      ...sessionStatus,
      lastError: effectiveError,
    };
  }

  /**
   * Execute tabletop commands isolated to a specific guild
   */
  public async handleCommand(
    command: DiscordCommand,
    specificGuildId?: string
  ): Promise<{ success: boolean; error?: string }> {
    const targetGuildId = command.guildId || specificGuildId || this.configuredGuildId || this.client.guilds.cache.first()?.id;
    if (!targetGuildId) {
      return { success: false, error: 'No Discord server specified for command' };
    }

    if (this.isOnline && !this.client.guilds.cache.has(targetGuildId)) {
      return { success: false, error: `Bot is not a member of server ID: ${targetGuildId}` };
    }

    const session = this.getOrCreateSession(targetGuildId);
    const mixer = session.mixer;

    switch (command.type) {
      case 'SCENE_START': {
        const { scene, crossfade } = command;
        console.log(`[AudioPipeline][${targetGuildId}] SCENE_START requested for "${scene.name}" (${scene.id}) with ${scene.layers.length} layers, crossfade=${crossfade ?? 'default'}`);
        const resolvedLayers: Array<{
          id: string;
          assetId: string;
          name: string;
          channel: any;
          volume: number;
          loop: boolean;
          buffer: Buffer;
        }> = [];

        for (const layer of scene.layers) {
          const buffer = await this.assetStore.getPcmBuffer(layer.assetId);
          if (buffer) {
            resolvedLayers.push({
              id: layer.id,
              assetId: layer.assetId,
              name: layer.name,
              channel: layer.channel,
              volume: layer.volume,
              loop: layer.loop,
              buffer,
            });
            console.log(`[AudioPipeline][${targetGuildId}] Layer resolved: "${layer.name}" (${layer.channel}) -> ${buffer.length} bytes PCM`);
          } else {
            console.warn(`[AudioPipeline][${targetGuildId}] Asset NOT found for layer "${layer.name}" (ID: ${layer.assetId})`);
          }
        }

        const effectiveCrossfade = crossfade ?? scene.transitionOverride ?? 2.0;
        mixer.startScene(
          { id: scene.id, name: scene.name },
          resolvedLayers,
          effectiveCrossfade
        );
        console.log(`[AudioPipeline][${targetGuildId}] Mixer playing scene "${scene.name}" with ${resolvedLayers.length}/${scene.layers.length} active layers`);
        return { success: true };
      }

      case 'SCENE_STOP': {
        const fade = command.fadeDuration ?? 1.5;
        console.log(`[AudioPipeline][${targetGuildId}] SCENE_STOP requested (fade=${fade}s)`);
        mixer.stopScene(fade);
        return { success: true };
      }

      case 'SCENE_PAUSE':
        console.log(`[AudioPipeline][${targetGuildId}] SCENE_PAUSE requested`);
        mixer.pause();
        return { success: true };

      case 'SCENE_RESUME':
        console.log(`[AudioPipeline][${targetGuildId}] SCENE_RESUME requested`);
        mixer.resume();
        return { success: true };

      case 'SFX_TRIGGER': {
        console.log(`[AudioPipeline][${targetGuildId}] SFX_TRIGGER requested for assetId: "${command.assetId}" (vol: ${command.volume ?? 0.85})`);
        const buffer = await this.assetStore.getPcmBuffer(command.assetId);
        if (!buffer) {
          console.warn(`[AudioPipeline][${targetGuildId}] SFX asset not found for ID: ${command.assetId}`);
          return { success: false, error: `SFX Asset not found for ID: ${command.assetId}` };
        }
        mixer.triggerSfx(
          command.assetId,
          buffer,
          command.volume ?? 0.85,
          command.name ?? 'SFX Cue'
        );
        console.log(`[AudioPipeline][${targetGuildId}] SFX triggered: "${command.name ?? 'SFX Cue'}" -> ${buffer.length} bytes PCM queued into mixer`);
        return { success: true };
      }

      case 'CHANNEL_VOLUME_SET':
        mixer.setChannelVolume(command.channel, command.volume);
        return { success: true };

      case 'CHANNEL_MUTE_TOGGLE':
        mixer.toggleChannelMute(command.channel);
        return { success: true };

      case 'MASTER_VOLUME_SET':
        mixer.setMasterVolume(command.volume);
        return { success: true };

      case 'MASTER_MUTE':
        mixer.setMasterMute(command.muted);
        return { success: true };

      case 'STOP_ALL':
        console.log(`[AudioPipeline][${targetGuildId}] STOP_ALL requested`);
        mixer.stopAll(command.fadeDuration ?? 0.5);
        return { success: true };

      case 'LAYER_VOLUME_SET':
        mixer.setLayerVolume(command.layerId, command.volume);
        return { success: true };

      case 'TEST_TONE': {
        console.log(`[AudioPipeline][${targetGuildId}] TEST_TONE requested`);
        const buffer = await this.assetStore.getPcmBuffer('asset_test_cue');
        if (buffer) {
          mixer.triggerSfx('asset_test_cue', buffer, 0.8, 'Voice Test Tone');
          console.log(`[AudioPipeline][${targetGuildId}] TEST_TONE queued successfully (${buffer.length} bytes PCM)`);
          return { success: true };
        }
        return { success: false, error: 'Test tone audio generator failed' };
      }

      default:
        return { success: false, error: 'Unknown command type' };
    }
  }
}
