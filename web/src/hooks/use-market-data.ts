"use client";

import { useState, useEffect } from "react";

interface MarketData {
  symbol: string;
  exchange: string;
  current_price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  change_pct: number;
  data_points?: number;
  source?: string; // "angel_one" | "yahoo_finance"
}

export function useMarketData(symbol: string, exchange: string = "NSE") {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        // Try live-price first (Angel One real-time → Yahoo fallback)
        const liveRes = await fetch(`/api/live-price/${symbol}?exchange=${exchange}`);
        if (liveRes.ok) {
          const liveData = await liveRes.json();
          if (!cancelled) {
            setData({
              symbol: liveData.symbol,
              exchange: liveData.exchange,
              current_price: liveData.ltp || liveData.close,
              open: liveData.open,
              high: liveData.high,
              low: liveData.low,
              volume: liveData.volume,
              change_pct: liveData.open > 0
                ? ((liveData.ltp || liveData.close) - liveData.open) / liveData.open * 100
                : 0,
              source: liveData.source,
            });
            setLoading(false);
          }
          return;
        }

        // Fallback to market-data endpoint
        const res = await fetch(`/api/market-data/${symbol}?exchange=${exchange}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError("AI engine offline");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    // Refresh every 15 seconds when Angel One is live, 60s for Yahoo
    const interval = setInterval(fetchData, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [symbol, exchange]);

  return { data, loading, error };
}

export function useMultiMarketData(symbols: { symbol: string; label: string }[]) {
  const [data, setData] = useState<Record<string, MarketData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      setLoading(true);
      const results: Record<string, MarketData> = {};
      await Promise.allSettled(
        symbols.map(async ({ symbol }) => {
          try {
            // Try live price first
            const liveRes = await fetch(`/api/live-price/${symbol}`);
            if (liveRes.ok) {
              const liveData = await liveRes.json();
              results[symbol] = {
                symbol: liveData.symbol,
                exchange: liveData.exchange,
                current_price: liveData.ltp || liveData.close,
                open: liveData.open,
                high: liveData.high,
                low: liveData.low,
                volume: liveData.volume,
                change_pct: liveData.open > 0
                  ? ((liveData.ltp || liveData.close) - liveData.open) / liveData.open * 100
                  : 0,
                source: liveData.source,
              };
              return;
            }
            // Fallback
            const res = await fetch(`/api/market-data/${symbol}`);
            if (res.ok) {
              results[symbol] = await res.json();
            }
          } catch { /* skip failed */ }
        })
      );
      if (!cancelled) {
        setData(results);
        setLoading(false);
      }
    }

    fetchAll();
    const interval = setInterval(fetchAll, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [symbols.map(s => s.symbol).join(",")]);

  return { data, loading };
}
