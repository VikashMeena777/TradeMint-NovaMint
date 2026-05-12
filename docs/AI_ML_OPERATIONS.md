# AI/ML Operations & Evaluation v1.0 — Indian Market

## 1. MLOps Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       AI/ML OPERATIONS PIPELINE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Data Collection → Feature Engineering → Model Development → Evaluation  │
│        │                │                    │                  │         │
│        ▼                ▼                    ▼                  ▼         │
│   ┌─────────┐    ┌──────────┐        ┌──────────┐       ┌──────────┐   │
│   │ Raw     │    │ Indicator│        │ Prompt   │       │ Benchmark│   │
│   │ Market  │───▶│ Calc     │───────▶│ Version  │──────▶│ Dataset  │   │
│   │ News    │    │ Sentiment│        │ A/B Test │       │ Regression│  │
│   │ Sentiment│   │ Feature  │        │ Fine-tune│       │ Human    │   │
│   └─────────┘    │ Store    │        │ Deploy   │       │ Evaluation│  │
│                  └──────────┘        └──────────┘       └──────────┘   │
│                                                                             │
│                              ┌──────────┐                                   │
│                              │ Monitoring│                                   │
│                              │  - Drift  │                                   │
│                              │  - Cost   │                                   │
│                              │  - Latency│                                   │
│                              │  - Quality│                                   │
│                              └──────────┘                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Model Versioning & Registry

### 2.1 Model Registry Structure

| Artifact | Storage | Format | Versioning |
|---|---|---|---|
| **Prompt templates** | Git + JSONL files | Markdown / JSON | Git commit hash |
| **Agent configurations** | Git + YAML | YAML | Semantic versioning (e.g., `v2.1.0`) |
| **Evaluation datasets** | Supabase Storage / Git LFS | JSONL / Parquet | Dataset ID + date |
| **Benchmark results** | Supabase | JSON | Run ID + model version |
| **Fine-tuned models** | Hugging Face Hub (free) | Safetensors / GGUF | Model card + SHA |
| **Feature schemas** | Git + JSON Schema | JSON Schema | Semantic versioning |

### 2.2 Version Control for Prompts

```yaml
# ai-engine/config/agents/fundamental_analyst/v2.1.0.yaml
version: "2.1.0"
parent_version: "2.0.3"
model: "groq/llama-3.3-70b"
temperature: 0.1
max_tokens: 2000
prompt_template: |
  You are a senior equity research analyst covering Indian equities (Ind AS)...
  
  INPUT DATA:
  {fundamental_data}
  
  OUTPUT FORMAT (STRICT JSON):
  ...

changelog:
  - "Added Ind AS impact and promoter pledge fields"
  - "Added SEBI concern check"
  - "Added Indian government policy tailwind/headwind analysis"
  - "Tightened confidence scoring guidance for Indian data sources"

evaluation_delta:
  accuracy_improvement: +3.2%
  latency_delta_ms: +120
  cost_delta_inr: -0.001

status: "production"
deployed_at: "2025-01-15T10:00:00+05:30"
```

### 2.3 Rollback Strategy

- **Hot rollback:** Feature flag toggle to previous prompt version (< 30s)
- **Warm rollback:** Deploy previous Docker image revision (< 5 min)
- **Cold rollback:** Revert Git commit + redeploy pipeline (< 15 min)

---

## 3. Prompt A/B Testing Framework

### 3.1 Experiment Design

```python
from dataclasses import dataclass
from typing import Literal

@dataclass
class PromptExperiment:
    experiment_id: str
    hypothesis: str
    control_version: str
    treatment_version: str
    traffic_split: float  # 0.0-1.0, typically 0.5
    success_metric: Literal["win_rate", "confidence_calibration", "user_approval_rate"]
    minimum_sample_size: int  # Statistical power calculation
    max_duration_days: int
    early_stopping_threshold: float  # p-value for early termination
```

### 3.2 Assignment Logic

```python
import hashlib

def assign_experiment_group(user_id: str, experiment_id: str, split: float = 0.5) -> Literal["control", "treatment"]:
    """Deterministic assignment using hash-based bucketing."""
    hash_input = f"{user_id}:{experiment_id}"
    hash_value = int(hashlib.md5(hash_input.encode()).hexdigest(), 16)
    bucket = (hash_value % 1000) / 1000.0
    return "treatment" if bucket < split else "control"
```

### 3.3 Experiment Metrics

| Metric | Description | Minimum Detectable Effect | Statistical Test |
|---|---|---|---|
| **Signal win rate** | % of signals with positive P&L | +5% | Two-proportion z-test |
| **Confidence calibration** | Predicted vs actual accuracy | +0.1 correlation | Pearson r |
| **User approval rate** | % of signals approved by user | +10% | Chi-square test |
| **Pipeline latency** | Time to complete signal | -10% | Two-sample t-test |
| **Cost per signal** | LLM API cost in INR | -15% | Two-sample t-test |
| **Risk-adjusted return** | Sharpe ratio of followed signals | +0.3 | Two-sample t-test |

### 3.4 Experiment Lifecycle

1. **Design:** Define hypothesis, metrics, sample size, duration
2. **Launch:** Deploy with feature flag, 5% traffic initially
3. **Monitor:** Daily metric checks, auto-alert if metric degrades > 10%
4. **Analyze:** After minimum sample size reached, calculate p-value and confidence interval
5. **Decision:**
   - p < 0.05 + positive effect → Gradually ramp to 100%
   - p < 0.05 + negative effect → Stop, rollback
   - p >= 0.05 → Extend or declare inconclusive
