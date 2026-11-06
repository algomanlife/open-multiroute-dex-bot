/**
 * AES-256-GCM encryption for exchange API credentials at rest.
 * Key comes from CREDENTIALS_ENCRYPTION_KEY (64-char hex = 32 bytes).
 * Output format: v1:<iv-hex>:<authTag-hex>:<cipher-hex>
 */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash
} from "node:crypto";

export function deriveKey(secretHex: string): Buffer {
  if (/^[0-9a-fA-F]{64}$/.test(secretHex)) {
    return Buffer.from(secretHex, "hex");
  }
  // Fall back to hashing shorter passphrases (still 32 bytes).
  return createHash("sha256").update(secretHex).digest();
}

export function encrypt(plaintext: string, secretHex: string): string {
  const key = deriveKey(secretHex);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(payload: string, secretHex: string): string {
  const [version, ivHex, tagHex, dataHex] = payload.split(":");
  if (version !== "v1" || !ivHex || !tagHex || !dataHex) {
    throw new Error("Invalid encrypted payload format");
  }
  const key = deriveKey(secretHex);
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final()
  ]);
  return decrypted.toString("utf8");
}
