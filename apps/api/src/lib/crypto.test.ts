import { describe, expect, it } from "vitest";
import { encrypt, decrypt } from "../lib/crypto.js";

const SECRET = "a".repeat(64);

describe("credential encryption (AES-256-GCM)", () => {
  it("round-trips a plaintext", () => {
    const payload = encrypt('{"apiKey":"k","apiSecret":"s"}', SECRET);
    expect(payload.startsWith("v1:")).toBe(true);
    expect(decrypt(payload, SECRET)).toBe('{"apiKey":"k","apiSecret":"s"}');
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const first = encrypt("same-input", SECRET);
    const second = encrypt("same-input", SECRET);
    expect(first).not.toBe(second);
  });

  it("fails to decrypt with the wrong key (auth tag mismatch)", () => {
    const payload = encrypt("secret", SECRET);
    expect(() => decrypt(payload, "b".repeat(64))).toThrow();
  });

  it("rejects malformed payloads", () => {
    expect(() => decrypt("not-a-payload", SECRET)).toThrow(/Invalid/);
  });

  it("hashes shorter passphrases to 32 bytes", () => {
    const payload = encrypt("value", "short-passphrase");
    expect(decrypt(payload, "short-passphrase")).toBe("value");
  });
});