6. **Cleanup:** Archive experiment, update prompt version registry

---

## 4. Evaluation Datasets

### 4.1 Dataset Categories

| Dataset | Size | Source | Update Frequency |
|---|---|---|---|
| **Test cases (curated)** | 200+ scenarios | Domain experts + historical NSE events | Quarterly |
| **Edge cases** | 50+ scenarios | Adversarial + synthetic (budget day, RBI policy, F&O expiry) | Monthly |
| **Regression suite** | 500+ historical signals | Production data (anonymized) on Nifty 50 | Weekly |
| **Human feedback** | 1000+ ratings | User approvals/rejections | Continuous |
| **Benchmark scenarios** | 20 market regimes | Academic + Indian market specific (pre-election, budget, RBI rate cycle) | Annually |

### 4.2 Test Case Format (JSONL)

```json
{
  "case_id": "tc_2025_001",
  "category": "earnings_surprise_india",
  "symbol": "RELIANCE.NS",
  "date": "2024-10-30",
  "scenario": "Q2 earnings beat by 15% but Jio ARPU guidance weak; promoter holding stable",
  "input_data": {
    "price": 2850.50,
    "earnings_eps": 12.5,
    "expected_eps": 10.9,
    "guidance": "Jio ARPU below consensus; retail EBITDA margin compressed",
    "technical_indicators": {"rsi": 62, "macd": "bullish", "circuit_proximity": "safe"},
    "sentiment_score": 0.65,
    "fii_inflow_7d": "net_buy",
    "promoter_pledge_pct": 2.1
  },
  "expected_behavior": {
    "valuation_signal": "mixed",
    "confidence_range": [0.5, 0.7],
    "timeframe_bias": "swing",
    "required_fields": ["earnings_outlook", "guidance_impact", "india_specific.sebi_concern"]
  },
  "ground_truth": {
    "next_day_return_pct": -2.3,
    "one_week_return_pct": 1.1,
    "direction": "neutral"
  },
  "tolerance": {
    "confidence": 0.15,
    "fair_value_estimate_pct": 5.0
  }
}
```

### 4.3 Regression Testing Pipeline

```python
# tests/agent/test_regression.py
import pytest
from pathlib import Path
import json

REGRESSION_DATASET = Path("tests/fixtures/agent-eval/regression_suite_india.jsonl")

@pytest.fixture(scope="session")
def regression_cases():
    cases = []
    with open(REGRESSION_DATASET) as f:
        for line in f:
            cases.append(json.loads(line))
    return cases

@pytest.mark.parametrize("case", regression_cases())
def test_agent_regression(case, agent_pipeline):
    """Run full pipeline on regression case and validate output."""
    result = agent_pipeline.run(
        symbol=case["symbol"],
        input_data=case["input_data"],
        config={"model_version": "current"}
    )
    
    # Schema validation
    assert_valid_schema(result, case["expected_behavior"]["required_fields"])
    
    # Confidence range check
    assert case["expected_behavior"]["confidence_range"][0] <= result.confidence <= case["expected_behavior"]["confidence_range"][1]
    
    # Ground truth comparison (if applicable)
    if "ground_truth" in case:
        predicted_direction = result.signal_type
        actual_direction = case["ground_truth"]["direction"]
        # Log for analysis but don't fail — ground truth is noisy
        log_comparison(case["case_id"], predicted_direction, actual_direction)
```

---

## 5. Benchmark Tasks

### 5.1 Agent-Specific Benchmarks

| Agent | Benchmark Task | Metric | Baseline | Target |
|---|---|---|---|---|
| **Fundamental Analyst** | Predict earnings surprise direction for NSE stocks | Accuracy | 55% (random) | > 65% |
| **Technical Analyst** | Predict next-day direction from NSE indicators | Accuracy | 52% | > 58% |
| **Sentiment Analyst** | Correlate sentiment score with 5-day NSE return | Pearson r | 0.10 | > 0.25 |
| **News Analyst** | Extract material news from Indian headline (Economic Times) | Precision@K | 0.40 | > 0.60 |
| **Bull/Bear Researcher** | Generate coherent bull/bear cases for Indian stocks | Human rating (1-5) | 3.0 | > 4.0 |
| **Trader Agent** | Synthesize signals into trade decision for NSE stocks | Win rate (followed signals) | 45% | > 55% |
| **Risk Manager** | Flag risky signals correctly (circuit limits, margin) | Precision / Recall | 0.70/0.70 | > 0.85/0.85 |

### 5.2 End-to-End Benchmarks

| Benchmark | Description | Metric | Target |
|---|---|---|---|
| **Full pipeline accuracy** | Signal direction vs actual 5-day NSE return | Directional accuracy | > 60% |
| **Calibration score** | Confidence vs accuracy (Brier score) | Brier score | < 0.25 |
| **Sharpe of followed signals** | Risk-adjusted return of executed signals | Sharpe ratio | > 1.0 |
| **Max drawdown** | Worst peak-to-trough of signal portfolio | Max DD | < 15% |
| **Latency SLA** | p95 pipeline completion time | Seconds | < 45s |
| **Cost per signal** | Total LLM cost per completed signal | INR | < ₹3.00 |

### 5.3 Benchmark Execution Schedule

| Frequency | Benchmarks | Trigger | Action on Failure |
|---|---|---|---|
| **Every PR** | Unit tests, schema validation | CI | Block merge |
| **Nightly** | Regression suite (200 cases) | Cron | Alert, investigate |
| **Weekly** | Full benchmark (500 cases + human eval) | Cron | Report to ML team |
| **Monthly** | A/B test analysis, model drift check | Calendar | Update models if drift detected |
| **Quarterly** | Full benchmark refresh, new scenarios | Calendar | Update evaluation dataset |

