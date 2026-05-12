# Testing Strategy & Quality Assurance v1.0

## 1. Testing Pyramid

```
           ┌─────────┐
           │   E2E   │  ← Playwright (critical paths)
           │  ~10%   │
        ┌──┴─────────┴──┐
        │  Integration    │  ← API, DB, service contracts
        │    ~25%       │
     ┌──┴───────────────┴──┐
     │      Component        │  ← Storybook + Chromatic
     │       ~20%            │
  ┌──┴───────────────────────┴──┐
  │         Unit Tests           │  ← Jest/Vitest (business logic)
  │          ~45%                │
  └──────────────────────────────┘
```

**Coverage targets:**
- Overall: **80%** line coverage minimum (90% for critical paths).
- AI agent logic: **70%** (human-in-the-loop makes 100% impractical).
- Trade execution paths: **95%** (regulatory requirement).
- API routes: **85%**.
- Frontend components: **75%** (excluding pure UI atoms).

---

## 2. Unit Testing (Jest / Vitest)

### 2.1 Framework Configuration

**Frontend (Next.js):**
- Test runner: **Vitest** (faster than Jest for Vite/Next.js)
- Assertion: `expect` from Vitest + `@testing-library/jest-dom`
- Mocking: `vi.fn()`, MSW for fetch mocking
- Coverage: `v8` provider, Istanbul fallback

**Backend (Python):**
- Test runner: **pytest** with `pytest-asyncio`
- Assertion: native `assert` + `pytest.raises`
- Mocking: `unittest.mock`, `pytest-mock`, `respx` for HTTPX
- Coverage: `pytest-cov` with branch coverage

### 2.2 What to Unit Test

| Layer | Examples | Exclusions |
|---|---|---|
| **Validation logic** | Zod schema edge cases, input sanitization | — |
| **Business rules** | Risk limit calculations, position sizing math | — |
| **Utility functions** | Date formatting, number precision, currency | Pure UI (CSS) |
| **State reducers** | Zustand store actions, React Query mutations | — |
| **Algorithm logic** | Indicator calculations, signal scoring | Random/time-based |
| **Data transforms** | API response normalization, CSV export | — |

### 2.3 Example: Signal Scoring Unit Test

```typescript
// tests/unit/signal-scoring.test.ts
import { describe, it, expect } from 'vitest';
import { calculateSignalConfidence } from '@/lib/signals/scoring';

describe('calculateSignalConfidence', () => {
  it('returns high confidence when all analysts agree bullish', () => {
    const reports = {
      fundamental: { confidence: 0.8, signal: 'buy' },
      technical: { confidence: 0.75, signal: 'buy' },
      sentiment: { confidence: 0.7, signal: 'buy' },
    };
    expect(calculateSignalConfidence(reports)).toBeGreaterThan(75);
  });

  it('returns low confidence when analysts conflict', () => {
    const reports = {
      fundamental: { confidence: 0.8, signal: 'buy' },
      technical: { confidence: 0.75, signal: 'sell' },
    };
    expect(calculateSignalConfidence(reports)).toBeLessThan(50);
  });

  it('penalizes missing analyst reports', () => {
    const reports = { fundamental: { confidence: 0.9, signal: 'buy' } };
    expect(calculateSignalConfidence(reports)).toBeLessThan(70);
  });
});
```

### 2.4 Example: Python Position Sizing Unit Test

```python
# tests/unit/test_position_sizing.py
import pytest
from services.risk.position_sizing import kelly_criterion

def test_kelly_criterion_standard():
    result = kelly_criterion(win_rate=0.6, avg_win=0.05, avg_loss=0.03)
    assert result == pytest.approx(0.1333, abs=0.001)

def test_kelly_criterion_half_kelly():
    result = kelly_criterion(win_rate=0.6, avg_win=0.05, avg_loss=0.03, fraction=0.5)
    assert result == pytest.approx(0.0667, abs=0.001)

def test_kelly_criterion_negative_expectancy():
    with pytest.raises(ValueError, match="Negative expectancy"):
        kelly_criterion(win_rate=0.4, avg_win=0.03, avg_loss=0.05)
```

---

## 3. Integration Testing

### 3.1 API Integration (MSW + testcontainers)

**Frontend:** Mock Service Worker (MSW) for API route mocking.
- Handlers defined in `tests/mocks/handlers.ts`
- Server setup in `tests/setup.ts`
- Reset handlers after each test

