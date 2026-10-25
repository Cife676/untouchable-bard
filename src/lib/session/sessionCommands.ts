import { ChannelId } from '@/types/audio';
import { SessionCommand } from './sessionTypes';

export const SessionCommands = {
  startScene: (sceneId: string, crossfade?: number): SessionCommand => ({
    type: 'SCENE_START',
    sceneId,
    crossfade,
  }),

  stopScene: (fadeDuration?: number): SessionCommand => ({
    type: 'SCENE_STOP',
    fadeDuration,
  }),

  pauseScene: (): SessionCommand => ({
    type: 'SCENE_PAUSE',
  }),

  resumeScene: (): SessionCommand => ({
    type: 'SCENE_RESUME',
  }),

  triggerSfx: (assetId: string, volume?: number): SessionCommand => ({
    type: 'SFX_TRIGGER',
    assetId,
    volume,
  }),

  setChannelVolume: (channel: ChannelId, volume: number): SessionCommand => ({
    type: 'CHANNEL_VOLUME_SET',
    channel,
    volume,
  }),

  toggleChannelMute: (channel: ChannelId): SessionCommand => ({
    type: 'CHANNEL_MUTE_TOGGLE',
    channel,
  }),

  setMasterVolume: (volume: number): SessionCommand => ({
    type: 'MASTER_VOLUME_SET',
    volume,
  }),

  setMasterMute: (muted: boolean): SessionCommand => ({
    type: 'MASTER_MUTE',
    muted,
  }),

  stopAll: (fadeDuration?: number): SessionCommand => ({
    type: 'STOP_ALL',
    fadeDuration,
  }),

  setLayerVolume: (layerId: string, volume: number): SessionCommand => ({
    type: 'LAYER_VOLUME_SET',
    layerId,
    volume,
  }),

  toggleLayerMute: (layerId: string): SessionCommand => ({
    type: 'LAYER_MUTE_TOGGLE',
    layerId,
  }),

  setCrossfade: (duration: number): SessionCommand => ({
    type: 'CROSSFADE_SET',
    duration,
  }),
};
