import test from 'node:test';
import assert from 'node:assert';
import { acquireIdempotencyLock, releaseIdempotencyLock } from '../utils/idempotency.js';

test('Idempotency - Prevents concurrent duplicate submissions', () => {
  const testKey = 'test-idemp-key-12345';

  // First acquisition should succeed
  const lock1 = acquireIdempotencyLock(testKey);
  assert.strictEqual(lock1, true, 'First lock acquisition should succeed');

  // Second acquisition with same key should fail (simulate rapid cashier double click)
  const lock2 = acquireIdempotencyLock(testKey);
  assert.strictEqual(lock2, false, 'Duplicate lock acquisition must be blocked');

  // Release lock
  releaseIdempotencyLock(testKey);

  // Third acquisition after release should succeed
  const lock3 = acquireIdempotencyLock(testKey);
  assert.strictEqual(lock3, true, 'Lock should be acquirable after release');

  releaseIdempotencyLock(testKey);
});
