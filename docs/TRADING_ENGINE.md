# Trading Engine & Execution Logic v1.0

## 1. Trade Execution Flow

```
User approves signal
  → Pre-trade checks (validation layer)
    → Position sizing calculation
      → Order type selection & routing
        → Broker API submission (Zerodha Kite Connect / Upstox / Angel One)
          → Post-trade reconciliation
            → Position & portfolio update
              → Alert / notification
```

### 1.1 Execution Sequence Diagram

```
User                     Next.js API              AI Engine           Broker API         DB
  │                         │                       │                  │                 │
  │── approve signal ───────>│                       │                  │                 │
  │                         │── validate signal ───>│                  │                 │
  │                         │                       │                  │                 │
  │                         │<─ validation OK ─────│                  │                 │
  │                         │                       │                  │                 │
  │                         │── size position ─────>│                  │                 │
  │                         │                       │                  │                 │
  │                         │<─ position size ─────│                  │                 │
  │                         │                       │                  │                 │
  │                         │── pre-trade checks ─>│                  │                 │
  │                         │                       │                  │                 │
  │                         │<─ checks pass ───────│                  │                 │
  │                         │                       │                  │                 │
  │                         │──────────────────── submit order ───────>│                 │
  │                         │                       │   (Zerodha/Upstox) │                 │
  │                         │                       │                  │                 │
  │                         │<──────────────────── order accepted ─────│                 │
  │                         │                       │   (NSE/BSE)        │                 │
  │                         │                       │                  │                 │
  │                         │─────────────────────── persist trade ───────────────────────>│
  │                         │                       │                  │                 │
  │<─ order pending ─────────│                       │                  │                 │
  │                         │                       │                  │                 │
  │                         │<──────────────────── webhook: fill ─────│                 │
  │                         │                       │   (order update)   │                 │
  │                         │                       │                  │                 │
  │                         │─────────────────────── update fill ─────────────────────────>│
  │                         │                       │                  │                 │
  │<─ trade filled ─────────│                       │                  │                 │
```

---

## 2. Order Types & Selection Logic

### 2.1 Supported Order Types

| Order Type | When to Use | Pros | Cons | Default For |
|---|---|---|---|---|
| **Market** | Urgent execution, high confidence | Immediate fill, guaranteed | Slippage risk, no price control | Day trading, high-volume stocks |
| **Limit** | Specific entry, patient execution | Price control, no slippage | May not fill, requires monitoring | Swing/position entries, thin spreads |
| **Stop** | Breakout entries, stop-loss exits | Automatic trigger, emotion-free | Slippage on trigger, false triggers | Stop-loss orders |
| **Stop-Limit** | Precise stop execution | Price control after trigger | May not fill after trigger | Tight stop-loss on liquid stocks |
| **Trailing Stop** | Let winners run | Dynamic protection, locks in gains | Slippage on trigger, complex calculation | Profit-taking, trend-following |
| **Bracket** | Complete trade plan | Set-and-forget, full plan | Complex, may overcomplicate | Automated signal execution |

### 2.2 Order Type Selection Algorithm

```python
def select_order_type(signal, market_conditions, user_preferences):
    spread_pct = (ask - bid) / mid_price
    avg_daily_volume = get_adv(signal.symbol)
    time_to_close = market_close - now()
    
    # Default selection logic
    if user_preferences.default_order_type:
        return user_preferences.default_order_type
    
    # High urgency (signal expires soon)
    if signal.expires_at - now() < timedelta(minutes=5):
        return OrderType.MARKET
    
    # Wide spread or low volume → limit to avoid slippage
    if spread_pct > 0.5 or avg_daily_volume < 1_000_000:
        return OrderType.LIMIT
    
    # Standard liquid stock → market for quick fill
    if spread_pct < 0.1 and avg_daily_volume > 10_000_000:
        return OrderType.MARKET
    
    # Default
    return OrderType.LIMIT
```

---

## 3. Order Routing Logic

### 3.1 Routing Decision Tree

```
Order received
  ├── Market hours check
  │   ├── Is pre-open (9:00-9:15 IST)?
  │   │   ├── Yes → Queue for pre-open call auction (9:08-9:12 order entry)
  │   │   └── No → Continue
  │   ├── Is normal hours (9:15-15:30 IST)?
  │   │   ├── Yes → Continue
  │   │   └── No → Reject (India has no extended hours for equities)
  ├── Product type selection (CNC / MIS / NRML)
  │   ├── CNC (Cash and Carry) → Delivery; full margin required
  │   ├── MIS (Margin Intraday Square-off) → Intraday; broker leverage (typically 5×)
  │   └── NRML (Normal) → F&O overnight; SPAN + Exposure margin
  ├── Order type?
  │   ├── Market → Route to broker OMS → NSE/BSE
  │   ├── Limit → Post to exchange order book at limit price
  │   └── Stop/Stop-Limit → Monitor trigger, route as market/limit when hit
  ├── SEBI circuit limit check
  │   ├── Is price within daily circuit limits? → Continue
  │   └── No → Reject or warn (T2T segment has no circuit)
  ├── F&O specific checks (if applicable)
  │   ├── Is lot size correct? (Jan 2026: Nifty 65, Bank Nifty 30, Fin Nifty 60)
  │   ├── Is expiry day? → Add 2% ELM for short options
  │   └── Is position within client limit (5% of total OI)?
  └── Broker routes to:
      ├── NSE (primary for most liquid stocks)
      └── BSE (if NSE liquidity is low or user prefers)
```

