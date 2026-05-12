# DPDP Act 2023 Compliance Guide — TradeMind AI

## 1. Overview

The **Digital Personal Data Protection (DPDP) Act, 2023** governs how TradeMind collects, processes, stores, and shares personal data of Indian users. As a fintech platform handling sensitive financial and trading data, compliance is mandatory.

**Key Terminology:**
- **Data Principal**: TradeMind users (traders)
- **Data Fiduciary**: TradeMind (the company)
- **Data Processor**: Supabase, Groq, NVIDIA NIM, Cashfree (third-party services)
- **Consent Manager**: System that collects and manages user consent

---

## 2. Personal Data Inventory

### 2.1 Data Collected & Purpose

| Data Category | Specific Fields | Purpose | Legal Basis | Retention |
|---|---|---|---|---|
| **Identity** | Name, email, phone | Account creation, auth | Consent + Contract | Account lifetime + 8 years (SEBI) |
| **Financial Identity** | PAN (hashed), bank account (masked) | KYC, tax reporting | Legal obligation (SEBI) | 8 years post-account closure |
| **Trading Data** | Orders, positions, P&L | Core service delivery | Contract performance | 8 years (SEBI mandate) |
| **Broker Credentials** | API keys, access tokens | Execute trades on user's behalf | Explicit consent | Until broker disconnected |
| **AI Analysis** | Signal reasoning, agent outputs | Explainability, audit trail | Legitimate interest + Consent | 8 years (SEBI audit trail) |
| **Usage Analytics** | Page views, feature usage | Product improvement | Consent (opt-in) | 2 years, then anonymized |
| **Device/IP** | IP address, user agent | Security, rate limiting | Legitimate interest | 90 days |
| **Communication** | Email, notification preferences | Alerts, marketing | Consent | Until withdrawn |

### 2.2 Data NOT Collected (Data Minimization)

TradeMind explicitly does **NOT** collect:
- Aadhaar number (not required for our service)
- Full bank account numbers (only last 4 digits stored)
- Biometric data
- Location data (GPS)
- Social media credentials
- Personal trading notes/journals (stored client-side only)

---

## 3. Consent Management

### 3.1 Consent Collection Points

| Consent Point | When Collected | Granularity | Withdrawable? |
|---|---|---|---|
| **Account creation** | Signup | Bundled (ToS + Privacy) | Yes (account deletion) |
| **Broker connection** | OAuth flow | Per-broker, explicit | Yes (disconnect broker) |
| **Trading signals** | First signal request | Explicit opt-in | Yes (disable signals) |
| **Email notifications** | Onboarding | Per-category toggle | Yes (notification settings) |
| **Analytics tracking** | First visit (cookie banner) | Opt-in only | Yes (manage preferences) |
| **AI data processing** | First signal | Explicit consent | Yes (disables AI features) |

### 3.2 Consent Storage

```sql
CREATE TABLE user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL,  -- 'analytics', 'trading', 'broker_oauth', 'email_marketing'
    granted BOOLEAN NOT NULL DEFAULT false,
    granted_at TIMESTAMPTZ,
    withdrawn_at TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,
    version TEXT NOT NULL DEFAULT '1.0',  -- Consent policy version
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick consent checks
CREATE INDEX idx_user_consents_lookup ON user_consents(user_id, consent_type, granted);
```

### 3.3 Consent Verification Middleware

```python
async def verify_consent(user_id: str, required_consent: str) -> bool:
    """Check if user has granted specific consent before processing data."""
    consent = await supabase.table("user_consents") \
        .select("granted") \
        .eq("user_id", user_id) \
        .eq("consent_type", required_consent) \
        .eq("granted", True) \
        .is_("withdrawn_at", None) \
        .single() \
        .execute()
    
    return consent.data is not None
```

---

## 4. Right to Erasure (Right to be Forgotten)

### 4.1 Deletion Process

```
User requests deletion → 7-day grace period → Soft delete → 30-day hard delete
                          (can cancel)          (data anonymized)  (data purged)
```

### 4.2 What Gets Deleted vs Retained

| Data | Action | Reason |
|---|---|---|
| Personal identity (name, email, phone) | **Deleted** | No longer needed |
| PAN hash | **Retained 8 years** | SEBI legal obligation |
| Trading history | **Anonymized** (user_id → random UUID) | SEBI 8-year audit requirement |
| Broker credentials | **Immediately deleted** | Security best practice |
| AI signal history | **Anonymized** | Aggregate model improvement |
| Analytics data | **Deleted** | No legal basis after account closure |
| Consent records | **Retained 3 years** | Proof of consent (legal defense) |

### 4.3 Implementation

```python
async def process_deletion_request(user_id: str):
    """DPDP-compliant account deletion pipeline."""
    
    # Step 1: Revoke all broker connections immediately
    await revoke_all_broker_tokens(user_id)
    
    # Step 2: Mark account for deletion (7-day grace period)
    await supabase.table("users").update({
        "deletion_requested_at": datetime.now(IST).isoformat(),
        "deletion_scheduled_at": (datetime.now(IST) + timedelta(days=7)).isoformat(),
        "status": "pending_deletion"
    }).eq("id", user_id).execute()
    
    # Step 3: Send confirmation email with cancellation link
    await send_deletion_confirmation_email(user_id)
    
    # Step 4: After 7 days (cron job)
    # - Anonymize trading history (replace user_id with random UUID)
    # - Delete personal data (name, email, phone)
    # - Retain PAN hash with anonymized record for SEBI compliance
    # - Delete analytics data
    # - Log deletion in audit trail (without PII)
```

