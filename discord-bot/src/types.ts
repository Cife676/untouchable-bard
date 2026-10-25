export type ChannelId = 'music' | 'ambience' | 'environment' | 'sfx';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
export type PlaybackState = 'stopped' | 'playing' | 'paused' | 'transitioning';

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
  channel: ChannelId;
  volume: number;
  isMuted: boolean;
}

export interface GuildSessionStatus {
  guildId: string | null;
  guildName: string | null;
  voiceChannelId: string | null;
  voiceChannelName: string | null;
  connectionState: ConnectionState;
  lastError: string | null;
  playbackState: PlaybackState;
  currentScene: { id: string; name: string } | null;
  activeLayers: ActiveLayerInfo[];
  masterVolume: number;
  isMasterMuted: boolean;
  channelVolumes: Record<ChannelId, number>;
  channelMutes: Record<ChannelId, boolean>;
  availableChannels: VoiceChannelInfo[];
}

export interface BotStatus extends GuildSessionStatus {
  isOnline: boolean;
  botTag: string | null;
  availableGuilds: GuildInfo[];
  activeSessionsCount: number;
}

export interface SceneLayerPayload {
  id: string;
  assetId: string;
  name: string;
  channel: ChannelId;
  volume: number; // 0.0 to 1.0
  loop: boolean;
  fadeDuration?: number;
}

export interface ScenePayload {
  id: string;
  name: string;
  layers: SceneLayerPayload[];
  transitionOverride?: number;
}

export type DiscordCommand =
  | {
      type: 'SCENE_START';
      scene: ScenePayload;
      crossfade?: number;
      guildId?: string;
    }
  | {
      type: 'SCENE_STOP';
      fadeDuration?: number;
      guildId?: string;
    }
  | {
      type: 'SCENE_PAUSE';
      guildId?: string;
    }
  | {
      type: 'SCENE_RESUME';
      guildId?: string;
    }
  | {
      type: 'SFX_TRIGGER';
      assetId: string;
      volume?: number;
      name?: string;
      channel?: ChannelId;
      loop?: boolean;
      guildId?: string;
    }
  | {
      type: 'CHANNEL_VOLUME_SET';
      channel: ChannelId;
      volume: number;
      guildId?: string;
    }
  | {
      type: 'CHANNEL_MUTE_TOGGLE';
      channel: ChannelId;
      guildId?: string;
    }
  | {
      type: 'MASTER_VOLUME_SET';
      volume: number;
      guildId?: string;
    }
  | {
      type: 'MASTER_MUTE';
      muted: boolean;
      guildId?: string;
    }
  | {
      type: 'STOP_ALL';
      fadeDuration?: number;
      guildId?: string;
    }
  | {
      type: 'LAYER_VOLUME_SET';
      layerId: string;
      volume: number;
      guildId?: string;
    }
  | {
      type: 'TEST_TONE';
      guildId?: string;
    };
