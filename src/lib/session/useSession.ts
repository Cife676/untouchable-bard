'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSessionController } from './sessionController';
import { LiveSessionState, SessionCommand } from './sessionTypes';
import { SessionCommands } from './sessionCommands';
import { useTabletop } from '@/context/TabletopContext';
import { ChannelId } from '@/types/audio';
import { useAudioEngine } from '@/lib/hooks/useAudioEngine';

export function useSession() {
  const controller = getSessionController();
  const { scenes, assets } = useTabletop();
  const { snapshot } = useAudioEngine();

  const [state, setState] = useState<LiveSessionState>(() => controller.getState());

  // Keep controller updated with current campaign scenes and assets
  useEffect(() => {
    controller.updateContextData(scenes, assets);
  }, [scenes, assets, controller]);

  // Subscribe to live session state mutations
  useEffect(() => {
    const unsubscribe = controller.subscribe((newState) => {
      setState(newState);
    });
    return () => unsubscribe();
  }, [controller]);

  const dispatch = useCallback(
    (command: SessionCommand) => {
      return controller.dispatch(command);
    },
    [controller]
  );

  const toggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return;

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        controller.setFullscreen(true);
      }).catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          controller.setFullscreen(false);
        });
      }
    }
  }, [controller]);

  // Listen to fullscreen changes from Esc or browser controls
  useEffect(() => {
    const handleFullscreenChange = () => {
      controller.setFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [controller]);

  return {
    state,
    engineSnapshot: snapshot,
    dispatch,
    startScene: useCallback(
      (sceneId: string, crossfade?: number) => dispatch(SessionCommands.startScene(sceneId, crossfade)),
      [dispatch]
    ),
    stopScene: useCallback(
      (fadeDuration?: number) => dispatch(SessionCommands.stopScene(fadeDuration)),
      [dispatch]
    ),
    pauseScene: useCallback(() => dispatch(SessionCommands.pauseScene()), [dispatch]),
    resumeScene: useCallback(() => dispatch(SessionCommands.resumeScene()), [dispatch]),
    triggerSfx: useCallback(
      (assetId: string, volume?: number) => dispatch(SessionCommands.triggerSfx(assetId, volume)),
      [dispatch]
    ),
    setChannelVolume: useCallback(
      (channel: ChannelId, volume: number) => dispatch(SessionCommands.setChannelVolume(channel, volume)),
      [dispatch]
    ),
    toggleChannelMute: useCallback(
      (channel: ChannelId) => dispatch(SessionCommands.toggleChannelMute(channel)),
      [dispatch]
    ),
    setMasterVolume: useCallback(
      (volume: number) => dispatch(SessionCommands.setMasterVolume(volume)),
      [dispatch]
    ),
    toggleMasterMute: useCallback(
      () => dispatch(SessionCommands.setMasterMute(!snapshot.isMasterMuted)),
      [dispatch, snapshot.isMasterMuted]
    ),
    stopAll: useCallback(
      (fadeDuration?: number) => dispatch(SessionCommands.stopAll(fadeDuration)),
      [dispatch]
    ),
    setLayerVolume: useCallback(
      (layerId: string, volume: number) => dispatch(SessionCommands.setLayerVolume(layerId, volume)),
      [dispatch]
    ),
    toggleLayerMute: useCallback(
      (layerId: string) => dispatch(SessionCommands.toggleLayerMute(layerId)),
      [dispatch]
    ),
    setCrossfade: useCallback(
      (duration: number) => dispatch(SessionCommands.setCrossfade(duration)),
      [dispatch]
    ),
    setOutputTarget: useCallback(
      (target: import('./sessionController').OutputTarget) => controller.setOutputTarget(target),
      [controller]
    ),
    outputTarget: controller.getOutputTarget(),
    setSelectedGuildId: useCallback(
      (guildId: string | null) => controller.setSelectedGuildId(guildId),
      [controller]
    ),
    selectedGuildId: controller.getSelectedGuildId(),
    toggleFullscreen,
  };
}
