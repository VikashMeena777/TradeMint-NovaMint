"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/constants";
import { TrendingUp, TrendingDown, Minus, Brain, Clock, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { TradeSignal } from "@/types/database";

interface SignalCardProps {
  signal: TradeSignal;
}

export function SignalCard({ signal }: SignalCardProps) {
  const isBuy = signal.signal_type === "buy";
  const isSell = signal.signal_type === "sell";

  // Store signal in sessionStorage for detail page access
  const handleClick = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`signal_${signal.id}`, JSON.stringify(signal));
    }
  };

  return (
    <Link href={`/signals/${signal.id}`} onClick={handleClick}>
      <div className={cn(
        "glass-card glass-card-hover p-5 transition-all duration-300 cursor-pointer group",
        isBuy && "border-green-500/20",
        isSell && "border-red-500/20"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              "h-2 w-2 rounded-full",
              signal.status === "pending" && "bg-amber-400 animate-pulse",
              signal.status === "approved" && "bg-green-400",
              signal.status === "expired" && "bg-gray-400"
            )} />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              {signal.exchange}
            </span>
          </div>
          <Badge className={cn(
            "text-xs font-bold",
            isBuy && "bg-green-500/20 text-green-400 border-green-500/30",
            isSell && "bg-red-500/20 text-red-400 border-red-500/30",
            !isBuy && !isSell && "bg-amber-500/20 text-amber-400 border-amber-500/30"
          )}>
            {isBuy && <TrendingUp className="mr-1 h-3 w-3" />}
            {isSell && <TrendingDown className="mr-1 h-3 w-3" />}
            {!isBuy && !isSell && <Minus className="mr-1 h-3 w-3" />}
            {signal.signal_type.toUpperCase()}
          </Badge>
        </div>

        {/* Symbol */}
        <div className="mb-1 flex items-center justify-between">
          <span className="text-lg font-bold">{signal.symbol}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Prices */}
        <div className="grid grid-cols-3 gap-3 text-sm mb-4">
          <div>
            <div className="text-muted-foreground text-xs mb-0.5">Entry</div>
            <div className="font-mono font-semibold">
              {signal.entry_price ? formatINR(signal.entry_price) : "—"}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs mb-0.5">Stop Loss</div>
            <div className="font-mono font-semibold text-red-400">
              {signal.stop_loss ? formatINR(signal.stop_loss) : "—"}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs mb-0.5">Target</div>
            <div className="font-mono font-semibold text-green-400">
              {signal.take_profit ? formatINR(signal.take_profit) : "—"}
            </div>
          </div>
        </div>

        {/* Confidence + Meta */}
        <div className="flex items-center justify-between border-t border-white/5 pt-3">
          <div className="flex items-center gap-2">
            <Brain className="h-3.5 w-3.5 text-purple-400" />
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-green-500"
                style={{ width: `${signal.confidence_score}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-purple-300">
              {signal.confidence_score}%
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {new Date(signal.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>

        {/* Risk/Reward */}
        {signal.risk_reward_ratio && (
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">R:R Ratio</span>
            <span className="font-mono text-foreground">1:{signal.risk_reward_ratio.toFixed(1)}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
