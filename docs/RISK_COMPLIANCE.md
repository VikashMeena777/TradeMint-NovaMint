# Risk & Compliance Checklist — Indian Market

## 1. Regulatory Compliance

| Item | Status | Mitigation |
|---|---|---|
| **SEBI Investment Adviser status** | Required analysis | Platform is "informational and educational only" — all trades require explicit user approval (except opt-in auto-execute). Clear disclaimers on every page. If offering personalized advice, may need SEBI IA registration. |
| **SEBI Research Analyst norms** | Required | If publishing research reports (AI memos), comply with SEBI (Research Analyst) Regulations, 2014. Display registration number if applicable. |
| **SEBI Algo Trading Framework** | Compliance | Pure advisory tool with user-initiated execution likely exempt from algo registration. If auto-execute without user click per order, may trigger SEBI algo norms. Keep human-in-the-loop for every live trade. |
| **NSE/BSE member compliance** | Via broker | Execution handled by user's broker (Zerodha/Upstox). We are a technology layer, not a member. |
| **Data localization (PDP Bill)** | Monitor | Keep user PII and broker keys within Indian jurisdiction when Digital Personal Data Protection Bill requirements crystallize. |

---

## 1.5 SEBI Feb 2025 Algo Trading Circular (Critical)

**Circular:** CIR/ISD/CFTP/C-2/2025 dated Feb 4, 2025. Effective ~August 1, 2025.

### 1.5.1 What SEBI Defines as "Algo Trading"

Any trading activity where orders are placed, modified, or cancelled automatically through computer programs or broker APIs, **without manually confirming each order**.

This means:
- All broker API orders are now classified as algo orders
- Must be tagged with an Algo ID (Generic or Unique)
- Subject to order frequency monitoring

### 1.5.2 10 Orders Per Second (OPS) Threshold

| OPS Level | Requirement | Algo ID Type | Applies To |
|---|---|---|---|
| **<= 10 OPS** | No exchange approval needed | **Generic Algo ID** | Most retail traders |
| **> 10 OPS** | Exchange approval mandatory | **Unique Strategy ID** | HFT / high-frequency strategies |

**How it works:**
- 10 OPS is calculated per exchange on a rolling 1-second window
- Includes all order placements, modifications, AND cancellations
- Most retail AI signals will be well below this threshold
- Brokers will auto-tag with Generic Algo ID if below threshold

### 1.5.3 Generic Algo ID vs Unique Strategy ID

```
User places order via Zerodha Kite API
  ├── Is OPS > 10/sec?
  │   ├── YES → Must have Unique Strategy ID (exchange-approved)
  │   │         → Submit strategy logic + testing to exchange
  │   │         → Get Unique Strategy ID upon approval
  │   └── NO  → Use Generic Algo ID (exchange-prescribed)
  │             → No pre-approval required
  │             → Broker auto-applies the ID
```

### 1.5.4 API Access Requirements (Mandatory)

| Requirement | Implementation | TradeMind Action |
|---|---|---|
| **Static Public IP** | Whitelist IP with broker | Document for users; broker handles at their end |
| **Daily 2FA** | TOTP / OTP at start of trading day | Display reminder in UI; user authenticates with broker |
| **OAuth + API Keys** | Client-specific keys only | Never share keys; server-side proxy |
| **Session Management** | API sessions must be manually authenticated daily | UI notification at 9:00 AM IST |

### 1.5.5 White Box vs Black Box Classification

| Type | Definition | SEBI Treatment | TradeMind Classification |
|---|---|---|---|
| **White Box** | Logic is known, replicable, disclosed to user | Allowed for personal use within limits | **TradeMind is White Box** — every signal shows full agent reasoning |
| **Black Box** | Logic not disclosed; user cannot understand/replicate | Requires SEBI Research Analyst registration | NOT applicable to TradeMind |

