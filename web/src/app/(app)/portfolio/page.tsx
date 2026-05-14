"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Briefcase, TrendingUp, TrendingDown, DollarSign, BarChart3,
  Plus, PieChart, Sparkles,
} from "lucide-react";
import Link from "next/link";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function PortfolioPage() {
  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-purple-600 dark:text-purple-400" /> Paper Portfolio
        </h1>
        <p className="text-sm text-muted-foreground">Track AI signal performance with simulated P&L · Not real money</p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <DollarSign className="h-3.5 w-3.5" /> Invested
          </div>
          <div className="font-mono font-bold text-lg">₹0</div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <TrendingUp className="h-3.5 w-3.5" /> Unrealized P&L
          </div>
          <div className="font-mono font-bold text-lg text-muted-foreground">—</div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <BarChart3 className="h-3.5 w-3.5" /> Realized P&L
          </div>
          <div className="font-mono font-bold text-lg text-muted-foreground">—</div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <PieChart className="h-3.5 w-3.5" /> Win Rate
          </div>
          <div className="font-mono font-bold text-lg text-muted-foreground">—</div>
        </div>
      </motion.div>

      {/* Positions */}
      <Tabs defaultValue="open" className="space-y-4">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="open" className="data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400">
            Open (0)
          </TabsTrigger>
          <TabsTrigger value="closed" className="data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400">
            Closed (0)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open">
          <motion.div variants={fadeUp} className="glass-card p-12 text-center">
            <Sparkles className="mx-auto h-14 w-14 text-purple-600/30 dark:text-purple-400/30 mb-4" />
            <h3 className="font-semibold text-lg mb-2">No open positions</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
              Generate AI signals and track their performance here. Paper trading lets you validate signals without risking real money.
            </p>
            <Link href="/signals">
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="mr-2 h-4 w-4" /> Generate a Signal
              </Button>
            </Link>
          </motion.div>
        </TabsContent>

        <TabsContent value="closed">
          <motion.div variants={fadeUp} className="glass-card p-12 text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">No closed positions yet</p>
          </motion.div>
        </TabsContent>
      </Tabs>

      <motion.div variants={fadeUp} className="glass-card p-4 border-amber-500/20 bg-amber-500/5">
        <p className="text-xs text-amber-700 dark:text-amber-400/80">
          ⚠️ <strong>Paper Trading Only</strong> — This is a simulated portfolio for tracking AI signal performance. No real money is involved. Past performance does not guarantee future results.
        </p>
      </motion.div>
    </motion.div>
  );
}
