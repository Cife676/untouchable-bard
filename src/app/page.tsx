'use client';

import React, { useState } from 'react';
import { Radio, Play } from 'lucide-react';
import { TabletopProvider, useTabletop } from '@/context/TabletopContext';
import { Header } from '@/components/Header';
import { CampaignSelector } from '@/components/CampaignSelector';
import { RecentScenesBar } from '@/components/RecentScenesBar';
import { ChannelStrip } from '@/components/ChannelStrip';
import { CurrentScene } from '@/components/CurrentScene';
import { QuickSfx } from '@/components/QuickSfx';
import { SceneList } from '@/components/SceneList';
import { AudioLibrary } from '@/components/AudioLibrary';
import { CampaignModal } from '@/components/CampaignModal';
import { SceneEditorModal } from '@/components/SceneEditorModal';
import { AssetEditModal } from '@/components/AssetEditModal';
import { AudioImportModal } from '@/components/AudioImportModal';
import { LiveSession } from '@/components/session/LiveSession';

function TabletopDashboard() {
  const { activeCampaign, activeScene, isHydrated } = useTabletop();
  const [isLiveSession, setIsLiveSession] = useState(false);

  // If in Live Session mode, render dedicated distraction-free GM console
  if (isLiveSession && activeCampaign) {
    return (
      <>
        <LiveSession
          campaign={activeCampaign}
          onExit={() => setIsLiveSession(false)}
        />
        <CampaignModal />
        <SceneEditorModal />
        <AssetEditModal />
        <AudioImportModal />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0e14] text-neutral-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Navigation & Master Audio Header */}
      <Header />

      {/* Main View: Either Campaign Selector or Active Campaign Console */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {!activeCampaign ? (
          <CampaignSelector />
        ) : (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Live GM Session Entry Banner */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-red-950/40 via-[#151c28] to-[#121622] p-4 md:p-5 rounded-xl border border-red-900/40 shadow-lg">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-lg bg-red-950/70 border border-red-800/80 text-red-400 shrink-0">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                    <span>LIVE GM SESSION MODE</span>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 font-mono">
                      Discord &amp; Web Audio
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Launch distraction-free tabletop cockpit with tactile SFX pads, scene crossfades, and Discord voice channel output.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsLiveSession(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-700 to-amber-700 hover:from-red-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-lg hover:shadow-red-700/25 transition transform active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Enter Live Session</span>
              </button>
            </div>

            {/* Quick Access Bar for Recent & Favorite Scenes */}
            <RecentScenesBar />

            {/* Core Channel Buses (Music, Ambience, Environment, SFX) */}
            <ChannelStrip />

            {/* Primary Operational Section: Active Scene & Quick Sound FX */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <CurrentScene scene={activeScene} />
              </div>

              <div className="space-y-6">
                <QuickSfx />
              </div>
            </div>

            {/* Campaign-Scoped Scenes List (Search, Categories, Favorites) */}
            <div className="space-y-6 pt-2">
              <SceneList />

              {/* Global Audio Library */}
              <AudioLibrary />
            </div>
          </div>
        )}
      </main>

      {/* Interactive Modals */}
      <CampaignModal />
      <SceneEditorModal />
      <AssetEditModal />
      <AudioImportModal />

      {/* Footer */}
      <footer className="border-t border-[#1a202c] py-4 px-6 text-center text-xs text-neutral-500 bg-[#0d1017]">
        Untouchable Bard • Phase 5: Discord Voice Integration &amp; Live GM Session Mode
      </footer>
    </div>
  );
}

export default function TabletopAudioControlPage() {
  return (
    <TabletopProvider>
      <TabletopDashboard />
    </TabletopProvider>
  );
}
