"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain, TrendingUp, Shield, ChevronRight, ChevronLeft,
  Zap, Target, BarChart3, CheckCircle
} from "lucide-react";
import { useRouter } from "next/navigation";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

interface OnboardingData {
  experience: string;
  capital: string;
  riskTolerance: string;
  segments: string[];
  goals: string[];
}

const STEPS = [
  {
    title: "Trading Experience",
    subtitle: "How long have you been trading in Indian markets?",
    key: "experience" as const,
    options: [
      { value: "beginner", label: "Beginner", desc: "Less than 1 year", icon: "🌱" },
      { value: "intermediate", label: "Intermediate", desc: "1-3 years", icon: "📊" },
      { value: "advanced", label: "Advanced", desc: "3-7 years", icon: "🎯" },
      { value: "expert", label: "Expert", desc: "7+ years", icon: "🏆" },
    ],
  },
  {
    title: "Trading Capital",
    subtitle: "What is your approximate trading capital?",
    key: "capital" as const,
    options: [
      { value: "small", label: "₹50K – ₹2L", desc: "Small Cap", icon: "💰" },
      { value: "medium", label: "₹2L – ₹10L", desc: "Medium Cap", icon: "💎" },
      { value: "large", label: "₹10L – ₹50L", desc: "Large Cap", icon: "🏦" },
      { value: "hni", label: "₹50L+", desc: "HNI", icon: "👑" },
    ],
  },
  {
    title: "Risk Tolerance",
    subtitle: "How much risk are you comfortable with per trade?",
    key: "riskTolerance" as const,
    options: [
      { value: "conservative", label: "Conservative", desc: "Max 1-2% per trade", icon: "🛡️" },
      { value: "moderate", label: "Moderate", desc: "Max 3-5% per trade", icon: "⚖️" },
      { value: "aggressive", label: "Aggressive", desc: "5-10% per trade", icon: "🔥" },
    ],
  },
];

const SEGMENTS = [
  { value: "equity", label: "Equity Cash" },
  { value: "fno", label: "F&O" },
  { value: "intraday", label: "Intraday" },
  { value: "swing", label: "Swing Trading" },
  { value: "positional", label: "Positional" },
  { value: "index", label: "Index Options" },
];

const GOALS = [
  { value: "income", label: "Regular Income" },
  { value: "wealth", label: "Wealth Building" },
  { value: "learning", label: "Learn Trading" },
  { value: "automation", label: "Automate Strategy" },
  { value: "hedging", label: "Portfolio Hedging" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    experience: "", capital: "", riskTolerance: "",
    segments: [], goals: [],
  });

  const totalSteps = STEPS.length + 2; // +segments +goals
  const progress = ((step + 1) / totalSteps) * 100;

  const handleSelect = (key: string, value: string) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const handleMultiSelect = (key: "segments" | "goals", value: string) => {
    setData(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value],
    }));
  };

  const canProceed = () => {
    if (step < STEPS.length) {
      const key = STEPS[step].key;
      const val = data[key];
      return Array.isArray(val) ? val.length > 0 : !!val;
    }
    if (step === STEPS.length) return data.segments.length > 0;
    if (step === STEPS.length + 1) return data.goals.length > 0;
    return false;
  };

  const handleComplete = () => {
    // Store preferences locally
    if (typeof window !== "undefined") {
      localStorage.setItem("trademind_profile", JSON.stringify(data));
      localStorage.setItem("trademind_onboarded", "true");
    }
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-400" />
              <span className="text-sm font-medium">TradeMind Setup</span>
            </div>
            <span className="text-xs text-muted-foreground">Step {step + 1} of {totalSteps}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-green-500 rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {step < STEPS.length ? (
              // Single-select steps
              <div>
                <h2 className="text-xl font-bold mb-1">{STEPS[step].title}</h2>
                <p className="text-sm text-muted-foreground mb-6">{STEPS[step].subtitle}</p>
                <div className="space-y-3">
                  {STEPS[step].options.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleSelect(STEPS[step].key, opt.value)}
                      className={`w-full text-left glass-card p-4 flex items-center gap-4 transition-all ${
                        data[STEPS[step].key] === opt.value
                          ? "border-purple-500/50 bg-purple-500/10"
                          : "hover:border-white/20"
                      }`}
                    >
                      <span className="text-2xl">{opt.icon}</span>
                      <div>
                        <div className="font-medium">{opt.label}</div>
                        <div className="text-xs text-muted-foreground">{opt.desc}</div>
                      </div>
                      {data[STEPS[step].key] === opt.value && (
                        <CheckCircle className="ml-auto h-5 w-5 text-purple-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : step === STEPS.length ? (
              // Segments multi-select
              <div>
                <h2 className="text-xl font-bold mb-1">Trading Segments</h2>
                <p className="text-sm text-muted-foreground mb-6">Which segments do you trade in? (Select all)</p>
                <div className="grid grid-cols-2 gap-3">
                  {SEGMENTS.map(seg => (
                    <button
                      key={seg.value}
                      onClick={() => handleMultiSelect("segments", seg.value)}
                      className={`glass-card p-3 text-sm font-medium transition-all ${
                        data.segments.includes(seg.value)
                          ? "border-purple-500/50 bg-purple-500/10 text-purple-300"
                          : "hover:border-white/20"
                      }`}
                    >
                      {data.segments.includes(seg.value) && <CheckCircle className="inline h-3 w-3 mr-1.5" />}
                      {seg.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // Goals multi-select
              <div>
                <h2 className="text-xl font-bold mb-1">Your Goals</h2>
                <p className="text-sm text-muted-foreground mb-6">What do you want to achieve? (Select all)</p>
                <div className="grid grid-cols-2 gap-3">
                  {GOALS.map(goal => (
                    <button
                      key={goal.value}
                      onClick={() => handleMultiSelect("goals", goal.value)}
                      className={`glass-card p-3 text-sm font-medium transition-all ${
                        data.goals.includes(goal.value)
                          ? "border-green-500/50 bg-green-500/10 text-green-300"
                          : "hover:border-white/20"
                      }`}
                    >
                      {data.goals.includes(goal.value) && <CheckCircle className="inline h-3 w-3 mr-1.5" />}
                      {goal.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="ghost"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="text-muted-foreground"
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>

          {step < totalSteps - 1 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={!canProceed()}
              className="bg-gradient-to-r from-purple-600 to-green-600 hover:from-purple-700 hover:to-green-700 ai-glow"
            >
              <Zap className="mr-1 h-4 w-4" /> Launch TradeMind
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
