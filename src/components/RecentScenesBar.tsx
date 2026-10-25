'use client';

import React from 'react';
import { History, Star, Play, Sparkles } from 'lucide-react';
import { useTabletop } from '@/context/TabletopContext';
import { useAudioEngine } from '@/lib/hooks/useAudioEngine';
import { Scene } from '@/types/audio';

import { useSession } from '@/lib/session/useSession';

export const RecentScenesBar: React.FC = () => {
  const { recentScenes, scenes, activeScene, setActiveScene, assets } = useTabletop();
  const { playAsset } = useAudioEngine();
  const { startScene } = useSession();

  // Map recent IDs to actual scene objects within current campaign
  const recentSceneObjects = recentScenes
    .map((r) => scenes.find((s) => s.id === r.sceneId))
    .filter((s): s is Scene => Boolean(s));

  // Also collect favorite scenes
  const favoriteScenes = scenes.filter((s) => s.isFavorite);

  if (recentSceneObjects.length === 0 && favoriteScenes.length === 0) {
    return null;
  }

  const handleQuickTransition = async (targetScene: Scene) => {
    setActiveScene(targetScene);
    startScene(targetScene.id);

    for (const layer of targetScene.layers) {
      const asset = assets.find((a) => a.id === layer.assetId);
      if (asset) {
        await playAsset(
          layer.channel,
          layer.assetId,
          asset.fileUrl,
          {
            volume: layer.volume,
            loop: layer.loop,
            fadeDuration: layer.fadeDuration ?? 1.5,
          },
          layer.name
        );
      }
    }
  };

  return (
    <div className="bg-[#121620] border border-[#232a39] rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex flex-wrap items-center gap-4">
        {/* Recent Scenes Section */}
        {recentSceneObjects.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-neutral-500 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
              <History className="w-3 h-3 text-neutral-400" />
              <span>RECENT:</span>
            </span>

            <div className="flex flex-wrap items-center gap-1.5">
              {recentSceneObjects.slice(0, 4).map((scene) => {
                const isActive = scene.id === activeScene?.id;

                return (
                  <button
                    key={scene.id}
                    onClick={() => handleQuickTransition(scene)}
                    className={`px-2.5 py-1 rounded text-xs transition cursor-pointer flex items-center gap-1 ${
                      isActive
                        ? 'bg-amber-600 text-neutral-950 font-bold shadow'
                        : 'bg-[#181e2b] hover:bg-[#202737] text-neutral-300 border border-[#252f40]'
                    }`}
                  >
                    <span>{scene.name}</span>
                    {scene.isFavorite && <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Favorites Quick Pills */}
        {favoriteScenes.length > 0 && (
          <div className="flex items-center gap-2 border-l border-[#232b3b] pl-4">
            <span className="text-neutral-500 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>FAVORITES:</span>
            </span>

            <div className="flex flex-wrap items-center gap-1.5">
              {favoriteScenes.slice(0, 4).map((scene) => {
                const isActive = scene.id === activeScene?.id;

                return (
                  <button
                    key={scene.id}
                    onClick={() => handleQuickTransition(scene)}
                    className={`px-2.5 py-1 rounded text-xs transition cursor-pointer flex items-center gap-1 ${
                      isActive
                        ? 'bg-amber-600 text-neutral-950 font-bold shadow'
                        : 'bg-[#181e2b] hover:bg-[#202737] text-amber-200 border border-amber-500/30'
                    }`}
                  >
                    <span>{scene.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <span className="text-[10px] text-neutral-500 hidden lg:inline">
        Click to quick-crossfade into scene
      </span>
    </div>
  );
};
