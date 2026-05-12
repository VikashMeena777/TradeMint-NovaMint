# Database Schema & Migrations v2.0 — Indian Market

## Overview

This document defines the complete production-ready Supabase PostgreSQL schema for TradeMind AI (Indian market edition). It includes core tables, audit logging, time-series optimization, soft deletes, data versioning, partitioning strategy, and Row Level Security (RLS) policies adapted for NSE/BSE trading, INR currency, and SEBI compliance.

**Extensions Required:**
```sql
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "timescaledb"; -- For price data hypertables
```

---

## 1. Core Tables

### 1.1 Profiles (extends auth.users)

```sql
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  avatar_url text,
  phone text,                           -- Indian mobile for OTP
  pan_hash text,                        -- PAN number hash (KYC reference)
  risk_profile text check (risk_profile in ('conservative', 'moderate', 'aggressive')) default 'moderate',
  broker_type text check (broker_type in ('zerodha', 'upstox', 'angel_one', '5paisa', 'other')) default 'zerodha',
  broker_api_key_encrypted text,        -- AES-256-GCM encrypted (Zerodha/Upstox)
  broker_api_secret_encrypted text,     -- AES-256-GCM encrypted
  broker_user_id_encrypted text,        -- Some brokers need separate user ID
  is_paper_trading boolean default true,
  paper_to_live_unlocked_at timestamptz, -- 30-day profitable gate
  subscription_tier text check (subscription_tier in ('free', 'pro', 'fund')) default 'free',
  daily_signals_used integer default 0,
  signals_reset_at timestamptz default now(),
  timezone text default 'Asia/Kolkata', -- IST default
  locale text default 'en-IN',           -- English (India) or hi-IN
  email_notifications boolean default true,
  push_notifications boolean default true,
  -- whatsapp_notifications removed (not in scope)
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,               -- Soft delete

  constraint valid_signals_reset check (signals_reset_at <= now())
);

-- Index for soft-delete filtering
 create index idx_profiles_deleted_at on profiles(deleted_at) where deleted_at is null;
```

### 1.2 Watchlists

```sql
create table watchlists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  symbol text not null,                -- e.g., "RELIANCE.NS", "TCS.NS", "INFY.BO"
  name text,                            -- e.g., "Reliance Industries"
  sector text,                          -- Indian sector classification
  exchange text check (exchange in ('NSE', 'BSE', 'NFO', 'BFO', 'MCX')), -- NSE/BSE/F&O/MCX
  instrument_type text default 'EQ',    -- EQ, FUT, OPT, CE, PE
  is_ai_recommended boolean default false,
  alert_price_high decimal(12,4),       -- INR
  alert_price_low decimal(12,4),       -- INR
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,

  unique(user_id, symbol)
);

 create index idx_watchlists_user_id on watchlists(user_id) where deleted_at is null;
 create index idx_watchlists_symbol on watchlists(symbol);
```

### 1.3 Trade Signals (AI Generated)

```sql
create type signal_status as enum ('pending', 'approved', 'rejected', 'executed', 'expired', 'canceled');
create type signal_type as enum ('buy', 'sell', 'hold');

create table trade_signals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  symbol text not null,                -- RELIANCE.NS, TCS.NS, etc.
  exchange text default 'NSE',
  signal_type signal_type not null,
  confidence_score integer check (confidence_score between 0 and 100) not null,
  entry_price decimal(12,4),           -- INR
  stop_loss decimal(12,4),             -- INR
  take_profit decimal(12,4),           -- INR
  position_size integer,               -- number of shares / lots
  lot_size integer default 1,          -- F&O lot size for the symbol
  risk_reward_ratio decimal(4,2),
  reasoning jsonb default '{}',
  agents_contributions jsonb default '{}',
  debate_summary text,
  risk_notes text,
  status signal_status default 'pending',
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,

  constraint valid_expiry check (expires_at > created_at)
);

 create index idx_trade_signals_user_id on trade_signals(user_id) where deleted_at is null;
 create index idx_trade_signals_symbol on trade_signals(symbol);
 create index idx_trade_signals_status on trade_signals(status);
 create index idx_trade_signals_created_at on trade_signals(created_at desc);
```

### 1.4 Trade Signals History (SCD Type 2)

