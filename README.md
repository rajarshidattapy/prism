# PRISM

> **The AI-native prediction market infrastructure and simulation engine built for the agentic economy.**

PRISM enables autonomous agents to **discover, analyze, trade, and launch prediction markets through a unified API**. By combining multi-exchange aggregation with verifiable multi-agent simulations, PRISM transforms fragmented human-native prediction markets into **agent-native financial infrastructure**.


Through a single intelligent interface, PRISM allows agents to:
* **Discover & Execute:** Route trades across Polymarket, Kalshi, and future integrations.
* **Prompt-to-Market:** Spin up custom Solana-based prediction markets using natural language (the `context create` API).
* **Simulate & Underwrite:** Utilize **MiroFish + OASIS** to run massive 1-million-agent simulations to predict event outcomes (e.g., crowd sentiment, market reactions).
* **Trade the Spread:** Create markets that bet on the delta between the AI's simulated prediction and the real-world outcome.

---

## The Problem

1.  **Fragmented Execution:** Every exchange has different APIs, orderbook formats, market schemas, and execution logic, making it impossible for autonomous agents to reason and trade natively.
2.  **Subjective Resolution Limits:** Current markets struggle with subjective events (e.g., "Will the public react negatively to this SEC policy?").
3.  **Lack of Verifiable Compute:** Agents cannot currently trust the outputs of other AI models on-chain without massive trust assumptions.

---

## The Solution

PRISM acts as an **AI-native market operating system** and **simulation underwriter**.

It combines:
* Unified market discovery and semantic matching.
* Autonomous trade execution via **ElizaOS**.
* Custom market creation on **Solana** via the Context CLI.
* Cryptographically verifiable agent simulations running on **Nosana GPUs**.
* Real-world resolution via decentralized NLP oracles (**Switchboard V3**).

---

## Core Features

### 1. Unified Trading Layer
Built on top of **PMXT**, providing a single abstraction layer for existing platforms.
```typescript
findMarket()
estimateProbability()
placeOrder()
monitorPnL()
```

### 2. Autonomous Agent Execution (ElizaOS v2)
The PRISM agent interprets natural language prompts, reasons over event probabilities, searches live markets, simulates trades, and auto-exits based on risk thresholds.

### 3. The "Context" API: Prompt-to-Market
Agents can dynamically spin up new markets on Solana using natural language. The Intent Engine parses the prompt and constructs the deterministic Solana transaction.
```bash
> prism create "Will real-world Farcaster sentiment match OASIS's 72% approval rating within 48 hours?"
Creating market...
Market PDA: PRiSM1111...3f2e | YES: 62% / NO: 38%
Oracle seeded, order book open
```

### 4. MiroFish Simulation Underwriter & Error Markets
Instead of just asking YES/NO questions, PRISM uses **MiroFish (OASIS)** to simulate 1 million AI agents reacting to a seed event. 
* **The Output:** "OASIS predicts 68% negative sentiment."
* **The Market:** "Will real-world sentiment deviate from the 68% OASIS benchmark by more than ±5%?"
Agents trade the spread between the simulation and reality. 

### 5. Multi-Agent Consensus Oracles
To resolve subjective "Simulation vs. Reality" markets, PRISM utilizes **Switchboard V3** to spin up a fleet of lightweight consensus agents that scrape X, Reddit, and Farcaster, run NLP sentiment analysis, and push the median score on-chain.

---

## Architecture Flow

```text
User/Agent Prompt
       ↓
Intent Parser Agent (ElizaOS)
       ↓
[Existing Market?] ──(YES)──> Unified Trading Abstraction (PMXT) ──> Polymarket/Kalshi
       ↓
     (NO)
       ↓
Market Generation Agent
       ↓
OASIS 1M Agent Simulation (Nosana GPU + TEE) ──> Attests baseline probability
       ↓
Solana Smart Contract (Anchor PDA Creation)
       ↓
Switchboard V3 NLP Scraper Agent (Resolution Oracle)
```

---

## Deep Nosana GPU Integration

PRISM relies heavily on **Nosana decentralized GPU infrastructure** for heavy, verifiable workloads, maximizing the challenge score:

* **The Simulation Engine:** Running the computationally massive **MiroFish/OASIS 1-million-agent matrix** requires intense GPU compute to generate the baseline prediction before the market opens.
* **Probability Inference:** Running deep-learning event probability models, confidence estimation, and volatility analysis.
* **High-Frequency Signal Processing:** Processing orderbook snapshots and sentiment feeds in real-time to adjust agent trading strategies.

---

## Tech Stack

* **Agent Framework:** ElizaOS v2
* **Compute:** Nosana
* **On-Chain Infra:** Solana, Anchor (Rust)
* **Oracles:** Switchboard V3
* **Simulation:** MiroFish, OASIS
* **Trading Abstraction:** PMXT, polyrec
* **Backend:** TypeScript / Node.js, Bun, Docker

---

## Local Setup

```bash
git clone https://github.com/rajarshidattapy/prism
cd prism

# One-shot setup (installs deps, configures solana devnet, builds anchor)
bash scripts/setup_local.sh

cp .env.example .env
# → Fill in ANTHROPIC_API_KEY, SOLANA_PRIVATE_KEY, POLYMARKET_API_KEY, etc.
```

Start services:
```bash
bun run dev:ui      # UI  → http://localhost:3000
bun run dev:agent   # Agent → http://localhost:3001
```

Run a simulation locally:
```bash
python simulation/scripts/run_matrix.py \
  --question "Will ETH break $5k before Q2 end?" \
  --context "ETF approved, institutional inflow strong" \
  --n_agents 10000

# Generate SHA-256 attestation for on-chain seeding
python simulation/scripts/generate_attestation.py
```

Run Anchor tests:
```bash
bun run test:anchor
```

---

## Docker & Nosana Deployment

Build and push the image:
```bash
docker build -t prism-agent .
docker push yourusername/prism-agent:latest
```

Deploy using Nosana CLI:
```bash
nosana job post \
  --file ./nos_job_def/prism_job.json \
  --market nvidia-4090
```

---

## Why PRISM Matters

PRISM transforms prediction markets from human-native UI playgrounds into **agent-native financial infrastructure**. By introducing verifiable multi-agent simulations as the base layer for new derivative markets, PRISM creates a closed-loop economy where AI agents act as the underwriters, the traders, and the judges. 

Built for the future of the agentic economy.

---

## Project Links & Core Team

* **Demo Video:** `< 1 min`
* **Live Nosana Deployment:** `Nosana deployment URL`
