'use client';

import React from 'react';
import { Zap, Volume2 } from 'lucide-react';
import { useSession } from '@/lib/session/useSession';
import { useTabletop } from '@/context/TabletopContext';

export const LiveSfxPads: React.FC = () => {
  const { state, triggerSfx } = useSession();
  const { assets } = useTabletop();

  const sfxAssets = assets.filter((a) => a.type === 'SFX');

  // Reverse mapping to find shortcut key for an asset
  const shortcutMap: Record<string, string> = {};
  Object.entries(state.sfxShortcuts).forEach(([key, assetId]) => {
    shortcutMap[assetId] = key;
  });

  return (
    <div className="bg-[#121620] border border-[#242e40] rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#212b3c]">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Tactile SFX Trigger Pads</span>
          </h3>
          <p className="text-[10px] text-neutral-500">
            One-shot cues trigger instantly over current scene background audio
          </p>
        </div>
        <span className="text-[10px] text-amber-400/80 font-mono">
          Keys [1] - [9]
        </span>
      </div>

      {sfxAssets.length === 0 ? (
        <div className="py-6 text-center text-xs text-neutral-500">
          No SFX assets found. Import or add audio files in the library to populate quick SFX pads.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {sfxAssets.map((asset) => {
            const hotkey = shortcutMap[asset.id];

            return (
              <button
                key={asset.id}
                onClick={() => triggerSfx(asset.id)}
                className="relative p-3 rounded-lg border border-[#2b3548] bg-[#161d29] hover:bg-[#20293a] hover:border-amber-500/50 active:scale-95 transition flex flex-col justify-between items-start min-h-[76px] group cursor-pointer text-left shadow-xs"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="p-1 rounded bg-[#20293a] text-amber-400 group-hover:text-amber-300">
                    <Volume2 className="w-3.5 h-3.5" />
                  </span>
                  {hotkey && (
                    <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-black font-mono bg-[#222b3b] text-amber-300 border border-[#313e54]">
                      {hotkey}
                    </span>
                  )}
                </div>

                <div className="w-full mt-2">
                  <div className="font-bold text-xs text-neutral-200 group-hover:text-white truncate">
                    {asset.name}
                  </div>
                  <div className="text-[9px] text-neutral-500 capitalize">
                    {asset.category || 'Sound FX'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