### 3.2 Broker Routing (Zerodha / Upstox)

Zerodha Kite and Upstox route to:
- **NSE** (National Stock Exchange) for equities, F&O, currency, commodity
- **BSE** (Bombay Stock Exchange) for equities and specific instruments
- Order routing follows broker's internal order management system (OMS) — no DMA for retail
- Broker charges per executed order (₹0 for equity delivery, ₹20 for intraday/F&O on Zerodha)

**Note:** For advanced DMA or custom venue routing, this would require NSE membership (unlikely for retail SaaS). Consider broker-agnostic execution for Pro tier users.

---

## 4. Slippage Estimation

### 4.1 Slippage Model

```python
def estimate_slippage(symbol, qty, order_type, market_conditions):
    """
    Estimate expected slippage in basis points.
    
    Factors:
    - Spread (bid-ask)
    - Order size relative to ADV
    - Volatility (ATR)
    - Market impact model (square-root law)
    """
    adv = get_adv(symbol)  # Average daily volume
    spread_bps = (market_conditions.ask - market_conditions.bid) / market_conditions.mid * 10_000
    volatility_bps = market_conditions.atr_14 / market_conditions.price * 10_000
    
    # Square-root market impact model
    participation_rate = qty / adv
    market_impact_bps = 100 * (participation_rate ** 0.5)
    
    # Order type adjustment
    if order_type == OrderType.MARKET:
        type_adjustment = 1.5  # Market orders incur more slippage
    elif order_type == OrderType.LIMIT:
        type_adjustment = 0.5  # Limit orders have controlled slippage
    else:
        type_adjustment = 1.0
    
    estimated_slippage_bps = (
        spread_bps * 0.3 +
        volatility_bps * 0.2 +
        market_impact_bps * 0.5
    ) * type_adjustment
    
    return {
        'expected_bps': estimated_slippage_bps,
        'worst_case_bps': estimated_slippage_bps * 2,
        'components': {
            'spread_bps': spread_bps,
            'volatility_bps': volatility_bps,
            'market_impact_bps': market_impact_bps,
        }
    }
```

### 4.2 Slippage Monitoring

| Metric | Target | Alert Threshold |
|---|---|---|
| Average slippage (market orders) | < 5 bps | > 10 bps |
| Average slippage (limit orders) | < 2 bps | > 5 bps |
| Worst-case slippage | < 20 bps | > 50 bps |
| Slippage trend (7-day) | Flat or improving | Increasing > 20% |

---

## 5. Position Sizing Algorithms

### 5.1 Kelly Criterion (Optimal)

```python
import math

def kelly_criterion(win_rate: float, avg_win_pct: float, avg_loss_pct: float, 
                    fraction: float = 1.0) -> float:
    """
    Calculate Kelly fraction for position sizing.
    
    Args:
        win_rate: Probability of winning trade (0-1)
        avg_win_pct: Average win amount as % of capital
        avg_loss_pct: Average loss amount as % of capital (positive number)
        fraction: Kelly fraction to use (1.0 = full Kelly, 0.5 = half Kelly)
    
    Returns:
        Fraction of portfolio to allocate
    """
    if win_rate <= 0 or avg_win_pct <= 0 or avg_loss_pct <= 0:
        raise ValueError("All inputs must be positive")
    
    # Kelly formula: f* = (p * b - q) / b
    # where p = win rate, q = loss rate, b = win/loss ratio
    b = avg_win_pct / avg_loss_pct  # Win-to-loss ratio
    q = 1 - win_rate
    
    kelly_fraction = (win_rate * b - q) / b
    
    if kelly_fraction <= 0:
        raise ValueError("Negative expectancy — do not trade")
    
    return kelly_fraction * fraction

# Example usage
# Conservative: half-Kelly
position_size = kelly_criterion(
    win_rate=0.55,
    avg_win_pct=0.08,  # 8% avg win
    avg_loss_pct=0.04,  # 4% avg loss
    fraction=0.5  # Half Kelly for safety
)
# Result: ~0.0625 = 6.25% of portfolio
```

### 5.2 Fixed Fractional (Recommended Default)

```python
def fixed_fractional_position_size(
    equity: float,
    risk_per_trade_pct: float,
    entry_price: float,
    stop_loss: float,
    max_position_pct: float = 0.10
) -> int:
    """
    Risk-based position sizing.
    
    Risk per trade is fixed % of equity.
    Position size = Risk Amount / (Entry - Stop Loss)
    """
    risk_amount = equity * risk_per_trade_pct
    risk_per_share = entry_price - stop_loss
    
    if risk_per_share <= 0:
        raise ValueError("Stop loss must be below entry price for longs")
    
    shares = int(risk_amount / risk_per_share)
    max_shares = int((equity * max_position_pct) / entry_price)
    
    return min(shares, max_shares)

# Example
shares = fixed_fractional_position_size(
    equity=100_000,
    risk_per_trade_pct=0.01,  # Risk 1% per trade
    entry_price=185.50,
    stop_loss=179.00,
    max_position_pct=0.10  # Max 10% in one position
)
# Risk amount: ₹1,000
# Risk per share: ₹6.50
# Position: 153 shares = ₹28,366 (28% of portfolio, capped at 10% = 53 shares)
# Result: 53 shares (capped by max_position_pct)
```

### 5.3 Volatility Targeting