Immutable history of signal state changes for audit and SEBI compliance.

```sql
create table trade_signals_history (
  id uuid default gen_random_uuid() primary key,
  signal_id uuid references trade_signals(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  status signal_status not null,
  changed_by uuid references auth.users(id), -- null for system
  changed_at timestamptz default now(),
  reason text, -- e.g., "User approved", "Risk manager rejected", "Expired"
  metadata jsonb default '{}'
);

 create index idx_signals_history_signal_id on trade_signals_history(signal_id);
 create index idx_signals_history_changed_at on trade_signals_history(changed_at desc);
```

### 1.5 Trades (Executed Orders)

```sql
create type trade_side as enum ('buy', 'sell');
create type order_type as enum ('market', 'limit', 'stop', 'stop_limit', 'bracket_order', 'cover_order');
create type trade_status as enum ('pending', 'filled', 'partial_fill', 'canceled', 'rejected');
create type product_type as enum ('CNC', 'MIS', 'NRML'); -- Cash-n-carry, Intraday, Normal (F&O)

create table trades (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  signal_id uuid references trade_signals(id),
  symbol text not null,                -- RELIANCE.NS
  exchange text default 'NSE',
  side text check (side in ('buy', 'sell')) not null,
  qty integer not null,
  product_type text check (product_type in ('CNC', 'MIS', 'NRML')) default 'CNC',
  order_type text check (order_type in ('market', 'limit', 'stop', 'stop_limit')) default 'market',
  limit_price decimal(12,4),           -- INR
  stop_price decimal(12,4),            -- INR
  filled_avg_price decimal(12,4),      -- INR
  filled_qty integer default 0,
  broker_order_id text,                -- Zerodha order ID / Upstox order ID
  algo_id text default 'GENERIC_ALGO', -- SEBI Feb 2025: Generic or Unique Algo ID
  broker_order_tag text,             -- Additional broker-specific metadata
  broker_status text,                  -- Raw broker status string
  status trade_status default 'pending',
  realized_pnl decimal(14,4),          -- INR
  unrealized_pnl decimal(14,4),        -- INR
  brokerage decimal(12,4) default 0,   -- Broker charges in INR
  stt decimal(12,4) default 0,         -- Securities Transaction Tax
  stamp_duty decimal(12,4) default 0,    -- Stamp duty
  gst decimal(12,4) default 0,         -- GST on brokerage
  slippage_bps decimal(8,4),           -- basis points
  time_in_force text default 'day',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

 create index idx_trades_user_id on trades(user_id) where deleted_at is null;
 create index idx_trades_symbol on trades(symbol);
 create index idx_trades_status on trades(status);
 create index idx_trades_signal_id on trades(signal_id);
 create index idx_trades_created_at on trades(created_at desc);
```

### 1.6 Portfolio Snapshots

```sql
create table portfolio_snapshots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  total_equity decimal(14,4) not null, -- INR
  cash decimal(14,4) not null,         -- INR
  market_value decimal(14,4) not null, -- INR
  buying_power decimal(14,4) not null, -- INR
  day_pnl decimal(14,4),               -- INR
  total_pnl decimal(14,4),             -- INR
  day_return_pct decimal(8,4),
  total_return_pct decimal(8,4),
  sharpe_ratio decimal(8,4),
  max_drawdown_pct decimal(8,4),
  snapshot_date date default current_date,
  created_at timestamptz default now()
);

 create index idx_portfolio_snapshots_user_id on portfolio_snapshots(user_id);
 create index idx_portfolio_snapshots_date on portfolio_snapshots(snapshot_date desc);
```

### 1.7 Positions (Current Holdings)

```sql
create table positions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  symbol text not null,                -- RELIANCE.NS
  exchange text default 'NSE',
  qty integer not null,
  avg_entry_price decimal(12,4) not null, -- INR
  market_price decimal(12,4),          -- INR
  market_value decimal(14,4),          -- INR
  unrealized_pnl decimal(14,4),        -- INR
  unrealized_pnl_pct decimal(8,4),
  day_pnl decimal(14,4),               -- INR
  side trade_side not null,
  product_type product_type default 'CNC',
  opened_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,

  unique(user_id, symbol, product_type)
);

 create index idx_positions_user_id on positions(user_id) where deleted_at is null;
```