---

## 6. Human Feedback Loop (RLHF)

### 6.1 Feedback Collection Points

| Stage | Feedback Type | Collection Method |
|---|---|---|
| **Signal approval/rejection** | Binary + reason | UI button + optional text |
| **Signal result** | P&L outcome | Automatic from trade execution |
| **Agent reasoning review** | Thumbs up/down per agent | UI inline in reasoning modal |
| **Overall satisfaction** | 1-5 star rating | Post-trade survey (opt-in) |
| **Specific correction** | Text feedback | "Correct this signal" button |

### 6.2 Feedback Aggregation

```python
def aggregate_human_feedback(signal_id: str, window_days: int = 30) -> dict:
    """
    Aggregate all human feedback for a signal or agent.
    """
    feedback = get_feedback(signal_id=signal_id, since=now() - timedelta(days=window_days))
    
    return {
        'approval_rate': feedback.approved_count / feedback.total_count,
        'avg_rating': feedback.ratings.mean(),
        'common_reasons': feedback.rejection_reasons.most_common(5),
        'agent_thumbs_up': {
            'fundamental': feedback.agent_ratings['fundamental'].positive_ratio,
            'technical': feedback.agent_ratings['technical'].positive_ratio,
            # ... per agent
        },
        'corrected_signals': feedback.corrections.count(),
    }
```

### 6.3 RLHF Implementation (Simplified)

```python
# Pseudo-code for preference-based fine-tuning
from transformers import AutoModelForCausalLM, AutoTokenizer

class RLHFTrainer:
    def __init__(self, base_model: str, feedback_buffer_size: int = 1000):
        self.model = AutoModelForCausalLM.from_pretrained(base_model)
        self.tokenizer = AutoTokenizer.from_pretrained(base_model)
        self.feedback_buffer = []
        self.buffer_size = feedback_buffer_size
    
    def add_preference(self, prompt: str, chosen: str, rejected: str):
        """Add a human preference pair (chosen output preferred over rejected)."""
        self.feedback_buffer.append({
            'prompt': prompt,
            'chosen': chosen,
            'rejected': rejected,
        })
        
        if len(self.feedback_buffer) >= self.buffer_size:
            self.train()
    
    def train(self):
        """Run Direct Preference Optimization (DPO) or PPO."""
        from trl import DPOTrainer
        
        trainer = DPOTrainer(
            model=self.model,
            ref_model=None,  # Use implicit reference
            beta=0.1,
            train_dataset=self.feedback_buffer,
            tokenizer=self.tokenizer,
        )
        trainer.train()
        
        # Save new version
        version = bump_version(self.model.config.version)
        self.model.save_pretrained(f"models/agent-{version}")
        self.feedback_buffer = []
```

### 6.4 Feedback-Driven Prompt Iteration

```
Collect 100 rejection reasons for "low confidence signals" on Indian market
  → Cluster reasons (topic modeling / manual review)
    → Identify top 3 patterns:
      1. "Stop-loss too far from NSE support / near circuit"
      2. "Didn't consider recent quarterly results (Ind AS impact)"
      3. "Overweight on technical, ignored promoter pledge/FII flows"
    → Update prompt templates:
      1. Add "validate stop-loss against nearest NSE support/resistance and circuit limits"
      2. Add "check quarterly results calendar within 7 days and Ind AS impact"
      3. Add "fundamental weight minimum 30% in final score; include FII/DII flow summary"
    → A/B test new prompt vs baseline
      → Measure: rejection rate for "low confidence" category
      → If -20% rejection rate, deploy to 100%
```

---

## 7. Output Quality Metrics

### 7.1 Structured Output Validity

| Metric | Description | Target | Measurement |
|---|---|---|---|
| **JSON parse rate** | % of outputs that parse as valid JSON | > 99% | Per 1000 signals |
| **Schema compliance** | % of outputs matching required schema | > 98% | Pydantic validation |
| **Field completeness** | % of required fields present and non-null | > 95% | Per agent |
| **Type correctness** | % of fields with correct type (number vs string) | > 99.5% | Automated check |
| **Range validity** | % of numeric fields within expected ranges | > 99% | Per agent |

### 7.2 Hallucination Rate

```python
def calculate_hallucination_rate(agent_outputs: list[dict], source_data: list[dict]) -> dict:
    """
    Detect hallucinated facts by cross-referencing with source data.
    """
    hallucinations = 0
    total_facts = 0
    
    for output, source in zip(agent_outputs, source_data):
        # Extract factual claims from output
        claims = extract_claims(output)
        
        for claim in claims:
            total_facts += 1
            if not verify_claim(claim, source):
                hallucinations += 1
    
    return {
        'hallucination_rate': hallucinations / total_facts if total_facts > 0 else 0,
        'hallucination_count': hallucinations,
        'total_facts_checked': total_facts,
        'common_hallucination_types': categorize_hallucinations(agent_outputs),
    }
```

| Hallucination Type | Example | Mitigation |
|---|---|---|
| **Invented metric** | "P/E ratio of 15.2" when not provided | Require `data_unavailable` flag |
| **Future event** | "Upcoming Jio IPO announced" when none exists | Ban future predictions without source |
| **Wrong symbol** | Attributes TCS news to Reliance | Symbol validation in prompt |
| **Outdated data** | Uses Q2 earnings when Q3 available | Timestamp validation, freshness check |
| **Numerical drift** | Price ₹2850.50 → output says ₹2880.50 | Source grounding in prompt; broker WS cross-check |
| **Circuit limit error** | Suggests entry above upper circuit | NSE circuit API validation in prompt |