```python
def volatility_targeted_position_size(
    equity: float,
    target_volatility_pct: float,  # Annual target vol, e.g., 15%
    current_atr: float,
    entry_price: float,
    atr_lookback: int = 14
) -> int:
    """
    Target a specific portfolio volatility.
    
    Position size inversely proportional to asset volatility.
    """
    # Convert annual target to daily
    daily_target_vol = target_volatility_pct / math.sqrt(252)
    
    # Asset daily volatility estimate from ATR
    asset_daily_vol = current_atr / entry_price
    
    # Position weight to achieve target volatility
    position_weight = daily_target_vol / asset_daily_vol
    
    # INR amount and shares
    position_inr = equity * position_weight
    shares = int(position_inr / entry_price)
    
    return shares
```

### 5.4 Position Sizing by Risk Profile

| Risk Profile | Risk per Trade | Max Position | Kelly Fraction | Method |
|---|---|---|---|---|
| **Conservative** | 0.5% equity | 5% portfolio | 0.25 (quarter Kelly) | Fixed fractional + volatility cap |
| **Moderate** | 1.0% equity | 10% portfolio | 0.50 (half Kelly) | Fixed fractional (default) |
| **Aggressive** | 2.0% equity | 20% portfolio | 0.75 (three-quarter Kelly) | Full Kelly with drawdown circuit breaker |

---

## 6. Portfolio Construction

### 6.1 Mean-Variance Optimization (MVO)

```python
import numpy as np
from scipy.optimize import minimize

def mean_variance_optimization(
    expected_returns: np.ndarray,
    covariance_matrix: np.ndarray,
    target_return: float = None,
    risk_free_rate: float = 0.045,
    max_position_weight: float = 0.20,
    allow_short: bool = False
) -> np.ndarray:
    """
    Optimize portfolio weights for Sharpe ratio maximization.
    
    Args:
        expected_returns: Annualized expected returns per asset
        covariance_matrix: Annualized covariance matrix
        target_return: Optional target return constraint
        risk_free_rate: Annual risk-free rate (e.g., 4.5%)
        max_position_weight: Maximum weight per position
        allow_short: Whether to allow short positions
    """
    n = len(expected_returns)
    
    def negative_sharpe(weights):
        portfolio_return = np.dot(weights, expected_returns)
        portfolio_vol = np.sqrt(np.dot(weights.T, np.dot(covariance_matrix, weights)))
        return -(portfolio_return - risk_free_rate) / portfolio_vol
    
    # Constraints
    constraints = [{'type': 'eq', 'fun': lambda w: np.sum(w) - 1.0}]
    if target_return:
        constraints.append({
            'type': 'eq', 
            'fun': lambda w: np.dot(w, expected_returns) - target_return
        })
    
    # Bounds
    if allow_short:
        bounds = tuple((-max_position_weight, max_position_weight) for _ in range(n))
    else:
        bounds = tuple((0, max_position_weight) for _ in range(n))
    
    # Optimize
    result = minimize(
        negative_sharpe,
        x0=np.array([1/n] * n),
        method='SLSQP',
        bounds=bounds,
        constraints=constraints
    )
    
    return result.x
```

### 6.2 Risk Parity

```python
def risk_parity_weights(covariance_matrix: np.ndarray, max_iter: int = 100) -> np.ndarray:
    """
    Allocate capital such that each asset contributes equally to portfolio risk.
    """
    n = covariance_matrix.shape[0]
    weights = np.ones(n) / n
    
    for _ in range(max_iter):
        # Portfolio volatility
        port_vol = np.sqrt(weights.T @ covariance_matrix @ weights)
        
        # Marginal risk contributions
        mrc = (covariance_matrix @ weights) / port_vol
        rc = weights * mrc
        
        # Update weights to equalize risk contributions
        weights = rc / np.sum(rc)
        weights = weights / np.sum(weights)
    
    return weights
```

---

## 7. Rebalancing Triggers & Frequency

### 7.1 Rebalancing Rules

| Trigger | Threshold | Action |
|---|---|---|
| **Time-based** | Weekly (default) / Daily (active) | Review all positions |
| **Drift-based** | Position weight ±5% from target | Trim or add |
| **Signal-based** | New strong signal, weak existing | Rotate capital |
| **Risk-based** | Portfolio heat > max allowed | Reduce sizes |
| **Drawdown-based** | Portfolio DD > 10% | Defensive rebalancing |
| **Cash-based** | Cash > 20% (conservative) / > 5% (aggressive) | Deploy capital |

### 7.2 Rebalancing Algorithm

```python
def rebalance_portfolio(portfolio, target_weights, signals, constraints):
    """
    Generate rebalancing orders to align portfolio with target weights.
    """
    orders = []
    total_equity = portfolio.total_equity
    
    for symbol, target_weight in target_weights.items():
        current_position = portfolio.positions.get(symbol)
        current_weight = (current_position.market_value / total_equity) if current_position else 0
        
        weight_diff = target_weight - current_weight
        
        # Only rebalance if drift > threshold (5%)
        if abs(weight_diff) < 0.05:
            continue
        
        target_inr = total_equity * target_weight
        current_inr = current_position.market_value if current_position else 0
        inr_diff = target_inr - current_inr
        
        # Check constraints
        if current_position and inr_diff < 0:
            # Selling — check STCG/LTCG implications (India: no wash sale rule, but STCG 20% / LTCG 12.5% apply)
            qty_to_sell = int(abs(inr_diff) / current_position.market_price)
            orders.append(Order(symbol=symbol, side='sell', qty=qty_to_sell))
        elif inr_diff > 0:
            # Buying — check buying power, position limits
            qty_to_buy = int(inr_diff / signals[symbol].entry_price)
            orders.append(Order(symbol=symbol, side='buy', qty=qty_to_buy))
    
    return orders
```

