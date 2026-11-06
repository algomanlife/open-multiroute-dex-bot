/**
 * SIWE (Sign-In with Ethereum) helpers — minimal EIP-4361 subset:
 * message parsing, nonce generation and signature verification.
 */
import { randomBytes } from "node:crypto";
import { utils } from "ethers";

export type SiweMessage = {
  domain: string;
  address: string;
  statement?: string;
  nonce: string;
  issuedAt?: string;
};

/** Parse the plain-text SIWE message produced by the dashboard. */
export function parseSiweMessage(message: string): SiweMessage {
  const domainMatch = message.match(/^(\S+) wants you to sign in with your/);
  const addressMatch = message.match(/your Ethereum account:\s*\n?\s*(0x[a-fA-F0-9]{40})/);
  const nonceMatch = message.match(/Nonce:\s*([a-zA-Z0-9]+)/);
  const issuedMatch = message.match(/Issued At:\s*(.+)$/m);

  if (!domainMatch?.[1] || !addressMatch?.[1] || !nonceMatch?.[1]) {
    throw new Error("Malformed SIWE message");
  }
  return {
    domain: domainMatch[1],
    address: addressMatch[1].toLowerCase(),
    nonce: nonceMatch[1],
    issuedAt: issuedMatch?.[1]?.trim()
  };
}

export function generateNonce(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Verify a SIWE signature against the reconstructed message.
 * Returns the wallet address on success, null otherwise.
 */
export function verifySiwe(
  message: string,
  signature: string
): string | null {
  try {
    const recovered = utils.verifyMessage(message, signature).toLowerCase();
    const parsed = parseSiweMessage(message);
    return recovered === parsed.address ? parsed.address : null;
  } catch {
    return null;
  }
}
