import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VoiceManager } from '../dist/voiceManager.js';
import { AudioMixer } from '../dist/audioMixer.js';
import { GuildSession } from '../dist/guildSession.js';
import { generateDependencyReport } from '@discordjs/voice';

test('VoiceManager & GuildSession Connection Lifecycle and Isolation', async (t) => {
  await t.test('VoiceManager initial state is disconnected', () => {
    const mixer = new AudioMixer();
    const vm = new VoiceManager(mixer);
    assert.equal(vm.getConnectionState(), 'disconnected');
    assert.equal(vm.getCurrentChannelId(), null);
    assert.equal(vm.getLastError(), null);
  });

  await t.test('Manual disconnect clears channel, state, and errors', () => {
    const mixer = new AudioMixer();
    const vm = new VoiceManager(mixer);
    vm.disconnect();
    assert.equal(vm.getConnectionState(), 'disconnected');
    assert.equal(vm.getCurrentChannelId(), null);
    assert.equal(vm.getCurrentChannelName(), null);
    assert.equal(vm.getLastError(), null);
  });

  await t.test('Encryption and DAVE libraries are properly loaded by @discordjs/voice', async () => {
    const report = generateDependencyReport();
    assert.ok(report.includes('libsodium-wrappers: 0.8.4'), 'libsodium-wrappers must be found');
    assert.ok(report.includes('@snazzah/davey: 0.1.12'), '@snazzah/davey (DAVE protocol) must be found');
  });

  await t.test('Guild sessions are strictly isolated', () => {
    const sessionA = new GuildSession('guild_123', 'Campaign Server A');
    const sessionB = new GuildSession('guild_456', 'Campaign Server B');

    assert.notEqual(sessionA.guildId, sessionB.guildId);
    assert.notEqual(sessionA.mixer, sessionB.mixer);
    assert.notEqual(sessionA.voiceManager, sessionB.voiceManager);

    // Modifying session A state does not affect session B
    sessionA.mixer.setMasterVolume(0.42);
    assert.equal(sessionA.mixer.getMasterVolume(), 0.42);
    assert.equal(sessionB.mixer.getMasterVolume(), 0.9);

    // Destroying session A does not affect session B
    sessionA.destroy();
    assert.equal(sessionA.voiceManager.getConnectionState(), 'disconnected');
    assert.equal(sessionB.voiceManager.getConnectionState(), 'disconnected');
  });
});