**TradeMind Positioning:**
- We are a **White Box advisory tool** — every signal shows exactly which agents said what
- User must **manually approve each signal** before execution (human-in-the-loop)
- This likely exempts us from "algo" registration, but legal counsel must confirm
- If auto-execute is enabled, this may trigger algo classification — gate behind legal review

### 1.5.6 Exchange Empanelment for Algo Providers

**Who needs empanelment:**
- Any entity that sells, distributes, or operates algorithmic strategies for others
- Must be empanelled with NSE/BSE
- Must be SEBI-registered Research Analyst

**TradeMind Assessment:**
- If we only provide **informational signals** (user clicks approve each time) → Likely NOT an algo provider
- If we offer **auto-execute without per-order confirmation** → May trigger algo provider rules
- **Recommendation:** Keep human-in-the-loop as default; auto-execute as opt-in with clear legal disclosure

### 1.5.7 Broker Obligations Under New Rules

Brokers must:
- Implement systems to detect and categorize algos crossing OPS threshold
- Only allow client-specific API keys with whitelisted static IPs
- Mandate OAuth + 2FA for all API access
- Be accountable for all algo-related investor grievances
- Block unapproved strategies crossing 10 OPS
- Obtain exchange approval before offering any algo to clients

### 1.5.8 Kill Switch / Circuit Breaker Requirements

SEBI mandates:
- Brokers must provide kill switch to instantly stop malfunctioning algos
- Exchange can kill specific algos if surveillance flags them
- TradeMind should implement its own kill switch:
  - Daily loss limit reached → Auto-pause
  - User-initiated kill switch in UI → "Stop All AI Signals"
  - Broker-level kill switch available to user

### 1.5.9 SEBI Timeline & Deadlines

| Milestone | Date | Status |
|---|---|---|
| Circular issued | Feb 4, 2025 | Done |
| Implementation guidelines finalized | April 1, 2025 (revised) | Monitor |
| Full compliance required | ~August 1, 2025 | **Target for TradeMind** |

### 1.5.10 TradeMind Compliance Strategy

1. **Position as "Advisory + User-Initiated Execution"**
   - Every trade requires explicit user click
   - Full explainability = White Box
   - Not a "set and forget" black box algo

2. **Stay Below 10 OPS**
   - Design system to never exceed 10 orders/second per user
   - Signal generation is slow (~30s); execution is manual
   - Throttle auto-execute to max 1 order/5 seconds

3. **Support Generic Algo ID**
   - Work with brokers to ensure all API orders carry Generic Algo ID
   - Document this in broker integration guides

4. **Monitor Regulatory Evolution**
   - SEBI may refine rules; keep legal counsel on retainer
   - Join broker API developer programs for early updates
   - Track exchange circulars monthly

---

## 2. Security Checklist

| Layer | Requirement | Implementation |
|---|---|---|
| **API Key Storage** | Never expose broker keys client-side | Server-side proxy for all broker calls. Keys AES-256 encrypted in DB. |
| **Transport** | TLS 1.3 everywhere | Enforced via hosting + Next.js config |
| **Auth** | Secure session management | Supabase SSR with httpOnly cookies, PKCE flow |
| **Rate Limiting** | Prevent abuse | @upstash/ratelimit: 10 req/min auth, 60 req/min API |
| **CSP Headers** | Prevent XSS | next.config.js security headers |
| **Input Validation** | Prevent injection | Zod validation on ALL inputs |
| **Dependency Audit** | Catch vulnerabilities | npm audit in CI pipeline |

### Security Headers (next.config.js)
```js
headers: [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
]
```

---

## 3. Financial Risk Controls

