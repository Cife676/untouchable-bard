/**
 * Procedural Audio Synthesizer for Discord Bot
 * Produces 48,000 Hz, 16-bit signed stereo little-endian PCM buffers.
 * Matches procedural sound keys used in default Untouchable Bard scenes.
 */

export class AudioSynthesizer {
  public static readonly SAMPLE_RATE = 48000;

  /**
   * Helper: allocate 16-bit stereo PCM buffer
   */
  private static allocateBuffer(seconds: number): { buffer: Buffer; totalFrames: number } {
    const totalFrames = Math.floor(seconds * this.SAMPLE_RATE);
    const buffer = Buffer.alloc(totalFrames * 4); // 2 channels * 2 bytes
    return { buffer, totalFrames };
  }

  /**
   * Helper: write a stereo frame to buffer at index (frameIndex)
   */
  private static writeFrame(buffer: Buffer, frameIndex: number, leftSample: number, rightSample: number): void {
    const clampedL = Math.max(-1, Math.min(1, leftSample));
    const clampedR = Math.max(-1, Math.min(1, rightSample));
    const intL = Math.round(clampedL * 32767);
    const intR = Math.round(clampedR * 32767);
    const offset = frameIndex * 4;
    buffer.writeInt16LE(intL, offset);
    buffer.writeInt16LE(intR, offset + 2);
  }

  /**
   * Pleasant two-tone crystal chime for immediate voice connection verification
   */
  public static createTestCue(): Buffer {
    const duration = 2.0;
    const { buffer, totalFrames } = this.allocateBuffer(duration);
    const freq1 = 587.33; // D5
    const freq2 = 880.00; // A5

    for (let i = 0; i < totalFrames; i++) {
      const t = i / this.SAMPLE_RATE;
      let sampleL = 0;
      let sampleR = 0;

      // Note 1 (0 to 1.5s)
      if (t >= 0 && t < 1.5) {
        const env1 = Math.exp(-t * 3.5);
        sampleL += Math.sin(2 * Math.PI * freq1 * t) * env1 * 0.4;
        sampleR += Math.sin(2 * Math.PI * freq1 * t * 1.002) * env1 * 0.4;
      }

      // Note 2 (0.2 to 2.0s)
      if (t >= 0.25) {
        const t2 = t - 0.25;
        const env2 = Math.exp(-t2 * 3.0);
        sampleL += Math.sin(2 * Math.PI * freq2 * t2) * env2 * 0.45;
        sampleR += Math.sin(2 * Math.PI * freq2 * t2 * 0.998) * env2 * 0.45;
      }

      this.writeFrame(buffer, i, sampleL, sampleR);
    }
    return buffer;
  }

  /**
   * Ambient Music Pad (Loopable, 8 seconds)
   * Minor chord pad: D minor (D3, F3, A3, C4)
   */
  public static createMusicPad(): Buffer {
    const duration = 8.0;
    const { buffer, totalFrames } = this.allocateBuffer(duration);
    const freqs = [146.83, 174.61, 220.0, 261.63];

    for (let i = 0; i < totalFrames; i++) {
      const t = i / this.SAMPLE_RATE;
      let sL = 0;
      let sR = 0;

      for (let f = 0; f < freqs.length; f++) {
        const freq = freqs[f];
        // Slow beating detune
        const detuneL = Math.sin(2 * Math.PI * 0.25 * t + f) * 0.6;
        const detuneR = Math.cos(2 * Math.PI * 0.25 * t + f) * 0.6;
        sL += Math.sin(2 * Math.PI * (freq + detuneL) * t) * 0.12;
        sR += Math.sin(2 * Math.PI * (freq + detuneR) * t) * 0.12;
      }

      // Seamless loop envelope at edges
      const fadeLen = 0.5 * this.SAMPLE_RATE;
      let env = 1.0;
      if (i < fadeLen) env = i / fadeLen;
      else if (i > totalFrames - fadeLen) env = (totalFrames - i) / fadeLen;

      this.writeFrame(buffer, i, sL * env, sR * env);
    }
    return buffer;
  }

