const crypto = require('node:crypto');

const KEY_LENGTH = 64;

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function hashSecret(secret) {
  if (typeof secret !== 'string' || secret.length === 0) {
    throw new Error('Secret must be a non-empty string.');
  }

  const salt = randomToken(16);
  const hash = crypto.scryptSync(secret, salt, KEY_LENGTH).toString('base64url');
  return `scrypt$${salt}$${hash}`;
}

function verifySecret(secret, storedHash) {
  if (typeof secret !== 'string' || typeof storedHash !== 'string') {
    return false;
  }

  const [scheme, salt, expectedHash] = storedHash.split('$');
  if (scheme !== 'scrypt' || !salt || !expectedHash) {
    return false;
  }

  try {
    const actual = crypto.scryptSync(secret, salt, KEY_LENGTH);
    const expected = Buffer.from(expectedHash, 'base64url');

    if (actual.length !== expected.length) {
      return false;
    }

    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

module.exports = {
  hashSecret,
  randomToken,
  sha256,
  verifySecret
};
