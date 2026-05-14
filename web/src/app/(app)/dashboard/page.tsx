"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SignalCard } from "@/components/dashboard/signal-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMultiMarketData } from "@/hooks/use-market-data";
import { formatINR, formatPercent } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import {
  TrendingUp, TrendingDown, BarChart3, Zap, Brain,
  Activity, Target, ShieldCheck, Loader2, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import type { TradeSignal } from "@/types/database";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

const INDEX_SYMBOLS = [
  { symbol: "^NSEI", label: "NIFTY 50" },
  { symbol: "^BSESN", label: "SENSEX" },
  { symbol: "^NSEBANK", label: "BANK NIFTY" },
  { symbol: "^CNXIT", label: "NIFTY IT" },
];

export default function DashboardPage() {
  const { data: indexData, loading: indexLoading } = useMultiMarketData(INDEX_SYMBOLS);
  const [signals, setSignals] = useState<TradeSignal[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchSignals() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSignalsLoading(false); return; }

      const { data } = await supabase
        .from("trade_signals")
        .select("*")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(6);

      setSignals((data as TradeSignal[]) || []);
      setSignalsLoading(false);
    }
    fetchSignals();
  }, []);

  const totalSignals = signals.length;
  const winRate = totalSignals > 0
    ? Math.round((signals.filter(s => s.signal_type === "buy").length / totalSignals) * 100)
    : 0;
  const activeCount = signals.filter(s => s.status === "pending" || s.status === "approved").length;

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time market overview & AI signals</p>
        </div>
        <Link href="/signals">
          <Button className="bg-purple-600 hover:bg-purple-700 ai-glow">
            <Brain className="mr-2 h-4 w-4" /> Generate Signal
          </Button>
        </Link>
      </motion.div>

      {/* Market Indices — LIVE */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {INDEX_SYMBOLS.map(({ symbol, label }) => {
          const d = indexData[symbol];
          const isUp = d ? d.change_pct >= 0 : true;
          return (
            <div key={symbol} className="glass-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">{label}</span>
                {indexLoading && !d ? (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                ) : (
                  <Badge variant="outline" className={`text-[10px] ${isUp ? "border-green-500/30 text-green-600 dark:text-green-400" : "border-red-500/30 text-red-600 dark:text-red-400"}`}>
                    {isUp ? "▲" : "▼"} {d ? formatPercent(d.change_pct) : "—"}
                  </Badge>
                )}
              </div>
              <div className="text-lg font-bold font-mono tabular-nums">
                {d ? formatINR(d.current_price) : (
                  <div className="h-6 w-24 bg-muted rounded animate-pulse" />
                )}
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Signals", value: String(totalSignals), icon: Zap, color: "text-purple-600 dark:text-purple-400" },
          { label: "Buy Signals", value: `${winRate}%`, icon: Target, color: "text-green-600 dark:text-green-400" },
          { label: "Active", value: String(activeCount), icon: Activity, color: "text-amber-600 dark:text-amber-400" },
          { label: "Risk Score", value: totalSignals > 0 ? "Low" : "—", icon: ShieldCheck, color: "text-blue-600 dark:text-blue-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{label}</span>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div className="text-xl font-bold mt-1">{signalsLoading ? "..." : value}</div>
          </div>
        ))}
      </motion.div>

      {/* Recent Signals */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" /> Recent Signals
          </h2>
          <Link href="/signals">
            <Button variant="ghost" size="sm" className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300">
              View All →
            </Button>
          </Link>
        </div>

        {signalsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card p-6 h-40 animate-pulse">
                <div className="h-4 w-20 bg-muted rounded mb-3" />
                <div className="h-6 w-32 bg-muted rounded mb-2" />
                <div className="h-3 w-full bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : signals.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {signals.slice(0, 3).map((signal) => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        ) : (
          <div className="glass-card p-8 text-center">
            <Brain className="h-12 w-12 mx-auto mb-3 text-purple-600 dark:text-purple-400 opacity-60" />
            <h3 className="font-semibold mb-1">No signals yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Generate your first AI-powered trade signal to get started.
            </p>
            <Link href="/signals">
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Zap className="mr-2 h-4 w-4" /> Generate First Signal
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </motion.div>

      {/* Agent Pipeline Status */}
      <motion.div variants={fadeUp} className="glass-card p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" /> 8-Agent Pipeline
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { name: "Fundamental", status: "ready", color: "bg-green-500" },
            { name: "Technical", status: "ready", color: "bg-green-500" },
            { name: "Sentiment", status: "ready", color: "bg-green-500" },
            { name: "News", status: "ready", color: "bg-green-500" },
            { name: "Bull Research", status: "ready", color: "bg-green-500" },
            { name: "Bear Research", status: "ready", color: "bg-green-500" },
            { name: "Trader", status: "ready", color: "bg-green-500" },
            { name: "Risk Mgr", status: "ready", color: "bg-green-500" },
          ].map(({ name, status, color }) => (
            <div key={name} className="flex items-center gap-2 text-xs">
              <div className={`h-2 w-2 rounded-full ${color}`} />
              <span>{name}</span>
              <span className="text-muted-foreground ml-auto">{status}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
