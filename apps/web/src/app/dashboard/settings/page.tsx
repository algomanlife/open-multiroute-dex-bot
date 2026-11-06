"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";
import { API_URL, getToken } from "@/lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!getToken()) router.replace("/login");
  }, [router]);

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">Account and integration settings.</p>
      </div>

      <section aria-label="Webhook configuration" className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="text-sm font-medium text-slate-200">TradingView Webhook URL</h2>
        <p className="mt-1 text-xs text-slate-500">
          Set this as the webhook URL in your TradingView alerts (POST, JSON body).
        </p>
        <code className="mt-3 block rounded-lg bg-slate-950 px-3 py-2 text-sm text-cyan-300">
          {API_URL}/api/webhook
        </code>
      </section>

      <section aria-label="Profile" className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="text-sm font-medium text-slate-200">Display name</h2>
        <form
          className="mt-3 flex gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setSaved(true);
          }}
        >
          <input
            value={displayName}
            onChange={(event) => {
              setDisplayName(event.target.value);
              setSaved(false);
            }}
            placeholder="Optional display name"
            maxLength={64}
            aria-label="Display name"
            className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="submit"
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
          >
            Save
          </button>
        </form>
        {saved ? (
          <p className="mt-2 text-xs text-emerald-400" role="status">
            Saved locally. Profile sync lands with the next API release.
          </p>
        ) : null}
      </section>

      <section aria-label="Session" className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="text-sm font-medium text-slate-200">Session</h2>
        <button
          type="button"
          onClick={() => {
            void signOut();
            router.replace("/login");
          }}
          className="mt-3 rounded-lg border border-rose-500/40 px-4 py-2 text-sm text-rose-400 hover:border-rose-400"
        >
          Sign out
        </button>
      </section>
    </div>
  );
}
