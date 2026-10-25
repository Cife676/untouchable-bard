'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DiscordClient, DiscordBotStatus, GuildInfo, VoiceChannelInfo } from './discordClient';
import { AudioFileStorage } from '@/lib/storage/audioFileStorage';
import { AudioAsset } from '@/types/audio';
import { getSessionController } from '@/lib/session/sessionController';

export type AudioOutputTarget = 'browser' | 'discord' | 'both';

const OUTPUT_PREF_KEY = 'untouchable_bard_output_target';
const GUILD_PREF_KEY = 'untouchable_bard_selected_guild';

export function useDiscordVoice() {
  const [outputTarget, setOutputTargetState] = useState<AudioOutputTarget>('browser');
  const [selectedGuildId, setSelectedGuildIdState] = useState<string | null>(null);
  const [status, setStatus] = useState<DiscordBotStatus | null>(null);
  const [guilds, setGuilds] = useState<GuildInfo[]>([]);
  const [channels, setChannels] = useState<VoiceChannelInfo[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ syncing: boolean; done: number; total: number } | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Hydrate preferences from localStorage
  useEffect(() => {
    try {
      const savedOutput = localStorage.getItem(OUTPUT_PREF_KEY) as AudioOutputTarget | null;
      if (savedOutput && (savedOutput === 'browser' || savedOutput === 'discord' || savedOutput === 'both')) {
        setOutputTargetState(savedOutput);
      }

      const savedGuild = localStorage.getItem(GUILD_PREF_KEY);
      if (savedGuild) {
        setSelectedGuildIdState(savedGuild);
        getSessionController().setSelectedGuildId(savedGuild);
      }
    } catch {
      // Ignore
    }
  }, []);

  const setOutputTarget = useCallback((target: AudioOutputTarget) => {
    setOutputTargetState(target);
    try {
      localStorage.setItem(OUTPUT_PREF_KEY, target);
    } catch {
      // Ignore
    }
  }, []);

  const setSelectedGuildId = useCallback((guildId: string | null) => {
    setSelectedGuildIdState(guildId);
    getSessionController().setSelectedGuildId(guildId);
    try {
      if (guildId) {
        localStorage.setItem(GUILD_PREF_KEY, guildId);
      } else {
        localStorage.removeItem(GUILD_PREF_KEY);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Poll status periodically for selected guild
  const fetchStatus = useCallback(async () => {
    const s = await DiscordClient.getStatus(selectedGuildId || undefined);
    if (s) {
      setStatus(s);
      if (s.availableGuilds) {
        setGuilds(s.availableGuilds);

        // If no guild selected yet or saved guild no longer accessible, default to first available
        if (!selectedGuildId && s.availableGuilds.length > 0) {
          const firstGuildId = s.availableGuilds[0].id;
          setSelectedGuildIdState(firstGuildId);
          getSessionController().setSelectedGuildId(firstGuildId);
        }
      }
      if (s.availableChannels) {
        setChannels(s.availableChannels);
      }
    }
  }, [selectedGuildId]);

  useEffect(() => {
    fetchStatus();
    pollTimerRef.current = setInterval(fetchStatus, 3000);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [fetchStatus]);

  // When selectedGuildId changes, reload channels immediately
  useEffect(() => {
    if (selectedGuildId) {
      DiscordClient.getVoiceChannels(selectedGuildId).then((ch) => {
        setChannels(ch);
      });
      DiscordClient.getStatus(selectedGuildId).then((st) => {
        if (st) setStatus(st);
      });
    }
  }, [selectedGuildId]);

  // Connect to voice channel in selected guild
  const connectVoice = useCallback(
    async (channelId: string, guildIdOverride?: string) => {
      const targetGuild = guildIdOverride || selectedGuildId || undefined;
      setIsConnecting(true);
      const res = await DiscordClient.connect(channelId, targetGuild);
      setIsConnecting(false);
      await fetchStatus();
      return res;
    },
    [selectedGuildId, fetchStatus]
  );

  // Disconnect from voice channel in selected guild
  const disconnectVoice = useCallback(async () => {
    const res = await DiscordClient.disconnect(selectedGuildId || undefined);
    await fetchStatus();
    return res;
  }, [selectedGuildId, fetchStatus]);

  // Play test tone in selected guild
  const playTestTone = useCallback(async () => {
    return DiscordClient.playTestTone(selectedGuildId || undefined);
  }, [selectedGuildId]);

  // Upload/Sync IndexedDB audio assets to Discord bot service
  const syncCustomAssets = useCallback(async (assets: AudioAsset[]) => {
    const customAssets = assets.filter((a) => a.isCustom && !a.fileUrl?.startsWith('procedural:'));
    if (customAssets.length === 0) return { synced: 0, total: 0 };

    setSyncProgress({ syncing: true, done: 0, total: customAssets.length });
    let count = 0;

    for (const asset of customAssets) {
      try {
        const blob = await AudioFileStorage.getAudioBlob(asset.id);
        if (blob) {
          await DiscordClient.uploadAsset(asset.id, asset.name, blob);
          count++;
        }
      } catch (err) {
        console.warn(`Failed to sync asset ${asset.name}:`, err);
      }
      setSyncProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : null));
    }

    setSyncProgress(null);
    return { synced: count, total: customAssets.length };
  }, []);

  return {
    outputTarget,
    setOutputTarget,
    selectedGuildId,
    setSelectedGuildId,
    guilds,
    channels,
    status,
    isConnecting,
    syncProgress,
    connectVoice,
    disconnectVoice,
    playTestTone,
    syncCustomAssets,
    refreshStatus: fetchStatus,
  };
}
