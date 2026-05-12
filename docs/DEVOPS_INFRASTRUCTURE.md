# DevOps & Infrastructure Plan v1.0

> **Strategy: ₹0 Free-Tier First.** All infrastructure runs on free tiers during MVP. AWS/Terraform reserved for post-revenue scaling.

## 1. Infrastructure Overview

### 1.1 Free-Tier Stack

| Layer | Tool (Free Tier) | Limit | Paid Upgrade Path |
|---|---|---|---|
| **Frontend Hosting** | Vercel (free) | Unlimited deploys, 100GB bandwidth | Vercel Pro ($20/mo) |
| **AI Engine Hosting** | Render (free) | 750 hrs/month, 512MB RAM | Render Starter ($7/mo) |
| **Database** | Supabase (free) | 500MB DB, 50K users, 1GB storage | Supabase Pro ($25/mo) |
| **Redis/Cache** | Upstash Redis (free) | 10K commands/day, 256MB | Upstash Pay-as-you-go |
| **Background Jobs** | Inngest (free) | 25K events/month | Inngest Pro ($25/mo) |
| **Monitoring** | Grafana Cloud (free) | 10K metrics, 50GB logs | Grafana Cloud Pro |
| **Error Tracking** | Sentry (free) | 5K errors/month | Sentry Team ($26/mo) |
| **Uptime** | UptimeRobot (free) | 50 monitors, 5-min checks | UptimeRobot Pro ($7/mo) |
| **Email** | Resend (free) | 3K emails/month | Resend Pro ($20/mo) |
| **Analytics** | PostHog (free) | 1M events/month | PostHog Scale |
| **CI/CD** | GitHub Actions (free) | 2,000 min/month | GitHub Teams |
| **Secrets** | Vercel/Render env vars dashboard | Unlimited | Vault (post-revenue) |
| **CDN** | Cloudflare (free) | Unlimited bandwidth, DDoS protection | Cloudflare Pro ($20/mo) |

### 1.2 Repository Structure

```
infra/
├── modules/
│   ├── vpc/                    # VPC, subnets, NAT, routing
│   ├── ecs/                    # ECS Fargate clusters
│   ├── rds/                    # PostgreSQL (Aurora / RDS)
│   ├── elasticache/            # Redis clusters
│   ├── s3/                     # Buckets, policies, lifecycle
│   ├── cloudfront/             # CDN, WAF, origins
│   ├── monitoring/             # CloudWatch, alarms, dashboards
│   └── iam/                    # Roles, policies, service accounts
├── environments/
│   ├── dev/
│   ├── staging/
│   └── prod/
│       ├── terragrunt.hcl
│       ├── vpc/
│       ├── ecs-ai-engine/
│       ├── rds-primary/
│       ├── elasticache-redis/
│       └── cloudfront/
└── global/
    ├── iam/
    ├── route53/
    └── s3-state/
```

### 1.3 Key Terraform Resources

| Resource | Environment | Notes |
|---|---|---|
| `aws_vpc` | All | 3 AZs, private + public subnets |
| `aws_ecs_cluster` | Staging, Prod | Fargate for AI engine + workers |
| `aws_rds_cluster` (Aurora PostgreSQL) | Staging, Prod | Serverless v2 for auto-scaling |
| `aws_elasticache_replication_group` | Staging, Prod | Redis 7 cluster mode, multi-AZ |
| `aws_alb` | Staging, Prod | Application Load Balancer for AI engine |
| `aws_cloudfront_distribution` | Prod | CDN for static assets, WAF attached |
| `aws_wafv2_web_acl` | Prod | Rate limiting, SQLi, XSS rules |
| `aws_s3_bucket` | All | Static assets, backups, logs |
| `aws_cloudwatch_log_group` | All | Structured JSON logs |
| `aws_iam_role` | All | Least-privilege service roles |

---

## 2. CI/CD Pipeline (GitHub Actions)

### 2.1 Workflow Architecture

```
Push to branch
  ├── lint.yml              → ESLint, Prettier, Ruff, Black
  ├── typecheck.yml         → tsc, mypy
  ├── unit-test.yml         → Jest/Vitest, pytest
  ├── integration-test.yml  → testcontainers, MSW
  ├── security-scan.yml     → Snyk, Semgrep, npm audit
  ├── e2e-test.yml          → Playwright (staging DB)
  └── build-and-deploy.yml  → Docker build, deploy
```

### 2.2 PR Workflow

