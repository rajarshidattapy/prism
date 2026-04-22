Here is the comprehensive Product Requirements Document (PRD) for PRISM, tailored for an engineering team to execute. This replaces the "Context" terminology entirely and positions PRISM as the definitive agent-native infrastructure layer.

---

# Product Requirements Document (PRD): PRISM

**Status:** Draft / Active Development
**Target:** Nosana × ElizaOS Builders’ Challenge MVP
**Product Leads:** AI & Web3 Engineering Team (Team Kaizen)

## 1. Executive Summary
PRISM is the first AI-native prediction market infrastructure and simulation engine built strictly for the agentic economy. It transforms fragmented, human-centric prediction markets into a unified API and introduces a novel derivative: **Simulation vs. Reality Markets**. By leveraging decentralized GPU compute (Nosana) to run massive multi-agent simulations (MiroFish) before an event, PRISM allows autonomous agents (ElizaOS) to dynamically launch (`prism create`), trade, and resolve markets on Solana.

## 2. Problem Statement
Prediction markets today are fundamentally broken for autonomous actors:
1. **Human-Native UX Constraints:** Existing platforms (Polymarket, Kalshi) are fragmented. They possess disparate APIs, bespoke orderbook schemas, and restrictive UIs designed for human point-and-click interaction, preventing autonomous agents from natively reasoning, matching, and executing trades at scale.
2. **The Subjectivity Bottleneck:** Traditional crypto prediction markets struggle with highly subjective outcomes (e.g., "Will public sentiment turn negative?"). They rely on central arbiters or highly rigid objective data feeds (like chainlink price feeds).
3. **Unverifiable AI Underwriting:** While AI models can predict event outcomes, agents cannot trust off-chain, centralized AI predictions without massive trust assumptions. There is no verifiable way to prove an AI ran a specific model at a specific time to seed a market.

## 3. Why This Approach? (Rationale)
To build an agent-to-agent financial system, every layer of the stack must be optimized for autonomous interaction, verifiable compute, and high throughput.
* **ElizaOS (The Brain):** Provides the reasoning engine. Agents need persistent memory and tool-routing capabilities to interpret natural language intents, monitor live data, and execute complex trading logic without human intervention.
* **Solana & Anchor (The Settlement Layer):** Agent-driven markets require high-frequency micro-transactions and low latency. Solana’s throughput allows agents to trade dynamically and spin up Program Derived Addresses (PDAs) for custom markets instantly for fractions of a cent.
* **Nosana (The Verifiable Compute Engine):** Running a 1-million-agent simulation (OASIS/MiroFish) to predict sentiment is computationally massive. Nosana provides the decentralized GPU layer to execute these deep-learning workloads verifiably, ensuring the simulation results committed on-chain are legitimate and tamper-evident.
* **Switchboard V3 (The Resolution Layer):** Instead of relying on a centralized judge for subjective markets, Switchboard enables a fleet of lightweight consensus agents to run NLP sentiment analysis across X, Reddit, and Farcaster, aggregating a median score on-chain to trigger smart contract resolution securely.

## 4. Scope & Key Features (MVP)

### In-Scope (Hackathon Deliverables)
* **Unified Trading Abstraction (PMXT Integration):** Read/write API layer abstracting existing prediction markets for ElizaOS agents.
* **The PRISM CLI & Intent Engine:** The `prism create` natural language parser that triggers Solana transaction construction.
* **Simulation Underwriter (MiroFish + Nosana):** The pipeline to execute an OASIS matrix on Nosana GPUs and output a verifiable baseline prediction.
* **Solana Smart Contracts:** Anchor programs for custom market PDA initialization, conditional token minting, and basic AMM/liquidity logic.
* **Multi-Agent Resolution Oracle:** A Switchboard V3 integration where lightweight scraper agents settle "Simulation vs. Reality" markets.
* **Web Interface:** A sleek Next.js terminal-style dashboard for human monitoring of agent activity.

### Out-of-Scope (Post-MVP)
* Cross-chain market aggregation (e.g., bridging liquidity from Arbitrum-based Polymarket directly to Solana).
* Complex on-chain orderbook matching (starting with a simpler AMM/liquidity pool model for custom PRISM markets).

## 5. User Stories (Agent Workflows)

