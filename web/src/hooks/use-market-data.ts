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
  data_points: number;
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
    // Refresh every 60 seconds during market hours
    const interval = setInterval(fetchData, 60000);
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
    const interval = setInterval(fetchAll, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [symbols.map(s => s.symbol).join(",")]);

  return { data, loading };
}
