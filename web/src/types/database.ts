// ─── TradeMind AI Database Types ─────────────────────────────
// These mirror the Supabase schema from DATABASE_SCHEMA.md

export type SignalType = "buy" | "sell" | "hold";
export type SignalStatus = "pending" | "approved" | "rejected" | "executed" | "expired" | "canceled";
export type RiskProfile = "conservative" | "moderate" | "aggressive";
export type SubscriptionTier = "free" | "pro" | "fund";
export type BrokerType = "zerodha" | "upstox" | "angel_one" | "5paisa" | "other";
export type Exchange = "NSE" | "BSE" | "NFO" | "BFO" | "MCX";
export type AgentRole = "analyst" | "researcher" | "trader" | "risk_manager";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  risk_profile: RiskProfile;
  broker_type: BrokerType;
  is_paper_trading: boolean;
  subscription_tier: SubscriptionTier;
  daily_signals_used: number;
  signals_reset_at: string;
  timezone: string;
  locale: string;
  email_notifications: boolean;
  push_notifications: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  symbol: string;
  name: string | null;
  sector: string | null;
  exchange: Exchange;
  instrument_type: string;
  is_ai_recommended: boolean;
  alert_price_high: number | null;
  alert_price_low: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TradeSignal {
  id: string;
  user_id: string;
  symbol: string;
  exchange: string;
  signal_type: SignalType;
  confidence_score: number;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  position_size: number | null;
  lot_size: number;
  risk_reward_ratio: number | null;
  reasoning: Record<string, unknown>;
  agents_contributions: Record<string, unknown>;
  debate_summary: string | null;
  risk_notes: string | null;
  status: SignalStatus;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AgentLog {
  id: string;
  user_id: string;
  signal_id: string | null;
  agent_name: string;
  agent_role: AgentRole;
  symbol: string | null;
  action: string;
  details: Record<string, unknown>;
  processing_time_ms: number | null;
  model_used: string | null;
  tokens_used: number | null;
  created_at: string;
}

export interface PortfolioSnapshot {
  id: string;
  user_id: string;
  total_equity: number;
  cash: number;
  market_value: number;
  buying_power: number;
  day_pnl: number | null;
  total_pnl: number | null;
  day_return_pct: number | null;
  total_return_pct: number | null;
  sharpe_ratio: number | null;
  max_drawdown_pct: number | null;
  snapshot_date: string;
  created_at: string;
}