**Backend:** `testcontainers` for PostgreSQL + Redis integration tests.
- Spin up ephemeral database per test suite
- Run migrations, seed fixtures, assert DB state
- Auto-cleanup after suite completion

### 3.2 Database Integration Test Example

```typescript
// tests/integration/trade-execution.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { createClient } from '@supabase/supabase-js';

let container: StartedPostgreSqlContainer;
let dbClient: SupabaseClient;

beforeAll(async () => {
  container = await new PostgreSqlContainer().start();
  dbClient = createClient(container.getConnectionUri());
  await runMigrations(dbClient);
});

afterAll(async () => {
  await container.stop();
});

it('creates trade and updates portfolio atomically', async () => {
  const { data: trade } = await dbClient.from('trades').insert({
    user_id: 'test-user',
    symbol: 'RELIANCE.NS',
    side: 'buy',
    qty: 50,
    status: 'filled',
  }).select().single();

  const { data: positions } = await dbClient.from('positions')
    .select('*').eq('user_id', 'test-user');

  expect(positions).toHaveLength(1);
  expect(positions[0].qty).toBe(50);
});
```

### 3.3 API Contract Testing (Pact)

Consumer-driven contract tests between frontend and backend:
- **Consumer (Next.js):** `pact-js` defines expected API shape
- **Provider (FastAPI):** `pact-python` verifies responses match contract
- Contracts stored in `pacts/` and verified in CI

```typescript
// tests/contract/signals.pact.ts
const pact = new PactV4({
  consumer: 'trademind-web',
  provider: 'trademind-api',
});

it('GET /v1/signals returns paginated signals', async () => {
  await pact
    .addInteraction()
    .uponReceiving('a request for signals')
    .withRequest('GET', '/v1/signals', { limit: '20' })
    .willRespondWith(200, (builder) => {
      builder.jsonBody({
        data: Matchers.eachLike({
          id: Matchers.uuid(),
          symbol: 'RELIANCE.NS',
          confidence_score: Matchers.integer(70, 100),
        }),
      });
    })
    .executeTest(async (mockServer) => {
      const response = await fetch(`${mockServer.url}/v1/signals?limit=20`);
      expect(response.status).toBe(200);
    });
});
```

---

## 4. End-to-End Testing (Playwright)

### 4.1 Critical User Paths

| Path | Steps | Assertions |
|---|---|---|
| **Onboarding** | Register → Verify email → Set risk profile | Dashboard loads, welcome modal shown |
| **Signal Generation** | Add to watchlist → Request signal → View reasoning | Agent pipeline completes < 45s, confidence > 0 |
| **Trade Execution** | Approve signal → Execute trade → View portfolio | Trade appears in history, portfolio updates |
| **Backtest Run** | Configure backtest → Run → View report | Report loads, metrics calculated |
| **Alert Flow** | Set price alert → Trigger condition → Receive notification | Alert appears, email sent (Mailpit) |
| **Settings Update** | Change risk profile → Verify signal changes | Risk profile persisted, new signals reflect it |
| **Mobile Responsive** | Resize viewport → Verify navigation → Execute trade | Bottom nav visible, touch targets 44px+ |

### 4.2 Playwright Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['github']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
  ],
});
```

### 4.3 Auth State Setup

```typescript
// tests/e2e/auth.setup.ts
import { test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'TestPass123!');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/dashboard');
  await page.context().storageState({ path: 'tests/e2e/.auth/user.json' });
});
```

---

## 5. Component Testing (Storybook + Chromatic)

### 5.1 Storybook Configuration

- Stories for all organisms and complex molecules
- Mock data via `msw-storybook-addon` for API-dependent components
- Visual regression baseline via Chromatic on every PR

### 5.2 Component Test Example

```typescript
// components/SignalCard.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { SignalCard } from './SignalCard';

const meta: Meta<typeof SignalCard> = {
  component: SignalCard,
  parameters: {
    msw: {
      handlers: [
        http.get('/api/signals/*', () => Response.json(mockSignal)),
      ],
    },
  },
};

export const BuySignal: StoryObj = {
  args: {
    signal: {
      symbol: 'RELIANCE.NS',
      signalType: 'buy',
      confidenceScore: 82,
      entryPrice: 185.50,
      stopLoss: 179.00,
      takeProfit: 198.00,
    },
  },
};

export const SellSignal: StoryObj = {
  args: {
    signal: {
      symbol: 'TCS.NS',
      signalType: 'sell',
      confidenceScore: 65,
      entryPrice: 3850.00,
    },
  },
};

