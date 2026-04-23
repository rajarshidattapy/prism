#!/bin/bash
set -e

echo ""
echo "◈ PRISM — Local Development Setup"
echo "──────────────────────────────────"
echo ""

# ── Prerequisites check ───────────────────────────────────────────────────────
command -v bun   >/dev/null 2>&1 || { echo "❌ bun not found — install at https://bun.sh"; exit 1; }
command -v anchor >/dev/null 2>&1 || echo "⚠️  anchor not found — Solana program won't build (install: https://www.anchor-lang.com)"
command -v solana >/dev/null 2>&1 || echo "⚠️  solana CLI not found — install at https://docs.solana.com/cli/install-solana-cli-tools"
command -v python3 >/dev/null 2>&1 || echo "⚠️  python3 not found — simulation layer won't run"

echo "✓ Prerequisites checked"

# ── Environment ───────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✓ Created .env from .env.example — fill in your API keys"
else
  echo "✓ .env already exists"
fi

# ── Install JS dependencies ───────────────────────────────────────────────────
echo ""
echo "Installing JS dependencies..."
bun install
echo "✓ bun install complete"

# ── Solana devnet airdrop ─────────────────────────────────────────────────────
if command -v solana >/dev/null 2>&1; then
  echo ""
  echo "Configuring Solana CLI for devnet..."
  solana config set --url devnet
  solana airdrop 2 2>/dev/null && echo "✓ Airdropped 2 SOL to local keypair" || echo "⚠️  Airdrop failed (rate limited — try manually)"
fi

# ── Anchor build ─────────────────────────────────────────────────────────────
if command -v anchor >/dev/null 2>&1; then
  echo ""
  echo "Building Anchor program..."
  cd anchor && anchor build && cd ..
  echo "✓ Anchor build complete"
fi

# ── Python deps ──────────────────────────────────────────────────────────────
if command -v python3 >/dev/null 2>&1; then
  echo ""
  echo "Checking Python simulation deps..."
  python3 -c "import hashlib, json, argparse, pathlib, time, random" 2>/dev/null && \
    echo "✓ Python stdlib deps OK (no extra installs needed for MVP)" || \
    echo "⚠️  Python stdlib check failed"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "──────────────────────────────────────────────"
echo "✅  PRISM local environment ready!"
echo ""
echo "  Start UI:      bun run dev:ui"
echo "  Start Agent:   bun run dev:agent"
echo "  Run simulation: bun run sim:run -- --question \"...\" --context \"...\""
echo "  Run tests:     bun run test:anchor"
echo "──────────────────────────────────────────────"
echo ""