```yaml
# .github/workflows/pr.yml
name: Pull Request
on: [pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check
      - uses: actions/setup-python@v5
      - run: pip install ruff
      - run: ruff check ai-engine/
      - run: ruff format --check ai-engine/

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run typecheck
      - uses: actions/setup-python@v5
      - run: pip install mypy
      - run: mypy ai-engine/

  unit-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:unit -- --shard=${{ matrix.shard }}/4 --coverage
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
      - run: cd ai-engine && pytest tests/integration/

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: snyk/actions/node@master
        env: { SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }} }
      - run: npm audit --audit-level=moderate
      - uses: returntocorp/semgrep-action@v1
        with: { config: >- p/owasp-top-ten p/cwe-top-25 p/secrets }

  build:
    runs-on: ubuntu-latest
    needs: [lint, typecheck, unit-tests]
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - uses: docker/build-push-action@v5
        with:
          context: ./ai-engine
          push: false
          tags: trademind-ai-engine:${{ github.sha }}
```

### 2.3 Deploy Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx vercel --token=${{ secrets.VERCEL_TOKEN }} --prod

  deploy-ai-engine:
    runs-on: ubuntu-latest
    needs: deploy-frontend
    environment: production
    steps:
      - uses: actions/checkout@v4
      # Render auto-deploys from main branch (free tier)
      # Manual trigger via deploy hook if needed:
      - name: Trigger Render Deploy
        run: |
          curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK_URL }}"
```

---

## 3. Deployment Strategy

### 3.1 Frontend (Vercel)

| Environment | Trigger | Strategy |
|---|---|---|
| **Preview** | Every PR | Automatic preview URL, isolated deployment |
| **Staging** | Merge to `staging` branch | Static generation + SSR on staging domain |
| **Production** | Merge to `main` | Static generation + SSR with rollback capability |

**Vercel Configuration:**
- `vercel.json`: ISR revalidation settings, headers, redirects
- Edge functions for lightweight API routes (rate limiting, geolocation)
- Preview deployments expire after 7 days of inactivity

### 3.2 AI Engine (ECS Fargate)

| Environment | Trigger | Strategy |
|---|---|---|
| **Staging** | Merge to `staging` | Rolling deployment, 2 tasks, no health check gate |
| **Production** | Merge to `main` | Blue-green deployment with health check gate |

**ECS Configuration:**
- Task definition: 1 vCPU, 2GB RAM (base), auto-scaling to 4 vCPU / 8GB
- Health check: `/healthz` endpoint, 2 consecutive failures = unhealthy
- Graceful shutdown: `SIGTERM` handler with 30s drain period
- Deployment: `DeploymentConfiguration` with `minimumHealthyPercent: 100`, `maximumPercent: 200`

### 3.3 Database Migrations

**Expand-Contract Pattern:**
1. **Expand phase:** Add new column/table (backward-compatible)
2. **Deploy:** Application code reads old + writes both
3. **Migrate data:** Backfill new column from old
4. **Contract phase:** Remove old column after verification

**Migration safety:**
- All migrations run in transactions where possible
- Long-running migrations use `pt-online-schema-change` equivalent (pg_repack)
- Staging migrations must pass before prod deployment
- Rollback script generated for every migration

---

## 4. Containerization

### 4.1 AI Engine Dockerfile

```dockerfile
# ai-engine/Dockerfile
FROM python:3.11-slim as builder

WORKDIR /app
RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml poetry.lock ./
RUN pip install poetry && poetry config virtualenvs.create false
RUN poetry install --no-dev

FROM python:3.11-slim as runtime
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY src/ ./src/

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/healthz || exit 1

EXPOSE 8000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### 4.2 Docker Compose (Local Development)

```yaml
# docker-compose.yml
version: '3.8'
services:
  web:
    build: ./apps/web
    ports: ["3000:3000"]
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
    volumes:
      - ./apps/web:/app
      - /app/node_modules
    depends_on: [db, redis]

  ai-engine:
    build: ./apps/ai-engine
    ports: ["8000:8000"]
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - ZERODHA_API_KEY=${ZERODHA_API_KEY}
      - ZERODHA_API_SECRET=${ZERODHA_API_SECRET}
      - GROQ_API_KEY=${GROQ_API_KEY}
      - NVIDIA_NIM_API_KEY=${NVIDIA_NIM_API_KEY}
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
    depends_on: [db, redis]

  # Single database: TimescaleDB includes PostgreSQL — no need for separate postgres
  db:
    image: timescale/timescaledb:latest-pg16
    environment:
      POSTGRES_USER: trademind
      POSTGRES_PASSWORD: devpassword
      POSTGRES_DB: trademind_dev
    ports: ["5432:5432"]
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infra/init-db.sql:/docker-entrypoint-initdb.d/init.sql  # Creates TimescaleDB extension

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

volumes:
  postgres_data:
```

