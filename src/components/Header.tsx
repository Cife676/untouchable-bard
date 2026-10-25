'use client';

import React, { useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Square,
  Shield,
  RotateCcw,
  ArrowLeft,
  Download,
  Settings,
  BookOpen,
} from 'lucide-react';
import { useAudioEngine } from '@/lib/hooks/useAudioEngine';
import { useTabletop } from '@/context/TabletopContext';
import { PersistenceService } from '@/lib/storage/persistence';

import { useSession } from '@/lib/session/useSession';

export const Header: React.FC = () => {
  const { snapshot, setMasterVolume, toggleMasterMute, stopAll, initEngine } = useAudioEngine();
  const { setMasterVolume: setDiscordMasterVolume, toggleMasterMute: toggleDiscordMasterMute, stopAll: stopDiscordAll } = useSession();
  const {
    activeCampaign,
    leaveCampaign,
    openEditCampaignModal,
    exportActiveCampaign,
    resetAllData,
  } = useTabletop();

  // Restore saved volume preference on initial load
  useEffect(() => {
    const prefs = PersistenceService.loadPreferences();
    if (typeof prefs.masterVolume === 'number') {
      setMasterVolume(prefs.masterVolume);
      setDiscordMasterVolume(prefs.masterVolume);
    }
    if (typeof prefs.isMasterMuted === 'boolean') {
      if (prefs.isMasterMuted !== snapshot.isMasterMuted) {
        toggleMasterMute();
      }
    }
  }, []);

  const handleVolumeChange = (vol: number) => {
    setMasterVolume(vol);
    setDiscordMasterVolume(vol);
    PersistenceService.savePreferences({ masterVolume: vol });
  };

  const handleToggleMute = () => {
    toggleMasterMute();
    toggleDiscordMasterMute();
    PersistenceService.savePreferences({ isMasterMuted: !snapshot.isMasterMuted });
  };

  const handleResetData = async () => {
    if (
      confirm(
        'Reset all campaigns, custom scenes, imported audio files, and settings back to default presets?'
      )
    ) {
      stopAll(0.2);
      await resetAllData();
    }
  };

  return (
    <header className="border-b border-[#232936] bg-[#12151b] px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-md">
      {/* Brand & Campaign Navigation */}
      <div className="flex items-center gap-4">
        {activeCampaign && (
          <button
            onClick={leaveCampaign}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1a202c] hover:bg-[#252d3d] text-neutral-300 border border-[#2a3447] rounded-lg text-xs font-semibold transition cursor-pointer"
            title="Return to Campaign Selection"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Campaigns</span>
          </button>
        )}

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-wider text-amber-100">
                UNTOUCHABLE BARD
              </h1>
              {activeCampaign ? (
                <div className="flex items-center gap-1.5 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-amber-300 text-xs font-semibold">
                  <BookOpen className="w-3 h-3" />
                  <span className="truncate max-w-[180px] md:max-w-xs">{activeCampaign.name}</span>
                </div>
              ) : (
                <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                  Campaign Hub
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-400">
              {activeCampaign ? 'Cinematic Tabletop Session Console' : 'Campaign & Project Manager'}
            </p>
          </div>
        </div>
      </div>

      {/* Engine Status, Campaign Actions & Master Controls */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Campaign Action Buttons (when in active campaign) */}
        {activeCampaign && (
          <div className="hidden md:flex items-center gap-1.5 border-r border-[#232b3b] pr-3">
            <button
              onClick={() => openEditCampaignModal(activeCampaign)}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#1a202c] rounded transition cursor-pointer"
              title="Campaign Settings / Rename"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={exportActiveCampaign}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-neutral-300 hover:text-white bg-[#1a202c] hover:bg-[#252d3d] border border-[#2a3447] rounded transition cursor-pointer"
              title="Export this campaign as a portable JSON backup"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Export</span>
            </button>
          </div>
        )}

        {/* AudioContext Activation Banner */}
        {!snapshot.isInitialized && (
          <button
            onClick={initEngine}
            className="text-xs bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/50 px-3 py-1.5 rounded transition cursor-pointer"
          >
            Activate Web Audio
          </button>
        )}

        {/* Master Volume Controller */}
        <div className="flex items-center gap-2.5 bg-[#181c24] px-3 py-1.5 rounded-lg border border-[#262c3a]">
          <button
            onClick={handleToggleMute}
            className="text-neutral-400 hover:text-amber-400 transition"
            title={snapshot.isMasterMuted ? 'Unmute Master' : 'Mute Master'}
          >
            {snapshot.isMasterMuted ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          <div className="flex flex-col">
            <div className="flex justify-between items-center text-[10px] text-neutral-400 leading-none mb-1">
              <span>MASTER</span>
              <span className="font-mono">{Math.round(snapshot.masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={snapshot.isMasterMuted ? 0 : snapshot.masterVolume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-20 md:w-24 h-1.5 bg-[#2a3040] accent-amber-500 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Global Stop All */}
        <button
          onClick={() => {
            stopAll(1.0);
            stopDiscordAll(1.0);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-200 border border-red-800/50 rounded-lg text-xs font-semibold tracking-wide transition cursor-pointer"
          title="Fade out and stop all playing audio channels"
        >
          <Square className="w-3.5 h-3.5 fill-red-400" />
          <span className="hidden sm:inline">STOP ALL</span>
        </button>

        {/* Reset Defaults button */}
        <button
          onClick={handleResetData}
          className="p-1.5 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded transition cursor-pointer"
          title="Reset campaigns and scenes to factory defaults"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
