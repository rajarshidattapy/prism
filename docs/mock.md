You are auditing and upgrading the PRISM project into a fully real, production-grade devnet implementation.

PROJECT:
PRISM = AI-native prediction market infra powered by ElizaOS agents + MiroFish OASIS simulations + Solana Anchor program + Switchboard oracle flow.

Current issue:
The project contains too many mocks, fake responses, demo placeholders, fallback-only logic, and simulated UI behavior.
I want a REAL end-to-end working system on Solana devnet with minimal fake logic.

YOUR TASK:
Remove all unnecessary mocks, fake flows, placeholder data, demo states, and non-functional abstractions.

CRITICAL GOALS:
1. Everything should be real and functional
2. Everything should run on Solana devnet
3. No fake market creation
4. No fake simulation hashes
5. No fake terminal responses
6. No mock market dashboard data
7. No fake oracle resolution
8. No placeholder API responses
9. No “coming soon” implementation placeholders
10. No demo-only UI pretending backend exists

BUT IMPORTANT CONSTRAINT:
Keep OpenAI/API costs extremely low.

Budget target:
Absolute max total testing cost = $2
Preferred = under $1

This means:
- aggressively reduce unnecessary LLM calls
- use deterministic/statistical fallback where possible
- use gpt-4o-mini only where strictly required
- never use expensive models
- cache outputs aggressively
- avoid repeated simulation calls during UI testing
- create local reusable fixtures only for development validation (not production mocks)
- only call OpenAI when true simulation/oracle logic is required

DO NOT:
- rebuild entire architecture from scratch
- replace the core PRISM concept
- over-engineer infra
- add unnecessary complexity
- introduce expensive infra dependencies

DO:
- preserve the current architecture
- fix what is fake
- connect real flows
- make all critical paths functional

REQUIRED AUDIT:
First perform a full project audit and identify:
- every mocked component
- every fake response
- every placeholder implementation
- every broken devnet flow
- every UI pretending backend exists
- every fake Solana interaction
- every fake oracle path
- every hardcoded market state
- every fallback pretending to be production

Then produce:

PHASE 1:
Mock Removal Report

PHASE 2:
Implementation Plan prioritized by:
P0 = must fix now
P1 = should fix next
P2 = optional improvements

PHASE 3:
Actually implement the fixes directly in code

STRICT REQUIREMENTS:

SOLANA:
- real PDA creation
- real Anchor interactions
- real devnet deployment flow
- real wallet integration
- real transaction confirmation
- real on-chain simulation hash commitment

BACKEND:
- real simulation pipeline
- minimal-cost OASIS execution
- proper SHA-256 attestation generation
- proper persistence of simulation outputs
- no fake “success” responses

UI:
- dashboard must reflect real state
- terminal must call real agent actions
- no hardcoded market cards
- no fake “market created successfully”
- proper loading/error states

AGENT:
- prism create must actually execute
- prism oracle must actually execute
- prism search must use real data
- prism status must reflect actual state

SWITCHBOARD / RESOLUTION:
- use real oracle integration where feasible
- if full oracle infra is too heavy for hackathon scope,
  implement a clean temporary real-data resolver
  (Twitter/Reddit/Farcaster aggregation pipeline)
  but NOT fake mocked outputs

IMPORTANT:
If a part cannot be fully productionized within reasonable hackathon scope,
replace it with the most real minimal implementation possible,
NOT a mock.

FINAL DELIVERABLE:
A genuinely working devnet MVP that can be demoed honestly without fake internals.

Your job is not to make it look real.
Your job is to make it actually real.

Start with the audit first.
Do not skip directly to code.