**Target hallucination rate:** < 2% across all agents.

---

## 8. Cost Tracking & Budgeting (INR)

### 8.1 Per-Signal Cost Breakdown

| Component | Model | Avg Tokens | Avg Cost (INR) | Budget (INR) |
|---|---|---|---|---|
| **Fundamental analyst** | Groq Llama 3.3 70B | 1,500 | ₹0.03 | ₹0.05 |
| **Technical analyst** | Groq Llama 3.3 70B | 1,500 | ₹0.03 | ₹0.05 |
| **Sentiment analyst** | GPT-4o-mini | 2,500 | ₹0.18 | ₹0.25 |
| **News analyst** | GPT-4o-mini | 2,000 | ₹0.12 | ₹0.15 |
| **Bull researcher** | GPT-4o | 3,500 | ₹0.55 | ₹0.75 |
| **Bear researcher** | GPT-4o | 3,500 | ₹0.55 | ₹0.75 |
| **Risk manager** | o1-mini | 1,500 | ₹0.30 | ₹0.45 |
| **Trader agent** | GPT-4o | 2,000 | ₹0.30 | ₹0.45 |
| **Overhead** | — | — | ₹0.01 | ₹0.05 |
| **Total** | — | ~18K | **₹2.07** | **₹2.95** |

### 8.2 Cost Monitoring Dashboard

```python
# ai-engine/src/monitoring/cost_tracker.py
class CostTracker:
    def __init__(self, budget_inr_per_signal: float = 2.95):
        self.budget = budget_inr_per_signal
        self.daily_budget = budget_inr_per_signal * signals_per_day_estimate
        
    def log_agent_cost(self, agent_name: str, model: str, tokens_in: int, 
                       tokens_out: int, cost_inr: float, latency_ms: int):
        """Log cost and emit metric for monitoring."""
        metrics.gauge(
            f"agent_cost_inr",
            cost_inr,
            tags={"agent": agent_name, "model": model}
        )
        metrics.histogram(
            f"agent_latency_ms",
            latency_ms,
            tags={"agent": agent_name, "model": model}
        )
        metrics.counter(
            f"agent_tokens_total",
            tokens_in + tokens_out,
            tags={"agent": agent_name, "model": model}
        )
    
    def check_budget(self, running_cost: float) -> bool:
        """Return True if within budget, False if exceeded."""
        if running_cost > self.budget:
            alerts.send(
                severity="warning",
                message=f"Signal cost ₹{running_cost:.2f} exceeded budget ₹{self.budget:.2f}"
            )
            return False
        return True
```

### 8.3 Cost Optimization Strategies

| Strategy | Implementation | Expected Savings |
|---|---|---|
| **Prompt caching** | Cache NSE market overview context across agents | 20-30% |
| **Model routing** | Route simple tasks to cheaper models (Groq primary) | 15-25% |
| **Response caching** | Cache identical inputs (same symbol + same data hash) | 10-15% |
| **Token budgeting** | Hard truncate context at 5K tokens per agent | 5-10% |
| **Batching** | Process multiple NSE symbols in single LLM call when possible | 10-20% |
| **Early exit** | Skip low-confidence paths after first agent fails | 5-10% |

---

## 9. Model Fallback Strategies

### 9.1 Fallback Hierarchy

| Agent | Primary | Fallback 1 | Fallback 2 | Final Fallback |
|---|---|---|---|---|
| Analysts | Groq Llama 3.3 70B | GPT-4o-mini | Claude 3 Haiku | Skip agent, reduce confidence |
| Researchers | GPT-4o | Claude 3.5 Sonnet | Groq Llama 3.3 70B | Use cached template response |
| Risk Manager | o1-mini | GPT-4o | DeepSeek R1 | Reject signal (safe default) |
| Trader | GPT-4o | Claude 3.5 Sonnet | Groq Llama 3.3 70B | Generate conservative hold signal |

### 9.2 Fallback Triggers

| Trigger | Condition | Action |
|---|---|---|
| **Rate limit (429)** | Groq: > 10K req/min | Queue + retry after 1s, then fallback |
| **Timeout** | No response in 15s | Cancel, retry with fallback model |
| **Error rate** | 3 consecutive errors | Circuit breaker open, use fallback |
| **Cost spike** | Cost > 2× budget | Switch to cheaper model for remaining agents |
| **Quality degradation** | Schema validation fails 3× | Switch to more reliable model |

### 9.3 Circuit Breaker Configuration

```python
from circuitbreaker import circuit

@circuit(failure_threshold=5, recovery_timeout=60, expected_exception=(APIError, TimeoutError))
def call_llm_with_fallback(agent_name: str, prompt: str, primary_model: str):
    try:
        return call_llm(prompt, model=primary_model)
    except RateLimitError:
        logger.warning(f"Rate limit on {primary_model}, falling back")
        return call_llm(prompt, model=FALLBACK_MODELS[agent_name][0])
    except APIError:
        logger.error(f"API error on {primary_model}, trying fallback 2")
        return call_llm(prompt, model=FALLBACK_MODELS[agent_name][1])
```

---

## 10. Fine-Tuning Pipeline

### 10.1 When to Fine-Tune

| Condition | Trigger | Action |
|---|---|---|
| **Cost pressure** | LLM costs > ₹1,500/user/month | Fine-tune smaller model to replace GPT-4o |
| **Latency pressure** | p95 latency > 60s | Fine-tune for faster inference |
| **Quality plateau** | Benchmark accuracy flat for 3 months | Fine-tune on curated Indian stock dataset |
| **Domain specificity** | New asset class (F&O, commodities, mutual funds) | Fine-tune on domain-specific Indian data |
| **Data accumulation** | > 10K high-quality labeled examples | Fine-tune on proprietary Indian dataset |