---

## 8. Drawdown Calculation

### 8.1 Peak-to-Trough Drawdown

```python
def calculate_drawdown(equity_curve: list[float]) -> dict:
    """
    Calculate maximum drawdown and drawdown statistics.
    
    Returns peak value, trough value, max drawdown %, and duration.
    """
    peak = equity_curve[0]
    max_dd = 0.0
    max_dd_start = 0
    max_dd_end = 0
    current_dd_start = 0
    
    for i, equity in enumerate(equity_curve):
        if equity > peak:
            peak = equity
            current_dd_start = i
        
        dd = (peak - equity) / peak
        
        if dd > max_dd:
            max_dd = dd
            max_dd_start = current_dd_start
            max_dd_end = i
    
    return {
        'max_drawdown_pct': max_dd * 100,
        'peak': peak,
        'trough': equity_curve[max_dd_end],
        'duration_days': max_dd_end - max_dd_start,
        'recovery_required_pct': (peak / equity_curve[max_dd_end] - 1) * 100,
    }

# Real-time tracking
def update_running_drawdown(portfolio):
    """Update running drawdown on every portfolio snapshot."""
    portfolio.peak_equity = max(portfolio.peak_equity, portfolio.total_equity)
    current_dd = (portfolio.peak_equity - portfolio.total_equity) / portfolio.peak_equity
    portfolio.current_drawdown = current_dd
    portfolio.max_drawdown = max(portfolio.max_drawdown, current_dd)
```

### 8.2 Drawdown Circuit Breakers

| Drawdown Level | Action |
|---|---|
| **5%** | Reduce position sizes by 25% |
| **10%** | Reduce position sizes by 50%, increase cash target to 30% |
| **15%** | Halt new signal generation, close weakest 50% of positions |
| **20%** | Full defensive mode: close all positions, 100% cash |
| **25%** | Mandatory review: audit all systems, halt live trading |

---

## 9. Performance Metrics

### 9.1 Sharpe Ratio

```python
def sharpe_ratio(returns: list[float], risk_free_rate: float = 0.045, 
                 periods_per_year: int = 252) -> float:
    """
    Calculate annualized Sharpe ratio.
    """
    excess_returns = [r - risk_free_rate / periods_per_year for r in returns]
    
    if len(excess_returns) < 2:
        return 0.0
    
    avg_excess_return = np.mean(excess_returns) * periods_per_year
    volatility = np.std(excess_returns, ddof=1) * np.sqrt(periods_per_year)
    
    return avg_excess_return / volatility if volatility > 0 else 0.0
```

### 9.2 Sortino Ratio

```python
def sortino_ratio(returns: list[float], risk_free_rate: float = 0.045,
                  periods_per_year: int = 252) -> float:
    """
    Calculate annualized Sortino ratio (downside deviation only).
    """
    excess_returns = [r - risk_free_rate / periods_per_year for r in returns]
    downside_returns = [r for r in excess_returns if r < 0]
    
    if len(downside_returns) < 2:
        return 0.0
    
    avg_excess_return = np.mean(excess_returns) * periods_per_year
    downside_deviation = np.std(downside_returns, ddof=1) * np.sqrt(periods_per_year)
    
    return avg_excess_return / downside_deviation if downside_deviation > 0 else 0.0
```

### 9.3 Benchmark Selection & Comparison

| Benchmark | Symbol | Use Case |
|---|---|---|
| **NIFTY 50** | NIFTY50 | Broad market comparison (default) |
| **NIFTY 100** | NIFTY100 | Large-cap strategy comparison |
| **NIFTY MIDCAP 100** | NIFTYMID100 | Mid-cap strategy comparison |
| **NIFTY SMALLCAP 100** | NIFTYSMCAP100 | Small-cap strategy comparison |
| **Sector Index** | NIFTY BANK, NIFTY IT, NIFTY AUTO, etc. | Sector-specific strategy |
| **Risk-free rate** | 91-day T-bill (India) | Sharpe/Sortino calculation |

### 9.4 Alpha & Beta Decomposition

```python
def calculate_alpha_beta(portfolio_returns: list[float], 
                         benchmark_returns: list[float],
                         risk_free_rate: float = 0.045) -> dict:
    """
    Calculate Jensen's alpha and portfolio beta.
    """
    import numpy as np
    
    # Convert to excess returns
    portfolio_excess = np.array(portfolio_returns) - risk_free_rate / 252
    benchmark_excess = np.array(benchmark_returns) - risk_free_rate / 252
    
    # Beta = Cov(portfolio, benchmark) / Var(benchmark)
    covariance = np.cov(portfolio_excess, benchmark_excess)[0, 1]
    benchmark_variance = np.var(benchmark_excess, ddof=1)
    beta = covariance / benchmark_variance if benchmark_variance > 0 else 1.0
    
    # Alpha = Portfolio return - (Risk-free + Beta * (Benchmark - Risk-free))
    avg_portfolio_return = np.mean(portfolio_returns) * 252
    avg_benchmark_return = np.mean(benchmark_returns) * 252
    alpha = avg_portfolio_return - (risk_free_rate + beta * (avg_benchmark_return - risk_free_rate))
    
    return {
        'alpha_annualized': alpha,
        'beta': beta,
        'r_squared': np.corrcoef(portfolio_returns, benchmark_returns)[0, 1] ** 2,
        'treynor_ratio': (avg_portfolio_return - risk_free_rate) / beta if beta > 0 else 0,
    }
```

