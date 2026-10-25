'use client';

import React from 'react';
import {
  Shield,
  VolumeX,
  Volume2,
  Square,
  Maximize2,
  Minimize2,
  LogOut,
  Keyboard,
  Radio,
} from 'lucide-react';
import { useSession } from '@/lib/session/useSession';
import { Campaign } from '@/types/campaign';

interface LiveHeaderProps {
  campaign: Campaign;
  onExit: () => void;
}

export const LiveHeader: React.FC<LiveHeaderProps> = ({ campaign, onExit }) => {
  const { state, engineSnapshot, toggleMasterMute, stopAll, toggleFullscreen } = useSession();

  return (
    <header className="border-b border-[#232d3f] bg-[#0f131a] px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 shadow-xl">
      {/* Brand & Campaign */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm md:text-base font-bold tracking-wider text-amber-100 flex items-center gap-2">
              <span>UNTOUCHABLE BARD</span>
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-800/60 font-mono animate-pulse">
                <Radio className="w-3 h-3 text-red-400" />
                LIVE GM SESSION
              </span>
            </h1>
          </div>
          <p className="text-[11px] text-neutral-400 truncate max-w-[200px] md:max-w-md">
            Campaign: <span className="text-amber-300 font-semibold">{campaign.name}</span>
          </p>
        </div>
      </div>

      {/* Global Emergency Controls & Actions */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-2 text-neutral-400 hover:text-white bg-[#181e2b] hover:bg-[#222b3d] border border-[#2a364d] rounded-lg transition cursor-pointer"
          title={state.isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (F11)'}
          aria-label="Toggle Fullscreen"
        >
          {state.isFullscreen ? (
            <Minimize2 className="w-4 h-4 text-amber-400" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>

        {/* Emergency Mute All Button */}
        <button
          onClick={toggleMasterMute}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition cursor-pointer ${
            engineSnapshot.isMasterMuted
              ? 'bg-red-600 text-white border-red-500 animate-pulse'
              : 'bg-[#1a212f] hover:bg-[#232c3f] text-neutral-200 border-[#2b374c]'
          }`}
          title="Mute/Unmute master output (HotKey: M)"
        >
          {engineSnapshot.isMasterMuted ? (
            <>
              <VolumeX className="w-4 h-4 text-white" />
              <span>MUTED</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 text-neutral-400" />
              <span>MUTE ALL</span>
            </>
          )}
        </button>

        {/* Emergency Stop All Button */}
        <button
          onClick={() => stopAll(0.5)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-red-950/70 hover:bg-red-900 text-red-200 border border-red-800 rounded-lg text-xs font-bold uppercase tracking-wider shadow transition cursor-pointer"
          title="Fade out and stop all playing channels immediately (HotKey: Esc)"
        >
          <Square className="w-3.5 h-3.5 fill-red-400" />
          <span>STOP ALL</span>
        </button>

        {/* Exit Session Button */}
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#1b2230] hover:bg-[#242d40] text-neutral-300 hover:text-white border border-[#2d384e] rounded-lg text-xs font-semibold transition cursor-pointer ml-1"
          title="Return to standard campaign dashboard"
        >
          <LogOut className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Exit Session</span>
        </button>
      </div>
    </header>
  );
};
