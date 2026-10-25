import { AudioAsset, Scene } from '@/types/audio';
import { Campaign, CampaignExportBackup } from '@/types/campaign';
import { SAMPLE_AUDIO_ASSETS, SAMPLE_CAMPAIGNS, SAMPLE_SCENES } from '@/data/sampleScenes';

const ASSETS_STORAGE_KEY = 'untouchable_bard_assets_v1';
const SCENES_STORAGE_KEY_V2 = 'untouchable_bard_scenes_v2';
const CAMPAIGNS_STORAGE_KEY_V2 = 'untouchable_bard_campaigns_v2';
const PREFS_STORAGE_KEY_V2 = 'untouchable_bard_prefs_v2';

// Legacy keys for migration
const LEGACY_SCENES_STORAGE_KEY = 'untouchable_bard_scenes_v1';
const LEGACY_PREFS_STORAGE_KEY = 'untouchable_bard_prefs_v1';

export interface UserPreferences {
  masterVolume?: number;
  isMasterMuted?: boolean;
  activeCampaignId?: string;
  activeSceneId?: string;
  recentScenes?: { campaignId: string; sceneId: string; timestamp: number }[];
}

export class PersistenceService {
  /**
   * Migrate Phase 2 data to Phase 3 schema if needed.
   * Preserves all existing custom scenes and audio files.
   */
  public static migrateIfNecessary(): void {
    if (typeof window === 'undefined') return;

    try {
      const hasV2Campaigns = localStorage.getItem(CAMPAIGNS_STORAGE_KEY_V2);
      if (!hasV2Campaigns) {
        // Check for legacy Phase 2 scenes
        const legacyScenesData = localStorage.getItem(LEGACY_SCENES_STORAGE_KEY);
        let migratedScenes: Scene[] = [];

        if (legacyScenesData) {
          const parsed = JSON.parse(legacyScenesData) as Scene[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            migratedScenes = parsed;
          }
        }

        if (migratedScenes.length === 0) {
          migratedScenes = [...SAMPLE_SCENES];
        }

        // Create default campaign containing the existing scenes
        const defaultCampaignId = 'campaign_crimson_moon';
        const defaultCampaign: Campaign = {
          id: defaultCampaignId,
          name: 'Curse of the Crimson Moon',
          description: 'Migrated from your tabletop session with all scenes preserved.',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          activeSceneId: migratedScenes[0]?.id,
          sceneIds: migratedScenes.map((s) => s.id),
          settings: { defaultMasterVolume: 0.8, autoFadeDuration: 1.5 },
        };

        // Attach campaignId to each scene
        const taggedScenes = migratedScenes.map((scene) => ({
          ...scene,
          campaignId: scene.campaignId || defaultCampaignId,
          category: scene.category || 'Exploration',
        }));

        localStorage.setItem(
          CAMPAIGNS_STORAGE_KEY_V2,
          JSON.stringify([defaultCampaign, ...SAMPLE_CAMPAIGNS.filter((c) => c.id !== defaultCampaignId)])
        );
        localStorage.setItem(SCENES_STORAGE_KEY_V2, JSON.stringify(taggedScenes));

        // Migrate preferences if any
        const legacyPrefsData = localStorage.getItem(LEGACY_PREFS_STORAGE_KEY);
        if (legacyPrefsData) {
          const legacyPrefs = JSON.parse(legacyPrefsData);
          localStorage.setItem(
            PREFS_STORAGE_KEY_V2,
            JSON.stringify({
              ...legacyPrefs,
              activeCampaignId: defaultCampaignId,
            })
          );
        }
      }
    } catch (err) {
      console.warn('Migration check failed:', err);
    }
  }

  /**
   * Load campaigns from localStorage
   */
  public static loadCampaigns(): Campaign[] {
    if (typeof window === 'undefined') return SAMPLE_CAMPAIGNS;

    this.migrateIfNecessary();

    try {
      const data = localStorage.getItem(CAMPAIGNS_STORAGE_KEY_V2);
      if (!data) return SAMPLE_CAMPAIGNS;
      const parsed = JSON.parse(data) as Campaign[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (err) {
      console.warn('Failed to load campaigns:', err);
    }
    return SAMPLE_CAMPAIGNS;
  }

  /**
   * Save campaigns to localStorage
   */
  public static saveCampaigns(campaigns: Campaign[]): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(CAMPAIGNS_STORAGE_KEY_V2, JSON.stringify(campaigns));
    } catch (err) {
      console.error('Failed to save campaigns:', err);
    }
  }

