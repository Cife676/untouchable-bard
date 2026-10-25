'use client';

import { useEffect, useState, useCallback } from 'react';
import { getAudioEngine } from '@/lib/audio/AudioEngine';
import { SoundGenerator } from '@/lib/audio/SoundGenerator';
import { ChannelId, EngineSnapshot, PlayTrackOptions } from '@/types/audio';

export function useAudioEngine() {
  const engine = getAudioEngine();
  const [snapshot, setSnapshot] = useState<EngineSnapshot>(() => engine.getSnapshot());

  useEffect(() => {
    // Subscribe to engine state mutations
    const unsubscribe = engine.subscribe((newSnapshot) => {
      setSnapshot(newSnapshot);
    });
    return () => unsubscribe();
  }, [engine]);

  /**
   * Helper to resolve an AudioBuffer either from procedural generator or network URL
   */
  const resolveBuffer = useCallback(
    async (assetUrl: string, assetId?: string): Promise<AudioBuffer | null> => {
      await engine.init();
      const ctx = engine.getContext();
      if (!ctx) return null;

      const cacheKey = assetUrl || assetId || '';
      if (!cacheKey) return null;

      // Check cache first
      const cached = engine.getCachedBuffer(cacheKey);
      if (cached) return cached;

      let buffer: AudioBuffer | null = null;

      if (assetUrl && assetUrl.startsWith('procedural:')) {
        const soundKey = assetUrl.replace('procedural:', '');
        switch (soundKey) {
          case 'music_pad':
            buffer = SoundGenerator.createMusicPad(ctx);
            break;
          case 'wind_ambience':
            buffer = SoundGenerator.createWindAmbience(ctx);
            break;
          case 'rain_environment':
            buffer = SoundGenerator.createRainEnvironment(ctx);
            break;
          case 'wolf_howl':
            buffer = SoundGenerator.createWolfHowl(ctx);
            break;
          case 'branch_crack':
            buffer = SoundGenerator.createBranchCrack(ctx);
            break;
          case 'thunder':
            buffer = SoundGenerator.createThunder(ctx);
            break;
          default:
            console.warn(`Unknown procedural sound: ${soundKey}`);
            return null;
        }
      } else {
        if (assetUrl) {
          try {
            buffer = await engine.loadAudioFile(assetUrl);
          } catch {
            buffer = null;
          }
        }
        // Fallback: Check local IndexedDB storage if URL expired or failed
        if (!buffer && assetId) {
          try {
            const { AudioFileStorage } = await import('@/lib/storage/audioFileStorage');
            const blob = await AudioFileStorage.getAudioBlob(assetId);
            if (blob) {
              const arrayBuffer = await blob.arrayBuffer();
              buffer = await ctx.decodeAudioData(arrayBuffer);
            }
          } catch {
            buffer = null;
          }
        }
      }

      if (buffer) {
        engine.cacheBuffer(cacheKey, buffer);
      }
      return buffer;
    },
    [engine]
  );

  const playAsset = useCallback(
    async (
      channelId: ChannelId,
      assetId: string,
      assetUrl: string,
      options: PlayTrackOptions = {},
      trackName?: string
    ) => {
      const buffer = await resolveBuffer(assetUrl, assetId);
      if (!buffer) return;
      return engine.playTrack(channelId, assetId, buffer, options, trackName);
    },
    [engine, resolveBuffer]
  );

  return {
    engine,
    snapshot,
    initEngine: useCallback(() => engine.init(), [engine]),
    setMasterVolume: useCallback((v: number) => engine.setMasterVolume(v), [engine]),
    toggleMasterMute: useCallback(() => engine.setMasterMute(!snapshot.isMasterMuted), [engine, snapshot.isMasterMuted]),
    setChannelVolume: useCallback(
      (channel: ChannelId, v: number) => engine.setChannelVolume(channel, v),
      [engine]
    ),
    toggleChannelMute: useCallback(
      (channel: ChannelId) => {
        const ch = engine.getChannel(channel);
        if (ch) ch.setMute(!ch.isChannelMuted());
      },
      [engine]
    ),
    stopChannel: useCallback((ch: ChannelId, fade = 0.5) => engine.stopChannel(ch, fade), [engine]),
    pauseChannel: useCallback((ch: ChannelId) => engine.pauseChannel(ch), [engine]),
    resumeChannel: useCallback((ch: ChannelId) => engine.resumeChannel(ch), [engine]),
    stopAll: useCallback((fade = 0.5) => engine.stopAll(fade), [engine]),
    playAsset,
  };
}
