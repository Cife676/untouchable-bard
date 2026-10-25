import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import { AudioSynthesizer } from './audioSynthesizer.js';

export interface StoredAssetMetadata {
  id: string;
  name: string;
  size: number;
  format: 'wav' | 'mp3' | 'ogg' | 'procedural' | 'unknown';
  updatedAt: number;
}

export class AssetStore {
  private dataDir: string;
  private pcmCache: Map<string, Buffer> = new Map();
  private metadataCache: Map<string, StoredAssetMetadata> = new Map();

  constructor(dataDir?: string) {
    this.dataDir = dataDir || path.resolve(process.cwd(), 'data', 'assets');
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    this.initProceduralAssets();
  }

  private sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  private initProceduralAssets(): void {
    // 1. Procedural sound base mappings
    const musicPad = AudioSynthesizer.createMusicPad();
    const windAmbience = AudioSynthesizer.createWindAmbience();
    const rainEnv = AudioSynthesizer.createRainEnvironment();
    const wolfHowl = AudioSynthesizer.createWolfHowl();
    const branchCrack = AudioSynthesizer.createBranchCrack();
    const thunder = AudioSynthesizer.createThunder();
    const testCue = AudioSynthesizer.createTestCue();

    // Procedural key aliases
    this.pcmCache.set('procedural:music_pad', musicPad);
    this.pcmCache.set('music_pad', musicPad);
    this.pcmCache.set('procedural:wind_ambience', windAmbience);
    this.pcmCache.set('wind_ambience', windAmbience);
    this.pcmCache.set('procedural:rain_environment', rainEnv);
    this.pcmCache.set('rain_environment', rainEnv);
    this.pcmCache.set('procedural:wolf_howl', wolfHowl);
    this.pcmCache.set('wolf_howl', wolfHowl);
    this.pcmCache.set('procedural:branch_crack', branchCrack);
    this.pcmCache.set('branch_crack', branchCrack);
    this.pcmCache.set('procedural:thunder', thunder);
    this.pcmCache.set('thunder', thunder);

    // 2. Direct Sample Scene Asset IDs (from sampleScenes.ts)
    // Music tracks
    this.pcmCache.set('music_haunted_forest', musicPad);
    this.pcmCache.set('music_combat', musicPad);

    // Ambience & Environment tracks
    this.pcmCache.set('ambience_night_forest', windAmbience);
    this.pcmCache.set('env_rain_leaves', rainEnv);

    // SFX one-shot cues
    this.pcmCache.set('sfx_wolf_howl', wolfHowl);
    this.pcmCache.set('sfx_branch_crack', branchCrack);
    this.pcmCache.set('sfx_thunder', thunder);

    // Test tone
    this.pcmCache.set('asset_test_cue', testCue);
    this.pcmCache.set('test_cue', testCue);

    console.log(`[AssetStore] Pre-cached ${this.pcmCache.size} procedural and sample asset mappings`);
  }

