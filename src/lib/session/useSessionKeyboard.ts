'use client';

import { useEffect } from 'react';
import { useSession } from './useSession';
import { useTabletop } from '@/context/TabletopContext';

export function useSessionKeyboard(enabled: boolean = true) {
  const {
    state,
    startScene,
    pauseScene,
    resumeScene,
    stopAll,
    toggleMasterMute,
    triggerSfx,
  } = useSession();

  const { scenes, activeScene, setActiveScene } = useTabletop();

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Guard against typing inside input, textarea, or contentEditable elements
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // 2. Spacebar: Play / Pause toggle
      if (e.code === 'Space') {
        e.preventDefault();
        if (state.playbackState === 'playing') {
          pauseScene();
        } else if (state.playbackState === 'paused') {
          resumeScene();
        } else if (activeScene) {
          startScene(activeScene.id);
        }
        return;
      }

      // 3. Escape: Stop all audio
      if (e.key === 'Escape') {
        e.preventDefault();
        stopAll(0.5);
        return;
      }

      // 4. 'M' or 'm': Toggle master mute
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMasterMute();
        return;
      }

      // 5. '1' through '9': Trigger configured Quick SFX
      if (/^[1-9]$/.test(e.key)) {
        const assetId = state.sfxShortcuts[e.key];
        if (assetId) {
          e.preventDefault();
          triggerSfx(assetId);
        }
        return;
      }

      // 6. Arrow keys: Navigate through scenes in active campaign
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (scenes.length === 0) return;
        const currentIndex = scenes.findIndex((s) => s.id === activeScene?.id);
        const nextIndex = (currentIndex + 1) % scenes.length;
        const nextScene = scenes[nextIndex];
        setActiveScene(nextScene);
        startScene(nextScene.id);
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (scenes.length === 0) return;
        const currentIndex = scenes.findIndex((s) => s.id === activeScene?.id);
        const prevIndex = (currentIndex - 1 + scenes.length) % scenes.length;
        const prevScene = scenes[prevIndex];
        setActiveScene(prevScene);
        startScene(prevScene.id);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    enabled,
    state,
    scenes,
    activeScene,
    startScene,
    pauseScene,
    resumeScene,
    stopAll,
    toggleMasterMute,
    triggerSfx,
    setActiveScene,
  ]);
}