---

## 10. Performance Attribution (Brinson Model)

### 10.1 Brinson-Fachler Attribution

```python
def brinson_attribution(
    portfolio_weights: dict[str, float],
    portfolio_returns: dict[str, float],
    benchmark_weights: dict[str, float],
    benchmark_returns: dict[str, float]
) -> dict:
    """
    Decompose outperformance into allocation, selection, and interaction effects.
    """
    sectors = set(portfolio_weights.keys()) | set(benchmark_weights.keys())
    
    allocation_effect = 0
    selection_effect = 0
    interaction_effect = 0
    
    benchmark_total_return = sum(benchmark_weights.get(s, 0) * benchmark_returns.get(s, 0) for s in sectors)
    
    for sector in sectors:
        wp = portfolio_weights.get(sector, 0)
        wb = benchmark_weights.get(sector, 0)
        rp = portfolio_returns.get(sector, 0)
        rb = benchmark_returns.get(sector, 0)
        
        # Allocation effect: Over/under-weighting a sector
        allocation_effect += (wp - wb) * (rb - benchmark_total_return)
        
        # Selection effect: Security selection within sector
        selection_effect += wb * (rp - rb)
        
        # Interaction: Combined effect
        interaction_effect += (wp - wb) * (rp - rb)
    
    return {
        'allocation_effect': allocation_effect,
        'selection_effect': selection_effect,
        'interaction_effect': interaction_effect,
        'total_excess_return': allocation_effect + selection_effect + interaction_effect,
    }
```

---

## 11. Pre-Trade Checks

### 11.1 Validation Matrix

| Check | Rule | Failure Action |
|---|---|---|
| **Buying power** | Order value <= available buying power | Reject with reason |
| **Position limit** | Position size <= max per risk profile | Reduce to max allowed |
| **Sector concentration** | No more than 3 positions in same sector | Warn + require confirmation |
| **Intraday leverage** | MIS product type; broker-specific leverage limits (typically 5× for equities) | Block order if exceeds broker margin |
| **Market hours** | Order submitted during valid hours | Reject or queue for open |
| **Circuit limit** | Entry price within NSE/BSE upper/lower circuit | Reject if at circuit; warn if near |
| **T2T segment** | Symbol in Trade-to-Trade (T2T) segment | Warn: delivery mandatory, no intraday |
| **Product type** | CNC/MIS/NRML valid for symbol and user margin | Block if insufficient SPAN/Exposure |
| **F&O lot size** | Qty is multiple of lot size (post-Nov 2024 values) | Reject if not lot multiple |
| **Expiry day margin** | Short options on expiry day: +2% ELM | Block if insufficient margin |
| **Intraday position limit** | Client position < 5% of total OI in contract | Warn if approaching limit |
| **Corporate action** | Pending split/dividend/bonus affecting order | Warn + adjust quantity/price |
| **Tax loss harvesting** | Recent loss sale on same symbol (India has no wash sale rule, but STCG applies) | Log for tax P&L export |

### 11.2 Pre-Trade Validation Code

```python
def validate_pre_trade(signal, portfolio, user_profile, market_status):
    errors = []
    warnings = []
    
    # Buying power check
    order_value = signal.position_size * signal.entry_price
    if order_value > portfolio.buying_power:
        errors.append(f"Insufficient buying power: ₹{portfolio.buying_power:.2f} available, ₹{order_value:.2f} required")
    
    # Position limit
    max_position_pct = {'conservative': 0.05, 'moderate': 0.10, 'aggressive': 0.20}[user_profile.risk_profile]
    max_position_value = portfolio.total_equity * max_position_pct
    if order_value > max_position_value:
        warnings.append(f"Position size exceeds {max_position_pct*100:.0f}% limit — reducing to ₹{max_position_value:.2f}")
        signal.position_size = int(max_position_value / signal.entry_price)
    
    # Sector concentration
    sector_positions = sum(1 for p in portfolio.positions if p.sector == signal.sector)
    if sector_positions >= 3:
        warnings.append(f"Already have {sector_positions} positions in {signal.sector} — consider diversification")
    
    # Intraday margin / product type check
    if signal.product_type == 'MIS':
        # MIS requires broker intraday margin; enforce conservative leverage check
        intraday_margin_required = order_value / 5  # Conservative 5× cap
        if portfolio.buying_power < intraday_margin_required:
            errors.append(f"Insufficient intraday margin for MIS order: ₹{intraday_margin_required:.2f} required")
    
    # Circuit limit check (NSE/BSE)
    if signal.entry_price >= market_status.upper_circuit:
        errors.append(f"Entry price ₹{signal.entry_price:.2f} is at or above upper circuit limit (₹{market_status.upper_circuit:.2f}). Cannot place order.")
    elif signal.entry_price >= market_status.upper_circuit * 0.98:
        warnings.append(f"Entry price is within 2% of upper circuit. High risk of order rejection.")
    
    # T2T segment check
    if market_status.is_t2t_segment:
        warnings.append(f"{signal.symbol} is in Trade-to-Trade (T2T) segment. Delivery is mandatory; no intraday allowed.")
        if signal.product_type == 'MIS':
            errors.append("MIS (intraday) orders not allowed for T2T stocks. Use CNC for delivery.")
    
    # F&O lot size validation
    if signal.instrument_type in ['FUT', 'CE', 'PE']:
        if signal.qty % signal.lot_size != 0:
            errors.append(f"F&O quantity must be in multiples of lot size ({signal.lot_size}). Got {signal.qty}.")
        # Expiry day ELM check for short options
        if signal.is_expiry_day and signal.side == 'sell' and signal.instrument_type in ['CE', 'PE']:
            elm_required = 0.02 * signal.underlying_price * signal.lot_size * (signal.qty / signal.lot_size)
            warnings.append(f"Expiry day: additional 2% ELM (₹{elm_required:.2f}) required for short options.")
    
    # Tax loss harvesting log (India has no wash sale rule, unlike US)
    recent_loss_trade = check_recent_loss(user_profile.user_id, signal.symbol, days=30)
    if recent_loss_trade:
        warnings.append(f"Recent loss on {signal.symbol} within last 30 days. STCG at 20% will apply on next profitable sale. Logged for tax reporting.")
    
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings,
        'adjusted_signal': signal,
    }
```