---

## 5. Kubernetes Considerations

### 5.1 When to Migrate to K8s

| Trigger | Action |
|---|---|
| > 50 microservices | Consider K8s for service mesh |
| > 10 AI engine replicas | K8s HPA for fine-grained scaling |
| Multi-cloud requirement | K8s for portability |
| Need custom sidecars | Istio/Linkerd for mTLS |

### 5.2 K8s Architecture (Future)

```
┌─────────────────────────────────────────────────────────────┐
│                        EKS Cluster                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Ingress     │  │  API Gateway │  │  AI Engine          │  │
│  │  (ALB)       │  │  (Nginx)     │  │  (Deployment/HPA)   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬──────────┘  │
│         │                 │                     │             │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────────┴──────────┐  │
│  │  Web Pods    │  │  Worker Pods │  │  Redis (ElastiCache)│  │
│  │  (Next.js)   │  │  (Celery)    │  │  PostgreSQL (RDS)   │  │
│  └──────────────┘  └──────────────┘  └─────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Service Mesh (Istio): mTLS, traffic splitting, retries │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Monitoring & Observability Stack

### 6.1 Metrics (Prometheus + Grafana)

| Metric Category | Examples | Alert Threshold |
|---|---|---|
| **Application** | Request rate, error rate, latency p99 | Error rate > 1% for 5min |
| **Business** | Signals/min, trades/min, P&L, agent latency | Signal latency p95 > 45s |
| **Infrastructure** | CPU, memory, disk I/O, network | CPU > 80% for 5min |
| **Database** | Query duration, connection pool, lock waits | Query duration p99 > 2s |
| **External APIs** | Zerodha/Upstox latency, Groq cost/min, rate limit usage | Broker API latency > 500ms |
| **Queue** | Depth, processing rate, dead letter | Queue depth > 100 for 5min |

**Grafana Dashboards:**
- `TradeMind Overview`: High-level business metrics
- `API Performance`: Request latency, throughput, errors by endpoint
- `AI Engine`: Agent pipeline duration, cost per signal, model usage
- `Database`: Query performance, connection pool, replication lag
- `Infrastructure`: CPU, memory, disk, network for all services

### 6.2 Logs (Loki / CloudWatch)

- Structured JSON logs from all services
- Centralized collection via Fluent Bit → Loki (or CloudWatch Logs)
- Log levels: `DEBUG` (dev), `INFO` (staging), `WARN`+ (production)
- Sensitive data redaction: API keys, PII auto-scrubbed

### 6.3 Distributed Tracing (OpenTelemetry + Tempo/Jaeger)

```
Frontend (Next.js) → API Route → Python AI Engine → Zerodha Kite API
   │                     │              │                │
   └─ trace_id: abc123 ─┴────────────┴────────────────┘
                          
                          Spans:
                          - nextjs_request (200ms)
                          - api_validation (5ms)
                          - ai_pipeline (25s)
                            - fundamental_analyst (3s)
                            - technical_analyst (4s)
                            - sentiment_analyst (5s)
                            - debate (10s)
                            - risk_manager (2s)
                          - zerodha_trade (500ms)
