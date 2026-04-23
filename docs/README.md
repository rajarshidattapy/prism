# PRISM

**AI-native prediction market infrastructure powered by MiroFish backed ElizaOS agents on Solana.**

PRISM lets autonomous agents discover, simulate, and launch prediction markets through a single terminal interface. The core idea: run a million-agent OASIS simulation *before* a real-world event, commit the result on-chain, and create a market that bets on whether reality matches the simulation.

---

## How it works

```
User types: prism create "Will crypto sentiment turn bearish after the Fed rate hike?"
                              ↓
              ElizaOS agent (plugin-prism) parses intent
                              ↓
              MiroFish backend runs OASIS simulation
              (N synthetic agents react to seed event)
                              ↓
              SHA-256 hash of result committed on-chain
              (tamper-evident — done before real event)
                              ↓
              Solana PDA derived: market is live
              YES bps seeded from simulation probability
```

Markets resolve against real-world data aggregated by Switchboard V3 oracles (Twitter, Reddit, Farcaster).

---

## Repo structure

```
prism/
├── agent/                  # ElizaOS agent (port 3001)
│   ├── agent.ts            # runtime entry point
│   ├── characters/         # PRISM Orchestrator persona
│   ├── plugins/
│   │   ├── plugin-pmxt/    # Polymarket + Kalshi aggregator
│   │   ├── plugin-prism/   # market creation + oracle pipeline
│   │   └── plugin-switchboard/  # NLP consensus oracle
│   └── src/                # actions, evaluators, providers
│
├── backend/                # MiroFish OASIS backend (port 5001)
│   ├── app/                # Flask API
│   ├── simulation/
│   │   ├── scripts/        # prism_oracle.py, run_matrix.py, analyze_actions.py
│   │   ├── models/         # sentiment_parser.py, agent_prompts.json
│   │   └── mirofish_client.py
│   └── locales/            # i18n strings
│
├── ui/                     # Next.js dashboard (port 3000)
│   ├── app/                # Terminal, Markets, Simulation tabs
│   ├── components/         # TerminalUI, MarketDashboard
│   ├── hooks/              # useSolanaWallet, usePrismMarket
│   └── lib/                # pmxt-client, utils
│
├── anchor/                 # Solana program (Rust/Anchor)
│   └── programs/prism_markets/
│
├── nosana/                 # Nosana GPU job definitions
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── oasis_simulation.json
│   └── prism_agent.json
│
└── polymarket/             # Standalone Polymarket UI (Vite/React)
```

---

## Quickstart

### Prerequisites

- Node 22+, Bun 1.3+
- Python 3.11 (required for `camel-oasis` — Python 3.14 won't work)
- `py -3.11` available on Windows

### 1. Install JS dependencies

```bash
bun install
```

### 2. Configure environment

```bash
# Agent env (minimum required)
cp .env.example agent/.env
# Edit agent/.env and set OPENAI_API_KEY=sk-...

# Backend env (for live OASIS simulations)
# Edit backend/.env and set:
#   LLM_API_KEY=sk-...
#   LLM_BASE_URL=https://api.openai.com/v1
#   LLM_MODEL_NAME=gpt-4o-mini
#   ZEP_API_KEY=...   (get free key at getzep.com)
```

### 3. Start services

Open 3 terminals:

```bash
# Terminal 1 — UI
bun run dev:ui
# → http://localhost:3000

# Terminal 2 — ElizaOS agent
bun run dev:agent
# → http://localhost:3001

# Terminal 3 — MiroFish backend (needs Python 3.11 venv)
cd backend && venv311/Scripts/python.exe run.py
# → http://localhost:5001
```

The UI runs standalone with mock data even without the agent or backend.

---

## Terminal commands

With the agent running, type in the **Terminal tab** at `localhost:3000`:

| Command | What it does |
|---------|-------------|
| `prism create "question"` | Run oracle simulation → derive Solana PDA → seed market odds |
| `prism search <query>` | Search live Polymarket + Kalshi markets |
| `prism oracle <topic>` | Run Switchboard NLP consensus |
| `prism status` | Show agent health and active markets |
| `help` | List all commands |
| `clear` | Clear terminal output |

---

## Run simulations directly

No API keys needed — statistical fallback works immediately:

```bash
# Fallback oracle (no keys, instant)
python backend/simulation/scripts/prism_oracle.py \
  --question "Will ETH break $5k before Q2 end?" \
  --context "Spot ETH ETF approved, institutional inflow strong" \
  --fallback

# Live OASIS oracle (needs backend running + Zep graph ID)
python backend/simulation/scripts/prism_oracle.py \
  --question "Will 60%+ react negatively to the new crypto tax?" \
  --context "Government proposes 30% capital gains tax" \
  --graph-id YOUR_ZEP_GRAPH_ID \
  --platform reddit \
  --rounds 5
```

Output includes a SHA-256 attestation hash and the exact `seed_simulation_result(hash, bps)` call for on-chain commitment.

---

## Solana program (optional for demo)

Markets derive PDAs and attestations work without on-chain deployment. To deploy:

```bash
# Install Solana + Anchor (PowerShell as admin)
winget install Solana.Solana
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install latest && avm use latest

# Deploy to devnet
solana config set --url devnet
solana-keygen new --outfile ~/.config/solana/id.json
solana airdrop 2
cd anchor && anchor build && anchor deploy
```

---

## Key env variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `OPENAI_API_KEY` | `agent/.env` | ElizaOS agent LLM |
| `SOLANA_PRIVATE_KEY` | `agent/.env` | On-chain writes (base58) |
| `MIROFISH_GRAPH_ID` | `agent/.env` | Zep graph for live OASIS (leave blank for fallback) |
| `LLM_API_KEY` | `backend/.env` | MiroFish agent LLMs |
| `ZEP_API_KEY` | `backend/.env` | Agent persona memory |

Full reference: `.env.example`

---