### 10.2 Fine-Tuning Process

```
Collect high-quality examples (approved signals with good P&L on NSE stocks)
  → Filter for diversity (different market conditions, sectors, Nifty 50 vs midcap)
    → Annotate with expert labels (senior Indian trader review)
      → Format for fine-tuning (prompt + expected output pairs)
        → Split: 80% train, 10% validation, 10% test
          → Run hyperparameter sweep (learning rate, epochs, LoRA rank)
            → Evaluate on held-out test set
              → A/B test fine-tuned vs base model on NSE data
                → Deploy if win rate improves > 5%
```

### 10.3 LoRA Fine-Tuning Configuration

```python
# fine_tune_config.yaml
base_model: "meta-llama/Llama-3.1-8B-Instruct"
method: "lora"
lora_config:
  r: 64
  lora_alpha: 128
  target_modules: ["q_proj", "v_proj", "k_proj", "o_proj"]
  lora_dropout: 0.05
  bias: "none"
  task_type: "CAUSAL_LM"

training:
  learning_rate: 2.0e-4
  num_train_epochs: 3
  per_device_train_batch_size: 4
  gradient_accumulation_steps: 4
  warmup_steps: 100
  max_seq_length: 4096
  fp16: true
  
evaluation:
  eval_strategy: "steps"
  eval_steps: 100
  save_strategy: "steps"
  save_steps: 500
```

---

## 11. Data Labeling Workflows

### 11.1 Automated Labeling

| Source | Label Type | Quality |
|---|---|---|
| **Trade outcome** | Win/loss, P&L in INR | High (objective) |
| **Price movement** | Direction, magnitude | High (objective) |
| **Signal approval** | Approved/rejected | High (user action) |
| **Sentiment score** | Bullish/bearish/neutral | Medium (model-derived) |
| **Technical pattern** | Breakout, reversal, consolidation | Medium (rule-based) |
| **NSE circuit hit** | Upper/lower circuit triggered | High (objective) |

### 11.2 Human-in-the-Loop Labeling

- **Expert review panel:** 2 senior Indian traders review 50 random signals/week
- **Disagreement resolution:** Third expert breaks ties
- **Inter-rater reliability:** Target Cohen's kappa > 0.7
- **Labeling UI:** Dedicated admin interface for efficient review

### 11.3 Active Learning

```python
def select_samples_for_labeling(unlabeled_pool: list, strategy: str, n: int = 100) -> list:
    """
    Select most valuable samples for human labeling.
    """
    if strategy == "uncertainty":
        uncertainties = [calculate_prediction_entropy(sample) for sample in unlabeled_pool]
        return [unlabeled_pool[i] for i in np.argsort(uncertainties)[-n:]]
    
    elif strategy == "diversity":
        embeddings = get_embeddings(unlabeled_pool)
        clusters = cluster_embeddings(embeddings, n_clusters=20)
        return sample_from_each_cluster(clusters, n)
    
    elif strategy == "high_impact":
        return sorted(unlabeled_pool, key=lambda x: x.potential_pnl, reverse=True)[:n]
```

---

## 12. Continuous Improvement Process

### 12.1 Improvement Cycle

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTINUOUS IMPROVEMENT LOOP                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│  │   DEPLOY     │────▶│   MONITOR    │────▶│   ANALYZE    │   │
│  │  (new model  │     │  - metrics   │     │  - drift?    │   │
│  │   or prompt) │     │  - feedback  │     │  - degrade?  │   │
│  └──────────────┘     │  - cost      │     │  - bias?     │   │
│        ▲              └──────────────┘     └──────────────┘   │
│        │                      │                    │           │
│        └──────────────────────┴────────────────────┘           │
│                              │                                   │
│                              ▼                                   │
│                       ┌──────────────┐                         │
│                       │    DECIDE    │                         │
│                       │  - rollback? │                         │
│                       │  - A/B test? │                         │
│                       │  - retrain?  │                         │
│                       └──────────────┘                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 12.2 Weekly Review Agenda

1. **Metrics Review (15 min):**
   - Signal win rate (7-day, 30-day) on NSE stocks
   - Confidence calibration plot
   - Pipeline latency p50/p95/p99
   - Cost per signal trend (INR)
   - Hallucination rate

2. **Feedback Review (15 min):**
   - Top rejection reasons
   - Agent thumbs up/down ratios
   - User satisfaction score
   - Specific corrections submitted

3. **Drift Detection (10 min):**
   - Input distribution drift (Indian market regime change?)
   - Output distribution drift (confidence scores shifting?)
   - Performance drift (win rate declining?)

4. **Action Items (10 min):**
   - Prompt adjustments needed?
   - New evaluation cases to add (Indian market events)?
   - Model fallback issues?
   - Cost optimization opportunities?

---

## 13. Agent Accuracy Dashboard

### 13.1 Dashboard Metrics

| Panel | Metric | Visualization | Refresh |
|---|---|---|---|
| **Win Rate Trend** | 7-day rolling win rate | Line chart | Real-time |
| **Confidence Calibration** | Predicted vs actual accuracy | Reliability diagram | Daily |
| **Agent Contribution** | Per-agent accuracy | Bar chart | Daily |
| **Confusion Matrix** | Predicted vs actual direction | Heatmap | Weekly |
| **Latency Distribution** | Pipeline stage timings | Histogram | Real-time |
| **Cost Breakdown** | Per-agent cost (INR) | Stacked bar | Daily |
| **Hallucination Tracker** | Rate + types | Line + pie | Daily |
| **Feedback Volume** | Approvals/rejections/ratings | Line chart | Real-time |
| **NSE Circuit Hits** | Signals near circuit | Alert table | Real-time |
| **F&O OI Correlation** | Signal accuracy vs OI change | Scatter | Daily |

