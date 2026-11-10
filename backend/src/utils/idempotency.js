/**
 * Idempotency Protection for checkout requests
 * Prevents double-charging or double stock deduction when cashiers double-click
 */

const inFlightKeys = new Set();

export function acquireIdempotencyLock(key) {
  if (!key) return true;
  if (inFlightKeys.has(key)) {
    return false;
  }
  inFlightKeys.add(key);
  return true;
}

export function releaseIdempotencyLock(key) {
  if (key) {
    inFlightKeys.delete(key);
  }
}
