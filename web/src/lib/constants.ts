// ─── App Constants ─────────────────────────────────────────

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "TradeMind AI";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
export const AI_ENGINE_URL = process.env.NEXT_PUBLIC_AI_ENGINE_URL || "http://localhost:8000";

// ─── Subscription Limits ───────────────────────────────────
export const SIGNAL_LIMITS = {
  free: 3,
  pro: 25,
  fund: 100,
} as const;

// ─── Indian Market Hours (IST) ─────────────────────────────
export const MARKET_HOURS = {
  preOpen: { start: "09:00", end: "09:15" },
  trading: { start: "09:15", end: "15:30" },
  postClose: { start: "15:30", end: "16:00" },
} as const;

// ─── Nifty 50 Top Stocks (Default Watchlist) ───────────────
export const DEFAULT_WATCHLIST = [
  { symbol: "RELIANCE", name: "Reliance Industries", sector: "Oil & Gas", exchange: "NSE" as const },
  { symbol: "TCS", name: "Tata Consultancy Services", sector: "IT", exchange: "NSE" as const },
  { symbol: "HDFCBANK", name: "HDFC Bank", sector: "Banking", exchange: "NSE" as const },
  { symbol: "INFY", name: "Infosys", sector: "IT", exchange: "NSE" as const },
  { symbol: "ICICIBANK", name: "ICICI Bank", sector: "Banking", exchange: "NSE" as const },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", sector: "FMCG", exchange: "NSE" as const },
  { symbol: "ITC", name: "ITC Limited", sector: "FMCG", exchange: "NSE" as const },
  { symbol: "SBIN", name: "State Bank of India", sector: "Banking", exchange: "NSE" as const },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", sector: "Telecom", exchange: "NSE" as const },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", sector: "Banking", exchange: "NSE" as const },
  { symbol: "LT", name: "Larsen & Toubro", sector: "Infrastructure", exchange: "NSE" as const },
  { symbol: "WIPRO", name: "Wipro", sector: "IT", exchange: "NSE" as const },
  { symbol: "AXISBANK", name: "Axis Bank", sector: "Banking", exchange: "NSE" as const },
  { symbol: "TATAMOTORS", name: "Tata Motors", sector: "Auto", exchange: "NSE" as const },
  { symbol: "SUNPHARMA", name: "Sun Pharma", sector: "Pharma", exchange: "NSE" as const },
] as const;

// ─── Navigation Links ──────────────────────────────────────
export const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/signals", label: "AI Signals", icon: "Zap" },
  { href: "/watchlist", label: "Watchlist", icon: "Star" },
  { href: "/settings", label: "Settings", icon: "Settings" },
] as const;

// ─── INR Formatter ─────────────────────────────────────────
export const formatINR = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatPercent = (value: number): string => {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat("en-IN").format(value);
};
