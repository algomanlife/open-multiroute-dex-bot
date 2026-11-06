"use client";

/** SIWE sign-in flow against /api/auth/*. */
import {
  get,
  post,
  setToken,
  type User
} from "./api";

type SignMessage = (message: string) => Promise<string>;

export function buildSiweMessage(
  domain: string,
  address: string,
  nonce: string
): string {
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    "",
    "Sign in to Open Multiroute DEX Bot",
    "",
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`
  ].join("\n");
}

/** Complete the nonce → sign → verify flow with a wallet signer callback. */
export async function signInWithWallet(
  address: string,
  signMessage: SignMessage,
  domain: string
): Promise<{ token: string; user: User }> {
  const { nonce } = await post<{ nonce: string }>("/api/auth/nonce", {});
  const message = buildSiweMessage(domain, address, nonce);
  const signature = await signMessage(message);
  const result = await post<{ token: string; user: User }>(
    "/api/auth/verify",
    { message, signature }
  );
  setToken(result.token);
  return result;
}

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    return await get<User>("/api/auth/me");
  } catch {
    return null;
  }
}

export async function signOut(): Promise<void> {
  try {
    await post("/api/auth/logout", {});
  } finally {
    setToken(null);
  }
}