```

**Instrumentation:**
- Next.js: `@opentelemetry/auto-instrumentations-node`
- Python: `opentelemetry-instrumentation-fastapi`, `opentelemetry-instrumentation-sqlalchemy`
- Supabase: Native tracing (when available)
- Zerodha/Upstox: Custom span wrapping broker API calls

---

## 7. Alerting (Grafana Cloud + UptimeRobot — Free Tiers)

### 7.1 Alert Severity Matrix

| Severity | Response Time | Escalation | Examples |
|---|---|---|---|
| **P1 (Critical)** | 5 min | On-call phone + SMS | Production down, data loss, security breach |
| **P2 (High)** | 15 min | On-call Slack + email | Service degradation, high error rate |
| **P3 (Medium)** | 1 hour | Team Slack channel | Elevated latency, non-critical service down |
| **P4 (Low)** | 24 hours | Daily digest | Minor performance drift, non-urgent warnings |

### 7.2 Alert Rules (Prometheus)

```yaml
# alerting/rules.yml
groups:
  - name: trademind-critical
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.01
        for: 5m
        labels:
          severity: p2
        annotations:
          summary: "High error rate on {{ $labels.service }}"
          
      - alert: AISignalLatencyHigh
        expr: histogram_quantile(0.95, signal_pipeline_duration_seconds) > 45
        for: 5m
        labels:
          severity: p2
        annotations:
          summary: "AI signal pipeline p95 latency > 45s"
          
      - alert: DatabaseConnectionsHigh
        expr: pg_stat_activity_count / pg_settings_max_connections > 0.8
        for: 5m
        labels:
          severity: p2
        annotations:
          summary: "Database connection pool > 80%"
          
      - alert: BrokerUnavailable
        expr: zerodha_api_up == 0
        for: 2m
        labels:
          severity: p1
        annotations:
          summary: "Zerodha Kite API unreachable — check fallback to Upstox"
```

### 7.3 On-Call Rotation

- Primary: Engineering lead (weekly rotation)
- Secondary: SRE / DevOps engineer
- Escalation: CTO / VP Engineering after 30 min unacknowledged P1
- Post-incident: P1/P2 require postmortem within 48 hours

---

## 8. Secret Management

### 8.1 HashiCorp Vault (Recommended)

```
┌─────────────────────────────────────────────┐
│              HashiCorp Vault                 │
│  ┌─────────────┐  ┌─────────────────────┐   │
│  │ KV v2       │  │ Database Dynamic    │   │
│  │ (API keys)  │  │ Credentials (Postgres)│  │
│  │ - Zerodha   │  │ - TTL: 24h          │   │
│  │ - Groq      │  │ - Auto-rotation      │   │
│  │ - NVIDIA NIM│  │ - Lease revocation  │   │
│  │ - Cashfree  │  └─────────────────────┘   │
│  └─────────────┘                            │
│  ┌─────────────────────────────────────────┐  │
│  │ Transit (Encryption as a Service)      │  │
│  │ - Encrypt API keys at rest             │  │
│  │ - Sign JWT tokens                       │  │
│  └─────────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### 8.2 AWS Secrets Manager (Alternative)

- Secrets encrypted with AWS KMS CMK
- Automatic rotation for RDS credentials (Lambda rotation function)
- IAM policy: `secretsmanager:GetSecretValue` scoped to specific secrets
- Audit: CloudTrail logs all secret access

### 8.3 Runtime Secret Injection

```python
# ai-engine/src/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Loaded from env vars (Render/Vercel dashboard env vars)
    zerodha_api_key: str
    zerodha_api_secret: str
    groq_api_key: str
    nvidia_nim_api_key: str
    openrouter_api_key: str = ''  # Optional fallback
    cashfree_client_id: str = ''  # Payment gateway
    cashfree_client_secret: str = ''  # Payment gateway
    database_url: str  # Dynamic credential from Vault
    
    class Config:
        env_prefix = "TRADEMIND_"
        case_sensitive = False

settings = Settings()
```

---

## 9. Backup & Disaster Recovery

### 9.1 Backup Schedule

| Data | Frequency | Retention | Method |
|---|---|---|---|
| PostgreSQL (Transactional) | Continuous (WAL) | 35 days | RDS automated backups + PITR |
| PostgreSQL (Full) | Daily | 90 days | pg_dump to S3 (cross-region) |
| TimescaleDB (Price data) | Continuous (WAL) | 30 days | TimescaleDB native backup |
| TimescaleDB (Cold) | Weekly | 2 years | S3 export + compression |
| Redis | Hourly | 7 days | ElastiCache snapshot |
| Application Logs | Continuous | 90 days | S3 + lifecycle to Glacier |
| Config / IaC | Every apply | Indefinite | Terraform state versioning |

### 9.2 Recovery Objectives

| System | RTO | RPO | Strategy |
|---|---|---|---|
| Frontend (Vercel) | 5 min | N/A | Automatic rollback, static assets cached |
| AI Engine | 15 min | 0 | Blue-green deployment, auto-failover ECS |
| Database (Primary) | 30 min | < 5 min | RDS Multi-AZ failover + PITR |
| Database (Read Replica) | 1 hour | < 1 hour | Promote read replica |
| Redis (Cache) | 15 min | < 1 hour | ElastiCache Multi-AZ failover |
| Full Region Failure | 4 hours | < 1 hour | Cross-region DB replica, S3 static site |

