'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { AudioAsset, AudioCategoryType, Scene, SceneLayer } from '@/types/audio';
import { Campaign, RecentSceneEntry } from '@/types/campaign';
import { SAMPLE_AUDIO_ASSETS, SAMPLE_CAMPAIGNS, SAMPLE_SCENES } from '@/data/sampleScenes';
import { PersistenceService } from '@/lib/storage/persistence';
import { AudioFileStorage } from '@/lib/storage/audioFileStorage';
import { CampaignManager } from '@/lib/campaign/campaignManager';

interface TabletopContextValue {
  isHydrated: boolean;

  // Campaigns
  campaigns: Campaign[];
  activeCampaign: Campaign | null;
  selectCampaign: (campaign: Campaign) => void;
  leaveCampaign: () => void;
  createCampaign: (name: string, description?: string) => Campaign;
  updateCampaign: (campaignId: string, updates: Partial<Campaign>) => void;
  duplicateCampaign: (campaignId: string) => void;
  deleteCampaign: (campaignId: string) => void;
  exportActiveCampaign: () => void;
  importCampaignBackup: (jsonString: string) => boolean;

  // Scenes (strictly isolated to activeCampaign)
  scenes: Scene[];
  allScenes: Scene[];
  activeScene: Scene | null;
  setActiveScene: (scene: Scene) => void;
  openSceneEditor: (sceneToEdit?: Scene) => void;
  closeSceneEditor: () => void;
  editingScene: Scene | null;
  saveScene: (scene: Scene) => void;
  deleteScene: (sceneId: string) => void;
  toggleSceneFavorite: (sceneId: string) => void;
  recentScenes: RecentSceneEntry[];

  // Audio Assets (global library)
  assets: AudioAsset[];
  importAudioFiles: (
    files: FileList | File[],
    defaultCategory?: string,
    defaultType?: AudioCategoryType
  ) => Promise<AudioAsset[]>;
  updateAsset: (assetId: string, updates: Partial<AudioAsset>) => void;
  deleteAsset: (assetId: string) => Promise<void>;

  // Modals & Dialogs
  editingAsset: AudioAsset | null;
  openAssetEditor: (asset: AudioAsset) => void;
  closeAssetEditor: () => void;
  isImportModalOpen: boolean;
  openImportModal: () => void;
  closeImportModal: () => void;
  campaignModalMode: 'create' | 'edit' | null;
  editingCampaignData: Campaign | null;
  openCreateCampaignModal: () => void;
  openEditCampaignModal: (campaign: Campaign) => void;
  closeCampaignModal: () => void;

  // Reset
  resetAllData: () => Promise<void>;
}

const TabletopContext = createContext<TabletopContextValue | null>(null);

