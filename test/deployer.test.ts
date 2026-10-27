import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Deployer } from '../src/deployer.js';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

test('batches rapid changes into one deploy', async () => {
  let n = 0;
  const d = new Deployer({ deploy: async () => { n++; }, debounceMs: 50 });
  for (let i = 0; i < 5; i++) { d.notify(); await sleep(20); }
  await sleep(200);
  assert.equal(n, 1);
  await d.stop();
});

test('change during deploy triggers exactly one follow-up', async () => {
  let n = 0;
  const d = new Deployer({ deploy: async () => { n++; await sleep(100); }, debounceMs: 20 });
  d.notify();
  await sleep(60);
  d.notify(); d.notify();
  await sleep(400);
  assert.equal(n, 2);
  await d.stop();
});

test('retries on failure', async () => {
  let n = 0;
  const d = new Deployer({
    deploy: async () => { if (++n < 3) throw new Error('boom'); },
    debounceMs: 10, retryDelayMs: 10, maxRetries: 3,
  });
  d.notify();
  await sleep(300);
  assert.equal(n, 3);
  await d.stop();
});

test('cleanup runs once after successful retries', async () => {
  let deploys = 0;
  let cleanups = 0;
  const d = new Deployer({
    deploy: async () => { if (++deploys < 3) throw new Error('boom'); },
    cleanup: async () => { cleanups++; },
    debounceMs: 10, retryDelayMs: 10, maxRetries: 3,
  });
  d.notify();
  await sleep(300);
  assert.equal(deploys, 3);
  assert.equal(cleanups, 1);
  await d.stop();
});

test('cleanup runs once after all retries fail', async () => {
  let deploys = 0;
  let cleanups = 0;
  const d = new Deployer({
    deploy: async () => { deploys++; throw new Error('boom'); },
    cleanup: async () => { cleanups++; },
    debounceMs: 10, retryDelayMs: 10, maxRetries: 2,
  });
  d.notify();
  await sleep(300);
  assert.equal(deploys, 3);
  assert.equal(cleanups, 1);
  await d.stop();
});

test('cleanup is called after the final deploy, not between follow-ups', async () => {
  const events: string[] = [];
  const d = new Deployer({
    deploy: async () => { events.push('deploy'); await sleep(100); },
    cleanup: async () => { events.push('cleanup'); },
    debounceMs: 20,
  });
  d.notify();
  await sleep(60);
  d.notify();
  await sleep(400);
  assert.deepEqual(events, ['deploy', 'deploy', 'cleanup']);
  await d.stop();
});
