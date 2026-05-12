# F&O (Futures & Options) Trading Guide — India

## 1. Overview

This guide covers F&O-specific trading rules for the Indian market, incorporating **SEBI's October 2024 circular** (effective November 2024 - February 2025) that significantly changed F&O contract specifications.

**Key Changes (Nov 2024 onwards):**
- Contract value increased from ₹5-10 lakhs to **₹15-20 lakhs**
- Lot sizes revised for all index F&O
- Only **one benchmark index** allowed weekly expiry (Nifty 50)
- New margin rules: 2% ELM on expiry day, no calendar spread benefit

---

## 2. F&O Lot Sizes (Post-Nov 2024)

### 2.1 Index F&O Lot Sizes

| Index | Lot Size (Pre-Dec 2025) | Lot Size (Effective Jan 2026) | Approx Contract Value |
|---|---|---|---|
| **Nifty 50** | 75 | **65** | ~₹15-18L |
| **Bank Nifty** | 35 | **30** | ~₹16-20L |
| **Fin Nifty** | 65 | **60** | ~₹15-18L |
| **Nifty Midcap Select** | 140 | **120** | ~₹16-20L |
| **Nifty Next 50** | 25 | **25** (unchanged) | ~₹15-18L |
| **Sensex** | 20 | **20** (unchanged) | ~₹16-20L |
| **Bankex** | 20 | **20** (unchanged) | ~₹16-20L |

**Effective Dates:**
- Weekly contracts: Jan 6, 2026 expiry onwards
- Monthly contracts: Jan 27, 2026 expiry onwards
- Quarterly contracts: After Dec 30, 2025 expiry

**Note:** NSE revises lot sizes periodically to maintain contract value between ₹15-20 lakhs. Always verify current lot sizes from NSE's latest circular before trading.

### 2.2 Stock F&O Lot Sizes

Stock F&O lot sizes are revised so that contract value is between ₹15-20 lakhs.

**Example:**
```
RELIANCE spot price: ₹2,850
Target contract value: ₹15,00,000
Lot size = ₹15,00,000 / ₹2,850 ≈ 526 → Rounded to nearest multiple of underlying tick
```

### 2.3 Lot Size Validation in TradeMind

```python
def validate_fno_lot_size(symbol: str, qty: int, lot_size: int) -> bool:
    """Validate F&O quantity is multiple of lot size."""
    if qty % lot_size != 0:
        raise ValueError(
            f"F&O quantity must be in multiples of {lot_size}. "
            f"Got {qty}. Nearest valid: {qty // lot_size * lot_size} or {(qty // lot_size + 1) * lot_size}"
        )
    return True
```

---

## 3. Expiry Calendar

### 3.1 Weekly Expiry (Nifty 50 Only — Post-Nov 2024)

| Index | Weekly Expiry | Monthly Expiry | Quarterly |
|---|---|---|---|
| **Nifty 50** | Every Thursday | Last Thursday of month | March, June, Sept, Dec |
| **Bank Nifty** | ❌ Discontinued | Last Thursday | March, June, Sept, Dec |
| **Fin Nifty** | ❌ Discontinued | Last Thursday | March, June, Sept, Dec |
| **Midcap Select** | ❌ Discontinued | Last Thursday | March, June, Sept, Dec |

**SEBI Rule:** Only one benchmark index can have weekly expiry contracts.

### 3.2 Expiry Day Timing

- **Equity F&O expiry:** 3:30 PM IST (same as market close)
- **Currency F&O expiry:** 12:30 PM IST
- **Commodity F&O expiry:** Varies by commodity

### 3.3 Rollover Strategy

```python
def calculate_rollover_cost(symbol: str, current_expiry: date, next_expiry: date) -> dict:
    """Calculate cost of rolling F&O position to next expiry."""
    
    current_fut_price = get_futures_price(symbol, current_expiry)
    next_fut_price = get_futures_price(symbol, next_expiry)
    spot_price = get_spot_price(symbol)
    
    # Cost of carry
    cost_of_carry = next_fut_price - current_fut_price
    days_to_expiry = (current_expiry - date.today()).days
    
    # Annualized cost of carry
    if days_to_expiry > 0:
        annualized_coc = (cost_of_carry / spot_price) * (365 / days_to_expiry) * 100
    else:
        annualized_coc = 0
    
    # Is rollover profitable?
    # If cost_of_carry is negative (backwardation), rollover saves money
    
    return {
        'current_fut': current_fut_price,
        'next_fut': next_fut_price,
        'cost_of_carry': cost_of_carry,
        'annualized_coc_pct': annualized_coc,
        'recommendation': 'rollover' if cost_of_carry < spot_price * 0.005 else 'expire'
    }
```

---

## 4. Margin Requirements

### 4.1 SPAN + Exposure + ELM