export const LoadingState: StoryObj = {
  args: { loading: true },
};
```

### 5.3 Chromatic Workflow

- Baseline snapshots on `main` branch
- PRs generate delta reports for review
- UI changes require Chromatic approval before merge
- Flaky tests quarantined after 3 consecutive failures

---

## 6. Performance Testing (k6)

### 6.1 Load Test Scenarios

```javascript
// tests/performance/signal-generation.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up
    { duration: '5m', target: 50 },   // Steady state
    { duration: '2m', target: 100 },  // Peak load
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.post(`${__ENV.BASE_URL}/v1/signals`, JSON.stringify({
    symbol: 'RELIANCE.NS',
    riskProfile: 'moderate',
  }), { headers: { 'Content-Type': 'application/json' } });

  check(res, {
    'status is 202': (r) => r.status === 202,
    'response time < 3s': (r) => r.timings.duration < 3000,
  });

  sleep(1);
}
```

### 6.2 WebSocket Load Testing

```javascript
// tests/performance/websocket-prices.js
import ws from 'k6/ws';
import { check } from 'k6';

export const options = {
  vus: 100,
  duration: '5m',
  thresholds: {
    ws_session_duration: ['p(95)>300000'],
  },
};

export default function () {
  const url = `${__ENV.WS_URL}?token=${__ENV.AUTH_TOKEN}`;
  const res = ws.connect(url, {}, function (socket) {
    socket.on('open', () => {
      socket.send(JSON.stringify({ type: 'subscribe:price', symbol: 'RELIANCE.NS' }));
    });
    socket.on('message', (msg) => {
      const data = JSON.parse(msg);
      check(data, { 'price tick received': (d) => d.type === 'price:tick' });
    });
    socket.setTimeout(() => socket.close(), 300000);
  });

  check(res, { 'status is 101': (r) => r && r.status === 101 });
}
```

### 6.3 Performance Budgets

| Endpoint | p50 | p95 | p99 | Target |
|---|---|---|---|---|
| `GET /v1/portfolio` | 80ms | 200ms | 400ms | < 500ms |
| `GET /v1/signals` | 100ms | 250ms | 500ms | < 600ms |
| `POST /v1/signals` | 15s | 25s | 35s | < 45s |
| `POST /v1/trades` | 300ms | 800ms | 1500ms | < 2000ms |
| `WS price:tick` | — | < 100ms | < 500ms | < 500ms latency |

---

## 7. Security Testing

### 7.1 Automated Scans

| Tool | Scope | Frequency | Integration |
|---|---|---|---|
| **Snyk** | Dependency vulnerabilities | On every PR | GitHub Action |
| **OWASP ZAP** | API endpoint scanning | Weekly (staging) | Scheduled CI |
| **Semgrep** | Custom security rules | On every PR | GitHub Action |
| **npm audit / pip-audit** | Known CVEs in deps | Daily | Scheduled CI |

### 7.2 Penetration Testing Schedule

- **Quarterly:** External penetration test by third-party security firm
- **After major releases:** Focused testing on new features
- **Bug bounty:** HackerOne or Bugcrowd program for continuous community testing
- **Vulnerability disclosure policy:** Published at `/security`

### 7.3 Security Test Cases

| Test | Method | Expected Result |
|---|---|---|
| SQL Injection | `' OR 1=1 --` in symbol field | Rejected by Zod validation |
| XSS | `<script>alert(1)</script>` in notes | HTML-escaped or rejected |
| Auth bypass | Missing/invalid JWT | 401 Unauthorized |
| IDOR | Access another user's signal | 403 Forbidden (RLS enforced) |
| Rate limit | 100 requests in 10s | 429 Too Many Requests |
| CSRF | Cross-origin POST without token | 403 Forbidden |
| Mass assignment | Extra fields in PATCH user | Ignored (strict schema) |

---

## 8. AI Agent Testing

### 8.1 Evaluation Dataset

Stored in `tests/fixtures/agent-eval/`:
- `test_cases.jsonl`: 200+ curated scenarios with known outcomes
- `edge_cases.jsonl`: Unusual market conditions, missing data, conflicting indicators
- `adversarial.jsonl`: Attempts to trick agents into hallucinations

### 8.2 Prompt Regression Testing