---

## 12. Post-Trade Reconciliation

### 12.1 Reconciliation Process

```
Broker fills trade (Zerodha / Upstox / Angel One)
  → Webhook received by TradeMind
    → Match against internal pending order
      → Verify: symbol, side, qty, price within tolerance
        → Update trade record with fill details
          → Update portfolio positions
            → Update P&L calculations
              → Generate trade confirmation
                → Log to audit trail
```

### 12.2 Reconciliation Checks

| Check | Tolerance | Action on Mismatch |
|---|---|---|
| Symbol match | Exact | Alert ops, manual review |
| Side match | Exact | Alert ops, potential system bug |
| Qty match | ±1 share (partial fill) | Update with actual fill qty |
| Price match | ±1% of expected | Log slippage, update records |
| Commission / STT / GST | ±₹0.01 | Update with actual broker charges |
| Timestamp | ±5 seconds | Accept, log if > 5s |

### 12.3 Trade Journaling Requirements

Every trade record must include:
- Signal ID that triggered the trade
- Agent reasoning snapshot (at time of signal)
- Market conditions (NIFTY 50 trend, sector momentum, VIX India equivalent if available)
- Pre-trade validation results
- Execution details (fill price, slippage, venue)
- Post-trade P&L (realized + unrealized)
- User notes / override reasons
- Photo/screenshot of chart at entry (optional)

---

## 13. Corporate Actions Handling

### 13.1 Supported Corporate Actions

| Action | Impact | Handling |
|---|---|---|
| **Stock Split** | Position qty × split ratio, price ÷ ratio | Auto-adjust positions and cost basis |
| **Reverse Split** | Position qty ÷ split ratio, price × ratio | Auto-adjust positions and cost basis |
| **Dividend (Cash)** | Cash credited to account | Record as cash flow, adjust total return |
| **Dividend (Stock)** | Additional shares received | Add to position qty, adjust cost basis |
| **Merger** | Position converted to acquiring company | Liquidate + rebuy if symbol changes |
| **Spin-off** | New position in spun-off company | Create new position with allocated cost basis |
| **Delisting** | Position removed from market | Flag for manual review, liquidate if possible |

### 13.2 Corporate Action Pipeline

```python
def handle_corporate_action(action_type: str, symbol: str, details: dict, portfolio):
    """
    Process corporate action and update portfolio records.
    """
    position = portfolio.positions.get(symbol)
    if not position:
        return  # No position affected
    
    if action_type == 'stock_split':
        ratio = details['split_ratio']  # e.g., 2.0 for 2:1
        old_qty = position.qty
        old_cost_basis = position.avg_entry_price
        
        position.qty = int(old_qty * ratio)
        position.avg_entry_price = old_cost_basis / ratio
        
        # Log adjustment
        log_corporate_action(
            user_id=portfolio.user_id,
            symbol=symbol,
            action='stock_split',
            old_qty=old_qty,
            new_qty=position.qty,
            old_cost_basis=old_cost_basis,
            new_cost_basis=position.avg_entry_price,
        )
    
    elif action_type == 'cash_dividend':
        dividend_amount = position.qty * details['dividend_per_share']
        portfolio.cash += dividend_amount
        portfolio.total_equity += dividend_amount
        
        # Record dividend for tax reporting
        record_dividend(
            user_id=portfolio.user_id,
            symbol=symbol,
            amount=dividend_amount,
            dividend_type='exempt_under_10L' if details.get('dividend') <= 10_00_000 else 'taxable_above_10L',
            ex_date=details['ex_date'],
        )
```

---

## 14. Market Hours Validation

### 14.1 Indian Equity Market Hours (IST)

|| Session | Start | End | Liquidity |
|---|---|---|---|---|
| **Pre-open** | 09:00 | 09:15 | Price discovery, order entry |
| **Normal / Regular** | 09:15 | 15:30 | High, tight spreads |
| **Closed** | 15:30 | 09:00 (next day) | No trading |

### 14.2 Market Hours Validation Logic

