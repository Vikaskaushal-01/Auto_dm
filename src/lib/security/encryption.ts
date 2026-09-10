import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("TOKEN_ENCRYPTION_KEY environment variable is not set");
  }
  return Buffer.from(key, "base64");
}

/**
 * Encrypts a plaintext token using AES-256-GCM.
 * Output is base64-encoded: [12-byte IV][16-byte Auth Tag][Ciphertext]
 */
export function encryptToken(plaintext: string): string {
  if (!plaintext) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

/**
 * Decrypts a base64-encoded token payload created with encryptToken.
 */
export function decryptToken(payload: string): string {
  if (!payload) return "";
  const raw = Buffer.from(payload, "base64");
  if (raw.length < 28) {
    throw new Error("Invalid encrypted token payload length");
  }
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