### 1.8 Agent Logs (Transparency)

```sql
create type agent_role as enum ('analyst', 'researcher', 'trader', 'risk_manager');

create table agent_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  signal_id uuid references trade_signals(id),
  agent_name text not null,
  agent_role agent_role not null,
  symbol text,                         -- RELIANCE.NS, TCS.NS
  action text not null,
  details jsonb default '{}',
  processing_time_ms integer,
  model_used text, -- e.g., "groq/llama-3.3-70b"
  tokens_used integer,
  cost_inr decimal(10,6),              -- Cost in INR instead of USD
  created_at timestamptz default now()
);

 create index idx_agent_logs_user_id on agent_logs(user_id);
 create index idx_agent_logs_signal_id on agent_logs(signal_id);
 create index idx_agent_logs_created_at on agent_logs(created_at desc);
```

### 1.9 Backtest Results

```sql
create type backtest_status as enum ('running', 'completed', 'failed', 'canceled');

create table backtests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  symbol text not null,                -- RELIANCE.NS, NIFTY 50 index
  exchange text default 'NSE',
  start_date date not null,
  end_date date not null,
  initial_capital decimal(14,4) not null, -- INR
  final_capital decimal(14,4),         -- INR
  total_return_pct decimal(8,4),
  sharpe_ratio decimal(8,4),
  max_drawdown_pct decimal(8,4),
  total_trades integer,
  win_rate decimal(5,2),
  avg_win_pct decimal(8,4),
  avg_loss_pct decimal(8,4),
  profit_factor decimal(8,4),
  benchmark_symbol text default 'NIFTY50', -- NSE benchmark
  benchmark_return_pct decimal(8,4),
  alpha decimal(8,4),
  strategy_config jsonb default '{}',
  status backtest_status default 'running',
  completed_at timestamptz,
  created_at timestamptz default now()
);

 create index idx_backtests_user_id on backtests(user_id);
 create index idx_backtests_status on backtests(status);
```

### 1.10 Alerts

```sql
create type alert_type as enum ('price_target', 'stop_loss', 'signal_generated', 'pipeline_failure', 'daily_summary', 'fo_expiry', 'circuit_limit');
create type alert_channel as enum ('in_app', 'email', 'push');
create type alert_status as enum ('pending', 'delivered', 'failed');

create table alerts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  alert_type alert_type not null,
  symbol text,
  title text not null,
  body text not null,
  data jsonb default '{}',
  channels alert_channel[] default '{in_app}',
  status alert_status default 'pending',
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz default now()
);

 create index idx_alerts_user_id on alerts(user_id);
 create index idx_alerts_status on alerts(status);
 create index idx_alerts_created_at on alerts(created_at desc);
```

### 1.11 Audit Logs (SEBI Compliance)

Immutable record of all data changes for SEBI regulatory audit.

```sql
create type audit_action as enum ('create', 'update', 'delete', 'login', 'logout', 'trade_execute', 'api_key_update', 'broker_connect');

create table audit_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null, -- keep log even if user deleted
  action audit_action not null,
  table_name text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  session_id text,
  created_at timestamptz default now()
);

 create index idx_audit_logs_user_id on audit_logs(user_id);
 create index idx_audit_logs_action on audit_logs(action);
 create index idx_audit_logs_table on audit_logs(table_name);
 create index idx_audit_logs_created_at on audit_logs(created_at desc);
```

### 1.12 Price Bars (Time-Series — NSE/BSE)

Optimized with TimescaleDB hypertable for high ingestion rates.

```sql
create table price_bars (
  time timestamptz not null,
  symbol text not null,                -- RELIANCE.NS
  exchange text default 'NSE',
  timeframe text not null,             -- '1m', '5m', '15m', '1h', '1d'
  open decimal(12,4) not null,         -- INR
  high decimal(12,4) not null,         -- INR
  low decimal(12,4) not null,          -- INR
  close decimal(12,4) not null,        -- INR
  volume bigint not null,
  vwap decimal(12,4),                  -- INR
  trades_count integer,
  source text default 'zerodha',       -- zerodha, upstox, nse_bhavcopy

  primary key (time, symbol, timeframe)
);

-- Convert to hypertable (TimescaleDB)
select create_hypertable('price_bars', by_range('time', interval '1 day'));

 create index idx_price_bars_symbol_timeframe on price_bars(symbol, timeframe, time desc);
```

