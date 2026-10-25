import { Campaign, CampaignExportBackup } from '@/types/campaign';
import { Scene, AudioAsset } from '@/types/audio';

export class CampaignManager {
  /**
   * Instantiate a new blank campaign
   */
  public static createNewCampaign(name: string, description: string = ''): Campaign {
    const id = `campaign_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    return {
      id,
      name: name.trim() || 'Untitled Campaign',
      description: description.trim() || 'A new tabletop adventure campaign.',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sceneIds: [],
      settings: {
        defaultMasterVolume: 0.8,
        autoFadeDuration: 1.5,
      },
    };
  }

  /**
   * Duplicate a campaign and all of its associated scenes with new IDs
   */
  public static duplicateCampaign(
    sourceCampaign: Campaign,
    allScenes: Scene[]
  ): { newCampaign: Campaign; duplicatedScenes: Scene[] } {
    const newCampaignId = `campaign_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const sourceScenes = allScenes.filter((s) => s.campaignId === sourceCampaign.id);

    // Map old scene IDs to new scene IDs
    const duplicatedScenes: Scene[] = sourceScenes.map((scene) => {
      const newSceneId = `scene_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      return {
        ...JSON.parse(JSON.stringify(scene)),
        id: newSceneId,
        campaignId: newCampaignId,
        name: `${scene.name} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isCustom: true,
      };
    });

    const newCampaign: Campaign = {
      ...JSON.parse(JSON.stringify(sourceCampaign)),
      id: newCampaignId,
      name: `${sourceCampaign.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sceneIds: duplicatedScenes.map((s) => s.id),
      activeSceneId: duplicatedScenes[0]?.id,
    };

    return { newCampaign, duplicatedScenes };
  }

  /**
   * Check if an audio asset is referenced in any scene
   */
  public static checkAssetUsage(
    assetId: string,
    scenes: Scene[]
  ): { isUsed: boolean; sceneNames: string[] } {
    const referencingScenes = scenes.filter((scene) => {
      const inLayers = scene.layers.some((l) => l.assetId === assetId);
      const inTriggers = scene.quickTriggers?.some((t) => t.assetId === assetId);
      return inLayers || inTriggers;
    });

    return {
      isUsed: referencingScenes.length > 0,
      sceneNames: referencingScenes.map((s) => s.name),
    };
  }

  /**
   * Validate and parse a campaign JSON backup
   */
  public static parseBackupJson(jsonString: string): CampaignExportBackup {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid JSON format');
    }
    if (!parsed.campaign || !parsed.campaign.id || !parsed.campaign.name) {
      throw new Error('Backup is missing essential campaign data');
    }
    if (!Array.isArray(parsed.scenes)) {
      throw new Error('Backup is missing scenes array');
    }

    return parsed as CampaignExportBackup;
  }
}
