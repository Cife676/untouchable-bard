import { ChannelId, AudioCategoryType } from '@/types/audio';

export type SessionPlaybackState = 'playing' | 'paused' | 'stopped' | 'transitioning';

export type SessionCommand =
  | {
      type: 'SCENE_START';
      sceneId: string;
      crossfade?: number;
    }
  | {
      type: 'SCENE_STOP';
      fadeDuration?: number;
    }
  | {
      type: 'SCENE_PAUSE';
    }
  | {
      type: 'SCENE_RESUME';
    }
  | {
      type: 'SFX_TRIGGER';
      assetId: string;
      volume?: number;
    }
  | {
      type: 'CHANNEL_VOLUME_SET';
      channel: ChannelId;
      volume: number;
    }
  | {
      type: 'CHANNEL_MUTE_TOGGLE';
      channel: ChannelId;
    }
  | {
      type: 'MASTER_VOLUME_SET';
      volume: number;
    }
  | {
      type: 'MASTER_MUTE';
      muted: boolean;
    }
  | {
      type: 'STOP_ALL';
      fadeDuration?: number;
    }
  | {
      type: 'LAYER_VOLUME_SET';
      layerId: string;
      volume: number;
    }
  | {
      type: 'LAYER_MUTE_TOGGLE';
      layerId: string;
    }
  | {
      type: 'CROSSFADE_SET';
      duration: number;
    };

export interface LiveLayerState {
  layerId: string;
  assetId: string;
  channel: ChannelId;
  name: string;
  temporaryVolume: number;
  isMuted: boolean;
  isPlaying: boolean;
}

export interface LiveSessionState {
  activeSceneId: string | null;
  playbackState: SessionPlaybackState;
  crossfadeDuration: number;
  currentTransitionRemaining?: number;
  layerStates: Record<string, LiveLayerState>;
  sfxShortcuts: Record<string, string>; // e.g. "1" -> assetId
  isFullscreen: boolean;
}

export type SessionStateListener = (state: LiveSessionState) => void;