```python
def validate_market_hours(symbol: str, order_type: str, user_preferences):
    now = datetime.now(tz=ZoneInfo('Asia/Kolkata'))
    pre_open_start = time(9, 0)
    market_open = time(9, 15)
    market_close = time(15, 30)
    
    is_weekday = now.weekday() < 5  # Monday = 0 ... Friday = 4
    is_holiday = is_market_holiday(now.date())  # NSE/BSE holiday calendar
    
    if not is_weekday or is_holiday:
        return {'valid': False, 'reason': 'Market closed (weekend or NSE/BSE holiday)'}
    
    current_time = now.time()
    
    if pre_open_start <= current_time < market_open:
        # Pre-open: only limit orders allowed, no cancellations after 09:08
        if order_type in ['market', 'trailing_stop', 'bracket_order', 'cover_order']:
            return {'valid': False, 'reason': f'{order_type} orders not supported during pre-open'}
        return {'valid': True, 'session': 'pre_open', 'warning': 'Pre-open session: orders executed at equilibrium price'}
    
    if market_open <= current_time <= market_close:
        return {'valid': True, 'session': 'regular'}
    
    return {'valid': False, 'reason': 'Market closed (outside NSE/BSE hours 09:15–15:30 IST)'}
```

### 14.3 Pre-Open Session Considerations (NSE/BSE)

- Only limit orders accepted during 09:00–09:15 pre-open
- Orders matched via call auction at 09:07–09:08 (no cancellation after 09:08)
- Equilibrium price determined from call auction
- No market orders, bracket orders, or cover orders during pre-open
- Regular session begins at 09:15 with continuous trading
- No after-hours trading for Indian equities; commodity (MCX) has separate evening session

---

## 15. Short Selling Requirements (NSE/BSE)

### 15.1 Short Sale Checks

|| Check | Requirement | Failure Action |
|---|---|---|---|
| **Product type** | Must use MIS (intraday) or CNC with SLBM | Reject if product type invalid |
| **SEBI short-selling norms** | All short sales reported to exchange | Broker handles reporting |
| **Intraday only** | Short selling allowed only intraday for retail (MIS) | Reject if CNC short attempted |
| **SLBM (institutional)** | For delivery-based short selling via Securities Lending & Borrowing | Not available for retail |
| **Buying power** | Sufficient intraday margin (VAR + ELM + broker-specific) | Reject if insufficient |
| **Broker restrictions** | Some brokers disallow short in certain illiquid stocks | Warn user |

### 15.2 Short Selling Flow

```
User requests short sell
  → Check product type (MIS mandatory for retail short)
    → Verify symbol is in broker's short-allowed list
      → Check SEBI / exchange restrictions (ban list, T2T)
        → Verify sufficient intraday margin (VAR + ELM)
          → Submit short sell order (MIS)
            → Auto square-off at 15:15 if position open (MIS)
              → Cover or let broker auto-square-off
```

---

## 16. Margin Calculation (Indian Broker Context)

### 16.1 Margin Requirements

|| Product Type | Requirement | Calculation |
|---|---|---|---|
| **CNC (Cash-n-Carry)** | 100% cash | Order value <= available cash |
| **MIS (Intraday)** | Broker-specific leverage (~5× equity, ~3× F&O) | VAR + ELM margin from NSE |
| **NRML (Normal / F&O overnight)** | SPAN + Exposure margin | Exchange-mandated SPAN + broker exposure |
| **MTF (Margin Trading Facility)** | Broker-specific; SEBI-capped leverage | As per broker MTF terms |

### 16.2 Margin Calculations

```python
def calculate_margin_requirements(portfolio, product_type='CNC'):
    """
    Calculate current and projected margin metrics for Indian brokers.
    """
    long_market_value = sum(p.market_value for p in portfolio.positions if p.side == 'long')
    short_market_value = sum(p.market_value for p in portfolio.positions if p.side == 'short')
    total_market_value = long_market_value + abs(short_market_value)
    
    # Indian broker margin: product-type dependent
    if product_type == 'CNC':
        initial_margin_required = total_market_value  # 100%
        maintenance_margin_required = total_market_value
    elif product_type == 'MIS':
        initial_margin_required = total_market_value * 0.20  # ~5× leverage (conservative)
        maintenance_margin_required = total_market_value * 0.25
    elif product_type == 'NRML':
        # F&O: SPAN + Exposure (simplified)
        initial_margin_required = total_market_value * 0.15  # Approximate SPAN
        maintenance_margin_required = total_market_value * 0.10  # Exposure margin
    else:
        initial_margin_required = total_market_value
        maintenance_margin_required = total_market_value
    
    # Current equity
    equity = portfolio.total_equity
    
    # Margin excess / deficit
    margin_excess = equity - initial_margin_required
    maintenance_excess = equity - maintenance_margin_required
    
    # Margin call threshold
    margin_call_triggered = maintenance_excess < 0
    
    return {
        'product_type': product_type,
        'initial_margin_required': initial_margin_required,
        'maintenance_margin_required': maintenance_margin_required,
        'margin_excess': margin_excess,
        'maintenance_excess': maintenance_excess,
        'margin_utilization_pct': (initial_margin_required / equity * 100) if equity > 0 else 0,
        'margin_call_triggered': margin_call_triggered,
    }
```

---

## 17. Cash Management

### 17.1 Cash Allocation Strategy

|| Strategy | Cash Target | Use Case |
|---|---|---|---|
| **Fully invested** | 0-2% | Aggressive, high conviction market |
| **Standard** | 5-10% | Moderate, default for most users |
| **Defensive** | 20-30% | Conservative, uncertain markets |
| **Opportunistic** | 15-25% | Waiting for pullback, high India VIX |

### 17.2 Idle Cash Yield