### 9.3 Disaster Recovery Runbooks

**Runbook: Database Primary Failure**
1. Detect failure via CloudWatch alarm (RDS `DBInstanceStatus` != `available`)
2. Automatic: RDS Multi-AZ promotes standby (RTO ~ 1-2 min)
3. Manual verification: Run `SELECT 1` on promoted instance
4. Update application connection strings if needed (DNS usually handles this)
5. Verify AI engine reconnects and resumes pipeline processing
6. Post-incident: Analyze cause, restore original topology if needed

**Runbook: AI Engine Service Failure**
1. Detect failure via ECS health check failures or ALB target health
2. Automatic: ECS service scheduler replaces unhealthy tasks
3. If stuck deployment: Force new deployment via AWS CLI
4. If code issue: Rollback to previous task definition revision
5. Verify: Check `/healthz` and submit test signal

**Runbook: Complete Region Failure**
1. Activate cross-region failover plan
2. Update Route53 DNS to point to secondary region ALB
3. Promote cross-region RDS read replica to primary
4. Verify S3 static assets accessible from secondary CloudFront distribution
5. Notify users of potential data loss (RPO < 1 hour)
6. Post-incident: Restore primary region, reverse failover

---

## 10. Feature Flags

### 10.1 Tool: LaunchDarkly (or Unleash for self-hosted)

| Flag Type | Example | Rollout Strategy |
|---|---|---|
| **Kill switch** | `signal_generation_enabled` | Instant toggle off |
| **Percentage** | `new_ui_dashboard_v2` | 5% → 25% → 50% → 100% |
| **Targeted** | `beta_backtest_engine` | Beta users only |
| **Time-based** | `extended_hours_trading` | Market hours only |
| **A/B test** | `prompt_version_b` | 50/50 split, track win rate |

### 10.2 Feature Flag Best Practices

- All new features behind flags by default
- Flag evaluation must not add > 10ms latency
- Flags auto-expire after 30 days (require explicit extension)
- Cleanup: Remove flag code after 100% rollout + 2 weeks stable

---

## 11. Cost Monitoring

### 11.1 Cost Allocation Tags

| Tag | Value | Purpose |
|---|---|---|
| `Project` | `trademind-ai` | All resources |
| `Environment` | `dev/staging/prod` | Environment isolation |
| `Service` | `web/ai-engine/db/redis` | Service-level cost tracking |
| `Team` | `platform/ai/product` | Team accountability |
| `CostCenter` | `engineering` | Finance reporting |

### 11.2 Budget Alerts

| Threshold | Action |
|---|---|
| 50% of monthly budget | Slack notification to engineering |
| 80% of monthly budget | Email to CTO + finance |
| 100% of monthly budget | Auto-disable non-production environments |
| 120% of monthly budget | Emergency cost review meeting |

### 11.3 Cost Optimization Strategies

- **Reserved Instances:** 1-year commit for base RDS + ElastiCache capacity
- **Spot Instances:** Use EC2 Spot for non-critical batch processing (backtests)
- **S3 Lifecycle:** Move logs to Glacier after 30 days, delete after 90
- **CDN Caching:** Aggressive caching on CloudFront (cache hit target > 95%)
- **AI Cost:** Model routing (cheap first), token budgeting, prompt caching
- **Right-sizing:** Weekly review of ECS task CPU/memory utilization

---

## 12. Git Branching Strategy

### 12.1 Trunk-Based Development (Recommended)

```
main (protected, deploys to production)
  ├── feature/signal-pipeline-v2
  ├── fix/memory-leak-chart
  ├── chore/update-dependencies
  └── hotfix/security-patch
```

**Rules:**
- `main` is always deployable
- Feature branches live < 3 days
- All changes via PR with required reviews (2 for infra, 1 for code)
- Squash merge to `main` for clean history
- Release tags: `v1.2.3` for production deploys

### 12.2 Commit Message Convention (Conventional Commits)

```
feat: add real-time price streaming via WebSocket
fix: resolve race condition in agent pipeline
refactor: extract signal scoring into separate module
docs: update API specification for v1.2
chore: upgrade Next.js to 15.0.3
security: rotate Zerodha API keys
perf: optimize portfolio snapshot query with materialized view
test: add integration tests for trade execution flow
```

---

## 13. Code Review Checklist

