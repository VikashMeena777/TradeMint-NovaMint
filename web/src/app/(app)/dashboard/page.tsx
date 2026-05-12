"use client";

import { motion } from "framer-motion";
import { SignalCard } from "@/components/dashboard/signal-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMultiMarketData } from "@/hooks/use-market-data";
import { formatINR, formatPercent } from "@/lib/constants";
import {
  TrendingUp, TrendingDown, BarChart3, Zap, Brain,
  Activity, Target, ShieldCheck, Loader2
} from "lucide-react";
import Link from "next/link";
import type { TradeSignal } from "@/types/database";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

const DEMO_SIGNALS: TradeSignal[] = [
  { id: "1", user_id: "demo", symbol: "RELIANCE", exchange: "NSE", signal_type: "buy", confidence_score: 82, entry_price: 2850.50, stop_loss: 2780.00, take_profit: 3050.00, position_size: 10, lot_size: 1, risk_reward_ratio: 2.8, reasoning: {}, agents_contributions: {}, debate_summary: "Jio growth + refinery margin expansion", risk_notes: "Crude volatility", status: "pending", expires_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null },
  { id: "2", user_id: "demo", symbol: "TCS", exchange: "NSE", signal_type: "sell", confidence_score: 71, entry_price: 3920, stop_loss: 4020, take_profit: 3750, position_size: 5, lot_size: 1, risk_reward_ratio: 1.7, reasoning: {}, agents_contributions: {}, debate_summary: "Bearish RSI divergence on weekly chart", risk_notes: "Q4 results pending", status: "pending", expires_at: null, created_at: new Date(Date.now() - 3600000).toISOString(), updated_at: new Date().toISOString(), deleted_at: null },
  { id: "3", user_id: "demo", symbol: "HDFCBANK", exchange: "NSE", signal_type: "buy", confidence_score: 88, entry_price: 1685, stop_loss: 1640, take_profit: 1800, position_size: 15, lot_size: 1, risk_reward_ratio: 2.6, reasoning: {}, agents_contributions: {}, debate_summary: "RBI rate cut tailwind + credit growth", risk_notes: "NPA watch", status: "approved", expires_at: null, created_at: new Date(Date.now() - 7200000).toISOString(), updated_at: new Date().toISOString(), deleted_at: null },
];

const INDEX_SYMBOLS = [
  { symbol: "^NSEI", label: "NIFTY 50" },
  { symbol: "^BSESN", label: "SENSEX" },
  { symbol: "^NSEBANK", label: "BANK NIFTY" },
  { symbol: "^CNXIT", label: "NIFTY IT" },
];

export default function DashboardPage() {
  const { data: indexData, loading: indexLoading } = useMultiMarketData(INDEX_SYMBOLS);

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
                  <Badge variant="outline" className={`text-[10px] ${isUp ? "border-green-500/30 text-green-400" : "border-red-500/30 text-red-400"}`}>
                    {isUp ? "▲" : "▼"} {d ? formatPercent(d.change_pct) : "—"}
                  </Badge>
                )}
              </div>
              <div className="text-lg font-bold font-mono tabular-nums">
                {d ? formatINR(d.current_price) : (
                  <div className="h-6 w-24 bg-white/5 rounded animate-pulse" />
                )}
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Signals", value: "47", icon: Zap, color: "text-purple-400" },
          { label: "Win Rate", value: "73%", icon: Target, color: "text-green-400" },
          { label: "Active Trades", value: "3", icon: Activity, color: "text-amber-400" },
          { label: "Risk Score", value: "Low", icon: ShieldCheck, color: "text-blue-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{label}</span>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div className="text-xl font-bold mt-1">{value}</div>
          </div>
        ))}
      </motion.div>

      {/* Recent Signals */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-400" /> Recent Signals
          </h2>
          <Link href="/signals">
            <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300">
              View All →
            </Button>
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {DEMO_SIGNALS.map((signal) => (
            <SignalCard key={signal.id} signal={signal} />
          ))}
        </div>
      </motion.div>

      {/* Agent Pipeline Status */}
      <motion.div variants={fadeUp} className="glass-card p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Brain className="h-4 w-4 text-purple-400" /> 8-Agent Pipeline
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