| Control | Description |
|---|---|
| **Max Position Size** | Limit single trade to X% of portfolio (default: 5% conservative, 10% moderate, 20% aggressive). In India, also respect SEBI margin limits. |
| **Daily Loss Limit** | Auto-pause AI if daily P&L < -3% of equity |
| **Stop-Loss Enforcement** | Every signal MUST include stop-loss; Risk Manager rejects without it |
| **Correlation Check** | Risk Manager checks portfolio concentration (no more than 3 positions in same sector, e.g., no more than 3 banking stocks) |
| **Circuit Limit Filter** | Skip trades near NSE/BSE upper/lower circuit limits. Alert user if stock is in T2T (Trade-to-Trade) segment. |
| **F&O Margin Check** | For derivative signals, verify sufficient margin (SPAN + Exposure) in broker account |
| **Paper Trading Gate** | Users must trade profitably in paper for 30 days before live auto-execute unlock |
| **Intraday Leverage Limit** | Respect broker intraday leverage (varies by broker; typically 5× for MIS). Never suggest positions exceeding broker margin. |

---

## 4. AI Risk Mitigation

| Risk | Mitigation |
|---|---|
| **Hallucination** | Structured outputs with JSON schemas; no free-text trade decisions. Cross-check prices against broker feed. |
| **Recency Bias** | Bull/Bear debate forces contrarian analysis. Backtesting validates signals on 1+ year NSE history. |
| **Overfitting** | Strategies tested on out-of-sample NSE data. Rolling window validation. |
| **Black Box** | Every signal shows full agent reasoning trail. User can inspect each agent's contribution. |
| **Latency Risk** | AI pipeline capped at 30s. If timeout, signal marked "stale" and not executed. |
| **Currency/Rupee Risk** | All calculations in INR. Agents aware of USD/INR impact for IT/Pharma exporters. |

---

## 5. Legal Disclaimers (Required Copy — India)

```
TradeMind AI is for educational and informational purposes only. 
It does not constitute investment advice, an offer to sell, or a 
solicitation of an offer to buy any securities. TradeMind AI is 
NOT a SEBI-registered investment adviser or research analyst. 
Past performance is not indicative of future results. 
AI-generated signals may be inaccurate. Always consult a 
qualified financial advisor before making investment decisions. 
You are solely responsible for your trading decisions and any 
resulting gains or losses. Securities market investments are subject 
to market risks; read all related documents carefully before 
investing. NSE/BSE member details and SEBI registration of your 
broker are available on the respective exchange websites.
```

---

## 6. Incident Response Plan

| Severity | Trigger | Response |
|---|---|---|
| **Critical** | Live trade executed erroneously | Immediately halt all auto-execute. Audit logs. Notify affected users within 1 hour. File incident with broker if required. |
| **High** | API key leaked / security breach | Rotate all keys. Force re-auth. Security audit. Notify users within 24h. Report to broker if keys compromised. |
| **Medium** | AI signal accuracy drops below 50% for 7 days | Pause signal generation. Retrain/retune agents. Notify users. |
| **Low** | Minor UI bug, data delay | Fix in next release. No user notification needed. |

---

## 7. Pre-Launch Compliance Checklist

- [ ] Legal counsel review of Terms of Service (India-specific)
- [ ] Legal counsel review of Privacy Policy (DPDP Bill compliant)
- [ ] Disclaimer copy present on dashboard, trade modal, and emails (Hindi + English)
- [ ] SEBI advisory status analysis documented
- [ ] SEBI Feb 2025 algo circular compliance assessment completed (CIR/ISD/CFTP/C-2/2025)
- [ ] Legal counsel opinion on TradeMind classification: "Advisory + User-Initiated" vs "Algo Provider"
- [ ] All API orders tagged with Generic Algo ID (verified with broker)
- [ ] System designed to stay below 10 OPS per user per exchange
- [ ] Auto-execute feature reviewed by legal counsel before enabling
- [ ] Kill switch implemented in UI and tested
- [ ] White Box classification documented (full explainability per signal)
- [ ] Broker sandbox thoroughly tested (100+ paper trades on Zerodha/Upstox)
- [ ] Security headers verified
- [ ] Rate limiting tested under load
- [ ] Data retention policy documented (Indian data localization)
- [ ] Incident response playbook reviewed by team
- [ ] GST registration if charging subscription fees in India

---

*Co-Authored-By: Oz <oz-agent@warp.dev>*