| Margin Component | Calculation | Applies To |
|---|---|---|
| **SPAN** | Risk-based (VaR style) | All F&O positions |
| **Exposure** | Additional risk cover | All F&O positions |
| **ELM (Extreme Loss)** | 2% of contract value on expiry day for shorts | Short options on expiry day |
| **Total** | SPAN + Exposure + ELM (if applicable) | — |

### 4.2 Margin Calculation Example

```
Short 1 lot Nifty 50 Call option (strike 23,000)
Nifty spot: 22,500
Lot size: 25

SPAN Margin: ₹45,000 (calculated by exchange)
Exposure Margin: ₹15,000 (typically ~1/3 of SPAN)

If today is EXPIRY DAY and shorting:
  ELM = 2% × Nifty spot × Lot size
       = 0.02 × 22,500 × 25
       = ₹11,250

Total Margin Required = ₹45,000 + ₹15,000 + ₹11,250 = ₹71,250
```

### 4.3 Calendar Spread Margin Benefit (Lost on Expiry Day)

**Normal Days:**
```
Short Nifty Jan 23,000 CE: Margin ₹60,000
Long Nifty Feb 23,000 CE: Margin ₹55,000
Calendar spread benefit: ~₹40,000 saved
Net margin: ₹75,000 (instead of ₹1,15,000)
```

**On Expiry Day of Jan Contract:**
```
Calendar spread benefit = ₹0
Full margin required for short position: ₹60,000
Must maintain full margin before expiry day
```

### 4.4 Upfront Premium for Option Buyers (SEBI Oct 2024)

- Option buyers must pay **entire premium upfront**
- No additional leverage for option buying
- Zerodha has always collected this; no change for Zerodha users

### 4.5 Margin Validation in TradeMind

```python
def validate_fno_margin(signal, broker_margin_data) -> dict:
    """Validate sufficient margin for F&O order."""
    
    required = broker_margin_data['span'] + broker_margin_data['exposure']
    
    # Add ELM (Extreme Loss Margin) for short options on expiry day
    elm = 0  # Initialize to avoid unbound variable
    if signal.side == 'sell' and signal.instrument_type in ['CE', 'PE']:
        if is_expiry_day(signal.expiry):
            elm = 0.02 * signal.underlying_price * signal.lot_size
            required += elm
    
    available = broker_margin_data['available_margin']
    
    return {
        'sufficient': available >= required,
        'required': required,
        'available': available,
        'shortfall': max(0, required - available),
        'components': {
            'span': broker_margin_data['span'],
            'exposure': broker_margin_data['exposure'],
            'elm': elm if signal.side == 'sell' and is_expiry_day(signal.expiry) else 0
        }
    }
```

---

## 5. Position Limits

### 5.1 Client-Level Limits

| Segment | Limit | Effective Date |
|---|---|---|
| **Equity F&O** | 5% of total open interest (OI) in that contract | Real-time monitoring from Apr 1, 2025 |
| **Index F&O** | 15% of total OI in that index | Real-time monitoring from Apr 1, 2025 |

**Previously:** Monitored only at EOD.  
**Now:** Monitored intraday multiple times. Excess positions may be cut by exchange.

### 5.2 Position Limit Check in TradeMind

```python
def check_position_limit(symbol: str, proposed_qty: int, current_oi: int) -> dict:
    """Check if order would breach client position limit."""
    
    limit = current_oi * 0.05  # 5% of total OI
    current_position = get_user_position(symbol)
    new_total = current_position + proposed_qty
    
    utilization_pct = (new_total / limit) * 100
    
    return {
        'limit': limit,
        'current': current_position,
        'proposed': proposed_qty,
        'new_total': new_total,
        'utilization_pct': utilization_pct,
        'breached': new_total > limit,
        'warning_threshold': utilization_pct > 80
    }
```

---

## 6. Greeks for Indian F&O

### 6.1 Computing Greeks

```python
import numpy as np
from scipy.stats import norm

def calculate_greeks(S: float, K: float, T: float, r: float, sigma: float, option_type: str) -> dict:
    """
    Calculate option Greeks using Black-Scholes model.
    
    S: Spot price (INR)
    K: Strike price (INR)
    T: Time to expiry (years)
    r: Risk-free rate (India: ~6.5%)
    sigma: Implied volatility (annualized)
    option_type: 'CE' (call) or 'PE' (put)
    """
    
    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)
    
    if option_type == 'CE':
        delta = norm.cdf(d1)
        theta = (-S * norm.pdf(d1) * sigma / (2 * np.sqrt(T)) 
                 - r * K * np.exp(-r * T) * norm.cdf(d2)) / 365
        rho = K * T * np.exp(-r * T) * norm.cdf(d2) / 100
    else:  # PE
        delta = norm.cdf(d1) - 1
        theta = (-S * norm.pdf(d1) * sigma / (2 * np.sqrt(T)) 
                 + r * K * np.exp(-r * T) * norm.cdf(-d2)) / 365
        rho = -K * T * np.exp(-r * T) * norm.cdf(-d2) / 100
    
    gamma = norm.pdf(d1) / (S * sigma * np.sqrt(T))
    vega = S * norm.pdf(d1) * np.sqrt(T) / 100
    
    return {
        'delta': round(delta, 4),
        'gamma': round(gamma, 6),
        'theta': round(theta, 4),
        'vega': round(vega, 4),
        'rho': round(rho, 4)
    }
```