### 13.2 Confusion Matrix for Signals

```
                  Actual
              ┌─────────────┐
              │  Up   Flat  Down  │
         ┌────┼─────────────┤
Predicted Buy  │  TP    FP    FP   │
         Hold  │  FN    TN    FN   │
         Sell  │  FP    FP    TP   │
         └────┴─────────────┘

Metrics:
- Precision (Buy): TP_buy / (TP_buy + FP_buy)
- Recall (Buy): TP_buy / (TP_buy + FN_buy)
- Precision (Sell): TP_sell / (TP_sell + FP_sell)
- Recall (Sell): TP_sell / (TP_sell + FN_sell)
- Accuracy: (TP_buy + TN + TP_sell) / Total
```

### 13.3 Win Rate by Agent Contribution

| Agent | Weight in Final Signal | Win Rate When Agent Correct | Win Rate When Agent Wrong |
|---|---|---|---|
| Fundamental | 25% | 62% | 48% |
| Technical | 25% | 58% | 51% |
| Sentiment | 20% | 55% | 53% |
| News | 15% | 60% | 50% |
| Bull/Bear | 15% | 59% | 49% |

---

## 14. Signal Confidence Calibration

### 14.1 Calibration Method

```python
def calibrate_confidence(confidence_scores: list[float], 
                        actual_outcomes: list[bool]) -> dict:
    """
    Assess how well confidence scores predict actual accuracy.
    
    Perfect calibration: 70% confidence → 70% actual accuracy.
    """
    import numpy as np
    
    # Bin confidence scores
    bins = np.arange(0, 1.05, 0.05)
    bin_accuracies = []
    bin_counts = []
    
    for i in range(len(bins) - 1):
        mask = (confidence_scores >= bins[i]) & (confidence_scores < bins[i+1])
        if mask.sum() > 0:
            bin_accuracies.append(actual_outcomes[mask].mean())
            bin_counts.append(mask.sum())
        else:
            bin_accuracies.append(None)
            bin_counts.append(0)
    
    # Expected Calibration Error (ECE)
    ece = 0
    for i, (acc, count) in enumerate(zip(bin_accuracies, bin_counts)):
        if acc is not None:
            bin_confidence = (bins[i] + bins[i+1]) / 2
            ece += (count / len(confidence_scores)) * abs(acc - bin_confidence)
    
    # Brier score
    brier = np.mean((np.array(confidence_scores) - np.array(actual_outcomes)) ** 2)
    
    return {
        'ece': ece,
        'brier_score': brier,
        'bin_accuracies': bin_accuracies,
        'bin_counts': bin_counts,
        'calibration_status': 'well_calibrated' if ece < 0.05 else 'poorly_calibrated',
    }
```

### 14.2 Calibration Targets

| Metric | Target | Alert Threshold |
|---|---|---|
| **ECE (Expected Calibration Error)** | < 0.05 | > 0.10 |
| **Brier Score** | < 0.20 | > 0.30 |
| **Max calibration error** | < 0.10 | > 0.20 |

---

## 15. Backtest Result Tracking

### 15.1 Backtest Registry

| Field | Description | Example |
|---|---|---|
| `backtest_id` | Unique identifier | `bt_2025_001` |
| `strategy_version` | Prompt/model version used | `v2.1.0` |
| `date_range` | Test period | `2024-01-01` to `2024-12-31` |
| `universe` | Symbols tested | `Nifty 50 constituents` |
| `metrics` | Full performance metrics | Sharpe, max DD, win rate, etc. |
| `trades` | Complete trade list | 847 trades |
| `parameters` | Strategy parameters | Risk profile, confidence threshold |
| `benchmark` | Comparison benchmark | `NIFTY50` |
| `alpha` | Excess return | +3.2% |

### 15.2 Backtest Comparison Table

| Version | Period | Return | Sharpe | Max DD | Win Rate | Alpha vs NIFTY50 |
|---|---|---|---|---|---|---|
| v1.0.0 | 2023 | +12.5% | 1.45 | -8.2% | 58% | +2.1% |
| v1.5.0 | 2023 | +15.2% | 1.62 | -7.1% | 61% | +4.8% |
| v2.0.0 | 2023 | +14.8% | 1.58 | -7.5% | 60% | +4.4% |
| v2.1.0 | 2024 | +18.5% | 1.92 | -8.4% | 64% | +3.2% |
| v2.1.0 | 2023 | +16.1% | 1.71 | -6.9% | 62% | +5.7% |

---

## 16. Model Drift Detection

### 16.1 Drift Types

| Type | Description | Detection Method | Action |
|---|---|---|---|
| **Data drift** | Input distribution changes | KS test on features | Retrain or adapt features |
| **Concept drift** | Feature-target relationship changes | Performance degradation | A/B test new model |
| **Prediction drift** | Output distribution changes | PSI on confidence scores | Investigate, possibly retrain |
| **Label drift** | Ground truth distribution changes | Track win rate trend | Adjust strategy |

### 16.2 Drift Detection Pipeline

