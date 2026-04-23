Installed: Node v22, Bun 1.3.6, Python 3.14, Flask, OpenAI SDK                                                                                                                                    
  Missing: camel-oasis, zep-cloud, JS node_modules, API keys in .env, Solana/Anchor CLI                                                                                                             
                                                                                                                                                                                                    
  ---                                                                                                                                                                                               
  Getting the app running — in order of difficulty          

  Layer 1: UI dashboard (5 min, no API keys needed)

  cd ui
  bun install
  bun dev
  # → http://localhost:3000

  The UI runs standalone with mock market data. You'll see the Terminal, Markets, and Simulation tabs. Nothing breaks without a wallet or agent connected.

  ---
  Layer 2: MiroFish backend (15 min, needs 2 API keys)

  This is the OASIS simulation engine. You need:
  - LLM_API_KEY — any OpenAI-compatible key (OpenAI, Together, Groq, etc.)
  - ZEP_API_KEY — from https://www.getzep.com (free tier available)

  ▎ ⚠️  Python 3.14 may break camel-oasis. If you hit issues, use Python 3.11 via py -3.11 or a venv.

  # Create the .env for miro_backend
  cd miro_backend
  echo LLM_API_KEY=sk-your-key-here >> .env
  echo LLM_BASE_URL=https://api.openai.com/v1 >> .env
  echo LLM_MODEL_NAME=gpt-4o-mini >> .env
  echo ZEP_API_KEY=your-zep-key-here >> .env

  # Install Python deps (use the venv that's already there)
  .\venv\Scripts\pip install -r requirements.txt   # Windows
  # or: source venv/bin/activate && pip install -r requirements.txt

  python run.py
  # → http://localhost:5001

  Once it's up, the simulation oracle works with live OASIS agents (not just the statistical fallback).

  ---
  Layer 3: ElizaOS agent (20 min, needs OpenAI key)

  # Root .env
  echo OPENAI_API_KEY=sk-your-key >> .env
  echo SOLANA_RPC_URL=https://api.devnet.solana.com >> .env

  # Install all JS deps from root
  bun install

  # Start the agent
  bun run dev:agent
  # → http://localhost:3001

  Once the agent is running, the Terminal tab in the UI sends commands to it — prism create "..." will trigger the MiroFish oracle pipeline + derive a Solana PDA.

  ---
  Layer 4: Simulation scripts (works now, no setup)

  These work right now with what you have:

  # Statistical oracle (fallback — no API keys needed)
  python simulation/scripts/prism_oracle.py \
    --question "Will crypto sentiment turn bearish after the tax announcement?" \
    --context "Government proposes 30% capital gains tax on crypto" \
    --fallback

  # Live MiroFish oracle (needs miro_backend running + a Zep graph ID)
  python simulation/scripts/prism_oracle.py \
    --question "Will 60%+ react negatively?" \
    --context "New crypto tax policy announced" \
    --graph-id YOUR_ZEP_GRAPH_ID \
    --platform reddit \
    --rounds 5

  ---
  Layer 5: Solana program (30+ min, needs Anchor CLI)

  This is the on-chain settlement layer. Skip for now if you just want to demo — the UI and agent work without it (PDAs are derived but not actually written on-chain).

  # Install Solana + Anchor (run in PowerShell as admin)
  winget install Solana.Solana
  # Then restart terminal, then:
  cargo install --git https://github.com/coral-xyz/anchor avm --locked
  avm install latest && avm use latest

  # Deploy to devnet
  solana config set --url devnet
  solana-keygen new --outfile ~/.config/solana/id.json
  solana airdrop 2

  cd anchor
  anchor build
  anchor deploy

  ---
  Recommended start order

  Open 4 terminals and run these in order:

  # Terminal 1 — UI
  cd ui && bun install && bun dev

  # Terminal 2 — MiroFish (after filling .env)
  cd miro_backend && python run.py

  # Terminal 3 — ElizaOS agent (after bun install at root)
  bun run dev:agent

  # Terminal 4 — test the oracle manually
  python simulation/scripts/prism_oracle.py \
    --question "Will ETH break $5k before Q2?" \
    --context "Spot ETH ETF approved, institutional inflow strong" \
    --fallback

  The minimum viable demo is Terminal 1 + Terminal 4 — the UI shows the dashboard and you can run simulations with verifiable attestation hashes, all without any API keys.