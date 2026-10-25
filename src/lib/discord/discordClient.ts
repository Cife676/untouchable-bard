/**
 * Client-Side Discord Voice Service API Client
 * Calls the Next.js authenticated API routes (/api/discord/*)
 */

export interface GuildInfo {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number;
}

export interface VoiceChannelInfo {
  id: string;
  name: string;
  userCount: number;
}

export interface ActiveLayerInfo {
  id: string;
  name: string;
  channel: string;
  volume: number;
  isMuted: boolean;
}

export interface DiscordBotStatus {
  isOnline: boolean;
  botTag: string | null;
  guildId: string | null;
  guildName: string | null;
  voiceChannelId: string | null;
  voiceChannelName: string | null;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastError: string | null;
  playbackState: 'stopped' | 'playing' | 'paused' | 'transitioning';
  currentScene: { id: string; name: string } | null;
  activeLayers: ActiveLayerInfo[];
  masterVolume: number;
  isMasterMuted: boolean;
  channelVolumes: Record<string, number>;
  channelMutes: Record<string, boolean>;
  availableChannels: VoiceChannelInfo[];
  availableGuilds: GuildInfo[];
  activeSessionsCount?: number;
  isServiceReachable?: boolean;
}

export class DiscordClient {
  public static async getGuilds(): Promise<GuildInfo[]> {
    try {
      const res = await fetch('/api/discord/guilds');
      if (!res.ok) return [];
      const data = await res.json();
      return data.guilds || [];
    } catch {
      return [];
    }
  }

  public static async getStatus(guildId?: string): Promise<DiscordBotStatus | null> {
    try {
      const url = guildId ? `/api/discord/status?guildId=${encodeURIComponent(guildId)}` : '/api/discord/status';
      const res = await fetch(url);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return {
          isOnline: false,
          botTag: null,
          guildId: guildId || null,
          guildName: null,
          voiceChannelId: null,
          voiceChannelName: null,
          connectionState: 'disconnected',
          lastError: errorData.error || `Service returned ${res.status}`,
          playbackState: 'stopped',
          activeLayers: [],
          currentScene: null,
          masterVolume: 1,
          isMasterMuted: false,
          channelVolumes: { music: 0.8, ambience: 0.8, environment: 0.8, sfx: 0.85 },
          channelMutes: { music: false, ambience: false, environment: false, sfx: false },
          availableChannels: [],
          availableGuilds: [],
          isServiceReachable: false,
        };
      }
      return await res.json();
    } catch {
      return null;
    }
  }

  public static async getVoiceChannels(guildId?: string): Promise<VoiceChannelInfo[]> {
    try {
      const url = guildId ? `/api/discord/channels?guildId=${encodeURIComponent(guildId)}` : '/api/discord/channels';
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return data.channels || [];
    } catch {
      return [];
    }
  }

  public static async connect(channelId: string, guildId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/discord/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, guildId }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to connect to voice channel' };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Connection request failed' };
    }
  }

  public static async disconnect(guildId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/discord/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to disconnect from voice channel' };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Disconnect request failed' };
    }
  }

  public static async sendCommand(command: any, guildId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/discord/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, guildId }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Command dispatch rejected' };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Command transmission failed' };
    }
  }

  public static async uploadAsset(assetId: string, name: string, fileBlob: Blob): Promise<{ success: boolean; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('assetId', assetId);
      formData.append('name', name);
      formData.append('file', fileBlob, `${assetId}.bin`);

      const res = await fetch('/api/discord/assets/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Asset upload failed' };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Asset upload request failed' };
    }
  }

  public static async playTestTone(guildId?: string): Promise<{ success: boolean; error?: string }> {
    return this.sendCommand({ type: 'TEST_TONE' }, guildId);
  }
}
