"use client";

/** Wallet sign-in page (SIWE). */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAccount, useSignMessage } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { signInWithWallet } from "@/lib/auth";
import { getToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace("/dashboard");
  }, [router]);

  async function handleSignIn(): Promise<void> {
    if (!address) return;
    setPending(true);
    setError(null);
    try {
      const domain =
        typeof window !== "undefined" ? window.location.host : "localhost";
      await signInWithWallet(
        address,
        (message) => signMessageAsync({ message }),
        domain
      );
      router.replace("/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <div className="flex flex-col items-center gap-3">
        <Image src="/logo.svg" alt="Open Multiroute DEX Bot" width={64} height={64} priority />
        <h1 className="text-xl font-semibold text-slate-100">
          Open Multiroute DEX Bot
        </h1>
        <p className="max-w-sm text-center text-sm text-slate-400">
          Sign in with your wallet to manage alerts, positions and exchange
          connections.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <ConnectButton />
        {isConnected && address ? (
          <button
            type="button"
            onClick={() => void handleSignIn()}
            disabled={pending}
            className="rounded-lg bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            {pending ? "Signing in…" : "Sign in with Ethereum"}
          </button>
        ) : null}
        {error ? (
          <p className="text-sm text-rose-400" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </main>
  );
}
