# ── Stage 1: Agent build ──────────────────────────────────────────────────────
FROM oven/bun:1.1 AS agent-builder

WORKDIR /app
COPY package.json bun.lockb ./
COPY agent/package.json ./agent/
COPY agent/plugins/plugin-pmxt/package.json ./agent/plugins/plugin-pmxt/
COPY agent/plugins/plugin-prism/package.json ./agent/plugins/plugin-prism/
COPY agent/plugins/plugin-switchboard/package.json ./agent/plugins/plugin-switchboard/

RUN bun install --frozen-lockfile

COPY agent/ ./agent/

WORKDIR /app/agent
RUN bun build agent.ts --outdir dist --target node

# ── Stage 2: Agent runtime ─────────────────────────────────────────────────────
FROM oven/bun:1.1-slim AS agent

WORKDIR /app
COPY --from=agent-builder /app/agent/dist ./dist
COPY --from=agent-builder /app/agent/characters ./characters
COPY --from=agent-builder /app/node_modules ./node_modules

EXPOSE 3001
CMD ["bun", "dist/agent.js"]

# ── Stage 3: Simulation ───────────────────────────────────────────────────────
FROM python:3.11-slim AS simulation

WORKDIR /app
COPY simulation/ ./simulation/

# No extra deps needed for MVP (stdlib only)
CMD ["python", "simulation/scripts/run_matrix.py", "--help"]
