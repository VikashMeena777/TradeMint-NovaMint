# SEBI Algorithmic Trading Compliance Guide

## 1. Circular Reference

**SEBI Circular:** CIR/ISD/CFTP/C-2/2025  
**Date:** February 4, 2025  
**Title:** "Safer participation of retail investors in Algorithmic trading"  
**Effective Date:** ~August 1, 2025 (implementation timeline subject to exchange readiness)  

**Official Source:** [SEBI Website](https://www.sebi.gov.in/legal/circulars/feb-2025/safer-participation-of-retail-investors-in-algorithmic-trading_91614.html)

---

## 2. What SEBI Defines as "Algorithmic Trading"

SEBI defines algorithmic trading as:
> Any trading activity where orders are placed, modified, or cancelled automatically through computer programs or broker APIs, **without manually confirming each order**.

**Key implication:** ALL orders placed via broker APIs are now classified as "algo orders" regardless of frequency or strategy complexity.

---

## 3. The 10 Orders Per Second (OPS) Threshold

### 3.1 How It Works

| Scenario | OPS Calculation | Algo ID Required | Exchange Approval |
|---|---|---|---|
| **<= 10 OPS** | Rolling 1-second window: total orders + modifications + cancellations | **Generic Algo ID** | Not required |
| **> 10 OPS** | Same calculation | **Unique Strategy ID** | Mandatory |

**Important:** The 10 OPS threshold is per exchange (NSE and BSE counted separately) and per client. If a user trades on both NSE and BSE simultaneously, each exchange has its own 10 OPS limit.

### 3.2 Generic Algo ID

- Issued by the stock exchange (not the broker)
- Single ID covers all strategies below the 10 OPS threshold
- Broker automatically tags orders with this ID
- No pre-approval or registration required

### 3.3 Unique Strategy ID

- Required if strategy exceeds 10 OPS on any exchange
- Strategy logic must be submitted to the exchange for approval
- Exchange tests for market manipulation risks
- Approval process timeline: TBD by exchanges (expected 30-60 days)
- Any change to approved strategy requires fresh approval

### 3.4 TradeMind AI OPS Analysis

```
Typical TradeMind AI Signal Flow:
  1. User selects stock → AI agents analyze (~30 seconds)
  2. Signal generated → User reviews and clicks "Approve" (~5-60 seconds)
  3. Order submitted to broker API → 1 order placed

Maximum theoretical OPS for TradeMind:
  - 1 signal → 1 order (market or limit)
  - Possible modification: 1 stop-loss order (if bracket order)
  - Possible cancellation: 1 (if user cancels)
  
  Total per signal: ~3 order actions max
  With 10 signals per minute: 10 orders / 60s = 0.17 OPS
  
  Conclusion: TradeMind operates at << 10 OPS. Generic Algo ID is sufficient.
```

---

## 4. API Access Requirements (Mandatory for All Retail Traders)

| Requirement | SEBI Rule | TradeMind Implementation |
|---|---|---|
| **Static Public IP** | Broker must whitelist client's static IP | Document in onboarding; user provides static IP to broker |
| **Daily 2FA** | TOTP or SMS OTP at start of each trading day | UI reminder at 9:00 AM IST; guide user to authenticate with broker app |
| **OAuth + API Keys** | Client-specific keys only; no shared keys | Server-side proxy; keys encrypted at rest; never exposed client-side |
| **Session Expiry** | API sessions must be re-authenticated daily | Track session expiry; notify user 15 min before expiry |

---

## 5. White Box vs Black Box Classification

### 5.1 White Box Algos (Execution Algos)

| Attribute | Description | TradeMind Fits? |
|---|---|---|
| **Logic Disclosure** | Full logic known and disclosed to user | Yes — every signal shows agent reasoning |
| **Replicability** | User can replicate the logic manually | Yes — user sees all indicators, news, sentiment inputs |
| **User Control** | User confirms each order | Yes — human-in-the-loop default |
| **SEBI Treatment** | Allowed for personal use within 10 OPS | ✅ Compliant |

### 5.2 Black Box Algos (Strategy Algos)

| Attribute | Description | TradeMind Fits? |
|---|---|---|
| **Logic Disclosure** | Logic not disclosed; user cannot understand | No — full explainability provided |
| **Replicability** | User cannot replicate manually | No — all signals are explainable |
| **User Control** | Auto-executes without per-order confirmation | Optional auto-execute; gated by legal review |
| **SEBI Treatment** | Requires Research Analyst registration + exchange empanelment | ⚠️ Only if auto-execute enabled without confirmation |

### 5.3 TradeMind Classification: White Box Advisory Tool

**Recommended positioning:**
- TradeMind is an **AI-powered research and advisory platform**
- It generates **informational trade signals** with full reasoning
- Every signal requires **explicit user approval** before execution
- The user is always the decision-maker; TradeMind is the research assistant
- This classification likely exempts TradeMind from "algo provider" registration

**⚠️ Caution:** If offering auto-execute (where the system places orders without per-order user confirmation), this may trigger Black Box classification. Gate this feature behind:
1. Legal counsel approval
2. Explicit user consent with risk disclosure
3. SEBI Research Analyst registration (if required)
4. Exchange empanelment (if required)

---

## 6. Exchange Empanelment Requirements

### 6.1 Who Must Be Empanelled

Any entity that:
- Sells, distributes, or operates algorithmic strategies for others
- Offers "ready-made" algo strategies to retail clients
- Receives compensation for algo trading services

### 6.2 Empanelment Process (Expected)

1. Register as SEBI Research Analyst (if providing research/advisory)
2. Apply to NSE/BSE for empanelment as algo provider
3. Submit infrastructure details (servers, IPs, security measures)
4. Submit strategy testing documentation
5. Obtain approval; receive empanelment ID

### 6.3 TradeMind Assessment

| Scenario | Empanelment Required? |
|---|---|
| User receives AI signal → manually approves each trade | **Likely NO** — advisory only |
| User enables auto-execute → system places orders automatically | **Likely YES** — operating algo for user |
| Platform charges subscription for AI research signals | **Uncertain** — depends on SEBI interpretation; legal counsel required |

**Recommendation:** Engage Indian securities lawyer before launch to get written opinion on classification.

---

## 7. Broker Obligations Under SEBI Feb 2025

Brokers must:

1. **Implement OPS monitoring** — detect and categorize algo crossing 10 OPS threshold
2. **Block open APIs** — only client-specific API keys with whitelisted static IPs
3. **Enforce OAuth + 2FA** — mandatory for all API access
4. **Tag all algo orders** — every API order must carry Algo ID
5. **Be accountable for grievances** — resolve all algo-related investor complaints
6. **Block unapproved strategies** — prevent strategies exceeding 10 OPS without Unique Strategy ID
7. **Obtain exchange approval** — before offering any algo to clients
8. **Maintain audit trails** — 8-year retention for all algo orders

**TradeMind Action:** Work closely with Zerodha/Upstox to ensure compliance on their end. Verify broker APIs pass Generic Algo ID correctly.

---

## 8. Kill Switch Requirements

### 8.1 SEBI Mandate

Brokers must provide a kill switch that can instantly stop a malfunctioning algo.

### 8.2 TradeMind Implementation

| Kill Switch Type | Trigger | Action |
|---|---|---|
| **User-initiated** | User clicks "Stop All AI Signals" in UI | Immediately halt all signal generation and pending order submissions |
| **Daily loss limit** | Portfolio drawdown exceeds -3% in one day | Auto-pause signal generation; notify user |
| **Drawdown circuit breaker** | Portfolio drawdown exceeds -10% | Halt all new positions; close 50% of weakest positions |
| **Broker-level** | User activates broker kill switch | All open orders cancelled; positions closed (broker handles) |
| **SEBI/Exchange** | Exchange kills algo via surveillance | Immediate halt; compliance team notified within 1 hour |

---

## 9. Implementation Timeline

| Milestone | Expected Date | TradeMind Action |
|---|---|---|
| SEBI Circular issued | Feb 4, 2025 | ✅ Done |
| Broker Industry Standards Forum guidelines | April 1, 2025 | ✅ Done |
| Full compliance deadline | ~August 1, 2025 | ✅ In effect |
| Jane Street barred for manipulative algo trading | July 2025 | ✅ Enforcement active |

**Current Status (2026):** The SEBI algo trading framework is **fully in effect**. All brokers have implemented OPS monitoring, Algo ID tagging, and static IP requirements. TradeMind must ensure full compliance with these rules.

---

## 10. TradeMind Compliance Checklist

- [ ] Legal counsel opinion: Is TradeMind an "algo provider" or "advisory tool"?
- [ ] Verify all broker API orders carry Generic Algo ID (test in sandbox)
- [ ] Implement OPS monitoring and throttling (ensure < 10 OPS per user per exchange)
- [ ] Document White Box classification with full explainability trail
- [ ] Implement kill switch (user-initiated + auto-triggered)
- [ ] Add static IP + daily 2FA guidance to user onboarding
- [ ] Ensure broker API keys are client-specific and encrypted
- [ ] Auto-execute feature: legal review before enabling; gated behind explicit consent
- [ ] Monitor SEBI and exchange circulars monthly
- [ ] Join broker API developer programs for early compliance updates
- [ ] Prepare for exchange empanelment if legal opinion requires it

---

## 11. Reference Documents

1. [SEBI Circular CIR/ISD/CFTP/C-2/2025](https://www.sebi.gov.in/legal/circulars/feb-2025/safer-participation-of-retail-investors-in-algorithmic-trading_91614.html)
2. [Fyers Blog: SEBI Algo Trading Rules](https://fyers.in/blog/sebi-algo-trading-rules-and-regulations-in-india/)
3. [uTrade Algos: Decoding SEBI's New Rules](https://www.utradealgos.com/blog/decoding-sebis-new-algo-trading-rules-for-retail-investors-all-you-need-to-know)
4. [Maheshwari & Co: SEBI Algo Trading Regulations 2025](https://www.maheshwariandco.com/blog/sebi-algo-trading-regulations-2025/)
5. [Groww: SEBI Regulations on Algo Trading](https://groww.in/blog/sebi-regulations-on-algorithmic-trading-in-india)
