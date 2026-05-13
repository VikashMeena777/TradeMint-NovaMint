"use client";

import { motion } from "framer-motion";
import { SignalCard } from "@/components/dashboard/signal-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StockChart } from "@/components/charts/stock-chart";
import { Zap, Brain, Filter, Loader2, Search, BarChart3, X } from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { TradeSignal } from "@/types/database";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

const DEMO_SIGNALS: TradeSignal[] = [
  { id: "1", user_id: "demo", symbol: "RELIANCE", exchange: "NSE", signal_type: "buy", confidence_score: 82, entry_price: 2850.50, stop_loss: 2780.00, take_profit: 3050.00, position_size: 10, lot_size: 1, risk_reward_ratio: 2.8, reasoning: { fundamental: "Strong diversified revenue from Jio, Retail, and O2C segments", technical: "RSI neutral, MACD flattening — potential reversal setup", sentiment: "Positive institutional flow with consistent FII buying", news: "New energy capex and Jio 5G monetization as key catalysts" }, agents_contributions: {}, debate_summary: "BULL: Jio growth + refinery margin expansion\n\nBEAR: Crude volatility + petrochemical overcapacity", risk_notes: "Position approved. Stop at ₹2,780 (2.5% risk). R:R 2.8:1.", status: "pending", expires_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null },
  { id: "2", user_id: "demo", symbol: "TCS", exchange: "NSE", signal_type: "sell", confidence_score: 71, entry_price: 3920, stop_loss: 4020, take_profit: 3750, position_size: 5, lot_size: 1, risk_reward_ratio: 1.7, reasoning: { fundamental: "Revenue growth slowing in key verticals", technical: "Bearish RSI divergence on weekly chart", sentiment: "Mixed sentiment — IT sector rotation concerns", news: "Q4 results pending — margin pressure expected" }, agents_contributions: {}, debate_summary: "BULL: Long-term digital transformation tailwind\n\nBEAR: Bearish RSI divergence, BFSI spending slowdown", risk_notes: "Moderate risk. Stop at ₹4,020. R:R 1.7:1.", status: "pending", expires_at: null, created_at: new Date(Date.now() - 3600000).toISOString(), updated_at: new Date().toISOString(), deleted_at: null },
  { id: "3", user_id: "demo", symbol: "HDFCBANK", exchange: "NSE", signal_type: "buy", confidence_score: 88, entry_price: 1685, stop_loss: 1640, take_profit: 1800, position_size: 15, lot_size: 1, risk_reward_ratio: 2.6, reasoning: { fundamental: "Best-in-class asset quality, growing NIMs", technical: "Trading near strong support zone with positive divergence", sentiment: "Institutional accumulation detected", news: "RBI rate cut cycle to boost credit growth" }, agents_contributions: {}, debate_summary: "BULL: RBI rate cut tailwind + credit growth\n\nBEAR: NPA concerns in unsecured lending", risk_notes: "Position approved. Excellent R:R. Stop at ₹1,640.", status: "approved", expires_at: null, created_at: new Date(Date.now() - 7200000).toISOString(), updated_at: new Date().toISOString(), deleted_at: null },
];

export default function SignalsPage() {
  return (
    <Suspense fallback={null}>
      <SignalsContent />
    </Suspense>
  );
}

