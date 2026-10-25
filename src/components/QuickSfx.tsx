'use client';

import React, { useState } from 'react';
import { Zap, Sparkles } from 'lucide-react';
import { useTabletop } from '@/context/TabletopContext';
import { useAudioEngine } from '@/lib/hooks/useAudioEngine';

import { useSession } from '@/lib/session/useSession';

export const QuickSfx: React.FC = () => {
  const { assets } = useTabletop();
  const { playAsset } = useAudioEngine();
  const { triggerSfx: triggerDiscordSfx } = useSession();
  const [lastTriggered, setLastTriggered] = useState<string | null>(null);

  // Filter all assets categorized under 'SFX' (including custom imported ones)
  const sfxAssets = assets.filter((asset) => asset.type === 'SFX');

  const triggerSfx = async (assetId: string, assetUrl: string, name: string) => {
    setLastTriggered(name);
    // Forward to SessionController / Discord
    triggerDiscordSfx(assetId, 0.85);

    // Play in local Web Audio Engine
    await playAsset(
      'sfx',
      assetId,
      assetUrl,
      {
        volume: 0.85,
        loop: false,
        fadeDuration: 0,
      },
      name
    );

    setTimeout(() => {
      setLastTriggered((prev) => (prev === name ? null : prev));
    }, 1200);
  };

  return (
    <section className="bg-[#131720] border border-[#232936] rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-wider uppercase text-neutral-300 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Quick Sound Effects</span>
          </h2>
          <p className="text-[11px] text-neutral-500">
            One-shot instant cues that play over ambient beds without interruption ({sfxAssets.length} cues)
          </p>
        </div>

        {lastTriggered && (
          <span className="text-[11px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 animate-pulse">
            Triggered: {lastTriggered}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sfxAssets.map((asset) => (
          <button
            key={asset.id}
            onClick={() => triggerSfx(asset.id, asset.fileUrl, asset.name)}
            className="flex flex-col items-start p-3 bg-[#181d28] hover:bg-[#202737] active:bg-amber-600/30 border border-[#262f40] hover:border-amber-500/50 rounded-lg text-left transition transform active:scale-95 group cursor-pointer"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="font-semibold text-xs text-neutral-200 group-hover:text-amber-300 transition truncate max-w-[100px]">
                {asset.name}
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">
                {asset.duration ? `${asset.duration}s` : 'Cue'}
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 line-clamp-1 mb-2">
              {asset.description ?? asset.category}
            </p>
            <div className="w-full flex items-center justify-between text-[10px] text-neutral-500 pt-2 border-t border-[#222838]">
              <span className="uppercase tracking-widest text-[9px] truncate max-w-[70px]">
                {asset.category}
              </span>
              <span className="text-amber-400 group-hover:translate-x-0.5 transition font-bold text-[9px]">
                TRIGGER ▶
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};