- **Default:** Cash stays in broker trading account; no automatic sweep to money market (Indian brokers typically don't offer this)
- **Alternative:** User can manually move excess cash to liquid funds / overnight funds via broker's mutual fund platform
- **Target:** Match or exceed 91-day T-bill yield (India)
- **Tracking:** Monitor yield vs 91-day T-bill / liquid fund benchmark monthly
- **Note:** Unlike US brokers, Indian retail brokers generally do not pay interest on idle cash balances

---

## 18. Tax Lot Selection (India)

### 18.1 Tax Lot Methods

|| Method | Description | Best For |
|---|---|---|---|
| **FIFO** (First In, First Out) | Oldest shares sold first | Default, ITD-compliant for equities |
| **LIFO** (Last In, First Out) | Newest shares sold first | Inflationary periods, higher cost basis |
| **HIFO** (Highest In, First Out) | Highest cost basis sold first | Tax minimization (maximize losses) |
| **LOFO** (Lowest In, First Out) | Lowest cost basis sold first | Tax maximization (harvest gains) |
| **Specific lot** | User selects individual lots | Precision tax planning |

**Note:** Income Tax Department (India) does not explicitly mandate FIFO, but FIFO is the conservative default. Users should consult a CA for specific lot selection.

### 18.2 STCG / LTCG & Tax-Loss Harvesting

```python
def identify_tax_loss_harvesting_opportunities(portfolio, min_loss_pct: float = 0.05):
    """
    Identify positions with unrealized losses suitable for tax-loss harvesting in India.
    
    Rules:
    - Equity STCG (holding < 1 year): 15% tax on gains
    - Equity LTCG (holding > 1 year): 10% tax on gains above ₹1 Lakh exemption
    - Set-off: STCL can offset STCG and LTCG; LTCL can only offset LTCG
    """
    opportunities = []
    
    for position in portfolio.positions:
        if position.unrealized_pnl_pct < -min_loss_pct:
            holding_period_days = (now() - position.opened_at).days
            is_stcg = holding_period_days < 365
            is_ltcl = holding_period_days >= 365 and position.unrealized_pnl < 0
            
            # STCL is more valuable (can offset both STCG and LTCG)
            tax_savings_rate = 0.15 if is_stcg else 0.10
            
            opportunities.append({
                'symbol': position.symbol,
                'unrealized_loss': position.unrealized_pnl,
                'unrealized_loss_pct': position.unrealized_pnl_pct,
                'holding_period_days': holding_period_days,
                'is_stcg': is_stcg,
                'is_ltcl': is_ltcl,
                'tax_savings_estimate': abs(position.unrealized_pnl) * tax_savings_rate,
                'note': 'STCL offsets both STCG and LTCG' if is_stcg else 'LTCL offsets only LTCG',
            })
    
    return sorted(opportunities, key=lambda x: x['tax_savings_estimate'], reverse=True)
```

### 18.3 STCG / LTCG Set-Off Logic

```python
def calculate_tax_liability(gains_stcg: float, gains_ltcg: float, 
                            losses_stcl: float, losses_ltcl: float) -> dict:
    """
    Calculate equity capital gains tax liability per Income Tax Act, India.
    """
    # STCL can offset STCG and LTCG (first STCG, then LTCG)
    net_stcg = max(0, gains_stcg - losses_stcl)
    remaining_stcl = max(0, losses_stcl - gains_stcg)
    net_ltcg = max(0, gains_ltcg - remaining_stcl - losses_ltcl)
    
    # LTCG exemption: ₹1 Lakh per year
    taxable_ltcg = max(0, net_ltcg - 1_00_000)
    
    tax_stcg = net_stcg * 0.15
    tax_ltcg = taxable_ltcg * 0.10
    
    # STT already paid at transaction time; not deductible from gains
    
    return {
        'net_stcg': net_stcg,
        'taxable_ltcg': taxable_ltcg,
        'tax_stcg': tax_stcg,
        'tax_ltcg': tax_ltcg,
        'total_tax': tax_stcg + tax_ltcg,
        'stt_paid_separately': True,
    }
```

### 18.4 Key Indian Tax Considerations

|| Consideration | Rule |
|---|---|
| **STCG rate** | 15% flat for equity + equity MF (if STT paid) |
| **LTCG rate** | 10% on gains above ₹1 Lakh/year exemption (if STT paid) |
| **STT** | Paid at transaction; not deductible from capital gains |
| **Dividend tax** | Taxed at slab rate if dividend > ₹10 Lakh/year; TDS at 10% if > ₹5,000 |
| **Carry forward losses** | STCL/LTCL can be carried forward 8 assessment years |
| **Set-off priority** | STCL → STCG first, then LTCG; LTCL → LTCG only |
| **Intraday** | Treated as speculative business income (not capital gains) |
| **F&O** | Treated as non-speculative business income |

**Important:** Tax rules per Income Tax Act, 1961 (as amended). Users must consult a qualified Chartered Accountant for personalized tax advice. Platform provides estimates only.

---

## 19. Execution Quality Metrics

| Metric | Formula | Target | Measurement |
|---|---|---|---|
| **Fill rate** | Filled qty / Requested qty | > 95% | Per order |
| **Time to fill** | Submit → First fill | < 2s (market), < 5min (limit) | Per order |
| **Price improvement** | (Mid - Fill) / Spread | > 30% | Per fill |
| **Effective spread** | 2 × |Fill - Mid| / Mid | < 0.10% | Per fill |
| **Realized spread** | 2 × |Fill - Mid_{5min later}| / Mid | < 0.15% | Per fill |
| **Implementation shortfall** | (Decision price - Fill price) / Decision price | < 0.20% | Per strategy |

---

*Co-Authored-By: Oz <oz-agent@warp.dev>*