function SignalsContent() {
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<"all" | "buy" | "sell" | "hold">("all");
  const [generating, setGenerating] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [signals, setSignals] = useState<TradeSignal[]>(DEMO_SIGNALS);
  const [agentStatus, setAgentStatus] = useState<string>("");
  const [chartSymbol, setChartSymbol] = useState<string | null>(null);

  // Pre-fill symbol from URL params (from watchlist)
  useEffect(() => {
    const s = searchParams.get("symbol");
    if (s) {
      setSymbol(s.toUpperCase());
      setChartSymbol(s.toUpperCase());
    }
  }, [searchParams]);

  const filtered = filter === "all" ? signals : signals.filter(s => s.signal_type === filter);

  const handleGenerate = async () => {
    const sym = symbol.trim().toUpperCase();
    if (!sym) { toast.error("Enter a stock symbol (e.g. RELIANCE, TCS)"); return; }

    setGenerating(true);
    setAgentStatus("Fetching market data...");
    setChartSymbol(sym);

    try {
      const stages = [
        "Fetching market data...",
        "Running Fundamental Analyst...",
        "Running Technical Analyst...",
        "Running Sentiment & News Analysts...",
        "Bull vs Bear Debate...",
        "Trader synthesizing...",
        "Risk Manager validating...",
      ];
      let stageIdx = 0;
      const interval = setInterval(() => {
        stageIdx = Math.min(stageIdx + 1, stages.length - 1);
        setAgentStatus(stages[stageIdx]);
      }, 3000);

      const res = await fetch("/api/signals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: sym, exchange: "NSE" }),
      });

      clearInterval(interval);
      const data = await res.json();

      if (data.error && data.confidence_score === 0) {
        toast.error("AI Engine offline — start it with: cd ai-engine && python main.py");
        setAgentStatus("");
        setGenerating(false);
        return;
      }

      const newSignal: TradeSignal = {
        id: crypto.randomUUID(),
        user_id: "local",
        symbol: data.symbol || sym,
        exchange: data.exchange || "NSE",
        signal_type: data.signal_type || "hold",
        confidence_score: data.confidence_score || 0,
        entry_price: data.prices?.entry || null,
        stop_loss: data.prices?.stop_loss || null,
        take_profit: data.prices?.take_profit || null,
        position_size: data.position_size || null,
        lot_size: 1,
        risk_reward_ratio: data.prices?.risk_reward_ratio || null,
        reasoning: data.reasoning || {},
        agents_contributions: data.agents || {},
        debate_summary: data.debate_summary || null,
        risk_notes: data.risk_notes || null,
        status: "pending",
        expires_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      };

      setSignals(prev => [newSignal, ...prev]);
      toast.success(`Signal generated for ${sym}: ${data.signal_type?.toUpperCase()} (${data.confidence_score}% confidence)`);
      setSymbol("");
    } catch {
      toast.error("Failed to connect to AI engine");
    } finally {
      setGenerating(false);
      setAgentStatus("");
    }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="h-6 w-6 text-purple-400" /> AI Signals
        </h1>
        <p className="text-sm text-muted-foreground">Trade signals generated by 8 AI agents · Groq + NVIDIA NIM + OpenRouter</p>
      </motion.div>

      {/* Generate Signal Form */}
      <motion.div variants={fadeUp} className="glass-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Enter stock symbol (e.g. RELIANCE, TCS, INFY)"
              value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              className="pl-10 bg-muted border-border uppercase"
              disabled={generating} />
          </div>
          <Button onClick={handleGenerate} disabled={generating}
            className="bg-purple-600 hover:bg-purple-700 ai-glow min-w-[180px]">
            {generating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</> : <><Brain className="mr-2 h-4 w-4" /> Generate Signal</>}
          </Button>
        </div>
        {agentStatus && (
          <div className="mt-3 flex items-center gap-2 text-sm text-purple-400">
            <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
            {agentStatus}
          </div>
        )}
      </motion.div>

      {/* Chart */}
      {chartSymbol && (
        <motion.div variants={fadeUp} className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4 text-purple-400" />
              {chartSymbol} — Price Chart
            </h3>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setChartSymbol(null)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <StockChart symbol={chartSymbol} height={300} />
        </motion.div>
      )}

      {/* Filters */}
      <motion.div variants={fadeUp} className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {(["all", "buy", "sell", "hold"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${filter === f ? "bg-purple-600/20 text-purple-400 border border-purple-500/30" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <Badge variant="outline" className="ml-auto text-xs">{filtered.length} signals</Badge>
      </motion.div>

      {/* Signal Grid */}
      <motion.div variants={fadeUp} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((signal) => (
          <motion.div key={signal.id} variants={fadeUp}>
            <SignalCard signal={signal} />
          </motion.div>
        ))}
      </motion.div>

      {filtered.length === 0 && (
        <motion.div variants={fadeUp} className="glass-card p-12 text-center">
          <Zap className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold mb-1">No {filter} signals</h3>
          <p className="text-sm text-muted-foreground">Try a different filter or generate new signals.</p>
        </motion.div>
      )}
    </motion.div>
  );
}
