"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatINR } from "@/lib/constants";
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus, Brain, Shield,
  Target, AlertTriangle, Clock, BarChart3, Zap, CheckCircle, XCircle
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { TradeSignal } from "@/types/database";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

// Store signals in sessionStorage so detail page can access them
function getStoredSignal(id: string): TradeSignal | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem(`signal_${id}`);
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

const DEMO_SIGNAL: TradeSignal = {
  id: "demo-1", user_id: "demo", symbol: "RELIANCE", exchange: "NSE",
  signal_type: "buy", confidence_score: 82, entry_price: 1364.00,
  stop_loss: 1330.00, take_profit: 1440.00, position_size: 10, lot_size: 1,
  risk_reward_ratio: 2.24,
  reasoning: {
    fundamental: "Reliance Industries shows strong fundamentals with diversified revenue streams across petrochemicals, telecom (Jio), and retail. Current P/E is reasonable for a large-cap conglomerate.",
    technical: "Price trading below SMA50 (₹1,382) suggesting short-term weakness. RSI at 43.61 is neutral. MACD histogram negative but flattening — potential reversal. Supertrend bullish.",
    sentiment: "Institutional sentiment remains positive with consistent FII buying. Retail sentiment neutral after recent correction from highs.",
    news: "New energy business expansion and Jio platform monetization are key catalysts. No adverse regulatory developments."
  },
  agents_contributions: {},
  debate_summary: "BULL: Strong conglomerate with Jio 5G monetization, new energy capex, and retail expansion providing multi-year growth runway. Correction offers entry below fair value.\n\nBEAR: Near-term margin pressure from petrochemical downcycle. Telecom ARPU growth slowing. Valuation premium relative to ONGC/IOC peers. O2C segment faces global overcapacity.",
  risk_notes: "Position approved with standard parameters. Stop-loss at ₹1,330 represents 2.5% downside (within 5% max). R:R of 2.24 exceeds 1.5 minimum. Volatility normal (ATR 2.4%). No circuit limit concerns.",
  status: "approved", expires_at: null,
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null
};

export default function SignalDetailPage() {
  const params = useParams();
  const signalId = params.id as string;
  const [signal, setSignal] = useState<TradeSignal | null>(null);

  useEffect(() => {
    const stored = getStoredSignal(signalId);
    setSignal(stored || DEMO_SIGNAL);
  }, [signalId]);

  if (!signal) return null;

  const isBuy = signal.signal_type === "buy";
  const isSell = signal.signal_type === "sell";
  const isHold = signal.signal_type === "hold";
  const SignalIcon = isBuy ? TrendingUp : isSell ? TrendingDown : Minus;
  const signalColor = isBuy ? "text-green-400" : isSell ? "text-red-400" : "text-amber-400";
  const signalBg = isBuy ? "bg-green-500/10 border-green-500/30" : isSell ? "bg-red-500/10 border-red-500/30" : "bg-amber-500/10 border-amber-500/30";

  const reasoning = signal.reasoning as Record<string, string>;
  const debateLines = (signal.debate_summary || "").split("\n\n");

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-3xl space-y-6">
      {/* Back + Header */}
      <motion.div variants={fadeUp}>
        <Link href="/signals">
          <Button variant="ghost" size="sm" className="mb-3 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Signals
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{signal.symbol}</h1>
              <Badge className={`${signalBg} ${signalColor} text-sm px-3 py-1`}>
                <SignalIcon className="mr-1 h-4 w-4" />
                {signal.signal_type.toUpperCase()}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {signal.exchange} · Generated {new Date(signal.created_at).toLocaleString("en-IN")}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Confidence</div>
            <div className={`text-3xl font-bold font-mono ${signal.confidence_score >= 70 ? "text-green-400" : signal.confidence_score >= 50 ? "text-amber-400" : "text-red-400"}`}>
              {signal.confidence_score}%
            </div>
          </div>
        </div>
      </motion.div>

      {/* Price Targets */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Entry", value: signal.entry_price, icon: Target, color: "text-purple-400" },
          { label: "Stop Loss", value: signal.stop_loss, icon: AlertTriangle, color: "text-red-400" },
          { label: "Take Profit", value: signal.take_profit, icon: TrendingUp, color: "text-green-400" },
          { label: "R:R Ratio", value: signal.risk_reward_ratio, icon: Shield, color: "text-blue-400", isRatio: true },
        ].map(({ label, value, icon: Icon, color, isRatio }) => (
          <div key={label} className="glass-card p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Icon className={`h-3 w-3 ${color}`} /> {label}
            </div>
            <div className="text-lg font-bold font-mono tabular-nums">
              {value ? (isRatio ? `${value}:1` : formatINR(value)) : "—"}
            </div>
          </div>
        ))}
      </motion.div>

      {/* Trade Details */}
      <motion.div variants={fadeUp} className="glass-card p-5 grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground text-xs mb-1">Position Size</div>
          <div className="font-semibold">{signal.position_size || "—"} shares</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs mb-1">Status</div>
          <Badge variant="outline" className={signal.status === "approved" ? "border-green-500/30 text-green-400" : "border-amber-500/30 text-amber-400"}>
            {signal.status === "approved" ? <CheckCircle className="mr-1 h-3 w-3" /> : <Clock className="mr-1 h-3 w-3" />}
            {signal.status}
          </Badge>
        </div>
        <div>
          <div className="text-muted-foreground text-xs mb-1">Lot Size</div>
          <div className="font-semibold">{signal.lot_size || 1}</div>
        </div>
      </motion.div>

      <Separator className="bg-white/5" />

      {/* Agent Analysis */}
      <motion.div variants={fadeUp}>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5 text-purple-400" /> Agent Analysis
        </h2>
        <div className="space-y-3">
          {[
            { title: "Fundamental Analyst", key: "fundamental", icon: BarChart3, color: "text-blue-400" },
            { title: "Technical Analyst", key: "technical", icon: Zap, color: "text-purple-400" },
            { title: "Sentiment Analyst", key: "sentiment", icon: TrendingUp, color: "text-green-400" },
            { title: "News Analyst", key: "news", icon: AlertTriangle, color: "text-amber-400" },
          ].map(({ title, key, icon: Icon, color }) => (
            <div key={key} className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <h3 className="font-medium text-sm">{title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {reasoning[key] || "Analysis pending — add a Groq API key to enable."}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Bull vs Bear Debate */}
      {signal.debate_summary && (
        <motion.div variants={fadeUp}>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-amber-400" /> Bull vs Bear Debate
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="glass-card p-4 border-l-2 border-green-500/50">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <h3 className="font-medium text-sm text-green-400">Bull Case</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {debateLines[0]?.replace("BULL: ", "") || "—"}
              </p>
            </div>
            <div className="glass-card p-4 border-l-2 border-red-500/50">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-red-400" />
                <h3 className="font-medium text-sm text-red-400">Bear Case</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {debateLines[1]?.replace("BEAR: ", "") || "—"}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Risk Manager Notes */}
      {signal.risk_notes && (
        <motion.div variants={fadeUp} className="glass-card p-5">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-blue-400" /> Risk Manager Assessment
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{signal.risk_notes}</p>
        </motion.div>
      )}
    </motion.div>
  );
}