**Workflow 1: Market Discovery & Trading (The Arbitrage Agent)**
> *As an autonomous trading agent, I want to query PRISM for all active markets related to "Ethereum ETF", so that I can compare the probability edge of my internal model against Polymarket odds and execute a trade via the unified PMXT API.*

**Workflow 2: The "Prompt-to-Market" Initialization (The Architect Agent)**
> *As an AI architect agent monitoring global news, I detect a major regulatory shift. I use the command `prism create "Will real-world X sentiment match OASIS's 60% panic rating within 48 hours?"` to deploy a new Anchor PDA, mint conditional tokens, and open an order book on Solana.*

**Workflow 3: The Verifiable Simulation (The Underwriter Agent)**
> *As a Nosana-powered simulation agent, I receive a PRISM market request. I spin up a 1-million agent matrix (MiroFish) on a decentralized GPU, calculate the baseline probability, and post the cryptographically verified result on-chain to seed the market's initial odds.*

## 6. System Architecture

```text
[ Natural Language Intent ]
          │
          ▼
┌─────────────────────────────────────────┐
│        ElizaOS PRISM Agent              │
│  (Intent Parser, Strategy, Monitoring)  │
└─────────────────────────────────────────┘
          │                      │
   [ prism create ]        [ trade / monitor ]
          │                      │
          ▼                      ▼
┌──────────────────┐    ┌──────────────────┐
│ Nosana GPU Layer │    │ PMXT Abstraction │
│ (OASIS/MiroFish  │    │  (Polymarket /   │
│  Simulations)    │    │    Kalshi API)   │
└──────────────────┘    └──────────────────┘
          │                      │
  [Baseline Attestation]         │
          │                      │
          ▼                      ▼
┌─────────────────────────────────────────┐
│         Solana On-Chain Layer           │
│   (Anchor Programs, Conditional Tokens) │
└─────────────────────────────────────────┘
          ▲
          │ [Resolution Trigger]
          │
┌─────────────────────────────────────────┐
│     Switchboard V3 Oracle Network       │
│ (Multi-Agent NLP Consensus on off-chain │
│  data e.g., X, Farcaster, Reddit)       │
└─────────────────────────────────────────┘
```

## 7. Project Structure (Monorepo)

```text
prism/
├── anchor/                     # ⛓️ Solana Smart Contracts
│   ├── programs/
│   │   └── prism_markets/      # Core logic: PDA creation, SPL tokens, AMM logic
│   ├── tests/                  # Anchor TS tests
│   └── Anchor.toml             
│
├── agent/                      # 🧠 ElizaOS Environment
│   ├── characters/             # Agent persona configs (e.g., prism_orchestrator.json)
│   ├── plugins/                
│   │   ├── plugin-pmxt/        # Wrapper for Polymarket/Kalshi APIs
│   │   ├── plugin-prism/       # NLP parser to trigger Solana TXs ("prism create")
│   │   └── plugin-switchboard/ # Multi-agent NLP consensus logic
│   ├── src/                    
│   └── agent.ts                # Main ElizaOS entry point
│
├── simulation/                 # 🐠 MiroFish & OASIS Underwriter
│   ├── scripts/                # Execution scripts for the 1M agent matrix
│   ├── models/                 # Sentiment parsers
│   └── outputs/                # Local cache before on-chain commitment
│
├── web/                        # 🌐 Frontend Application
│   ├── app/                    # Next.js App Router 
│   ├── components/             # React/Tailwind components (Terminal UI)
│   ├── hooks/                  # Solana wallet & RPC hooks
│   └── lib/                    
│
├── nos_job_def/                # ☁️ Nosana Compute Configurations
│   ├── prism_agent.json        # Manifest for the 24/7 ElizaOS agent
│   └── oasis_simulation.json   # High-GPU manifest for the MiroFish run
│
├── scripts/                    # Deployment scripts
├── .env.example                
├── bun.lockb                   
├── package.json                
└── README.md                   
```

## 8. Success Metrics (KPIs for MVP)
1. **End-to-End Latency:** Time from a `prism create` prompt to the confirmed creation of an Anchor PDA on Solana devnet (Target: < 5 seconds).
2. **Simulation Verifiability:** Successful execution of the MiroFish container on a Nosana node, culminating in a verifiable hash posted to Solana.
3. **Agent Autonomy:** Demonstrated ability of an ElizaOS agent to continuously monitor a live PRISM market and execute an auto-exit based on pre-defined PnL or volatility thresholds without human intervention.