```python
# tests/agent/test_prompt_regression.py
import pytest
from agents.fundamental_analyst import analyze

TEST_CASES = load_jsonl('tests/fixtures/agent-eval/test_cases.jsonl')

@pytest.mark.parametrize('case', TEST_CASES)
def test_fundamental_analyst_regression(case):
    result = analyze(case['input'])
    
    # Schema validation
    assert_valid_json_schema(result, 'fundamental_report.schema.json')
    
    # Output bounds
    assert 0 <= result['confidence'] <= 1
    assert result['valuation_signal'] in ['undervalued', 'fair', 'overvalued']
    
    # Ground truth comparison (if available)
    if 'expected_fair_value' in case:
        assert abs(result['fair_value_estimate'] - case['expected_fair_value']) < case['tolerance']

# Run with: pytest tests/agent/ -n auto --tb=short
```

### 8.3 Hallucination Detection

```python
# tests/agent/test_hallucination_guardrails.py
def test_no_hallucinated_metrics():
    # Input has no P/E ratio provided
    result = analyze({ symbol: 'XYZ', pe_ratio: None })
    
    # Agent must either omit or explicitly mark as unavailable
    assert 'pe_ratio' not in result['key_metrics'] or \
           result['key_metrics'].get('pe_ratio') is None or \
           result.get('data_unavailable') is True

def test_factual_grounding():
    # Provide fake insider data; agent must not invent transactions
    result = analyze({ symbol: 'FAKE', insider_summary: [] })
    assert result.get('insider_sentiment') in ['neutral', None] or \
           result.get('data_unavailable') is True
```

### 8.4 Cost & Latency Tracking

```python
# tests/agent/test_cost_budget.py
def test_signal_cost_within_budget():
    state = run_full_pipeline(symbol='RELIANCE.NS', risk_profile='moderate')
    assert state.total_cost_inr < 5.0  # $0.05 per signal hard limit
    assert state.total_tokens < 50000

def test_latency_within_sla():
    start = time.time()
    state = run_full_pipeline(symbol='RELIANCE.NS')
    elapsed = time.time() - start
    assert elapsed < 45  # 45s SLA
```

---

## 9. Database Testing

### 9.1 Migration Tests

```python
# tests/db/test_migrations.py
import pytest
from alembic.config import Config
from alembic import command

def test_migrations_idempotent():
    """Running migrations twice should not fail."""
    alembic_cfg = Config('alembic.ini')
    command.upgrade(alembic_cfg, 'head')
    command.downgrade(alembic_cfg, 'base')
    command.upgrade(alembic_cfg, 'head')

def test_migration_performance():
    """Migrations should complete in < 30s on a fresh DB."""
    # Tracked in CI with timing annotations
```

### 9.2 Seed Data Validation

```typescript
// tests/db/seed-data.test.ts
import { describe, it, expect } from 'vitest';
import { seedDatabase } from '@/lib/db/seed';

describe('seed data', () => {
  it('creates required system settings', async () => {
    await seedDatabase();
    const { data } = await db.from('system_settings').select('*');
    const keys = data.map((s) => s.key);
    expect(keys).toContain('signal_generation_enabled');
    expect(keys).toContain('max_free_signals_daily');
  });
});
```

---

## 10. Test Environment Strategy

| Environment | Data | Services | CI Usage |
|---|---|---|---|
| **Local dev** | Ephemeral testcontainers (Postgres, Redis) | Full stack via Docker Compose | Ad-hoc testing |
| **CI** | Fresh container per job | Mocked external APIs (MSW, WireMock) | Unit, integration, contract |
| **Preview (Vercel)** | Staging DB subset | Live external APIs (paper only) | E2E smoke tests |
| **Staging** | Anonymized prod snapshot (weekly refresh) | Live external APIs (paper only) | Full E2E suite, performance |
| **Production** | Live data | Live external APIs | Synthetic monitoring only |

### 10.1 Mock Data Factories

```typescript
// tests/factories/signal.factory.ts
import { faker } from '@faker-js/faker';

export const createSignalFactory = (overrides = {}) => ({
  id: faker.string.uuid(),
  symbol: faker.finance.currencyCode(),
  signalType: faker.helpers.arrayElement(['buy', 'sell', 'hold']),
  confidenceScore: faker.number.int({ min: 50, max: 100 }),
  entryPrice: faker.number.float({ min: 10, max: 500, precision: 0.01 }),
  stopLoss: faker.number.float({ min: 5, max: 400, precision: 0.01 }),
  status: 'pending',
  createdAt: faker.date.recent(),
  ...overrides,
});
```

