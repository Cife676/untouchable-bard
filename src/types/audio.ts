/**
 * Core Audio and Scene Data Types for the Tabletop Audio Engine
 */

export type AudioCategoryType = 'MUSIC' | 'AMBIENCE' | 'ENVIRONMENT' | 'SFX';

export type ChannelId = 'music' | 'ambience' | 'environment' | 'sfx';

export interface AudioAsset {
  id: string;
  name: string;
  type: AudioCategoryType;
  fileUrl: string;
  duration?: number;
  loopable: boolean;
  category: string;
  description?: string;
  isCustom?: boolean;
  fileName?: string;
  fileBlobKey?: string;
}

export interface SceneLayer {
  id: string;
  assetId: string;
  channel: ChannelId;
  name: string;
  volume: number; // 0.0 to 1.0
  loop: boolean;
  fadeDuration?: number; // seconds
}

export interface QuickTrigger {
  id: string;
  name: string;
  assetId: string;
  volume: number;
  shortcutKey?: string;
}

export interface Scene {
  id: string;
  campaignId: string;
  name: string;
  description: string;
  layers: SceneLayer[];
  quickTriggers?: QuickTrigger[];
  isCustom?: boolean;
  category?: import('./campaign').SceneCategory;
  isFavorite?: boolean;
  transitionOverride?: number; // optional scene-specific crossfade override in seconds
  createdAt?: number;
  updatedAt?: number;
}

export interface PlayTrackOptions {
  volume?: number;       // 0.0 to 1.0 (defaults to 1.0)
  loop?: boolean;         // defaults to false for SFX, true for music/ambience
  fadeDuration?: number;  // seconds (e.g. 1.5s fade-in)
  startOffset?: number;   // seconds into track
}

export interface ChannelStatus {
  id: ChannelId;
  name: string;
  volume: number;         // 0.0 to 1.0
  isMuted: boolean;
  isPlaying: boolean;
  currentTrackName?: string;
}

export interface EngineSnapshot {
  isInitialized: boolean;
  masterVolume: number;
  isMasterMuted: boolean;
  channels: Record<ChannelId, ChannelStatus>;
}