### 1.13 Market Holidays (India)

```sql
create table market_holidays (
  id uuid default gen_random_uuid() primary key,
  holiday_date date not null,
  description text,
  exchange text default 'NSE',           -- NSE, BSE, MCX
  is_trading_holiday boolean default true,
  is_settlement_holiday boolean default false,
  created_at timestamptz default now()
);

 create index idx_market_holidays_date on market_holidays(holiday_date);
```

### 1.14 System Settings / Feature Flags

```sql
create table system_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz default now()
);

-- Seed defaults
insert into system_settings (key, value, description) values
('signal_generation_enabled', 'true', 'Master toggle for AI signal generation'),
('max_free_signals_daily', '3', 'Daily signal limit for free tier'),
('maintenance_mode', 'false', 'Platform maintenance mode'),
('ai_model_primary', '"groq/llama-3.3-70b"', 'Default LLM for agent tasks'),
('risk_max_position_pct', '20', 'Maximum position size percent for aggressive profile'),
('market_timezone', '"Asia/Kolkata"', 'Market timezone (IST)'),
('market_open_time', '"09:15"', 'NSE market open IST'),
('market_close_time', '"15:30"', 'NSE market close IST'),
('sebi_disclaimer_required', 'true', 'Show SEBI disclaimer on all pages');
```

---

## 2. Entity Relationship Diagram

```
auth.users ||--o{ profiles : "extends"
auth.users ||--o{ watchlists : "tracks"
auth.users ||--o{ trade_signals : "generates"
auth.users ||--o{ trades : "executes"
auth.users ||--o{ portfolio_snapshots : "snapshots"
auth.users ||--o{ positions : "holds"
auth.users ||--o{ agent_logs : "logs"
auth.users ||--o{ backtests : "runs"
auth.users ||--o{ alerts : "receives"
auth.users ||--o{ audit_logs : "audited"

trade_signals ||--o{ trades : "executed_as"
trade_signals ||--o{ agent_logs : "logged_for"
trade_signals ||--o{ trade_signals_history : "versioned"
trades ||--o{ positions : "updates"
```

---

## 3. Row Level Security (RLS) Policies

```sql
-- Enable RLS
alter table profiles enable row level security;
alter table watchlists enable row level security;
alter table trade_signals enable row level security;
alter table trade_signals_history enable row level security;
alter table trades enable row level security;
alter table portfolio_snapshots enable row level security;
alter table positions enable row level security;
alter table agent_logs enable row level security;
alter table backtests enable row level security;
alter table alerts enable row level security;

-- Profiles
 create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);
 create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Watchlists
 create policy "Users can CRUD own watchlists"
  on watchlists for all using (auth.uid() = user_id);

-- Trade Signals
 create policy "Users can read own signals"
  on trade_signals for select using (auth.uid() = user_id);
 create policy "Users can create own signals"
  on trade_signals for insert with check (auth.uid() = user_id);
 create policy "Users can update own signals"
  on trade_signals for update using (auth.uid() = user_id);

-- Trade Signals History (read-only for users)
 create policy "Users can read own signal history"
  on trade_signals_history for select using (auth.uid() = user_id);

-- Trades
 create policy "Users can read own trades"
  on trades for select using (auth.uid() = user_id);
 create policy "Users can create own trades"
  on trades for insert with check (auth.uid() = user_id);

-- Portfolio Snapshots
 create policy "Users can read own snapshots"
  on portfolio_snapshots for select using (auth.uid() = user_id);

-- Positions
 create policy "Users can read own positions"
  on positions for select using (auth.uid() = user_id);

-- Agent Logs
 create policy "Users can read own agent logs"
  on agent_logs for select using (auth.uid() = user_id);

-- Backtests
 create policy "Users can CRUD own backtests"
  on backtests for all using (auth.uid() = user_id);

-- Alerts
 create policy "Users can CRUD own alerts"
  on alerts for all using (auth.uid() = user_id);

-- Audit logs are admin-only; users can request export via support
 create policy "Users can read own audit logs"
  on audit_logs for select using (auth.uid() = user_id);
```

---