```python
# tests/factories/trade_factory.py
import factory
from db.models import Trade

class TradeFactory(factory.Factory):
    class Meta:
        model = Trade
    
    symbol = factory.Faker('random_element', elements=['RELIANCE.NS', 'TCS.NS', 'INFY.NS'])
    side = factory.Faker('random_element', elements=['buy', 'sell'])
    qty = factory.Faker('random_int', min=1, max=1000)
    order_type = 'market'
    status = 'filled'
    filled_avg_price = factory.Faker('random_float', min=10, max=500)
```

---

## 11. CI Test Pipeline (GitHub Actions)

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: test }
      redis:
        image: redis:7-alpine
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: snyk/actions/node@master
        env: { SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }} }
      - run: npm audit --audit-level=moderate

  visual-regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx chromatic --project-token=${{ secrets.CHROMATIC_TOKEN }}
```

---

## 12. Flaky Test Management

### 12.1 Detection

- Track test flakiness in CI (pass rate < 95% over 14 days = flaky).
- Auto-quarantine: Move to `tests/quarantine/` after 5 consecutive flaky runs.
- Daily retry: Quarantined tests run once daily on `main` to detect fixes.

### 12.2 Common Causes & Fixes

| Cause | Fix |
|---|---|
| Race conditions in async | Add `await` assertions, use `waitFor` |
| Time-dependent logic | Mock `Date.now()` / `setTimeout` |
| External API timing | Increase timeouts, use MSW consistently |
| Database state leakage | Use transactions, reset DB per test |
| WebSocket timing | Add explicit `on('open')` listener |
| Animations | Use `prefers-reduced-motion` in tests |

---

## 13. Snapshot Testing Policy

- **Allowed:** API response schemas, error message formats, GraphQL queries
- **Forbidden:** UI pixel snapshots (use Chromatic instead), dynamic data (timestamps, UUIDs)
- **Update process:** `npm run test:update-snapshots` only after intentional changes
- **Review requirement:** Snapshot changes must be reviewed in PR diff

---

## 14. Accessibility Testing

### 14.1 Automated (axe-core)

```typescript
// tests/a11y/dashboard.test.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('dashboard has no accessibility violations', async ({ page }) => {
  await page.goto('/dashboard');
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});
```

### 14.2 Manual Checklist

- [ ] Keyboard navigation works for all interactive elements
- [ ] Focus indicators are visible and logical
- [ ] Screen reader announces dynamic content updates
- [ ] Color is not the only means of conveying information
- [ ] Form errors are associated with inputs via `aria-describedby`
- [ ] Charts have accessible text alternatives or data tables

---

## 15. Mobile Testing

### 15.1 BrowserStack / Device Farm

- Cross-browser matrix: Chrome, Firefox, Safari, Edge (latest + N-1)
- Mobile devices: iPhone 14, Pixel 7, Samsung Galaxy S23, iPad Pro
- Tablet: iPad Air, Surface Pro

### 15.2 Mobile-Specific Tests

- Touch target size >= 44×44px
- Pinch-to-zoom on charts
- Pull-to-refresh on lists
- Bottom sheet modals
- Safe area insets (notch, home indicator)
- Orientation changes

---

## 16. Chaos Engineering Plan

### 16.1 Failure Injection Scenarios

| Scenario | Tool | Expected System Behavior |
|---|---|---|
| Broker API timeout (Zerodha/Upstox) | Toxiproxy / Gremlin | Fallback to cached prices, queue trades |
| LLM provider failure | Mock server error | Fallback to next provider, reduce confidence |
| Database connection drop | pgbouncer kill | Retry with exponential backoff, return 503 |
| Redis outage | iptables block | Degrade to in-memory cache, warn user |
| WebSocket disconnect | Network emulator | Reconnect with backoff, show offline state |
| High latency (>5s) | Toxiproxy delay | Circuit breaker opens, fast-fail |

### 16.2 Game Day Schedule

- Monthly: 2-hour chaos engineering session on staging
- Quarterly: 4-hour session with cross-team war room
- Annually: Full disaster recovery drill (database restore from backup)

---

## 17. Test Data Cleanup

- **Unit tests:** Pure functions, no cleanup needed
- **Integration tests:** Database transactions rolled back after each test
- **E2E tests:** Test user accounts prefixed `e2e_` purged nightly via cron
- **Performance tests:** Dedicated test org/account, isolated from production data
- **Staging:** Weekly refresh from anonymized production snapshot

---

*Co-Authored-By: Oz <oz-agent@warp.dev>*