export const TabletopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isHydrated, setIsHydrated] = useState(false);

  // Core Data
  const [campaigns, setCampaigns] = useState<Campaign[]>(SAMPLE_CAMPAIGNS);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [allScenes, setAllScenes] = useState<Scene[]>(SAMPLE_SCENES);
  const [activeScene, setActiveSceneState] = useState<Scene | null>(null);
  const [assets, setAssets] = useState<AudioAsset[]>(SAMPLE_AUDIO_ASSETS);
  const [recentScenes, setRecentScenes] = useState<RecentSceneEntry[]>([]);

  // Modals
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [editingAsset, setEditingAsset] = useState<AudioAsset | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [campaignModalMode, setCampaignModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingCampaignData, setEditingCampaignData] = useState<Campaign | null>(null);

  // Client-side hydration & migration
  useEffect(() => {
    async function hydrate() {
      // 1. Run migration from Phase 2 if needed
      PersistenceService.migrateIfNecessary();

      // 2. Load stored campaigns & scenes
      const storedCampaigns = PersistenceService.loadCampaigns();
      const storedScenes = PersistenceService.loadScenes();
      const storedAssets = PersistenceService.loadAssets();
      const prefs = PersistenceService.loadPreferences();

      // 3. Re-hydrate IndexedDB Blobs into valid live Object URLs for custom assets
      const restoredAssets = await Promise.all(
        storedAssets.map(async (asset) => {
          if (asset.isCustom) {
            const blob = await AudioFileStorage.getAudioBlob(asset.id);
            if (blob) {
              return {
                ...asset,
                fileUrl: URL.createObjectURL(blob),
              };
            }
          }
          return asset;
        })
      );

      setCampaigns(storedCampaigns);
      setAllScenes(storedScenes);
      setAssets(restoredAssets);

      // 4. Select active campaign
      let initialCampaign = storedCampaigns[0] ?? null;
      if (prefs.activeCampaignId) {
        const found = storedCampaigns.find((c) => c.id === prefs.activeCampaignId);
        if (found) initialCampaign = found;
      }
      setActiveCampaign(initialCampaign);

      // 5. Select active scene within that campaign
      if (initialCampaign) {
        const campaignScenes = storedScenes.filter((s) => s.campaignId === initialCampaign.id);
        let currentScene = campaignScenes[0] ?? null;
        if (initialCampaign.activeSceneId) {
          const matched = campaignScenes.find((s) => s.id === initialCampaign.activeSceneId);
          if (matched) currentScene = matched;
        }
        setActiveSceneState(currentScene);
      }

      // 6. Recent scenes
      if (prefs.recentScenes && initialCampaign) {
        const filtered = prefs.recentScenes
          .filter((r) => r.campaignId === initialCampaign.id)
          .map((r) => ({ sceneId: r.sceneId, timestamp: r.timestamp }));
        setRecentScenes(filtered);
      }

      setIsHydrated(true);
    }

    hydrate();
  }, []);

  // Compute scenes strictly belonging to the currently active campaign
  const scenes = useMemo(() => {
    if (!activeCampaign) return [];
    return allScenes.filter((s) => s.campaignId === activeCampaign.id);
  }, [allScenes, activeCampaign]);

  // Campaign Selection
  const selectCampaign = useCallback(
    (campaign: Campaign) => {
      setActiveCampaign(campaign);
      PersistenceService.savePreferences({ activeCampaignId: campaign.id });

      const campaignScenes = allScenes.filter((s) => s.campaignId === campaign.id);
      let nextActiveScene = campaignScenes[0] ?? null;
      if (campaign.activeSceneId) {
        const found = campaignScenes.find((s) => s.id === campaign.activeSceneId);
        if (found) nextActiveScene = found;
      }
      setActiveSceneState(nextActiveScene);

      // Load recent scenes for this campaign
      const prefs = PersistenceService.loadPreferences();
      if (prefs.recentScenes) {
        const filtered = prefs.recentScenes
          .filter((r) => r.campaignId === campaign.id)
          .map((r) => ({ sceneId: r.sceneId, timestamp: r.timestamp }));
        setRecentScenes(filtered);
      } else {
        setRecentScenes([]);
      }
    },
    [allScenes]
  );

  const leaveCampaign = useCallback(() => {
    setActiveCampaign(null);
    PersistenceService.savePreferences({ activeCampaignId: '' });
  }, []);

  // Create Campaign
  const createCampaign = useCallback((name: string, description: string = '') => {
    const newCamp = CampaignManager.createNewCampaign(name, description);
    setCampaigns((prev) => {
      const updated = [newCamp, ...prev];
      PersistenceService.saveCampaigns(updated);
      return updated;
    });
    setActiveCampaign(newCamp);
    setActiveSceneState(null);
    PersistenceService.savePreferences({ activeCampaignId: newCamp.id });
    return newCamp;
  }, []);

  // Update Campaign
  const updateCampaign = useCallback((campaignId: string, updates: Partial<Campaign>) => {
    setCampaigns((prev) => {
      const updated = prev.map((c) =>
        c.id === campaignId ? { ...c, ...updates, updatedAt: Date.now() } : c
      );
      PersistenceService.saveCampaigns(updated);
      return updated;
    });
    setActiveCampaign((prev) =>
      prev && prev.id === campaignId ? { ...prev, ...updates, updatedAt: Date.now() } : prev
    );
  }, []);

  // Duplicate Campaign
  const duplicateCampaign = useCallback(
    (campaignId: string) => {
      const source = campaigns.find((c) => c.id === campaignId);
      if (!source) return;

      const { newCampaign, duplicatedScenes } = CampaignManager.duplicateCampaign(source, allScenes);

      setCampaigns((prev) => {
        const updated = [newCampaign, ...prev];
        PersistenceService.saveCampaigns(updated);
        return updated;
      });

      setAllScenes((prev) => {
        const updated = [...prev, ...duplicatedScenes];
        PersistenceService.saveScenes(updated);
        return updated;
      });
    },
    [campaigns, allScenes]
  );

  // Delete Campaign
  const deleteCampaign = useCallback(
    (campaignId: string) => {
      const camp = campaigns.find((c) => c.id === campaignId);
      if (!camp) return;

      setCampaigns((prev) => {
        const updated = prev.filter((c) => c.id !== campaignId);
        PersistenceService.saveCampaigns(updated);
        return updated;
      });

      // Remove scenes belonging to this campaign
      setAllScenes((prev) => {
        const updated = prev.filter((s) => s.campaignId !== campaignId);
        PersistenceService.saveScenes(updated);
        return updated;
      });

      if (activeCampaign?.id === campaignId) {
        const remaining = campaigns.filter((c) => c.id !== campaignId);
        if (remaining.length > 0) {
          selectCampaign(remaining[0]);
        } else {
          setActiveCampaign(null);
          setActiveSceneState(null);
        }
      }
    },
    [campaigns, activeCampaign, selectCampaign]
  );

  // Export Active Campaign
  const exportActiveCampaign = useCallback(() => {
    if (!activeCampaign) return;
    const jsonString = PersistenceService.exportCampaignBackup(activeCampaign, scenes, assets);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeCampaign.name.replace(/[^a-z0-9_-]/gi, '_')}_backup.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [activeCampaign, scenes, assets]);

  // Import Campaign Backup
  const importCampaignBackup = useCallback(
    (jsonString: string): boolean => {
      try {
        const backup = CampaignManager.parseBackupJson(jsonString);
        const importedCampaign: Campaign = {
          ...backup.campaign,
          id: `campaign_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: `${backup.campaign.name} (Restored)`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const importedScenes: Scene[] = backup.scenes.map((scene) => ({
          ...scene,
          campaignId: importedCampaign.id,
          id: `scene_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        }));

        importedCampaign.sceneIds = importedScenes.map((s) => s.id);
        importedCampaign.activeSceneId = importedScenes[0]?.id;

        setCampaigns((prev) => {
          const updated = [importedCampaign, ...prev];
          PersistenceService.saveCampaigns(updated);
          return updated;
        });

        setAllScenes((prev) => {
          const updated = [...prev, ...importedScenes];
          PersistenceService.saveScenes(updated);
          return updated;
        });

        selectCampaign(importedCampaign);
        return true;
      } catch (err) {
        console.error('Failed to import backup:', err);
        return false;
      }
    },
    [selectCampaign]
  );

  // Set Active Scene & record recent
  const setActiveScene = useCallback(
    (scene: Scene) => {
      setActiveSceneState(scene);

      if (activeCampaign) {
        updateCampaign(activeCampaign.id, { activeSceneId: scene.id });

        // Update recent scenes (max 5)
        setRecentScenes((prev) => {
          const filtered = prev.filter((r) => r.sceneId !== scene.id);
          const updated = [{ sceneId: scene.id, timestamp: Date.now() }, ...filtered].slice(0, 5);

          // Persist recent scenes
          const allPrefs = PersistenceService.loadPreferences();
          const existingRecents = allPrefs.recentScenes || [];
          const withoutThisCampaign = existingRecents.filter((r) => r.campaignId !== activeCampaign.id);
          const newEntries = updated.map((u) => ({
            campaignId: activeCampaign.id,
            sceneId: u.sceneId,
            timestamp: u.timestamp,
          }));
          PersistenceService.savePreferences({
            recentScenes: [...newEntries, ...withoutThisCampaign],
          });

          return updated;
        });
      }
    },
    [activeCampaign, updateCampaign]
  );

  // Toggle favorite on scene
  const toggleSceneFavorite = useCallback((sceneId: string) => {
    setAllScenes((prev) => {
      const updated = prev.map((s) =>
        s.id === sceneId ? { ...s, isFavorite: !s.isFavorite, updatedAt: Date.now() } : s
      );
      PersistenceService.saveScenes(updated);
      return updated;
    });
  }, []);

  // Open Scene Editor
  const openSceneEditor = useCallback(
    (sceneToEdit?: Scene) => {
      if (!activeCampaign) return;

      if (sceneToEdit) {
        setEditingScene(JSON.parse(JSON.stringify(sceneToEdit)));
      } else {
        const newScene: Scene = {
          id: `scene_custom_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          campaignId: activeCampaign.id,
          name: 'New Custom Scene',
          description: 'Configure atmospheric audio layers for this encounter.',
          category: 'Exploration',
          isCustom: true,
          isFavorite: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          layers: [
            {
              id: `layer_${Date.now()}_1`,
              assetId: assets[0]?.id ?? 'music_haunted_forest',
              channel: 'music',
              name: 'Primary Theme',
              volume: 0.6,
              loop: true,
              fadeDuration: 2.0,
            },
          ],
        };
        setEditingScene(newScene);
      }
    },
    [activeCampaign, assets]
  );

  const closeSceneEditor = useCallback(() => {
    setEditingScene(null);
  }, []);

  // Save Scene
  const saveScene = useCallback(
    (sceneToSave: Scene) => {
      if (!activeCampaign) return;

      const preparedScene: Scene = {
        ...sceneToSave,
        campaignId: activeCampaign.id,
        updatedAt: Date.now(),
      };

      setAllScenes((prev) => {
        const index = prev.findIndex((s) => s.id === preparedScene.id);
        let updated: Scene[];
        if (index >= 0) {
          updated = [...prev];
          updated[index] = preparedScene;
        } else {
          updated = [...prev, preparedScene];
        }
        PersistenceService.saveScenes(updated);
        return updated;
      });

      // Update campaign sceneIds if new
      if (!activeCampaign.sceneIds.includes(preparedScene.id)) {
        updateCampaign(activeCampaign.id, {
          sceneIds: [...activeCampaign.sceneIds, preparedScene.id],
        });
      }

      if (activeScene?.id === preparedScene.id) {
        setActiveSceneState(preparedScene);
      }
      setEditingScene(null);
    },
    [activeCampaign, activeScene, updateCampaign]
  );

  // Delete Scene
  const deleteScene = useCallback(
    (sceneId: string) => {
      setAllScenes((prev) => {
        const updated = prev.filter((s) => s.id !== sceneId);
        PersistenceService.saveScenes(updated);
        return updated;
      });

      if (activeCampaign) {
        updateCampaign(activeCampaign.id, {
          sceneIds: activeCampaign.sceneIds.filter((id) => id !== sceneId),
        });
      }

      if (activeScene?.id === sceneId) {
        const remaining = scenes.filter((s) => s.id !== sceneId);
        setActiveSceneState(remaining[0] ?? null);
      }
    },
    [activeCampaign, activeScene, scenes, updateCampaign]
  );

  // Audio Import
  const importAudioFiles = useCallback(
    async (
      files: FileList | File[],
      defaultCategory: string = 'Custom Foley',
      defaultType?: AudioCategoryType
    ): Promise<AudioAsset[]> => {
      const fileArray = Array.from(files);
      const newAssets: AudioAsset[] = [];

      for (const file of fileArray) {
        const extMatch = file.name.match(/\.(mp3|wav|ogg)$/i);
        if (!extMatch) continue;

        const assetId = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

        let type: AudioCategoryType = defaultType ?? 'SFX';
        let loopable = false;

        const lowerName = cleanName.toLowerCase();
        if (!defaultType) {
          if (lowerName.includes('theme') || lowerName.includes('music') || lowerName.includes('track')) {
            type = 'MUSIC';
            loopable = true;
          } else if (lowerName.includes('ambience') || lowerName.includes('wind') || lowerName.includes('forest')) {
            type = 'AMBIENCE';
            loopable = true;
          } else if (lowerName.includes('rain') || lowerName.includes('storm') || lowerName.includes('fire')) {
            type = 'ENVIRONMENT';
            loopable = true;
          } else {
            type = 'SFX';
            loopable = false;
          }
        } else {
          loopable = defaultType === 'MUSIC' || defaultType === 'AMBIENCE' || defaultType === 'ENVIRONMENT';
        }

        await AudioFileStorage.saveAudioBlob(assetId, file);
        const objectUrl = URL.createObjectURL(file);

        let duration: number | undefined;
        try {
          const tempAudio = new Audio(objectUrl);
          await new Promise<void>((resolve) => {
            tempAudio.onloadedmetadata = () => {
              if (isFinite(tempAudio.duration) && tempAudio.duration > 0) {
                duration = Math.round(tempAudio.duration * 10) / 10;
              }
              resolve();
            };
            tempAudio.onerror = () => resolve();
            setTimeout(resolve, 1500);
          });
        } catch {
          // Duration detection failure is non-fatal
        }

        const newAsset: AudioAsset = {
          id: assetId,
          name: cleanName,
          type,
          fileUrl: objectUrl,
          duration,
          loopable,
          category: defaultCategory,
          isCustom: true,
          fileName: file.name,
          fileBlobKey: assetId,
          description: `Imported file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
        };

        newAssets.push(newAsset);
      }

      setAssets((prev) => {
        const updated = [...prev, ...newAssets];
        const serializable = updated.map((a) => (a.isCustom ? { ...a, fileUrl: '' } : a));
        PersistenceService.saveAssets(serializable);
        return updated;
      });

      return newAssets;
    },
    []
  );

  const updateAsset = useCallback((assetId: string, updates: Partial<AudioAsset>) => {
    setAssets((prev) => {
      const updated = prev.map((asset) => (asset.id === assetId ? { ...asset, ...updates } : asset));
      const serializable = updated.map((a) => (a.isCustom ? { ...a, fileUrl: '' } : a));
      PersistenceService.saveAssets(serializable);
      return updated;
    });
  }, []);

  const deleteAsset = useCallback(
    async (assetId: string) => {
      // Check if asset is used in scenes
      const usage = CampaignManager.checkAssetUsage(assetId, allScenes);
      if (usage.isUsed) {
        const proceed = confirm(
          `Warning: This audio asset is currently referenced in the following scene(s):\n• ${usage.sceneNames.join(
            '\n• '
          )}\n\nDeleting this asset will leave those layers without audio. Are you sure you want to proceed?`
        );
        if (!proceed) return;
      }

      await AudioFileStorage.deleteAudioBlob(assetId);
      setAssets((prev) => {
        const updated = prev.filter((a) => a.id !== assetId);
        const serializable = updated.map((a) => (a.isCustom ? { ...a, fileUrl: '' } : a));
        PersistenceService.saveAssets(serializable);
        return updated;
      });
    },
    [allScenes]
  );

  // Modals management
  const openAssetEditor = useCallback((asset: AudioAsset) => setEditingAsset(asset), []);
  const closeAssetEditor = useCallback(() => setEditingAsset(null), []);
  const openImportModal = useCallback(() => setIsImportModalOpen(true), []);
  const closeImportModal = useCallback(() => setIsImportModalOpen(false), []);

  const openCreateCampaignModal = useCallback(() => {
    setEditingCampaignData(null);
    setCampaignModalMode('create');
  }, []);

  const openEditCampaignModal = useCallback((campaign: Campaign) => {
    setEditingCampaignData(campaign);
    setCampaignModalMode('edit');
  }, []);

  const closeCampaignModal = useCallback(() => {
    setCampaignModalMode(null);
    setEditingCampaignData(null);
  }, []);

  // Factory Reset
  const resetAllData = useCallback(async () => {
    PersistenceService.resetDefaults();
    await AudioFileStorage.clearAll();
    setCampaigns(SAMPLE_CAMPAIGNS);
    setAllScenes(SAMPLE_SCENES);
    setAssets(SAMPLE_AUDIO_ASSETS);
    setActiveCampaign(SAMPLE_CAMPAIGNS[0]);
    setActiveSceneState(SAMPLE_SCENES[0]);
    setRecentScenes([]);
  }, []);

  const value: TabletopContextValue = {
    isHydrated,
    campaigns,
    activeCampaign,
    selectCampaign,
    leaveCampaign,
    createCampaign,
    updateCampaign,
    duplicateCampaign,
    deleteCampaign,
    exportActiveCampaign,
    importCampaignBackup,

    scenes,
    allScenes,
    activeScene,
    setActiveScene,
    openSceneEditor,
    closeSceneEditor,
    editingScene,
    saveScene,
    deleteScene,
    toggleSceneFavorite,
    recentScenes,

    assets,
    importAudioFiles,
    updateAsset,
    deleteAsset,

    editingAsset,
    openAssetEditor,
    closeAssetEditor,
    isImportModalOpen,
    openImportModal,
    closeImportModal,

    campaignModalMode,
    editingCampaignData,
    openCreateCampaignModal,
    openEditCampaignModal,
    closeCampaignModal,

    resetAllData,
  };

  return <TabletopContext.Provider value={value}>{children}</TabletopContext.Provider>;
};

export function useTabletop() {
  const context = useContext(TabletopContext);
  if (!context) {
    throw new Error('useTabletop must be used within a TabletopProvider');
  }
  return context;
}