  /**
   * Load scenes, optionally filtered by campaignId for strict campaign isolation
   */
  public static loadScenes(campaignId?: string): Scene[] {
    if (typeof window === 'undefined') {
      return campaignId ? SAMPLE_SCENES.filter((s) => s.campaignId === campaignId) : SAMPLE_SCENES;
    }

    this.migrateIfNecessary();

    try {
      const data = localStorage.getItem(SCENES_STORAGE_KEY_V2);
      let allScenes = SAMPLE_SCENES;
      if (data) {
        const parsed = JSON.parse(data) as Scene[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          allScenes = parsed;
        }
      }

      if (campaignId) {
        return allScenes.filter((s) => s.campaignId === campaignId);
      }
      return allScenes;
    } catch (err) {
      console.warn('Failed to load scenes:', err);
    }
    return campaignId ? SAMPLE_SCENES.filter((s) => s.campaignId === campaignId) : SAMPLE_SCENES;
  }

  /**
   * Save scenes to localStorage
   */
  public static saveScenes(scenes: Scene[]): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(SCENES_STORAGE_KEY_V2, JSON.stringify(scenes));
    } catch (err) {
      console.error('Failed to save scenes:', err);
    }
  }

  /**
   * Load audio assets
   */
  public static loadAssets(): AudioAsset[] {
    if (typeof window === 'undefined') return SAMPLE_AUDIO_ASSETS;

    try {
      const data = localStorage.getItem(ASSETS_STORAGE_KEY);
      if (!data) return SAMPLE_AUDIO_ASSETS;
      const parsed = JSON.parse(data) as AudioAsset[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (err) {
      console.warn('Failed to load assets from localStorage:', err);
    }
    return SAMPLE_AUDIO_ASSETS;
  }

  /**
   * Save audio assets
   */
  public static saveAssets(assets: AudioAsset[]): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify(assets));
    } catch (err) {
      console.error('Failed to save assets:', err);
    }
  }

  /**
   * Load user preferences
   */
  public static loadPreferences(): UserPreferences {
    if (typeof window === 'undefined') return {};

    try {
      const data = localStorage.getItem(PREFS_STORAGE_KEY_V2);
      if (data) {
        return JSON.parse(data);
      }
      // Check legacy prefs if v2 does not exist yet
      const legacyData = localStorage.getItem(LEGACY_PREFS_STORAGE_KEY);
      if (legacyData) {
        return JSON.parse(legacyData);
      }
    } catch (err) {
      console.warn('Failed to load preferences:', err);
    }
    return {};
  }

  /**
   * Save user preferences
   */
  public static savePreferences(prefs: Partial<UserPreferences>): void {
    if (typeof window === 'undefined') return;

    try {
      const current = this.loadPreferences();
      localStorage.setItem(PREFS_STORAGE_KEY_V2, JSON.stringify({ ...current, ...prefs }));
    } catch (err) {
      console.error('Failed to save preferences:', err);
    }
  }

  /**
   * Export a campaign along with its scenes and asset metadata into a portable JSON backup
   */
  public static exportCampaignBackup(
    campaign: Campaign,
    campaignScenes: Scene[],
    allAssets: AudioAsset[]
  ): string {
    const referencedAssetIds = new Set<string>();
    campaignScenes.forEach((scene) => {
      scene.layers.forEach((layer) => referencedAssetIds.add(layer.assetId));
      scene.quickTriggers?.forEach((trig) => referencedAssetIds.add(trig.assetId));
    });

    const referencedAssets = allAssets.filter((a) => referencedAssetIds.has(a.id));

    const backup: CampaignExportBackup = {
      schemaVersion: 2,
      exportedAt: Date.now(),
      campaign,
      scenes: campaignScenes,
      referencedAssets: referencedAssets.map((a) => (a.isCustom ? { ...a, fileUrl: '' } : a)),
    };

    return JSON.stringify(backup, null, 2);
  }

  /**
   * Reset all data back to factory defaults
   */
  public static resetDefaults(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(CAMPAIGNS_STORAGE_KEY_V2);
      localStorage.removeItem(SCENES_STORAGE_KEY_V2);
      localStorage.removeItem(ASSETS_STORAGE_KEY);
      localStorage.removeItem(PREFS_STORAGE_KEY_V2);
      localStorage.removeItem(LEGACY_SCENES_STORAGE_KEY);
      localStorage.removeItem(LEGACY_PREFS_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}
