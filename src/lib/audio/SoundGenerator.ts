/**
 * SoundGenerator produces real, procedural audio buffers for Web Audio testing.
 * This guarantees the developer and user can immediately test playback, looping,
 * fading, and multi-channel mixing without relying on external file downloads.
 */

export class SoundGenerator {
  /**
   * Generates a rich, ambient synth chord (C minor pad) suitable for looping music.
   */
  public static createMusicPad(ctx: AudioContext, durationSeconds: number = 8): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const frameCount = sampleRate * durationSeconds;
    const buffer = ctx.createBuffer(2, frameCount, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    // C minor frequencies: C3 (130.81), Eb3 (155.56), G3 (196.00), Bb3 (233.08)
    const frequencies = [130.81, 155.56, 196.0, 233.08];

    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate;
      let sampleL = 0;
      let sampleR = 0;

      // Soft envelope to prevent clicks when looping
      const fadeLen = sampleRate * 0.5;
      let env = 1.0;
      if (i < fadeLen) {
        env = 0.5 * (1 - Math.cos((Math.PI * i) / fadeLen));
      } else if (i > frameCount - fadeLen) {
        env = 0.5 * (1 - Math.cos((Math.PI * (frameCount - i)) / fadeLen));
      }

      frequencies.forEach((freq, idx) => {
        // Subtle chorusing detune & stereo spread
        const detuneL = Math.sin(t * 0.4 + idx) * 0.8;
        const detuneR = Math.cos(t * 0.35 + idx) * 0.8;
        const oscL = Math.sin(2 * Math.PI * (freq + detuneL) * t);
        const oscR = Math.sin(2 * Math.PI * (freq + detuneR) * t);
        const weight = 0.25 / frequencies.length;
        sampleL += oscL * weight;
        sampleR += oscR * weight;
      });

      left[i] = sampleL * env;
      right[i] = sampleR * env;
    }

    return buffer;
  }

  /**
   * Generates ambient wind noise with gentle low-pass modulation.
   */
  public static createWindAmbience(ctx: AudioContext, durationSeconds: number = 6): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const frameCount = sampleRate * durationSeconds;
    const buffer = ctx.createBuffer(2, frameCount, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    let lastL = 0;
    let lastR = 0;

    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate;
      // White noise base
      const whiteL = Math.random() * 2 - 1;
      const whiteR = Math.random() * 2 - 1;

      // Low pass filter approximation (brown/pink noise)
      const windSwell = 0.5 + 0.5 * Math.sin(t * 0.8);
      const alpha = 0.04 + 0.05 * windSwell;

      lastL = lastL + alpha * (whiteL - lastL);
      lastR = lastR + alpha * (whiteR - lastR);

      // Loop envelope
      const fadeLen = sampleRate * 0.4;
      let env = 1.0;
      if (i < fadeLen) {
        env = 0.5 * (1 - Math.cos((Math.PI * i) / fadeLen));
      } else if (i > frameCount - fadeLen) {
        env = 0.5 * (1 - Math.cos((Math.PI * (frameCount - i)) / fadeLen));
      }

      left[i] = lastL * 2.5 * env;
      right[i] = lastR * 2.5 * env;
    }

    return buffer;
  }

  /**
   * Generates environment rain/rustle audio buffer.
   */
  public static createRainEnvironment(ctx: AudioContext, durationSeconds: number = 6): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const frameCount = sampleRate * durationSeconds;
    const buffer = ctx.createBuffer(2, frameCount, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    let b0L = 0, b1L = 0;
    let b0R = 0, b1R = 0;

    for (let i = 0; i < frameCount; i++) {
      const whiteL = Math.random() * 2 - 1;
      const whiteR = Math.random() * 2 - 1;

      // Bandpass/pink filter to mimic rainfall patter
      b0L = 0.95 * b0L + whiteL * 0.05;
      b1L = 0.85 * b1L + (whiteL - b0L) * 0.15;

      b0R = 0.95 * b0R + whiteR * 0.05;
      b1R = 0.85 * b1R + (whiteR - b0R) * 0.15;

      const fadeLen = sampleRate * 0.4;
      let env = 1.0;
      if (i < fadeLen) {
        env = 0.5 * (1 - Math.cos((Math.PI * i) / fadeLen));
      } else if (i > frameCount - fadeLen) {
        env = 0.5 * (1 - Math.cos((Math.PI * (frameCount - i)) / fadeLen));
      }

      left[i] = b1L * 1.5 * env;
      right[i] = b1R * 1.5 * env;
    }

    return buffer;
  }

  /**
   * Generates a wolf howl sound effect (smooth frequency-swept tone).
   */
  public static createWolfHowl(ctx: AudioContext): AudioBuffer {
    const duration = 2.4;
    const sampleRate = ctx.sampleRate;
    const frameCount = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);

    let phase = 0;
    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate;
      // Frequency trajectory: 300Hz -> 650Hz -> 450Hz
      const freq = 300 + 350 * Math.sin((Math.PI * t) / duration) * (1 + 0.05 * Math.sin(12 * t));
      phase += (2 * Math.PI * freq) / sampleRate;

      // Amplitude envelope
      const env = Math.sin((Math.PI * t) / duration) ** 1.5;
      data[i] = (Math.sin(phase) + 0.25 * Math.sin(phase * 2)) * env * 0.4;
    }

    return buffer;
  }

  /**
   * Generates a sharp branch crack / snap SFX.
   */
  public static createBranchCrack(ctx: AudioContext): AudioBuffer {
    const duration = 0.45;
    const sampleRate = ctx.sampleRate;
    const frameCount = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate;
      const noise = Math.random() * 2 - 1;
      const snap = Math.exp(-t * 28);
      const thud = Math.sin(2 * Math.PI * 90 * t) * Math.exp(-t * 12);
      data[i] = (noise * 0.6 + thud * 0.4) * snap * 0.6;
    }

    return buffer;
  }

  /**
   * Generates a distant thunder rumble SFX.
   */
  public static createThunder(ctx: AudioContext): AudioBuffer {
    const duration = 3.0;
    const sampleRate = ctx.sampleRate;
    const frameCount = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(2, frameCount, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    let filterL = 0;
    let filterR = 0;

    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate;
      const whiteL = Math.random() * 2 - 1;
      const whiteR = Math.random() * 2 - 1;

      // Heavy low pass for rumbling bass
      filterL += 0.02 * (whiteL - filterL);
      filterR += 0.02 * (whiteR - filterR);

      const envelope = Math.exp(-t * 1.1) * (1 + 0.3 * Math.sin(t * 14));
      left[i] = filterL * 3.5 * envelope;
      right[i] = filterR * 3.5 * envelope;
    }

    return buffer;
  }
}
