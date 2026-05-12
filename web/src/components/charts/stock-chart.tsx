"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries, HistogramSeries } from "lightweight-charts";
import { Loader2 } from "lucide-react";

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface StockChartProps {
  symbol: string;
  exchange?: string;
  period?: string;
  height?: number;
}

export function StockChart({ symbol, exchange = "NSE", period = "6mo", height = 400 }: StockChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let chart: ReturnType<typeof createChart> | null = null;

    async function loadChart() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/chart-data/${symbol}?exchange=${exchange}&period=${period}`);
        if (!res.ok) throw new Error("Failed to fetch chart data");
        const { candles } = await res.json() as { candles: CandleData[] };

        if (!containerRef.current || !candles?.length) {
          setError("No chart data available");
          setLoading(false);
          return;
        }

        chart = createChart(containerRef.current, {
          width: containerRef.current.clientWidth,
          height,
          layout: {
            background: { color: "transparent" },
            textColor: "rgba(255,255,255,0.5)",
            fontSize: 11,
          },
          grid: {
            vertLines: { color: "rgba(255,255,255,0.04)" },
            horzLines: { color: "rgba(255,255,255,0.04)" },
          },
          crosshair: {
            vertLine: { color: "rgba(139,92,246,0.3)", labelBackgroundColor: "#7c3aed" },
            horzLine: { color: "rgba(139,92,246,0.3)", labelBackgroundColor: "#7c3aed" },
          },
          rightPriceScale: {
            borderColor: "rgba(255,255,255,0.1)",
          },
          timeScale: {
            borderColor: "rgba(255,255,255,0.1)",
            timeVisible: false,
          },
        });

        // Candlestick series
        const candleSeries = chart.addSeries(CandlestickSeries, {
          upColor: "#22c55e",
          downColor: "#ef4444",
          borderDownColor: "#ef4444",
          borderUpColor: "#22c55e",
          wickDownColor: "#ef4444",
          wickUpColor: "#22c55e",
        });

        candleSeries.setData(candles.map(c => ({
          time: c.time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        })));

        // Volume series
        const volumeSeries = chart.addSeries(HistogramSeries, {
          priceFormat: { type: "volume" },
          priceScaleId: "volume",
        });

        volumeSeries.priceScale().applyOptions({
          scaleMargins: { top: 0.85, bottom: 0 },
        });

        volumeSeries.setData(candles.map(c => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
        })));

        chart.timeScale().fitContent();

        // Responsive resize
        const observer = new ResizeObserver(() => {
          if (containerRef.current && chart) {
            chart.applyOptions({ width: containerRef.current.clientWidth });
          }
        });
        observer.observe(containerRef.current);

        setLoading(false);
      } catch (e) {
        setError("Chart unavailable — AI engine offline");
        setLoading(false);
      }
    }

    loadChart();
    return () => { chart?.remove(); };
  }, [symbol, exchange, period, height]);

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/50 z-10 rounded-lg">
          <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground z-10">
          {error}
        </div>
      )}
      <div ref={containerRef} style={{ height }} className="rounded-lg overflow-hidden" />
    </div>
  );
}