### 13.1 Required Checks (Block Merge)

- [ ] CI passes (lint, typecheck, unit tests, integration tests)
- [ ] Security scan passes (Snyk, Semgrep)
- [ ] Code review approved by 1+ engineer (2 for infra changes)
- [ ] No secrets in code (detect-secrets scan)
- [ ] Database migration reviewed (if applicable)
- [ ] Feature flag added (if new user-facing feature)
- [ ] Documentation updated (API spec, README)

### 13.2 Review Focus Areas

| Area | Reviewer Focus |
|---|---|
| **Security** | Input validation, auth checks, secret handling |
| **Performance** | N+1 queries, inefficient loops, missing indexes |
| **Reliability** | Error handling, retry logic, circuit breakers |
| **Observability** | Metrics, logs, tracing added for new paths |
| **Testing** | Unit tests cover business logic, edge cases |

---

## 14. Preview Deployments

### 14.1 Per-PR Preview

- Every PR generates a Vercel preview URL (`https://trademind-ai-git-branch.vercel.app`)
- Preview uses staging database (isolated schema per PR via `pr_{pr_number}`)
- AI engine preview deploys to separate ECS service (`ai-engine-preview-{pr}`)
- Preview environments auto-destroyed on PR close

### 14.2 Staging Environment Parity

| Layer | Staging | Production | Parity Gap |
|---|---|---|---|
| Code | Same commit | Same commit | N/A |
| Data | Anonymized snapshot (weekly) | Live | ~1 week lag |
| External APIs | Live (paper trading) | Live (paper/live) | Same endpoints |
| Infrastructure | Smaller instances | Production size | 50% capacity |
| Monitoring | Same stack | Same stack | N/A |
| Secrets | Different keys | Production keys | Isolated |

---

## 15. Auto-Scaling Policies

### 15.1 ECS Service Auto-Scaling

```json
{
  "TargetValue": 70.0,
  "ScaleOutCooldown": 60,
  "ScaleInCooldown": 300,
  "MetricName": "CPUUtilization",
  "ServiceNamespace": "ecs",
  "ResourceId": "service/trademind-prod/ai-engine",
  "ScalableDimension": "ecs:service:DesiredCount",
  "MinCapacity": 2,
  "MaxCapacity": 20
}
```

**Scale triggers:**
- CPU > 70% for 1 min → +1 task (max 1 per min)
- Request queue depth > 50 → +2 tasks
- Signal pipeline latency p95 > 45s → +2 tasks
- CPU < 30% for 10 min → -1 task (min 2)

### 15.2 RDS Auto-Scaling

- Aurora Serverless v2: Scales 0.5 ACU to 128 ACU based on CPU/connections
- Read replicas: Auto-add when read replica lag > 1s

### 15.3 Redis Auto-Scaling

- ElastiCache: Scale vertically (node type) for memory
- Scale horizontally (shards) when memory > 80%

---

## 16. DDoS Protection & WAF

### 16.1 Cloudflare (Primary)

- **DDoS Protection:** Automatic L3/L4/L7 attack mitigation
- **Rate Limiting:** 100 req/min per IP (configurable per endpoint)
- **Bot Management:** Challenge suspicious traffic
- **Page Rules:** Cache static assets, bypass cache for API

### 16.2 AWS WAF (Secondary, ALB-level)

**Managed Rule Sets:**
- AWS Managed Rules (Common): SQLi, XSS, LFI, RFI
- AWS Managed Rules (Known Bad Inputs): Protocol attacks
- Rate-based rules: 2000 requests per 5 min per IP → block
- Custom rules: Geo-blocking (if needed), IP allowlists for admin APIs

### 16.3 Vercel Firewall

- IP blocking, geo-blocking, challenge mode
- Custom rules for specific paths

---

## 17. GitHub Environment Protection

| Environment | Required Reviews | Deployment Windows | Protection Rules |
|---|---|---|---|
| **Preview** | 0 | Any time | Branch must be PR |
| **Staging** | 1 | Any time | CI must pass |
| **Production** | 2 | Business hours (Mon-Fri 9-17 ET) | CI + E2E + security scan must pass |

**Production deploy checklist:**
- [ ] All P1/P2 alerts resolved
- [ ] Database migration tested on staging
- [ ] Rollback plan documented
- [ ] On-call engineer notified
- [ ] Feature flags configured for gradual rollout

---

*Co-Authored-By: Oz <oz-agent@warp.dev>*
