'use client';

import React, { useState } from 'react';
import {
  Compass,
  ArrowRight,
  Layers,
  Check,
  Plus,
  Edit3,
  Trash2,
  Search,
  Star,
  Tag,
} from 'lucide-react';
import { Scene } from '@/types/audio';
import { SceneCategory } from '@/types/campaign';
import { useTabletop } from '@/context/TabletopContext';
import { useAudioEngine } from '@/lib/hooks/useAudioEngine';
import { useSession } from '@/lib/session/useSession';

const CATEGORIES: ('ALL' | SceneCategory)[] = [
  'ALL',
  'Exploration',
  'Combat',
  'Boss',
  'Town',
  'Dungeon',
  'Mystery',
  'Travel',
  'Cutscene',
];

export const SceneList: React.FC = () => {
  const {
    scenes,
    activeScene,
    setActiveScene,
    openSceneEditor,
    deleteScene,
    toggleSceneFavorite,
    assets,
  } = useTabletop();
  const { playAsset } = useAudioEngine();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | SceneCategory>('ALL');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // Filter scenes within the active campaign
  const filteredScenes = scenes.filter((scene) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      scene.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scene.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'ALL' || scene.category === selectedCategory;

    const matchesFavorite = !favoritesOnly || Boolean(scene.isFavorite);

    return matchesSearch && matchesCategory && matchesFavorite;
  });

  const { startScene } = useSession();

  const handleTransitionToScene = async (targetScene: Scene) => {
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

  const handleDelete = (scene: Scene) => {
    if (confirm(`Delete "${scene.name}"?\n\nThis removes the scene from this campaign.`)) {
      deleteScene(scene.id);
    }
  };

  return (
    <section className="bg-[#131720] border border-[#232936] rounded-xl p-5 shadow-lg space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold tracking-wider uppercase text-neutral-300 flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-400" />
            <span>Campaign Scenes & Encounters</span>
          </h2>
          <p className="text-[11px] text-neutral-500">
            Organize multi-track cinematic scenes for this campaign ({scenes.length} scenes)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search scenes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#171b25] border border-[#262e3d] rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-hidden focus:border-amber-500/70 w-44 md:w-52"
            />
          </div>

          {/* Favorites Only Toggle */}
          <button
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              favoritesOnly
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs'
                : 'bg-[#181d28] text-neutral-400 border-[#262e3d] hover:text-white'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${favoritesOnly ? 'fill-amber-400 text-amber-400' : ''}`} />
            <span>Favorites</span>
          </button>

          {/* Create Scene Button */}
          <button
            onClick={() => openSceneEditor()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold text-xs uppercase tracking-wider rounded-lg shadow transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Scene</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap items-center gap-1 bg-[#171b24] p-1 rounded-lg border border-[#242b3b] w-fit">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold tracking-wider uppercase transition cursor-pointer ${
              selectedCategory === cat
                ? 'bg-amber-600 text-neutral-950 shadow'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Scenes Grid or Empty State */}
      {scenes.length === 0 ? (
        <div className="py-12 text-center border-2 border-dashed border-[#242d3d] rounded-xl bg-[#141924] space-y-3">
          <p className="text-sm font-bold text-neutral-300 uppercase tracking-wider">
            No Scenes in this Campaign Yet
          </p>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Create your first scene and build its audio layers to accompany exploration, battles, or tavern visits.
          </p>
          <button
            onClick={() => openSceneEditor()}
            className="mt-2 px-5 py-2 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold text-xs uppercase tracking-wider rounded-lg shadow transition cursor-pointer"
          >
            + Create First Scene
          </button>
        </div>
      ) : filteredScenes.length === 0 ? (
        <div className="py-10 text-center border border-dashed border-[#232b3b] rounded-xl bg-[#141822]">
          <p className="text-xs text-neutral-400">NO MATCHING SCENES</p>
          <p className="text-[11px] text-neutral-500 mt-1">
            Try adjusting your search query or category filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredScenes.map((scene) => {
            const isActive = scene.id === activeScene?.id;

            return (
              <div
                key={scene.id}
                className={`p-4 rounded-lg border flex flex-col justify-between transition ${
                  isActive
                    ? 'bg-[#18202d] border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                    : 'bg-[#151922] border-[#222733] hover:border-[#353d50]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleSceneFavorite(scene.id)}
                        className="text-neutral-500 hover:text-amber-400 transition cursor-pointer"
                        title={scene.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            scene.isFavorite ? 'fill-amber-400 text-amber-400' : ''
                          }`}
                        />
                      </button>

                      <h3 className="font-bold text-sm text-neutral-200 truncate max-w-[160px]">
                        {scene.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {scene.category && (
                        <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-[#1e2535] text-amber-300 border border-[#2b354b]">
                          {scene.category}
                        </span>
                      )}

                      {isActive && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          <Check className="w-3 h-3" /> ACTIVE
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-neutral-400 line-clamp-2 mb-3">
                    {scene.description || 'No description provided.'}
                  </p>

                  <div className="flex items-center gap-2 text-[11px] text-neutral-500 mb-4">
                    <Layers className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{scene.layers.length} Layers</span>
                    <span>•</span>
                    <span className="capitalize truncate max-w-[150px]">
                      {scene.layers.map((l) => l.channel).join(', ')}
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-[#232936]">
                  <button
                    onClick={() => openSceneEditor(scene)}
                    className="p-1.5 text-neutral-400 hover:text-white bg-[#1a202c] hover:bg-[#252d3d] border border-[#2b3548] rounded transition cursor-pointer"
                    title="Edit Scene in Scene Builder"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(scene)}
                    className="p-1.5 text-neutral-500 hover:text-red-400 bg-[#1a202c] hover:bg-red-950/40 border border-[#2b3548] rounded transition cursor-pointer"
                    title="Delete Scene"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleTransitionToScene(scene)}
                    className="flex-1 py-1.5 px-3 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 rounded text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer ml-auto"
                    title="Crossfade immediately into this scene"
                  >
                    <span>Transition</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
