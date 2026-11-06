import { describe, expect, it } from "vitest";
import {
  generateNonce,
  parseSiweMessage,
  verifySiwe
} from "../lib/siwe.js";
import { Wallet } from "ethers";

const message = [
  "example.com wants you to sign in with your Ethereum account:",
  "0x0000000000000000000000000000000000000001",
  "",
  "Sign in to Open Multiroute DEX Bot",
  "",
  "Nonce: abc123def456",
  "Issued At: 2026-01-01T00:00:00.000Z"
].join("\n");

describe("parseSiweMessage", () => {
  it("extracts domain, address and nonce", () => {
    const parsed = parseSiweMessage(message);
    expect(parsed.domain).toBe("example.com");
    expect(parsed.address).toBe("0x0000000000000000000000000000000000000001");
    expect(parsed.nonce).toBe("abc123def456");
  });

  it("throws on malformed messages", () => {
    expect(() => parseSiweMessage("hello world")).toThrow(/Malformed/);
  });
});

describe("generateNonce", () => {
  it("returns a unique hex string", () => {
    const first = generateNonce();
    const second = generateNonce();
    expect(first).not.toBe(second);
    expect(first).toMatch(/^[a-f0-9]{32}$/);
  });
});

describe("verifySiwe", () => {
  it("verifies a valid signature and returns the address", async () => {
    const wallet = Wallet.createRandom();
    const siwe = [
      "example.com wants you to sign in with your Ethereum account:",
      wallet.address,
      "",
      "Sign in to Open Multiroute DEX Bot",
      "",
      "Nonce: abc123def456",
      "Issued At: 2026-01-01T00:00:00.000Z"
    ].join("\n");
    const signature = await wallet.signMessage(siwe);
    expect(verifySiwe(siwe, signature)).toBe(wallet.address.toLowerCase());
  });

  it("rejects a signature from a different signer", async () => {
    const other = await Wallet.createRandom().signMessage(message);
    expect(verifySiwe(message, other)).toBeNull();
  });

  it("rejects garbage signatures", () => {
    expect(verifySiwe(message, "0xdeadbeef")).toBeNull();
  });
});