  /**
   * Wind Ambience (Loopable, 6 seconds)
   */
  public static createWindAmbience(): Buffer {
    const duration = 6.0;
    const { buffer, totalFrames } = this.allocateBuffer(duration);
    let prevL = 0;
    let prevR = 0;

    for (let i = 0; i < totalFrames; i++) {
      const t = i / this.SAMPLE_RATE;
      const gust = 0.35 + 0.3 * Math.sin(2 * Math.PI * 0.2 * t) + 0.15 * Math.sin(2 * Math.PI * 0.45 * t);

      // Low-pass filtered noise
      const noiseL = (Math.random() * 2 - 1) * gust;
      const noiseR = (Math.random() * 2 - 1) * gust;

      const alpha = 0.04;
      prevL = prevL + alpha * (noiseL - prevL);
      prevR = prevR + alpha * (noiseR - prevR);

      // Loop envelope
      const fadeLen = 0.4 * this.SAMPLE_RATE;
      let env = 1.0;
      if (i < fadeLen) env = i / fadeLen;
      else if (i > totalFrames - fadeLen) env = (totalFrames - i) / fadeLen;

      this.writeFrame(buffer, i, prevL * env * 0.6, prevR * env * 0.6);
    }
    return buffer;
  }

  /**
   * Rain Environment (Loopable, 5 seconds)
   */
  public static createRainEnvironment(): Buffer {
    const duration = 5.0;
    const { buffer, totalFrames } = this.allocateBuffer(duration);
    let lpfL = 0;
    let lpfR = 0;

    for (let i = 0; i < totalFrames; i++) {
      const whiteL = Math.random() * 2 - 1;
      const whiteR = Math.random() * 2 - 1;

      // Medium-pass noise
      lpfL = lpfL + 0.15 * (whiteL - lpfL);
      lpfR = lpfR + 0.15 * (whiteR - lpfR);

      // Occasional droplet spike
      let dropL = 0;
      let dropR = 0;
      if (Math.random() < 0.003) {
        dropL = (Math.random() - 0.5) * 0.4;
        dropR = (Math.random() - 0.5) * 0.4;
      }

      const fadeLen = 0.3 * this.SAMPLE_RATE;
      let env = 1.0;
      if (i < fadeLen) env = i / fadeLen;
      else if (i > totalFrames - fadeLen) env = (totalFrames - i) / fadeLen;

      this.writeFrame(buffer, i, (lpfL * 0.25 + dropL) * env, (lpfR * 0.25 + dropR) * env);
    }
    return buffer;
  }

  /**
   * SFX: Wolf Howl (One-shot, 3.5 seconds)
   */
  public static createWolfHowl(): Buffer {
    const duration = 3.5;
    const { buffer, totalFrames } = this.allocateBuffer(duration);

    for (let i = 0; i < totalFrames; i++) {
      const t = i / this.SAMPLE_RATE;
      // Pitch curve: rise, plateau, fall
      let pitch = 300;
      if (t < 0.8) pitch = 220 + (t / 0.8) * 200;
      else if (t < 2.2) pitch = 420 + Math.sin(t * 12) * 15;
      else pitch = 420 - ((t - 2.2) / 1.3) * 220;

      // Envelope
      let env = Math.sin((t / duration) * Math.PI);
      env = Math.pow(env, 1.2);

      const s = Math.sin(2 * Math.PI * pitch * t) * env * 0.55;
      this.writeFrame(buffer, i, s, s * 0.95);
    }
    return buffer;
  }

  /**
   * SFX: Branch Crack (One-shot, 0.6 seconds)
   */
  public static createBranchCrack(): Buffer {
    const duration = 0.6;
    const { buffer, totalFrames } = this.allocateBuffer(duration);

    for (let i = 0; i < totalFrames; i++) {
      const t = i / this.SAMPLE_RATE;
      let env = 0;
      if (t < 0.05) env = t / 0.05;
      else env = Math.exp(-(t - 0.05) * 16);

      const noise = (Math.random() * 2 - 1) * env * 0.8;
      const snap = Math.sin(2 * Math.PI * 480 * t) * env * 0.4;
      this.writeFrame(buffer, i, noise + snap, (noise + snap) * 0.9);
    }
    return buffer;
  }

  /**
   * SFX: Thunder Boom (One-shot, 4.0 seconds)
   */
  public static createThunder(): Buffer {
    const duration = 4.0;
    const { buffer, totalFrames } = this.allocateBuffer(duration);
    let lpf = 0;

    for (let i = 0; i < totalFrames; i++) {
      const t = i / this.SAMPLE_RATE;
      const env = Math.exp(-t * 1.2);
      const white = (Math.random() * 2 - 1) * 0.9;
      // Low rumble filter
      lpf = lpf + 0.02 * (white - lpf);
      const sub = Math.sin(2 * Math.PI * (55 - t * 8) * t) * 0.4 * env;

      const s = (lpf * 1.5 + sub) * env * 0.85;
      this.writeFrame(buffer, i, s, s * 0.98);
    }
    return buffer;
  }
}
