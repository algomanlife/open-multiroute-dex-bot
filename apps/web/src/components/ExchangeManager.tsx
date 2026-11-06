"use client";

/** Exchange connection management: cards + add-credential dialog. */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ExchangeCard } from "@omdb/ui";
import { get, post, del, type ExchangeList } from "@/lib/api";

const EXCHANGES = ["gains", "dydxv4", "perpetual", "gmx", "bluefin", "hyperliquid"] as const;

export function ExchangeManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["exchanges"],
    queryFn: () => get<ExchangeList>("/api/exchanges")
  });

  const saveCredential = useMutation({
    mutationFn: (input: { exchange: string; label: string; apiKey: string; apiSecret: string }) =>
      post("/api/exchanges", input),
    onSuccess: () => {
      setDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["exchanges"] });
    }
  });

  const removeCredential = useMutation({
    mutationFn: (input: { exchange: string; label: string }) =>
      del(`/api/exchanges/${input.exchange}/${input.label}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["exchanges"] })
  });

  const exchanges = data?.exchanges ?? [];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Exchange Connections</h2>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
        >
          Add credential
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {exchanges.map((exchange) => (
          <ExchangeCard
            key={exchange.exchange}
            exchange={exchange.exchange}
            ready={exchange.ready}
            hasStoredCredential={exchange.hasStoredCredential}
            labels={exchange.labels}
            actions={
              exchange.hasStoredCredential ? (
                <button
                  type="button"
                  onClick={() =>
                    removeCredential.mutate({
                      exchange: exchange.exchange,
                      label: exchange.labels[0] ?? "default"
                    })
                  }
                  className="text-xs text-rose-400 underline-offset-2 hover:underline"
                >
                  Remove stored credential
                </button>
              ) : undefined
            }
          />
        ))}
      </div>

      {dialogOpen ? (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Add exchange credential"
        >
          <form
            className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              saveCredential.mutate({
                exchange: String(form.get("exchange") ?? ""),
                label: String(form.get("label") ?? "default"),
                apiKey: String(form.get("apiKey") ?? ""),
                apiSecret: String(form.get("apiSecret") ?? "")
              });
            }}
          >
            <h3 className="text-base font-semibold text-slate-100">Add credential</h3>
            <label className="mt-4 block text-sm text-slate-400">
              Exchange
              <select
                name="exchange"
                required
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                {EXCHANGES.map((exchange) => (
                  <option key={exchange} value={exchange}>
                    {exchange}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm text-slate-400">
              Label
              <input
                name="label"
                defaultValue="default"
                required
                maxLength={64}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="mt-3 block text-sm text-slate-400">
              API key
              <input
                name="apiKey"
                type="password"
                required
                autoComplete="off"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="mt-3 block text-sm text-slate-400">
              API secret
              <input
                name="apiSecret"
                type="password"
                required
                autoComplete="off"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            {saveCredential.isError ? (
              <p className="mt-3 text-sm text-rose-400" role="alert">
                Failed to save credential. Is CREDENTIALS_ENCRYPTION_KEY configured on the API?
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveCredential.isPending}
                className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