  /**
   * Detect file format from header bytes
   */
  public detectFormat(buffer: Buffer): 'wav' | 'mp3' | 'ogg' | 'unknown' {
    if (buffer.length < 12) return 'unknown';

    // WAV: "RIFF" .... "WAVE"
    if (
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x41 && buffer[10] === 0x56 && buffer[11] === 0x45
    ) {
      return 'wav';
    }

    // Ogg: "OggS"
    if (buffer[0] === 0x4f && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) {
      return 'ogg';
    }

    // MP3: ID3 tag or sync word 0xFF 0xFB / 0xFF 0xF3 / 0xFF 0xF2
    if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
      return 'mp3';
    }
    if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
      return 'mp3';
    }

    return 'unknown';
  }

  /**
   * Parse a standard 16-bit PCM WAV file into 48kHz stereo PCM buffer
   */
  private parseWavToPcm(wavBuffer: Buffer): Buffer | null {
    try {
      if (wavBuffer.length < 44) return null;

      // Find "fmt " chunk
      let fmtOffset = 12;
      while (fmtOffset < wavBuffer.length - 8) {
        const chunkId = wavBuffer.toString('ascii', fmtOffset, fmtOffset + 4);
        const chunkSize = wavBuffer.readUInt32LE(fmtOffset + 4);
        if (chunkId === 'fmt ') {
          break;
        }
        fmtOffset += 8 + chunkSize;
      }

      if (fmtOffset >= wavBuffer.length - 16) return null;

      const audioFormat = wavBuffer.readUInt16LE(fmtOffset + 8);
      const numChannels = wavBuffer.readUInt16LE(fmtOffset + 10);
      const sampleRate = wavBuffer.readUInt32LE(fmtOffset + 12);
      const bitsPerSample = wavBuffer.readUInt16LE(fmtOffset + 22);

      // Support uncompressed PCM (format 1)
      if (audioFormat !== 1 || (bitsPerSample !== 16 && bitsPerSample !== 24 && bitsPerSample !== 32)) {
        return null;
      }

      // Find "data" chunk
      let dataOffset = fmtOffset + 8 + wavBuffer.readUInt32LE(fmtOffset + 4);
      while (dataOffset < wavBuffer.length - 8) {
        const chunkId = wavBuffer.toString('ascii', dataOffset, dataOffset + 4);
        const chunkSize = wavBuffer.readUInt32LE(dataOffset + 4);
        if (chunkId === 'data') {
          break;
        }
        dataOffset += 8 + chunkSize;
      }

      if (dataOffset >= wavBuffer.length - 8) return null;

      const dataSize = wavBuffer.readUInt32LE(dataOffset + 4);
      const rawData = wavBuffer.subarray(dataOffset + 8, dataOffset + 8 + dataSize);

      // Resample / convert to 48,000 Hz 16-bit signed stereo
      const targetSampleRate = 48000;
      const bytesPerSourceSample = bitsPerSample / 8;
      const sourceFrames = Math.floor(rawData.length / (numChannels * bytesPerSourceSample));
      const targetFrames = Math.floor((sourceFrames * targetSampleRate) / sampleRate);

      const outBuffer = Buffer.alloc(targetFrames * 4); // 2 channels * 2 bytes

      for (let t = 0; t < targetFrames; t++) {
        const sourceIndex = (t * sampleRate) / targetSampleRate;
        const indexInt = Math.floor(sourceIndex);
        const frac = sourceIndex - indexInt;

        if (indexInt + 1 < sourceFrames) {
          // Read sample 1
          const frameOffset1 = indexInt * numChannels * bytesPerSourceSample;
          const frameOffset2 = (indexInt + 1) * numChannels * bytesPerSourceSample;

          let sL1 = 0;
          let sR1 = 0;
          let sL2 = 0;
          let sR2 = 0;

          if (bitsPerSample === 16) {
            sL1 = rawData.readInt16LE(frameOffset1) / 32768;
            sR1 = numChannels > 1 ? rawData.readInt16LE(frameOffset1 + 2) / 32768 : sL1;
            sL2 = rawData.readInt16LE(frameOffset2) / 32768;
            sR2 = numChannels > 1 ? rawData.readInt16LE(frameOffset2 + 2) / 32768 : sL2;
          }

          const interpL = sL1 + (sL2 - sL1) * frac;
          const interpR = sR1 + (sR2 - sR1) * frac;

          outBuffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, interpL)) * 32767), t * 4);
          outBuffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, interpR)) * 32767), t * 4 + 2);
        }
      }

      return outBuffer;
    } catch {
      return null;
    }
  }

  /**
   * Transcode arbitrary audio file (MP3, OGG, WAV, etc.) to 48,000 Hz, stereo, 16-bit signed LE PCM
   */
  public async transcodeFileToPcm(filePath: string): Promise<Buffer | null> {
    const ffmpegPath = ffmpegStatic as string | null;
    if (!ffmpegPath || !fs.existsSync(filePath)) {
      return null;
    }

    return new Promise((resolve) => {
      try {
        const proc = spawn(ffmpegPath, [
          '-v', 'error',
          '-i', filePath,
          '-f', 's16le',
          '-ar', '48000',
          '-ac', '2',
          'pipe:1',
        ]);

        const chunks: Buffer[] = [];
        proc.stdout.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        proc.stderr.on('data', (errData: Buffer) => {
          console.warn(`[AssetStore][ffmpeg-transcode] stderr: ${errData.toString().trim()}`);
        });

        proc.on('error', (err) => {
          console.error(`[AssetStore][ffmpeg-transcode] Spawn error:`, err.message);
          resolve(null);
        });

        proc.on('close', (code) => {
          if (code === 0) {
            const combined = Buffer.concat(chunks);
            resolve(combined);
          } else {
            console.warn(`[AssetStore][ffmpeg-transcode] FFmpeg exited with non-zero code ${code}`);
            resolve(null);
          }
        });
      } catch (err: any) {
        console.error(`[AssetStore][ffmpeg-transcode] Exception:`, err?.message);
        resolve(null);
      }
    });
  }

  /**
   * Save uploaded asset file securely
   */
  public async saveAsset(
    assetId: string,
    originalName: string,
    fileBuffer: Buffer
  ): Promise<{ success: boolean; format: string; error?: string }> {
    const cleanId = this.sanitizeId(assetId);
    if (!cleanId) {
      return { success: false, format: 'unknown', error: 'Invalid asset ID' };
    }

    const format = this.detectFormat(fileBuffer);
    if (format === 'unknown') {
      return {
        success: false,
        format: 'unknown',
        error: 'Unsupported audio format. Expected valid MP3, WAV, or OGG file.',
      };
    }

    const targetFile = path.join(this.dataDir, `${cleanId}.${format}`);
    await fs.promises.writeFile(targetFile, fileBuffer);

    // Fast path: If it's a standard WAV, convert via built-in parser
    let pcm: Buffer | null = null;
    if (format === 'wav') {
      pcm = this.parseWavToPcm(fileBuffer);
    }

    // High quality transcoding path: Use FFmpeg for MP3, OGG, or non-standard WAV
    if (!pcm) {
      pcm = await this.transcodeFileToPcm(targetFile);
    }

    if (pcm) {
      this.pcmCache.set(assetId, pcm);
      this.pcmCache.set(cleanId, pcm);
      const pcmPath = path.join(this.dataDir, `${cleanId}.pcm`);
      await fs.promises.writeFile(pcmPath, pcm);
      console.log(`[AssetStore] Successfully prepared 48kHz PCM for asset "${originalName}" (${cleanId}, ${format}, ${pcm.length} bytes)`);
    }

    this.metadataCache.set(cleanId, {
      id: cleanId,
      name: originalName,
      size: fileBuffer.length,
      format,
      updatedAt: Date.now(),
    });

    return { success: true, format };
  }

  /**
   * Resolve PCM 48kHz stereo buffer for an asset ID
   */
  public async getPcmBuffer(assetId: string): Promise<Buffer | null> {
    // 1. Check in-memory cache
    if (this.pcmCache.has(assetId)) {
      return this.pcmCache.get(assetId)!;
    }

    const cleanId = this.sanitizeId(assetId);
    if (this.pcmCache.has(cleanId)) {
      return this.pcmCache.get(cleanId)!;
    }

    // 2. Check cached .pcm file on disk
    const pcmPath = path.join(this.dataDir, `${cleanId}.pcm`);
    if (fs.existsSync(pcmPath)) {
      try {
        const pcm = await fs.promises.readFile(pcmPath);
        this.pcmCache.set(cleanId, pcm);
        return pcm;
      } catch {
        // Continue
      }
    }

    // 3. Check for .wav file on disk
    const wavPath = path.join(this.dataDir, `${cleanId}.wav`);
    if (fs.existsSync(wavPath)) {
      try {
        const wavData = await fs.promises.readFile(wavPath);
        let pcm = this.parseWavToPcm(wavData);
        if (!pcm) {
          pcm = await this.transcodeFileToPcm(wavPath);
        }
        if (pcm) {
          this.pcmCache.set(cleanId, pcm);
          await fs.promises.writeFile(pcmPath, pcm).catch(() => {});
          return pcm;
        }
      } catch {
        // Continue
      }
    }

    // 4. Check for .mp3 file on disk
    const mp3Path = path.join(this.dataDir, `${cleanId}.mp3`);
    if (fs.existsSync(mp3Path)) {
      try {
        const pcm = await this.transcodeFileToPcm(mp3Path);
        if (pcm) {
          this.pcmCache.set(cleanId, pcm);
          await fs.promises.writeFile(pcmPath, pcm).catch(() => {});
          return pcm;
        }
      } catch {
        // Continue
      }
    }

    // 5. Check for .ogg file on disk
    const oggPath = path.join(this.dataDir, `${cleanId}.ogg`);
    if (fs.existsSync(oggPath)) {
      try {
        const pcm = await this.transcodeFileToPcm(oggPath);
        if (pcm) {
          this.pcmCache.set(cleanId, pcm);
          await fs.promises.writeFile(pcmPath, pcm).catch(() => {});
          return pcm;
        }
      } catch {
        // Continue
      }
    }

    return null;
  }

  /**
   * Check if asset is available
   */
  public hasAsset(assetId: string): boolean {
    if (this.pcmCache.has(assetId)) return true;
    const cleanId = this.sanitizeId(assetId);
    if (this.pcmCache.has(cleanId)) return true;
    if (fs.existsSync(path.join(this.dataDir, `${cleanId}.pcm`))) return true;
    if (fs.existsSync(path.join(this.dataDir, `${cleanId}.wav`))) return true;
    if (fs.existsSync(path.join(this.dataDir, `${cleanId}.mp3`))) return true;
    if (fs.existsSync(path.join(this.dataDir, `${cleanId}.ogg`))) return true;
    return false;
  }
}
