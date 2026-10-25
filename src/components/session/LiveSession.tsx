'use client';

import React from 'react';
import { Campaign } from '@/types/campaign';
import { useSessionKeyboard } from '@/lib/session/useSessionKeyboard';
import { LiveHeader } from './LiveHeader';
import { LiveDiscordPanel } from './LiveDiscordPanel';
import { LiveCurrentScene } from './LiveCurrentScene';
import { LiveChannelMixer } from './LiveChannelMixer';
import { LiveSfxPads } from './LiveSfxPads';
import { LiveSceneGrid } from './LiveSceneGrid';

interface LiveSessionProps {
  campaign: Campaign;
  onExit: () => void;
}

export const LiveSession: React.FC<LiveSessionProps> = ({ campaign, onExit }) => {
  // Activate global GM session keyboard shortcuts (Space, Esc, M, 1-9, Arrow keys)
  useSessionKeyboard(true);

  return (
    <div className="min-h-screen bg-[#090c12] text-neutral-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Header & Emergency Controls */}
      <LiveHeader campaign={campaign} onExit={onExit} />

      {/* Main Live GM Control Board */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-3 md:p-6 space-y-5">
        {/* Discord Voice Control & Output Selector Panel */}
        <LiveDiscordPanel />

        {/* Primary Hero: Active Scene with Crossfade & Temporary Live Layer Sliders */}
        <LiveCurrentScene />

        {/* Channel Bus Output Mixer (Music, Ambience, Environment, SFX, Master) */}
        <LiveChannelMixer />

        {/* Tactile SFX Trigger Pads */}
        <LiveSfxPads />

        {/* Rapid Scene Switching Grid */}
        <LiveSceneGrid />
      </main>

      {/* Footer Status */}
      <footer className="border-t border-[#1a2230] py-3 px-6 text-center text-[11px] text-neutral-500 bg-[#0d1118]">
        Untouchable Bard • Live Session Mode • Discord Voice &amp; Web Audio Multi-Bus Architecture
      </footer>
    </div>
  );
};
