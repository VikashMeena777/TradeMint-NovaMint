"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Zap,
  Shield,
  TrendingUp,
  Brain,
  BarChart3,
  ArrowRight,
  Activity,
  Target,
  Eye,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { APP_NAME } from "@/lib/constants";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.15 } },
};

const FEATURES = [
  {
    icon: Brain,
    title: "8 AI Agents",
    description:
      "Fundamental, Technical, Sentiment & News analysts + Bull/Bear debate + Risk Manager work together.",
    gradient: "from-purple-500/20 to-purple-900/20",
    iconColor: "text-purple-400",
  },
  {
    icon: Target,
    title: "Precise Entry & Exit",
    description:
      "Every signal includes entry price, stop-loss, take-profit targets, and position sizing in ₹.",
    gradient: "from-green-500/20 to-green-900/20",
    iconColor: "text-green-400",
  },
  {
    icon: BarChart3,
    title: "200+ Indicators",
    description:
      "RSI, MACD, Bollinger Bands, ADX, Pivot Points, OI analysis — all computed automatically.",
    gradient: "from-blue-500/20 to-blue-900/20",
    iconColor: "text-blue-400",
  },
  {
    icon: Shield,
    title: "Risk-First Approach",
    description:
      "SEBI circuit limits, margin checks, position sizing, and portfolio heat — validated before every signal.",
    gradient: "from-amber-500/20 to-amber-900/20",
    iconColor: "text-amber-400",
  },
  {
    icon: Eye,
    title: "Full Transparency",
    description:
      "See exactly why each agent voted bullish or bearish. Read the bull vs bear debate. No black boxes.",
    gradient: "from-cyan-500/20 to-cyan-900/20",
    iconColor: "text-cyan-400",
  },
  {
    icon: Activity,
    title: "NSE & BSE Coverage",
    description:
      "Nifty 50, Nifty 500, F&O stocks, sector analysis — Indian market specialized from day one.",
    gradient: "from-rose-500/20 to-rose-900/20",
    iconColor: "text-rose-400",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Pick a Stock",
    description: "Select from Nifty 50 or add any NSE/BSE symbol to your watchlist.",
  },
  {
    step: "02",
    title: "AI Analyzes",
    description: "8 agents analyze fundamentals, technicals, sentiment, and news in <30 seconds.",
  },
  {
    step: "03",
    title: "Get Your Signal",
    description: "Receive Buy/Sell/Hold with entry price, stop-loss, targets, and confidence score.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen gradient-hero text-foreground">
      {/* ─── Navbar ──────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold">{APP_NAME}</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How it Works
            </Link>
            <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Login
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                Get Started
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ────────────────────────────────── */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-16">
        {/* AI Aura Background */}
        <div className="pointer-events-none absolute inset-0 gradient-ai-aura" />

        <motion.div
          className="relative z-10 mx-auto max-w-4xl text-center"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <Badge
              variant="outline"
              className="mb-6 border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-purple-300"
            >
              <Zap className="mr-1.5 h-3 w-3" />
              Powered by 8 AI Agents • Free for Indian Traders
            </Badge>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-7xl"
          >
            AI-Powered{" "}
            <span className="bg-gradient-to-r from-purple-400 via-purple-300 to-blue-400 bg-clip-text text-transparent">
              Trade Signals
            </span>
            <br />
            for Indian Markets
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl"
          >
            8 AI agents analyze fundamentals, technicals, sentiment & news to generate
            institutional-grade buy/sell signals with entry, stop-loss & target prices for{" "}
            <span className="text-foreground font-medium">NSE & BSE stocks</span>.
          </motion.p>

          <motion.div variants={fadeUp} className="flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button
                size="lg"
                className="bg-purple-600 hover:bg-purple-700 text-lg px-8 py-6 ai-glow"
              >
                Start Getting Signals
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 border-border">
                See How It Works
              </Button>
            </Link>
          </motion.div>

          {/* ─── Live Signal Preview ────────────────────── */}
          <motion.div
            variants={fadeUp}
            className="mx-auto mt-16 max-w-md"
          >
            <div className="glass-card p-6 text-left">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs text-muted-foreground">LIVE SIGNAL</span>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  BUY
                </Badge>
              </div>
              <div className="mb-2 text-xl font-bold">RELIANCE.NS</div>
              <div className="text-sm text-muted-foreground mb-4">Reliance Industries Ltd</div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs">Entry</div>
                  <div className="font-mono font-semibold text-foreground">₹2,850.50</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Stop Loss</div>
                  <div className="font-mono font-semibold text-red-400">₹2,780.00</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Target</div>
                  <div className="font-mono font-semibold text-green-400">₹3,050.00</div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                <div className="text-xs text-muted-foreground">Confidence</div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-[82%] rounded-full bg-gradient-to-r from-purple-500 to-green-500" />
                  </div>
                  <span className="text-sm font-mono font-bold text-green-400">82%</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Features ────────────────────────────────────── */}
      <section id="features" className="relative px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <motion.div
            className="mb-16 text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2 variants={fadeUp} className="mb-4 text-4xl font-bold">
              Why Traders Choose{" "}
              <span className="text-purple-400">TradeMind</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-muted-foreground">
              Not just one AI — an entire team of specialized agents working for you.
            </motion.p>
          </motion.div>

          <motion.div
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            {FEATURES.map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                className="glass-card glass-card-hover p-6 transition-all duration-300 cursor-default"
              >
                <div
                  className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient}`}
                >
                  <feature.icon className={`h-6 w-6 ${feature.iconColor}`} />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── How It Works ────────────────────────────────── */}
      <section id="how-it-works" className="relative px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <motion.div
            className="mb-16 text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2 variants={fadeUp} className="mb-4 text-4xl font-bold">
              How It Works
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-muted-foreground">
              From stock selection to trade signal in under 30 seconds.
            </motion.p>
          </motion.div>

          <motion.div
            className="space-y-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            {STEPS.map((step, i) => (
              <motion.div
                key={step.step}
                variants={fadeUp}
                className="flex items-start gap-6"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-purple-600/20 text-xl font-bold text-purple-400">
                  {step.step}
                </div>
                <div>
                  <h3 className="mb-1 text-xl font-semibold">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="mt-4 hidden h-5 w-5 text-muted-foreground/30 lg:block" />
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Pricing ─────────────────────────────────────── */}
      <section id="pricing" className="relative px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <motion.div
            className="mb-16 text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2 variants={fadeUp} className="mb-4 text-4xl font-bold">
              Simple Pricing
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-muted-foreground">
              Start free. Upgrade when you need more signals.
            </motion.p>
          </motion.div>

          <motion.div
            className="grid gap-6 md:grid-cols-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            {/* Free Tier */}
            <motion.div variants={fadeUp} className="glass-card p-8">
              <h3 className="mb-1 text-lg font-semibold">Free</h3>
              <p className="mb-4 text-sm text-muted-foreground">For learning & exploration</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">₹0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="mb-8 space-y-3 text-sm">
                <li className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-400" /> 3 signals per day</li>
                <li className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-400" /> Nifty 50 stocks only</li>
                <li className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-400" /> Basic explainability</li>
                <li className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-400" /> Email alerts</li>
              </ul>
              <Link href="/signup">
                <Button className="w-full" variant="outline">Get Started Free</Button>
              </Link>
            </motion.div>

            {/* Pro Tier */}
            <motion.div variants={fadeUp} className="glass-card p-8 relative border-purple-500/30 ai-glow">
              <Badge className="absolute -top-3 right-6 bg-purple-600">Most Popular</Badge>
              <h3 className="mb-1 text-lg font-semibold">Pro</h3>
              <p className="mb-4 text-sm text-muted-foreground">For active traders</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">₹999</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="mb-8 space-y-3 text-sm">
                <li className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-400" /> 25 signals per day</li>
                <li className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-400" /> All NSE/BSE stocks + F&O</li>
                <li className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-400" /> Full agent reasoning panel</li>
                <li className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-400" /> Bull vs Bear debate view</li>
                <li className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-400" /> Priority signal generation</li>
              </ul>
              <Link href="/signup">
                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                  Start Pro Trial
                </Button>
              </Link>
            </motion.div>

            {/* Fund Tier */}
            <motion.div variants={fadeUp} className="glass-card p-8">
              <h3 className="mb-1 text-lg font-semibold">Fund</h3>
              <p className="mb-4 text-sm text-muted-foreground">For portfolio managers</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">₹4,999</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="mb-8 space-y-3 text-sm">
                <li className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-400" /> 100 signals per day</li>
                <li className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-400" /> Multi-stock batch analysis</li>
                <li className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-400" /> API access</li>
                <li className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-400" /> Custom risk parameters</li>
                <li className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-400" /> Dedicated support</li>
              </ul>
              <Link href="/signup">
                <Button className="w-full" variant="outline">Contact Sales</Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-white/5 px-6 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold">{APP_NAME}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} TradeMind AI. Not SEBI registered. Signals are for informational purposes only.
          </p>
        </div>
      </footer>
    </div>
  );
}