```python
from scipy.stats import ks_2samp

def detect_drift(reference_data: np.ndarray, 
                 current_data: np.ndarray,
                 threshold: float = 0.05) -> dict:
    """
    Detect if current data distribution has drifted from reference.
    """
    statistic, p_value = ks_2samp(reference_data, current_data)
    
    drift_detected = p_value < threshold
    
    return {
        'drift_detected': drift_detected,
        'ks_statistic': statistic,
        'p_value': p_value,
        'reference_mean': reference_data.mean(),
        'current_mean': current_data.mean(),
        'mean_shift_pct': (current_data.mean() - reference_data.mean()) / reference_data.mean() * 100,
    }

# Weekly drift check
def run_weekly_drift_check():
    reference = load_reference_distribution()  # Last 90 days
    current = load_current_distribution()      # Last 7 days
    
    features_to_check = ['rsi', 'atr', 'sentiment_score', 'volume_zscore', 'oi_change']
    
    for feature in features_to_check:
        drift = detect_drift(reference[feature], current[feature])
        if drift['drift_detected']:
            alerts.send(
                severity="warning",
                message=f"Drift detected in {feature}: p={drift['p_value']:.4f}, "
                        f"shift={drift['mean_shift_pct']:.1f}%"
            )
```

### 16.3 Drift Response Playbook

| Severity | Condition | Response |
|---|---|---|
| **Low** | Minor drift (p < 0.05, shift < 5%) | Monitor, log for next review |
| **Medium** | Moderate drift (shift 5-15%) | A/B test new prompt, increase evaluation frequency |
| **High** | Severe drift (shift > 15%) | Pause new signal generation, investigate root cause |
| **Critical** | Performance degraded > 20% | Rollback to last known good version, emergency review |

---

## 17. Feature Importance Analysis

### 17.1 Agent-Specific Feature Importance

```python
from sklearn.inspection import permutation_importance

def calculate_feature_importance(agent_name: str, 
                                  model, 
                                  X: np.ndarray, 
                                  y: np.ndarray,
                                  feature_names: list[str]) -> dict:
    """
    Calculate feature importance for an agent's decision model.
    """
    result = permutation_importance(
        model, X, y, 
        n_repeats=30,
        random_state=42,
        scoring='accuracy'
    )
    
    importance = dict(zip(
        feature_names,
        zip(result.importances_mean, result.importances_std)
    ))
    
    return {
        'agent': agent_name,
        'top_features': sorted(importance.items(), 
                              key=lambda x: x[1][0], 
                              reverse=True)[:10],
        'least_important': sorted(importance.items(), 
                                 key=lambda x: x[1][0])[:5],
    }
```

### 17.2 Example: Fundamental Analyst Feature Importance (India)

| Rank | Feature | Importance | Notes |
|---|---|---|---|
| 1 | Forward P/E vs sector avg | 0.18 | Key valuation anchor for Indian stocks |
| 2 | Revenue growth YoY (Ind AS) | 0.15 | Growth signal strength |
| 3 | Promoter holding % | 0.14 | Key Indian market signal |
| 4 | Promoter pledge % | 0.12 | Risk signal specific to Indian markets |
| 5 | FII/DII flow (7d) | 0.11 | Institutional sentiment |
| 6 | Earnings surprise % | 0.10 | Momentum indicator |
| 7 | Debt/Equity ratio | 0.09 | Balance sheet health |
| 8 | RoE | 0.06 | Profitability |
| 9 | Gross margin trend | 0.05 | Pricing power |
| 10 | Analyst consensus (Indian brokerages) | 0.04 | Crowd wisdom |

---

## 18. Hyperparameter Tuning Strategy

### 18.1 Agent Hyperparameters

| Parameter | Range | Default | Tuning Strategy |
|---|---|---|---|
| **Temperature** | 0.0 - 1.0 | 0.1 (analysts), 0.3 (researchers) | Grid search on evaluation set |
| **Max tokens** | 500 - 4000 | 2000 (analysts), 4000 (researchers) | Tradeoff: completeness vs cost |
| **Top-p** | 0.5 - 1.0 | 0.95 | Rarely tuned |
| **Presence penalty** | -2.0 - 2.0 | 0.0 | If repetitive outputs detected |
| **Frequency penalty** | -2.0 - 2.0 | 0.0 | If repetitive outputs detected |

### 18.2 Pipeline Hyperparameters

| Parameter | Range | Default | Tuning Strategy |
|---|---|---|---|
| **Confidence threshold** | 50 - 90 | 70 | Grid search on backtest Sharpe |
| **Position sizing multiplier** | 0.5× - 1.0× Kelly | 0.5× | Walk-forward optimization |
| **Stop-loss ATR multiplier** | 1.0 - 3.0 | 2.0 | Grid search on max drawdown |
| **Take-profit R:R ratio** | 1.5 - 3.0 | 2.0 | Grid search on win rate |
| **Rebalance frequency** | Daily - Monthly | Weekly | Walk-forward optimization |
| **Circuit buffer %** | 1% - 5% | 2% | Grid search on circuit hit rate |

### 18.3 Tuning Framework

```python
from sklearn.model_selection import ParameterGrid

def run_hyperparameter_tuning(strategy_class, param_grid: dict, 
                             backtest_data: pd.DataFrame) -> dict:
    """
    Grid search over strategy hyperparameters using backtest data.
    """
    best_sharpe = -np.inf
    best_params = None
    results = []
    
    for params in ParameterGrid(param_grid):
        strategy = strategy_class(**params)
        metrics = backtest(strategy, backtest_data)
        
        # Multi-objective: Sharpe - 0.5 × max_drawdown_penalty
        score = metrics['sharpe_ratio'] - 0.5 * (metrics['max_drawdown_pct'] / 20)
        
        results.append({
            'params': params,
            'sharpe': metrics['sharpe_ratio'],
            'max_dd': metrics['max_drawdown_pct'],
            'win_rate': metrics['win_rate_pct'],
            'score': score,
        })
        
        if score > best_sharpe:
            best_sharpe = score
            best_params = params
    
    return {
        'best_params': best_params,
        'best_score': best_sharpe,
        'all_results': results,
    }
```