## 4. Functions & Triggers

### 4.1 Auto-update `updated_at`

```sql
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

 create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at_column();
 create trigger watchlists_updated_at before update on watchlists
  for each row execute function update_updated_at_column();
 create trigger trade_signals_updated_at before update on trade_signals
  for each row execute function update_updated_at_column();
 create trigger trades_updated_at before update on trades
  for each row execute function update_updated_at_column();
 create trigger positions_updated_at before update on positions
  for each row execute function update_updated_at_column();
```

### 4.2 Reset Daily Signals

```sql
create or replace function reset_daily_signals()
returns void as $$
begin
  update profiles
  set daily_signals_used = 0, signals_reset_at = now()
  where signals_reset_at < now() - interval '1 day';
end;
$$ language plpgsql;

-- Schedule via pg_cron or Inngest (run at 9:00 AM IST before market open)
-- select cron.schedule('reset-daily-signals', '0 9 * * *', 'select reset_daily_signals()');
```

### 4.3 Increment Daily Signals

```sql
create or replace function increment_daily_signals(user_uuid uuid)
returns void as $$
begin
  update profiles
  set daily_signals_used = daily_signals_used + 1
  where id = user_uuid;
end;
$$ language plpgsql;
```

### 4.4 Signal Status Change Audit

```sql
create or replace function log_signal_status_change()
returns trigger as $$
begin
  if old.status is distinct from new.status then
    insert into trade_signals_history (signal_id, user_id, status, changed_by, changed_at, reason, metadata)
    values (
      new.id,
      new.user_id,
      new.status,
      coalesce(current_setting('app.current_user_id', true)::uuid, null),
      now(),
      coalesce(current_setting('app.change_reason', true), 'System'),
      jsonb_build_object('previous_status', old.status, 'new_status', new.status)
    );
  end if;
  return new;
end;
$$ language plpgsql;

 create trigger signal_status_audit after update on trade_signals
  for each row execute function log_signal_status_change();
```

### 4.5 Soft Delete Helper

```sql
create or replace function soft_delete(table_name text, record_id uuid)
returns void as $$
begin
  execute format('update %I set deleted_at = now() where id = %L', table_name, record_id);
end;
$$ language plpgsql;
```

---

## 5. Partitioning & Archiving

### 5.1 Price Bars (TimescaleDB)
- Hypertable chunk size: 1 day.
- Compression: Enable after 7 days (`timescaledb.compress`).
- Archive: Supabase Storage export after 1 year; keep last 2 years hot.

### 5.2 Agent Logs
- Partition by month using pg_partman.
- Auto-drop partitions after 90 days (configurable).
- Pre-aggregation to `mv_agent_performance` before drop.

### 5.3 Trade Signals
- Partition by year.
- Archive cold data (>3 years) to Supabase Storage / local backup.
- Maintain `trade_signals_history` indefinitely for SEBI compliance.

### 5.4 Audit Logs
- Partition by month.
- Retention: 8 years (SEBI requirement for trade audit).
- Immutable: No updates/deletions allowed (WORM policy).

---

## 6. Materialized Views

### 6.1 Daily Portfolio Summary

```sql
create materialized view mv_daily_portfolio as
select
  user_id,
  snapshot_date,
  sum(total_equity) as total_equity,
  sum(day_pnl) as day_pnl,
  sum(total_pnl) as total_pnl,
  avg(sharpe_ratio) as avg_sharpe,
  min(max_drawdown_pct) as max_drawdown
from portfolio_snapshots
group by user_id, snapshot_date;

-- Refresh every 15 minutes via Inngest/pg_cron
 create unique index idx_mv_daily_portfolio on mv_daily_portfolio(user_id, snapshot_date);
```

### 6.2 Agent Performance

```sql
create materialized view mv_agent_performance as
select
  agent_name,
  agent_role,
  date_trunc('week', created_at) as week,
  count(*) as total_calls,
  avg(processing_time_ms) as avg_latency_ms,
  sum(cost_inr) as total_cost_inr,
  avg(tokens_used) as avg_tokens
from agent_logs
group by agent_name, agent_role, date_trunc('week', created_at);

-- Refresh nightly
```

---

## 7. Backup & Recovery

