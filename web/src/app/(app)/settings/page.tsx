"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings, User, Shield, Bell, Zap, Brain } from "lucide-react";
import { toast } from "sonner";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

export default function SettingsPage() {
  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-2xl space-y-8">
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-muted-foreground" /> Settings
        </h1>
        <p className="text-sm text-muted-foreground">Manage your account and trading preferences</p>
      </motion.div>

      {/* Profile */}
      <motion.div variants={fadeUp} className="glass-card p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><User className="h-4 w-4 text-purple-400" /> Profile</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" defaultValue="Vikash Meena" className="bg-muted border-border" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" defaultValue="vikash@example.com" disabled className="bg-muted border-border opacity-60" />
          </div>
        </div>
        <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => toast.success("Profile saved")}>
          Save Changes
        </Button>
      </motion.div>

      {/* Subscription */}
      <motion.div variants={fadeUp} className="glass-card p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-amber-400" /> Subscription</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Free Plan</div>
            <div className="text-sm text-muted-foreground">3 signals per day • Nifty 50 only</div>
          </div>
          <Badge variant="outline" className="border-green-500/30 text-green-400">Active</Badge>
        </div>
        <Separator className="bg-muted" />
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Signals used today</span>
          <span className="font-mono font-bold">0 / 3</span>
        </div>
        <Button variant="outline" size="sm" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
          Upgrade to Pro — ₹999/mo
        </Button>
      </motion.div>

      {/* Risk Profile */}
      <motion.div variants={fadeUp} className="glass-card p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Shield className="h-4 w-4 text-blue-400" /> Risk Profile</h2>
        <div className="grid grid-cols-3 gap-3">
          {(["conservative", "moderate", "aggressive"] as const).map((level) => (
            <button key={level}
              className={`rounded-lg border p-3 text-sm font-medium transition-all ${level === "moderate" ? "border-purple-500/30 bg-purple-500/10 text-purple-400" : "border-white/5 text-muted-foreground hover:border-border hover:text-foreground"}`}
              onClick={() => toast.success(`Risk profile set to ${level}`)}>
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Moderate: Max 5% per trade, 20% portfolio heat, 1.5:1 min R:R ratio
        </p>
      </motion.div>

      {/* Notifications */}
      <motion.div variants={fadeUp} className="glass-card p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Bell className="h-4 w-4 text-green-400" /> Notifications</h2>
        <div className="space-y-3">
          {[
            { label: "Email alerts for new signals", enabled: true },
            { label: "Daily market summary", enabled: false },
            { label: "Signal expiry reminders", enabled: true },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-sm">{item.label}</span>
              <button
                className={`h-6 w-11 rounded-full transition-colors ${item.enabled ? "bg-purple-600" : "bg-muted"}`}
                onClick={() => toast.success("Preference updated")}>
                <div className={`h-5 w-5 rounded-full bg-white transition-transform ${item.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* AI Engine */}
      <motion.div variants={fadeUp} className="glass-card p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Brain className="h-4 w-4 text-purple-400" /> AI Engine</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Primary LLM</span><span>Groq Llama 3.3 70B</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Fallback LLM</span><span>NVIDIA NIM DeepSeek R1</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Data Source</span><span>Angel One SmartAPI</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Signal Latency</span><span className="font-mono">&lt;30s</span></div>
        </div>
      </motion.div>
    </motion.div>
  );
}
