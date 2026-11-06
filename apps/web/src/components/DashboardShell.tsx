"use client";

/** Dashboard chrome: top nav + sidebar + mobile menu + wallet chip. */
import { useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { signOut } from "@/lib/auth";
import { getToken } from "@/lib/api";
import { shortenAddress } from "@/lib/format";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/positions", label: "Positions" },
  { href: "/dashboard/trades", label: "Trades" },
  { href: "/dashboard/alerts", label: "Alerts" },
  { href: "/dashboard/exchanges", label: "Exchanges" },
  { href: "/dashboard/settings", label: "Settings" }
] as const;

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const [mobileOpen, setMobileOpen] = useState(false);
  const authed = Boolean(getToken());

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
          <button
            type="button"
            className="rounded-md p-2 text-slate-400 hover:text-slate-100 md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M2 4.5h16v1.5H2v-1.5Zm0 5h16v1.5H2v-1.5Zm0 5h16v1.5H2v-1.5Z" />
            </svg>
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Open Multiroute DEX Bot" width={28} height={28} priority />
            <span className="hidden text-sm font-semibold text-slate-100 sm:inline">
              Open Multiroute DEX Bot
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            {authed && isConnected && address ? (
              <span
                className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300"
                title={address}
              >
                {shortenAddress(address)}
              </span>
            ) : null}
            <ConnectButton.Custom>
              {({ account, chain, openAccountModal, openConnectModal, mounted }) => (
                <div
                  {...(!mounted && {
                    "aria-hidden": true,
                    style: { opacity: 0, pointerEvents: "none", userSelect: "none" }
                  })}
                >
                  {(() => {
                    if (!mounted || !account || !chain) {
                      return (
                        <button
                          type="button"
                          onClick={openConnectModal}
                          className="rounded-lg bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
                        >
                          Connect Wallet
                        </button>
                      );
                    }
                    return (
                      <button
                        type="button"
                        onClick={openAccountModal}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500"
                      >
                        {account.displayName}
                      </button>
                    );
                  })()}
                </div>
              )}
            </ConnectButton.Custom>
            {authed ? (
              <button
                type="button"
                onClick={() => void signOut()}
                className="text-xs text-slate-400 underline-offset-2 hover:text-slate-100 hover:underline"
              >
                Sign out
              </button>
            ) : null}
          </div>
        </div>
        {mobileOpen ? (
          <nav aria-label="Dashboard navigation" className="border-t border-slate-800 md:hidden">
            <ul>
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block px-4 py-3 text-sm ${
                      pathname === item.href
                        ? "bg-slate-900 text-cyan-300"
                        : "text-slate-300 hover:bg-slate-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="hidden w-52 shrink-0 md:block" aria-label="Sidebar">
          <nav>
            <ul className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={pathname === item.href ? "page" : undefined}
                    className={`block rounded-lg px-3 py-2 text-sm ${
                      pathname === item.href
                        ? "bg-slate-900 text-cyan-300"
                        : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
