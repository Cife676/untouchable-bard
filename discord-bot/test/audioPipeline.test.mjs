import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AudioMixer } from '../dist/audioMixer.js';
import { AssetStore } from '../dist/assetStore.js';
import { AudioSynthesizer } from '../dist/audioSynthesizer.js';

test('Audio Pipeline & Mixer Concurrency Suite', async (t) => {
  await t.test('1. Test Voice Sound produces standard 48kHz stereo 16-bit PCM cue', () => {
    const cueBuffer = AudioSynthesizer.createTestCue();
    assert.ok(Buffer.isBuffer(cueBuffer), 'Cue must be a valid Buffer');
    assert.equal(cueBuffer.length % 4, 0, 'Buffer must consist of 4-byte stereo frames');
    // 2.0s duration at 48000 Hz * 4 bytes/frame = 384,000 bytes
    assert.equal(cueBuffer.length, 384000, 'Test cue length should equal exactly 2 seconds of 48kHz audio');
  });

  await t.test('2. AssetStore resolves default soundboard SFX and ambience assets', async () => {
    const store = new AssetStore();

    // Verify SFX assets resolve directly
    const wolfPcm = await store.getPcmBuffer('sfx_wolf_howl');
    assert.ok(wolfPcm && wolfPcm.length > 0, 'sfx_wolf_howl must resolve to non-empty PCM');

    const branchPcm = await store.getPcmBuffer('sfx_branch_crack');
    assert.ok(branchPcm && branchPcm.length > 0, 'sfx_branch_crack must resolve to non-empty PCM');

    const thunderPcm = await store.getPcmBuffer('sfx_thunder');
    assert.ok(thunderPcm && thunderPcm.length > 0, 'sfx_thunder must resolve to non-empty PCM');

    // Verify Ambience and Music assets resolve directly
    const musicPcm = await store.getPcmBuffer('music_haunted_forest');
    assert.ok(musicPcm && musicPcm.length > 0, 'music_haunted_forest must resolve to non-empty PCM');

    const windPcm = await store.getPcmBuffer('ambience_night_forest');
    assert.ok(windPcm && windPcm.length > 0, 'ambience_night_forest must resolve to non-empty PCM');

    const rainPcm = await store.getPcmBuffer('env_rain_leaves');
    assert.ok(rainPcm && rainPcm.length > 0, 'env_rain_leaves must resolve to non-empty PCM');

    // Verify procedural aliases also resolve
    const proceduralWind = await store.getPcmBuffer('procedural:wind_ambience');
    assert.ok(proceduralWind && proceduralWind.length > 0, 'procedural:wind_ambience must resolve');
  });

  await t.test('3. AudioMixer produces 3840 bytes per 20ms frame and supports multi-layer ambience + SFX', () => {
    const mixer = new AudioMixer();
    mixer.start();

    const stream = mixer.getStream();
    const initialChunk = stream.read(AudioMixer.BYTES_PER_CHUNK);
    assert.ok(Buffer.isBuffer(initialChunk), 'Mixer stream should produce valid Buffers');
    assert.equal(initialChunk.length, AudioMixer.BYTES_PER_CHUNK, 'Chunks must be exactly 3840 bytes');

    // Add multiple simultaneous ambience layers
    const pad = AudioSynthesizer.createMusicPad();
    const wind = AudioSynthesizer.createWindAmbience();
    const rain = AudioSynthesizer.createRainEnvironment();

    mixer.startScene(
      { id: 'test_scene', name: 'Haunted Forest' },
      [
        { id: 'layer_1', assetId: 'music_haunted_forest', name: 'Pad', channel: 'music', volume: 0.7, loop: true, buffer: pad },
        { id: 'layer_2', assetId: 'ambience_night_forest', name: 'Wind', channel: 'ambience', volume: 0.5, loop: true, buffer: wind },
        { id: 'layer_3', assetId: 'env_rain_leaves', name: 'Rain', channel: 'environment', volume: 0.4, loop: true, buffer: rain },
      ],
      0 // Instant crossfade for testing
    );

    assert.equal(mixer.getActiveLayers().length, 3, 'Mixer should have 3 active background layers');

    // Trigger one-shot SFX over the ambient mix
    const wolf = AudioSynthesizer.createWolfHowl();
    mixer.triggerSfx('sfx_wolf_howl', wolf, 0.85, 'Wolf Howl');
    assert.equal(mixer.getActiveLayers().length, 4, 'Mixer should have 4 active layers (3 ambience + 1 SFX)');

    // Read mixed frame - ensure it mixes properly without crash or overflow
    const mixedChunk = stream.read(AudioMixer.BYTES_PER_CHUNK);
    assert.equal(mixedChunk.length, 3840, 'Mixed chunk must be exactly 3840 bytes');

    // Clean up
    mixer.stop();
  });

  await t.test('4. Scene switching and crossfading preserves mixer stability', () => {
    const mixer = new AudioMixer();
    mixer.start();

    const sceneA = { id: 'scene_a', name: 'Forest' };
    const pad = AudioSynthesizer.createMusicPad();
    mixer.startScene(sceneA, [
      { id: 'l1', assetId: 'm1', name: 'Pad', channel: 'music', volume: 0.6, loop: true, buffer: pad },
    ], 0);

    assert.equal(mixer.getCurrentScene()?.id, 'scene_a');

    // Switch to Scene B
    const sceneB = { id: 'scene_b', name: 'Combat' };
    mixer.startScene(sceneB, [
      { id: 'l2', assetId: 'm2', name: 'Combat Pad', channel: 'music', volume: 0.8, loop: true, buffer: pad },
    ], 1.0);

    assert.equal(mixer.getCurrentScene()?.id, 'scene_b');
    assert.equal(mixer.getPlaybackState(), 'transitioning');

    // Stop scene
    mixer.stopScene(0.5);
    assert.equal(mixer.getPlaybackState(), 'stopped');
    assert.equal(mixer.getCurrentScene(), null);

    mixer.stop();
  });

  await t.test('5. AudioMixer seamlessly recreates Readable stream if destroyed (no Premature close)', () => {
    const mixer = new AudioMixer();
    mixer.start();

    const stream1 = mixer.getStream();
    assert.ok(!stream1.destroyed, 'Initial stream should be active');

    // Simulate @discordjs/voice destroying the stream on disconnect / unpipe
    stream1.destroy();
    assert.ok(stream1.destroyed, 'Stream 1 should now be destroyed');

    // getStream() must automatically supply a fresh, undestroyed stream
    const stream2 = mixer.getStream();
    assert.notEqual(stream1, stream2, 'Mixer must create a new stream instance after destruction');
    assert.ok(!stream2.destroyed, 'New stream must not be destroyed');

    const chunk = stream2.read(AudioMixer.BYTES_PER_CHUNK);
    assert.ok(Buffer.isBuffer(chunk), 'New stream must yield valid audio buffer without Premature close');
    assert.equal(chunk.length, AudioMixer.BYTES_PER_CHUNK);

    mixer.stop();
  });
});
