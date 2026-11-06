"use client";

/** Gains Network demo/test panel — places a small test order (demo chain by
 * default: arbitrum-sepolia, the environment behind demo.gains.trade) and
 * shows the resulting position so the pipeline can be verified end-to-end. */
import { useEffect, useState } from "react";
import { get, post } from "@/lib/api";
import type {
  GainsStatus,
  GainsTestResult,
  GainsPosition
} from "@/lib/api";

export function GainsTestPanel() {
  const [status, setStatus] = useState<GainsStatus | null>(null);
  const [market, setMarket] = useState("BTC-USD");
  const [side, setSide] = useState<"long" | "short">("long");
  const [size, setSize] = useState("0.01");
  const [leverage, setLeverage] = useState("2");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);
  const [positions, setPositions] = useState<GainsPosition[] | null>(null);

  useEffect(() => {
    get<GainsStatus>("/api/gains/status")
      .then(setStatus)
      .catch(() => setStatus(null));
    get<{ positions: GainsPosition[] }>("/api/gains/positions")
      .then((payload) => setPositions(payload.positions))
      .catch(() => setPositions(null));
  }, []);

  async function runTest(): Promise<void> {
    setPending(true);
    setResult(null);
    try {
      const response = await post<GainsTestResult>("/api/gains/test", {
        market,
        side,
        size: Number(size),
        leverage
      });
      setOk(true);
      setResult(JSON.stringify(response, null, 2));
      const refreshed = await get<{ positions: GainsPosition[] }>(
        "/api/gains/positions"
      );
      setPositions(refreshed.positions);
    } catch (error) {
      setOk(false);
      setResult(
        error instanceof Error ? error.message : "Gains test request failed"
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-200">
          Gains Network — Test Mode
        </h3>
        {status ? (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs ${
              status.configured
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-amber-500/10 text-amber-400"
            }`}
          >
            {status.chain}
            {status.isDemoChain ? " (demo)" : ""}
            {status.configured ? " · ready" : " · keys missing"}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Places a small market order via the agent key and returns the fill —
        verify the position lands on the demo (testnet) environment of
        gains.trade before going live.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="text-xs text-slate-400">
          Market
          <input
            value={market}
            onChange={(event) => setMarket(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
          />
        </label>
        <label className="text-xs text-slate-400">
          Side
          <select
            value={side}
            onChange={(event) => setSide(event.target.value as "long" | "short")}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
          >
            <option value="long">long</option>
            <option value="short">short</option>
          </select>
        </label>
        <label className="text-xs text-slate-400">
          Size
          <input
            value={size}
            onChange={(event) => setSize(event.target.value)}
            inputMode="decimal"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
          />
        </label>
        <label className="text-xs text-slate-400">
          Leverage
          <input
            value={leverage}
            onChange={(event) => setLeverage(event.target.value)}
            inputMode="numeric"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => void runTest()}
        disabled={pending}
        className="mt-4 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
      >
        {pending ? "Placing test order…" : "Send test order (Gains demo)"}
      </button>

      {!status?.configured && status ? (
        <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
          Set GAINS_AGENT_KEY + GAINS_RPC_URL in the server .env (a funded
          testnet agent key works with chain {status.chain}); then restart the
          API.
        </p>
      ) : null}

      {result ? (
        <pre
          className={`mt-3 max-h-56 overflow-auto rounded-lg p-3 font-mono text-xs ${
            ok
              ? "bg-emerald-500/10 text-emerald-300"
              : "bg-rose-500/10 text-rose-300"
          }`}
        >
          {result}
        </pre>
      ) : null}

      {positions && positions.length > 0 ? (
        <div className="mt-4">
          <h4 className="text-xs uppercase tracking-wide text-slate-500">
            Gains positions (agent account)
          </h4>
          <ul className="mt-2 space-y-1.5 text-xs">
            {positions.map((position) => (
              <li
                key={position.id}
                className="flex flex-wrap gap-2 rounded-lg bg-slate-800/60 px-3 py-2 font-mono text-slate-300"
              >
                <span className="text-slate-100">{position.market}</span>
                <span
                  className={position.side === "long" ? "text-emerald-400" : "text-rose-400"}
                >
                  {position.side}
                </span>
                <span>size {position.size}</span>
                <span>{position.leverage}x</span>
                <span>entry {position.openPrice}</span>
                <span className="text-slate-500">{position.status}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