### 6.2 Practical Greek Interpretation for Indian Traders

| Greek | What It Means | Indian Context |
|---|---|---|
| **Delta (Δ)** | Price change per ₹1 move in underlying | Nifty 50 Call Δ=0.5: If Nifty +50 pts, call premium +₹25 |
| **Gamma (Γ)** | Rate of delta change | High near expiry; avoid large gamma positions on expiry day |
| **Theta (Θ)** | Time decay per day | For weekly expiry options: Theta is very high (rapid decay) |
| **Vega (V)** | Volatility sensitivity | Indian VIX spikes before budget, elections, RBI policy |
| **Rho (ρ)** | Interest rate sensitivity | Minimal impact in India (rates stable at 6.5%) |

---

## 7. Risk Manager Agent — F&O Specific Checks

```python
def fno_risk_checks(signal, portfolio, market_data) -> dict:
    """F&O-specific risk validation for the Risk Manager Agent."""
    
    checks = {
        'passed': [],
        'failed': [],
        'warnings': []
    }
    
    # 1. Lot size validation
    if signal.qty % signal.lot_size == 0:
        checks['passed'].append('lot_size')
    else:
        checks['failed'].append('lot_size')
    
    # 2. Margin adequacy
    margin_check = validate_fno_margin(signal, market_data.margin)
    if margin_check['sufficient']:
        checks['passed'].append('margin')
    else:
        checks['failed'].append(f"margin_shortfall_₹{margin_check['shortfall']:.0f}")
    
    # 3. Position limit
    position_check = check_position_limit(signal.symbol, signal.qty, market_data.total_oi)
    if position_check['breached']:
        checks['failed'].append('position_limit_breached')
    elif position_check['warning_threshold']:
        checks['warnings'].append(f"position_limit_{position_check['utilization_pct']:.0f}%")
    else:
        checks['passed'].append('position_limit')
    
    # 4. Expiry day ELM
    if is_expiry_day(signal.expiry) and signal.side == 'sell' and signal.instrument_type in ['CE', 'PE']:
        checks['warnings'].append('expiry_day_elm_2%')
    
    # 5. Time to expiry
    days_to_expiry = (signal.expiry - date.today()).days
    if days_to_expiry < 2:
        checks['warnings'].append(f"near_expiry_{days_to_expiry}_days_high_gamma_risk")
    
    # 6. Open Interest trend
    if market_data.oi_change_1d > 0.10:  # 10% OI increase
        checks['warnings'].append('oi_surge_10%_liquidity_risk')
    
    return checks
```

---

## 8. F&O Trading Strategies for TradeMind AI

### 8.1 Covered Call (Equity + Short Call)

```
Hold 1 lot of Nifty ETF (or equivalent basket)
Sell 1 lot of slightly OTM Nifty Call

Income: Option premium collected
Risk: Capped upside if Nifty rallies above strike
Best for: Neutral to mildly bullish market
```

### 8.2 Protective Put (Equity + Long Put)

```
Hold 1 lot of Nifty constituents
Buy 1 lot of ATM Nifty Put

Cost: Option premium paid
Benefit: Downside protection
Best for: Bullish but want insurance
```

### 8.3 Straddle / Strangle

```
Straddle: Buy ATM Call + ATM Put (same strike)
Strangle: Buy OTM Call + OTM Put (different strikes)

Profit: Large move in either direction
Loss: Premium paid if market stays flat
Best for: High volatility expected (budget day, RBI policy, earnings)
```

### 8.4 Iron Condor

```
Sell OTM Call + Buy further OTM Call
Sell OTM Put + Buy further OTM Put

Profit: Premium collected if market stays in range
Loss: Limited to spread width minus premium
Best for: Range-bound market (low volatility)
```

---

## 9. Compliance Checklist

- [ ] Lot size tables updated for post-Nov 2024 contract values (₹15-20L)
- [ ] Only Nifty 50 weekly expiry supported (SEBI Oct 2024)
- [ ] 2% ELM margin added for short options on expiry day
- [ ] Calendar spread benefit removed on expiry day (from Feb 10, 2025)
- [ ] Upfront premium collection enforced for option buyers
- [ ] Intraday position limit monitoring (5% client OI) implemented
- [ ] Margin API integrated with broker (SPAN + Exposure + ELM)
- [ ] Greeks computation available for all option signals
- [ ] Rollover cost calculator built for near-expiry futures
- [ ] Option strategy builder (covered call, protective put, straddle) in UI
