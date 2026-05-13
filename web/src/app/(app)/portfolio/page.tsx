"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Briefcase, TrendingUp, TrendingDown, DollarSign, BarChart3,
  Plus, ChevronRight, PieChart
} from "lucide-react";
import Link from "next/link";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

interface Position {
  id: string;
  symbol: string;
  exchange: string;
  type: "buy" | "sell";
  entry_price: number;
  current_price: number;
  quantity: number;
  opened_at: string;
  status: "open" | "closed";
  exit_price?: number;
  closed_at?: string;
}

const DEMO_POSITIONS: Position[] = [
  { id: "1", symbol: "RELIANCE", exchange: "NSE", type: "buy", entry_price: 2850, current_price: 2920, quantity: 10, opened_at: "2026-05-10T10:30:00Z", status: "open" },
  { id: "2", symbol: "HDFCBANK", exchange: "NSE", type: "buy", entry_price: 1685, current_price: 1720, quantity: 15, opened_at: "2026-05-08T11:00:00Z", status: "open" },
  { id: "3", symbol: "TCS", exchange: "NSE", type: "sell", entry_price: 3920, current_price: 3850, quantity: 5, opened_at: "2026-05-09T09:45:00Z", status: "open" },
  { id: "4", symbol: "INFY", exchange: "NSE", type: "buy", entry_price: 1450, current_price: 1480, quantity: 20, opened_at: "2026-05-05T10:15:00Z", status: "closed", exit_price: 1520, closed_at: "2026-05-07T14:30:00Z" },
  { id: "5", symbol: "ICICIBANK", exchange: "NSE", type: "buy", entry_price: 1180, current_price: 1210, quantity: 25, opened_at: "2026-05-03T11:30:00Z", status: "closed", exit_price: 1210, closed_at: "2026-05-06T15:00:00Z" },
];

function calculatePnL(pos: Position): { amount: number; percent: number } {
  const exitOrCurrent = pos.status === "closed" && pos.exit_price ? pos.exit_price : pos.current_price;
  const multiplier = pos.type === "buy" ? 1 : -1;
  const amount = (exitOrCurrent - pos.entry_price) * pos.quantity * multiplier;
  const percent = ((exitOrCurrent - pos.entry_price) / pos.entry_price) * 100 * multiplier;
  return { amount, percent };
}

function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function PositionCard({ position }: { position: Position }) {
  const pnl = calculatePnL(position);
  const isProfit = pnl.amount >= 0;

  return (
    <motion.div variants={fadeUp} className="glass-card p-4 glass-card-hover">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={position.type === "buy"
            ? "border-green-500/30 text-green-400 bg-green-500/10"
            : "border-red-500/30 text-red-400 bg-red-500/10"
          }>
            {position.type === "buy" ? "LONG" : "SHORT"}
          </Badge>
          <span className="font-bold">{position.symbol}</span>
          <span className="text-xs text-muted-foreground">{position.exchange}</span>
        </div>
        <Badge variant="outline" className={position.status === "open"
          ? "border-blue-500/30 text-blue-400 bg-blue-500/10"
          : "border-gray-500/30 text-gray-400 bg-gray-500/10"
        }>
          {position.status}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm mb-3">
        <div>
          <div className="text-xs text-muted-foreground">Entry</div>
          <div className="font-mono">{formatINR(position.entry_price)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{position.status === "closed" ? "Exit" : "Current"}</div>
          <div className="font-mono">
            {formatINR(position.status === "closed" && position.exit_price ? position.exit_price : position.current_price)}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Qty</div>
          <div className="font-mono">{position.quantity}</div>
        </div>
      </div>

      <div className={`flex items-center justify-between p-2 rounded-lg ${isProfit ? "bg-green-500/10" : "bg-red-500/10"}`}>
        <span className="text-xs text-muted-foreground">Paper P&L</span>
        <div className="flex items-center gap-2">
          {isProfit ? <TrendingUp className="h-3.5 w-3.5 text-green-400" /> : <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
          <span className={`font-mono font-semibold text-sm ${isProfit ? "text-green-400" : "text-red-400"}`}>
            {isProfit ? "+" : ""}{formatINR(pnl.amount)} ({isProfit ? "+" : ""}{pnl.percent.toFixed(1)}%)
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function PortfolioPage() {
  const [positions] = useState<Position[]>(DEMO_POSITIONS);
  const openPositions = positions.filter(p => p.status === "open");
  const closedPositions = positions.filter(p => p.status === "closed");

  const totalInvested = openPositions.reduce((s, p) => s + p.entry_price * p.quantity, 0);
  const totalPnLOpen = openPositions.reduce((s, p) => s + calculatePnL(p).amount, 0);
  const totalPnLClosed = closedPositions.reduce((s, p) => s + calculatePnL(p).amount, 0);
  const winRate = closedPositions.length > 0
    ? Math.round((closedPositions.filter(p => calculatePnL(p).amount >= 0).length / closedPositions.length) * 100)
    : 0;

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-purple-400" /> Paper Portfolio
        </h1>
        <p className="text-sm text-muted-foreground">Track signal performance with simulated P&L · Not real money</p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <DollarSign className="h-3.5 w-3.5" /> Invested
          </div>
          <div className="font-mono font-bold text-lg">{formatINR(totalInvested)}</div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <TrendingUp className="h-3.5 w-3.5" /> Unrealized P&L
          </div>
          <div className={`font-mono font-bold text-lg ${totalPnLOpen >= 0 ? "text-green-400" : "text-red-400"}`}>
            {totalPnLOpen >= 0 ? "+" : ""}{formatINR(totalPnLOpen)}
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <BarChart3 className="h-3.5 w-3.5" /> Realized P&L
          </div>
          <div className={`font-mono font-bold text-lg ${totalPnLClosed >= 0 ? "text-green-400" : "text-red-400"}`}>
            {totalPnLClosed >= 0 ? "+" : ""}{formatINR(totalPnLClosed)}
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <PieChart className="h-3.5 w-3.5" /> Win Rate
          </div>
          <div className="font-mono font-bold text-lg text-purple-400">{winRate}%</div>
        </div>
      </motion.div>

      {/* Positions */}
      <Tabs defaultValue="open" className="space-y-4">
        <TabsList className="bg-muted border border-border">
          <TabsTrigger value="open" className="data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400">
            Open ({openPositions.length})
          </TabsTrigger>
          <TabsTrigger value="closed" className="data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400">
            Closed ({closedPositions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open">
          <motion.div variants={stagger} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {openPositions.map(pos => <PositionCard key={pos.id} position={pos} />)}
          </motion.div>
          {openPositions.length === 0 && (
            <div className="glass-card p-12 text-center">
              <Briefcase className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm mb-3">No open positions</p>
              <Link href="/signals">
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="mr-1 h-3 w-3" /> Generate a Signal
                </Button>
              </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="closed">
          <motion.div variants={stagger} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {closedPositions.map(pos => <PositionCard key={pos.id} position={pos} />)}
          </motion.div>
          {closedPositions.length === 0 && (
            <div className="glass-card p-12 text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">No closed positions yet</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <motion.div variants={fadeUp} className="glass-card p-4 border-amber-500/20 bg-amber-500/5">
        <p className="text-xs text-amber-400/80">
          ⚠️ <strong>Paper Trading Only</strong> — This is a simulated portfolio for tracking AI signal performance. No real money is involved. Past performance does not guarantee future results.
        </p>
      </motion.div>
    </motion.div>
  );
}