---

## 5. Data Processing Agreements (DPAs)

### 5.1 Third-Party Data Processors

| Processor | Data Shared | Purpose | DPA Required? | Data Location |
|---|---|---|---|---|
| **Supabase** | All DB data | Database hosting | ✅ Yes | Mumbai region (preferred) |
| **Vercel** | Request logs, cookies | Web hosting | ✅ Yes | Edge (Mumbai/Singapore) |
| **Groq** | Prompt text (no PII) | AI inference | ⚠️ Review ToS | US servers |
| **NVIDIA NIM** | Prompt text (no PII) | AI inference | ⚠️ Review ToS | US/Global |
| **OpenRouter** | Prompt text (no PII) | AI inference | ⚠️ Review ToS | Various |
| **Cashfree** | Payment data | Payment processing | ✅ Yes (PCI DSS) | India |
| **Resend** | Email addresses | Email delivery | ✅ Yes | US servers |
| **Zerodha** | Trading data (user-authorized) | Broker execution | N/A (user's own account) | India |

### 5.2 PII Stripping for AI Providers

**Critical:** LLM prompts must NEVER contain personally identifiable information.

```python
def sanitize_prompt_for_llm(prompt: str, user_context: dict) -> str:
    """Strip all PII before sending to LLM providers."""
    
    # Replace user-specific data with anonymized placeholders
    sanitized = prompt
    sanitized = sanitized.replace(user_context.get("name", ""), "[USER]")
    sanitized = sanitized.replace(user_context.get("email", ""), "[EMAIL]")
    sanitized = sanitized.replace(user_context.get("pan", ""), "[PAN]")
    sanitized = sanitized.replace(user_context.get("phone", ""), "[PHONE]")
    
    # Remove any remaining patterns that look like PII
    sanitized = re.sub(r'[A-Z]{5}[0-9]{4}[A-Z]', '[PAN]', sanitized)  # PAN pattern
    sanitized = re.sub(r'\b\d{10}\b', '[PHONE]', sanitized)  # Phone pattern
    sanitized = re.sub(r'\S+@\S+\.\S+', '[EMAIL]', sanitized)  # Email pattern
    
    return sanitized
```

---

## 6. Data Localization

### 6.1 Strategy

- **Primary database**: Supabase (Mumbai region when available, else Singapore)
- **Backups**: Encrypted, stored in Indian cloud region
- **AI inference**: Prompts sent to US-based LLMs contain NO PII (see §5.2)
- **Payment data**: Cashfree processes entirely within India
- **CDN**: Vercel Edge Network with Mumbai PoP

### 6.2 Cross-Border Data Transfer

| Data Type | Crosses Border? | Justification |
|---|---|---|
| Trading data | No | Stored in Indian DB |
| User PII | No | Indian DB + Indian payment processor |
| AI prompts | Yes (to Groq/NVIDIA) | Contains NO PII; market data only |
| Email delivery | Yes (to Resend) | Only email address; necessary for service |

---

## 7. Breach Notification

### 7.1 Incident Response Timeline

| Step | Timeline | Action |
|---|---|---|
| **Detection** | Immediate | Automated monitoring triggers alert |
| **Assessment** | Within 4 hours | Determine scope and affected users |
| **Containment** | Within 6 hours | Revoke compromised tokens, patch vulnerability |
| **DPB Notification** | Within 72 hours | Notify Data Protection Board of India |
| **User Notification** | Within 72 hours | Email affected users with details and remediation |
| **Post-Mortem** | Within 7 days | Root cause analysis and prevention measures |

---

## 8. User Rights Dashboard

TradeMind provides a self-service privacy dashboard at `/settings/privacy`:

| Right | Implementation | UI Element |
|---|---|---|
| **Right to Access** | Export all personal data as JSON/CSV | "Download My Data" button |
| **Right to Correction** | Edit profile, contact info | Profile settings form |
| **Right to Erasure** | Account deletion with 7-day grace | "Delete Account" with confirmation |
| **Right to Withdraw Consent** | Toggle each consent category | Consent toggles per category |
| **Right to Grievance** | Contact DPO via email form | "Contact Privacy Officer" link |
| **Right to Nominate** | Designate nominee for account | "Nominate" section (future) |

---

## 9. Compliance Checklist

- [ ] Privacy Policy updated for DPDP Act 2023
- [ ] Cookie consent banner on all public pages
- [ ] Consent collection at each data processing point
- [ ] PII stripping verified for all LLM prompts
- [ ] Data Processing Agreements with Supabase, Cashfree, Resend
- [ ] Account deletion pipeline tested end-to-end
- [ ] "Download My Data" export feature implemented
- [ ] Breach notification playbook documented
- [ ] Grievance redressal mechanism (DPO email) published
- [ ] Annual compliance audit scheduled
