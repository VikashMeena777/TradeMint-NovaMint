"use client";

import { useEffect, useState, Suspense } from "react";
import { motion } from "framer-motion";
import { SignalCard } from "@/components/dashboard/signal-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StockChart } from "@/components/charts/stock-chart";
import { createClient } from "@/lib/supabase/client";
import {
  Zap, Brain, Filter, Loader2, Search, BarChart3, X,
  ArrowRight, TrendingUp, Sparkles,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { TradeSignal } from "@/types/database";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

export default function SignalsPage() {
  return (
    <Suspense fallback={null}>
      <SignalsContent />
    </Suspense>
  );
}

function SignalsContent() {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [filter, setFilter] = useState<"all" | "buy" | "sell" | "hold">("all");
  const [generating, setGenerating] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [signals, setSignals] = useState<TradeSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentStatus, setAgentStatus] = useState<string>("");
  const [chartSymbol, setChartSymbol] = useState<string | null>(null);

  // Fetch real signals from Supabase
  useEffect(() => {
    async function fetchSignals() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("trade_signals")
        .select("*")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);

      setSignals((data as TradeSignal[]) || []);
      setLoading(false);
    }
    fetchSignals();
  }, []);

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
    setAgentStatus("Initializing AI pipeline...");
    setChartSymbol(sym);

    try {
      const stages = [
        "📊 Fetching 6-month market data...",
        "🔬 Fundamental Analyst evaluating...",
        "📈 Technical Analyst computing indicators...",
        "🧠 Sentiment & News Analysts running...",
        "⚔️ Bull vs Bear Debate in progress...",
        "🤝 Trader synthesizing all inputs...",
        "🛡️ Risk Manager validating...",
        "✨ Finalizing signal...",
      ];
      let stageIdx = 0;
      const interval = setInterval(() => {
        stageIdx = Math.min(stageIdx + 1, stages.length - 1);
        setAgentStatus(stages[stageIdx]);
      }, 4000);

      const res = await fetch("/api/signals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: sym, exchange: "NSE" }),
      });

      clearInterval(interval);
      const data = await res.json();

      if (data.error && data.confidence_score === 0) {
        toast.error("AI Engine offline — check Render deployment");
        setAgentStatus("");
        setGenerating(false);
        return;
      }

      // Save signal to Supabase
      const { data: { user } } = await supabase.auth.getUser();

      const newSignal: TradeSignal = {
        id: crypto.randomUUID(),
        user_id: user?.id || "local",
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

      // Save to Supabase for persistence
      if (user) {
        await supabase.from("trade_signals").insert({
          ...newSignal,
          id: undefined, // let Supabase generate UUID
        }).select().single().then(({ data: saved }) => {
          if (saved) newSignal.id = (saved as Record<string, string>).id;
        });
      }

      setSignals(prev => [newSignal, ...prev]);

      const emoji = data.signal_type === "buy" ? "🟢" : data.signal_type === "sell" ? "🔴" : "🟡";
      toast.success(`${emoji} ${sym}: ${data.signal_type?.toUpperCase()} — ${data.confidence_score}% confidence`);
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
          <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" /> AI Signals
        </h1>
        <p className="text-sm text-muted-foreground">8 AI agents analyze → debate → decide · Powered by Groq + NVIDIA + OpenRouter</p>
      </motion.div>

      {/* Generate Signal Form */}
      <motion.div variants={fadeUp} className="glass-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Enter stock symbol (e.g. RELIANCE, TCS, INFY)"
              value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              className="pl-10 bg-secondary border-border uppercase"
              disabled={generating} />
          </div>
          <Button onClick={handleGenerate} disabled={generating}
            className="bg-purple-600 hover:bg-purple-700 ai-glow min-w-[180px]">
            {generating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</> : <><Brain className="mr-2 h-4 w-4" /> Generate Signal</>}
          </Button>
        </div>
        {agentStatus && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3 flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400"
          >
            <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
            {agentStatus}
          </motion.div>
        )}
      </motion.div>

      {/* Chart */}
      {chartSymbol && (
        <motion.div variants={fadeUp} className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
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
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              filter === f
                ? "bg-purple-600/20 text-purple-600 dark:text-purple-400 border border-purple-500/30"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <Badge variant="outline" className="ml-auto text-xs">{filtered.length} signals</Badge>
      </motion.div>

      {/* Signal Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card p-6 h-44 animate-pulse">
              <div className="h-4 w-20 bg-muted rounded mb-3" />
              <div className="h-6 w-32 bg-muted rounded mb-2" />
              <div className="h-3 w-full bg-muted rounded mb-2" />
              <div className="h-3 w-2/3 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <motion.div variants={fadeUp} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((signal) => (
            <motion.div key={signal.id} variants={fadeUp}>
              <SignalCard signal={signal} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div variants={fadeUp} className="glass-card p-12 text-center">
          {filter === "all" ? (
            <>
              <Sparkles className="mx-auto h-14 w-14 text-purple-600/30 dark:text-purple-400/30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No signals generated yet</h3>
              <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
                Enter a stock symbol above and click &quot;Generate Signal&quot; to let 8 AI agents analyze, debate, and produce a trade recommendation.
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-1 rounded bg-muted">RELIANCE</span>
                <span className="px-2 py-1 rounded bg-muted">TCS</span>
                <span className="px-2 py-1 rounded bg-muted">HDFCBANK</span>
                <span className="px-2 py-1 rounded bg-muted">INFY</span>
                <span className="px-2 py-1 rounded bg-muted">NIFTY</span>
              </div>
            </>
          ) : (
            <>
              <Zap className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-1">No {filter} signals</h3>
              <p className="text-sm text-muted-foreground">Try a different filter or generate new signals.</p>
            </>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