---

## 19. Ensemble Methods for Signal Aggregation

### 19.1 Weighted Voting Ensemble

```python
def weighted_signal_ensemble(agent_outputs: list[dict], 
                           agent_weights: dict[str, float]) -> dict:
    """
    Combine agent signals using weighted voting.
    """
    buy_score = 0
    sell_score = 0
    hold_score = 0
    total_weight = 0
    
    for output in agent_outputs:
        agent = output['agent_name']
        weight = agent_weights.get(agent, 1.0)
        
        if output['signal'] == 'buy':
            buy_score += weight * output['confidence']
        elif output['signal'] == 'sell':
            sell_score += weight * output['confidence']
        else:
            hold_score += weight * output['confidence']
        
        total_weight += weight
    
    # Normalize
    buy_score /= total_weight
    sell_score /= total_weight
    hold_score /= total_weight
    
    # Determine ensemble signal
    scores = {'buy': buy_score, 'sell': sell_score, 'hold': hold_score}
    ensemble_signal = max(scores, key=scores.get)
    ensemble_confidence = scores[ensemble_signal] * 100
    
    return {
        'signal': ensemble_signal,
        'confidence': ensemble_confidence,
        'scores': scores,
        'agent_weights_used': agent_weights,
    }
```

### 19.2 Dynamic Weighting (Performance-Based)

```python
def calculate_dynamic_weights(agent_performance: dict[str, dict],
                              lookback_days: int = 30) -> dict[str, float]:
    """
    Calculate agent weights based on recent performance.
    """
    weights = {}
    
    for agent, perf in agent_performance.items():
        # Weight proportional to recent accuracy
        accuracy = perf['win_rate_30d']
        # Penalize high variance
        variance = perf['confidence_variance_30d']
        
        weights[agent] = accuracy / (variance + 0.01)  # +0.01 to avoid div by zero
    
    # Normalize
    total = sum(weights.values())
    return {k: v / total for k, v in weights.items()}
```

### 19.3 Stacking Ensemble (Meta-Learner)

```python
from sklearn.ensemble import GradientBoostingClassifier

def train_meta_learner(agent_outputs_history: list[dict], 
                       actual_outcomes: list[bool]) -> GradientBoostingClassifier:
    """
    Train a meta-learner to combine agent outputs.
    
    Features: [agent1_confidence, agent1_signal_encoded, ...]
    Target: Did the trade win?
    """
    X = []
    y = actual_outcomes
    
    for outputs in agent_outputs_history:
        features = []
        for agent in ['fundamental', 'technical', 'sentiment', 'news']:
            agent_out = next((o for o in outputs if o['agent'] == agent), None)
            if agent_out:
                features.extend([
                    agent_out['confidence'],
                    1 if agent_out['signal'] == 'buy' else -1 if agent_out['signal'] == 'sell' else 0,
                ])
            else:
                features.extend([0, 0])
        X.append(features)
    
    meta_model = GradientBoostingClassifier(n_estimators=100, max_depth=3)
    meta_model.fit(X, y)
    
    return meta_model
```

---

## 20. Explainability Techniques

### 20.1 LLM Output Explainability

Since LLM agents are black boxes, we use:

| Technique | Application | Implementation |
|---|---|---|
| **Chain-of-thought prompting** | Show reasoning steps | Include "explain your reasoning" in prompts |
| **Structured output logging** | Traceable decisions | Log all intermediate outputs |
| **Attention visualization** | Identify important input tokens | Use attention weights (if available) |
| **Contrastive explanation** | Why Buy vs Hold? | Run counterfactual: "What would make this a Hold?" |
| **Feature ablation** | Which inputs matter most? | Remove features one at a time, measure output change |

### 20.2 Feature Ablation for Agent Sensitivity

```python
def ablation_study(agent, baseline_input: dict, n_trials: int = 5) -> dict:
    """
    Measure how removing each feature affects agent output.
    """
    baseline_output = agent.run(baseline_input)
    
    sensitivities = {}
    for feature in baseline_input.keys():
        perturbations = []
        for _ in range(n_trials):
            # Remove or randomize feature
            modified_input = {**baseline_input, feature: None}
            modified_output = agent.run(modified_input)
            
            # Measure output change
            change = abs(modified_output['confidence'] - baseline_output['confidence'])
            perturbations.append(change)
        
        sensitivities[feature] = {
            'mean_sensitivity': np.mean(perturbations),
            'std_sensitivity': np.std(perturbations),
        }
    
    return {
        'baseline_confidence': baseline_output['confidence'],
        'feature_sensitivities': sorted(sensitivities.items(), 
                                       key=lambda x: x[1]['mean_sensitivity'],
                                       reverse=True),
    }
```

### 20.3 User-Facing Explainability

Every signal must include:
1. **Top 3 reasons for the signal** (from agent outputs)
2. **Confidence breakdown** (per-agent contribution)
3. **Key risk factors** (from risk manager)
4. **What would change the signal** (counterfactual)
5. **Historical accuracy** of similar signals (from backtest)
6. **NSE circuit proximity** and **F&O OI signal** (if applicable)

---

*Co-Authored-By: Oz <oz-agent@warp.dev>*