| Component | Strategy | RTO | RPO |
|---|---|---|---|
| PostgreSQL | Daily logical dump + WAL archiving (Supabase managed) | 4h | 1h |
| Redis (Upstash) | Automated snapshots every 6h | 15 min | 6h |
| S3 / Object Storage (Mumbai) | Cross-region replication | 1h | Near-zero |

**Procedures:**
- **Point-in-time recovery:** Supabase console → select timestamp → restore.
- **Table-level restore:** Use `pg_dump` logical backup for specific tables.
- **Disaster recovery runbook:** Documented in `ops/runbooks/db-recovery.md`.

---

## 8. Connection Pooling

- **Supabase PgBouncer:** Transaction mode; max 200 connections.
- **Application pools:** Next.js (20 conn), Python AI (50 conn), background workers (30 conn).
- **Read replica:** Route analytics queries (`mv_*` refreshes, reporting) to replica.

---

## 9. Seed Data (Development)

```sql
-- Seed a test user (replace with your test UUID)
-- insert into profiles (id, full_name, risk_profile, is_paper_trading, subscription_tier, timezone)
-- values ('00000000-0000-0000-0000-000000000000', 'Test User', 'moderate', true, 'pro', 'Asia/Kolkata');

-- Seed popular NSE symbols
insert into watchlists (user_id, symbol, name, sector, exchange, is_ai_recommended)
values
  ('00000000-0000-0000-0000-000000000000', 'RELIANCE.NS', 'Reliance Industries Ltd', 'Energy', 'NSE', true),
  ('00000000-0000-0000-0000-000000000000', 'TCS.NS', 'Tata Consultancy Services', 'IT', 'NSE', true),
  ('00000000-0000-0000-0000-000000000000', 'INFY.NS', 'Infosys Ltd', 'IT', 'NSE', true),
  ('00000000-0000-0000-0000-000000000000', 'HDFCBANK.NS', 'HDFC Bank Ltd', 'Financial Services', 'NSE', true),
  ('00000000-0000-0000-0000-000000000000', 'ICICIBANK.NS', 'ICICI Bank Ltd', 'Financial Services', 'NSE', true),
  ('00000000-0000-0000-0000-000000000000', 'SBIN.NS', 'State Bank of India', 'Financial Services', 'NSE', true),
  ('00000000-0000-0000-0000-000000000000', 'BAJFINANCE.NS', 'Bajaj Finance Ltd', 'Financial Services', 'NSE', true),
  ('00000000-0000-0000-0000-000000000000', 'HINDUNILVR.NS', 'Hindustan Unilever Ltd', 'FMCG', 'NSE', true),
  ('00000000-0000-0000-0000-000000000000', 'ITC.NS', 'ITC Ltd', 'FMCG', 'NSE', true),
  ('00000000-0000-0000-0000-000000000000', 'KOTAKBANK.NS', 'Kotak Mahindra Bank Ltd', 'Financial Services', 'NSE', true),
  ('00000000-0000-0000-0000-000000000000', 'AXISBANK.NS', 'Axis Bank Ltd', 'Financial Services', 'NSE', true),
  ('00000000-0000-0000-0000-000000000000', 'LT.NS', 'Larsen & Toubro Ltd', 'Construction', 'NSE', true),
  ('00000000-0000-0000-0000-000000000000', 'SUNPHARMA.NS', 'Sun Pharmaceutical Industries Ltd', 'Pharma', 'NSE', true),
  ('00000000-0000-0000-0000-000000000000', 'ONGC.NS', 'Oil & Natural Gas Corporation Ltd', 'Energy', 'NSE', true),
  ('00000000-0000-0000-0000-000000000000', 'NIFTY50', 'NIFTY 50 Index', 'Index', 'NSE', true);
```

---

## 10. Migration Strategy

1. **Versioning:** Use sequential numbering (`001_init.sql`, `002_add_alerts.sql`, etc.).
2. **Expand-Contract:** Add new columns as nullable first, backfill, then add constraints.
3. **Backward Compatibility:** API must handle both old and new schema during deployment window.
4. **Rollback:** Keep `down` migration scripts; test rollback in staging before prod.
5. **Automation:** Apply via Supabase CLI in CI/CD (`supabase db push`).

---

*Co-Authored-By: Oz <oz-agent@warp.dev>*
