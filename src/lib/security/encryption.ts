import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY environment variable is not set. Please set a 32-byte base64 string in .env",
    );
  }
  const buf = Buffer.from(key, "base64");
  if (buf.length !== 32) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must be a 32-byte base64 string (got ${buf.length} bytes).`,
    );
  }
  return buf;
}

/**
 * Encrypts a plaintext string (e.g., OAuth access token) using AES-256-GCM.
 * Output format: Base64 string containing [12 bytes IV + 16 bytes AuthTag + Encrypted bytes].
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
 * Decrypts an AES-256-GCM encrypted payload back to plaintext.
 */
export function decryptToken(payload: string): string {
  if (!payload) return "";
  const raw = Buffer.from(payload, "base64");
  if (raw.length < 28) {
    throw new Error("Invalid encrypted token payload (too short).");
  }
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);

  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
