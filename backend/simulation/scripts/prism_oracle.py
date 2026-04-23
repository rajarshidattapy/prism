"""
PRISM Oracle Pipeline

Bridges MiroFish/OASIS with PRISM prediction markets.

Flow:
  1. Accept a prediction market question + context
  2. Run a MiroFish simulation (OASIS agents on virtual Twitter/Reddit)
  3. Interview all agents post-simulation: "Does this event match the threshold?"
  4. Analyze both interview responses and agent post content
  5. Generate SHA-256 attestation of the probability
  6. Output: { yes_probability, yes_basis_points, simulation_hash, simulation_id }

The attestation is passed to Solana's `seed_simulation_result(hash, bps)`.

Usage:
    # With live MiroFish backend (recommended):
    python simulation/scripts/prism_oracle.py \\
        --question "Will 60%+ of Twitter users react negatively to Policy X?" \\
        --context "Government announces new crypto tax legislation" \\
        --graph-id <zep_graph_id> \\
        --project-id prism-oracle \\
        --platform reddit \\
        --rounds 5

    # Fallback (no MiroFish backend — uses stub simulation):
    python simulation/scripts/prism_oracle.py \\
        --question "Will ETH break $5k?" \\
        --context "ETF approved" \\
        --fallback
"""

import argparse
import hashlib
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

# Path setup — ROOT = prism/ so "backend.simulation.*" imports resolve correctly
ROOT = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(ROOT))

from backend.simulation.models.sentiment_parser import parse_score, score_to_probability
from backend.simulation.scripts.analyze_actions import aggregate_oracle_probability
from backend.simulation.scripts.generate_attestation import generate_attestation

try:
    import backend.simulation.mirofish_client as mf
    MIROFISH_AVAILABLE = True
except ImportError:
    MIROFISH_AVAILABLE = False


OUTPUTS_DIR = ROOT / "outputs"
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)


# ── Interview prompt ──────────────────────────────────────────────────────────

def build_interview_prompt(question: str) -> str:
    """
    Ask agents whether the prediction market outcome (YES) will happen.
    Must elicit a clear YES/NO + confidence from each LLM agent.
    """
    return (
        f"Based on your persona, beliefs, and all information you've encountered "
        f"during this simulation, answer the following prediction:\n\n"
        f"'{question}'\n\n"
        f"Respond with: YES or NO, followed by your confidence percentage (e.g. 'YES, 75% confident'). "
        f"Then briefly explain your reasoning in 2-3 sentences."
    )


# ── MiroFish pipeline ─────────────────────────────────────────────────────────

def run_mirofish_oracle(
    question: str,
    context: str,
    graph_id: str,
    project_id: str = "prism-oracle",
    platform: str = "reddit",
    max_rounds: int = 5,
    use_llm_profiles: bool = True,
) -> dict[str, Any]:
    """
    Full MiroFish oracle pipeline using the live backend.

    Requires miro_backend running on port 5001 with a valid Zep graph.
    """
    print(f"\n[PRISM Oracle] Starting MiroFish simulation")
    print(f"  Question : {question}")
    print(f"  Context  : {context}")
    print(f"  Graph ID : {graph_id}")
    print(f"  Platform : {platform} | Max rounds: {max_rounds}")

    # ── Step 1: Create simulation ──────────────────────────────────────────────
    print("\n[1/5] Creating simulation...")
    enable_twitter = platform in ("twitter", "parallel")
    enable_reddit = platform in ("reddit", "parallel")
    simulation_id = mf.create_simulation(
        project_id=project_id,
        graph_id=graph_id,
        enable_twitter=enable_twitter,
        enable_reddit=enable_reddit,
    )
    print(f"  Simulation ID: {simulation_id}")

    # ── Step 2: Prepare (generate profiles + config) ──────────────────────────
    print("\n[2/5] Preparing agent profiles from Zep graph (this may take a few minutes)...")
    simulation_requirement = (
        f"Simulate how agents react to the following event and assess the probability "
        f"of the following outcome:\n\nQuestion: {question}\n\nContext: {context}\n\n"
        f"Focus on whether agents would consider the stated outcome (YES condition) "
        f"as likely or unlikely based on their personas and beliefs."
    )
    mf.prepare_simulation(
        simulation_id=simulation_id,
        simulation_requirement=simulation_requirement,
        document_text=context,
        use_llm_for_profiles=use_llm_profiles,
    )
    print("  Profiles generated and config saved.")

    # ── Step 3: Run simulation ─────────────────────────────────────────────────
    print(f"\n[3/5] Starting OASIS simulation ({platform}, {max_rounds} rounds)...")
    mf.start_simulation(simulation_id, platform=platform, max_rounds=max_rounds)

    def progress_cb(state: dict):
        r = state.get("current_round", 0)
        total = state.get("total_rounds", max_rounds)
        tw = state.get("twitter_actions_count", 0)
        rd = state.get("reddit_actions_count", 0)
        print(f"  Round {r}/{total} | Twitter actions: {tw} | Reddit actions: {rd}", end="\r")

    final_state = mf.wait_for_completion(
        simulation_id,
        poll_interval=5,
        max_wait=3600,
        on_progress=progress_cb,
    )
    print(f"\n  Simulation finished. Status: {final_state.get('runner_status')}")
    total_actions = final_state.get("total_actions_count", 0)
    print(f"  Total agent actions: {total_actions}")

    # ── Step 4: Interview all agents ──────────────────────────────────────────
    print("\n[4/5] Interviewing all agents...")
    interview_prompt = build_interview_prompt(question)

    interview_result = None
    try:
        interview_result = mf.interview_all_agents(
            simulation_id=simulation_id,
            prompt=interview_prompt,
            platform=platform if platform != "parallel" else None,
            timeout=180,
        )
        n_agents = interview_result.get("interviews_count", "?")
        print(f"  Received responses from {n_agents} agents.")
    except Exception as e:
        print(f"  Interview failed (will rely on post analysis): {e}")

    # ── Step 5: Analyze results ────────────────────────────────────────────────
    print("\n[5/5] Analyzing agent responses and post content...")

    # Find actions.jsonl paths
    sim_data_dir = Path("miro_backend/uploads/simulations") / simulation_id
    twitter_path = str(sim_data_dir / "twitter" / "actions.jsonl") if enable_twitter else None
    reddit_path = str(sim_data_dir / "reddit" / "actions.jsonl") if enable_reddit else None

    oracle = aggregate_oracle_probability(
        interview_result=interview_result,
        twitter_actions_path=twitter_path,
        reddit_actions_path=reddit_path,
    )

    result = _finalize_oracle_result(
        question=question,
        context=context,
        oracle=oracle,
        simulation_id=simulation_id,
        n_agents=total_actions,
        platform=platform,
    )

    return result


# ── Fallback pipeline (no MiroFish backend) ───────────────────────────────────

def run_fallback_oracle(
    question: str,
    context: str,
    n_agents: int = 10000,
) -> dict[str, Any]:
    """
    Fallback oracle using the statistical persona simulation.
    Used when MiroFish backend is unavailable.
    """
    print("\n[PRISM Oracle] MiroFish backend not available — using statistical fallback")

    # Import here to avoid circular deps
    from backend.simulation.scripts.run_matrix import run_matrix

    matrix_result = run_matrix(question, context, n_agents)

    oracle = {
        "yes_probability": matrix_result["yes_probability"],
        "yes_basis_points": matrix_result["yes_basis_points"],
        "no_basis_points": matrix_result["no_basis_points"],
        "details": {"fallback": True, "persona_breakdown": matrix_result["persona_breakdown"]},
    }

    return _finalize_oracle_result(
        question=question,
        context=context,
        oracle=oracle,
        simulation_id=f"fallback-{int(time.time())}",
        n_agents=n_agents,
        platform="statistical",
    )


# ── Shared finalization ───────────────────────────────────────────────────────

def _finalize_oracle_result(
    question: str,
    context: str,
    oracle: dict,
    simulation_id: str,
    n_agents: int,
    platform: str,
) -> dict[str, Any]:
    """Compute attestation hash and build the final oracle report."""

    yes_probability = oracle["yes_probability"]
    yes_basis_points = oracle["yes_basis_points"]

    # Deterministic hash of the oracle output
    hashable = {
        "question": question,
        "context": context,
        "yes_probability": yes_probability,
        "yes_basis_points": yes_basis_points,
        "simulation_id": simulation_id,
        "platform": platform,
    }
    payload = json.dumps(hashable, sort_keys=True, separators=(",", ":")).encode("utf-8")
    sha256 = hashlib.sha256(payload).hexdigest()
    hash_bytes = list(bytes.fromhex(sha256))  # [u8; 32] for on-chain

    result = {
        "question": question,
        "context": context,
        "simulation_id": simulation_id,
        "platform": platform,
        "n_agents": n_agents,
        "yes_probability": yes_probability,
        "yes_basis_points": yes_basis_points,
        "no_basis_points": 10000 - yes_basis_points,
        "simulation_hash": sha256,
        "hash_bytes": hash_bytes,
        "oracle_details": oracle.get("details", {}),
        "timestamp": int(time.time()),
    }

    # Save to outputs
    out_path = OUTPUTS_DIR / f"oracle_{result['timestamp']}.json"
    out_path.write_text(json.dumps(result, indent=2))

    print(f"\n{'='*60}")
    print(f"[PRISM Oracle] Result:")
    print(f"  YES probability : {yes_probability:.3f} ({yes_basis_points} bps)")
    print(f"  NO  probability : {1-yes_probability:.3f} ({10000-yes_basis_points} bps)")
    print(f"  SHA-256 hash    : {sha256[:16]}...")
    print(f"  Output saved    : {out_path}")
    print(f"\n  On-chain call:")
    print(f"    seed_simulation_result(")
    print(f"      simulation_hash = {hash_bytes[:4]}...{hash_bytes[-4:]},")
    print(f"      yes_probability = {yes_basis_points},")
    print(f"    )")
    print(f"{'='*60}\n")

    return result


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PRISM Oracle — MiroFish prediction market underwriter")
    parser.add_argument("--question", required=True, help="The prediction market question")
    parser.add_argument("--context", default="", help="Background context / seed event description")
    parser.add_argument("--graph-id", default="", help="Zep graph ID (required for live MiroFish)")
    parser.add_argument("--project-id", default="prism-oracle", help="MiroFish project ID")
    parser.add_argument("--platform", default="reddit", choices=["twitter", "reddit", "parallel"])
    parser.add_argument("--rounds", type=int, default=5, help="OASIS simulation rounds")
    parser.add_argument("--fallback", action="store_true", help="Force statistical fallback mode")
    parser.add_argument("--n-agents", type=int, default=10000, help="Agents for fallback mode")
    args = parser.parse_args()

    use_fallback = args.fallback

    if not use_fallback and MIROFISH_AVAILABLE:
        try:
            alive = mf.is_alive()
        except Exception:
            alive = False

        if not alive:
            print("[PRISM Oracle] MiroFish backend not reachable — switching to fallback mode")
            print("  Start it with: cd miro_backend && python run.py\n")
            use_fallback = True
        elif not args.graph_id:
            print("[PRISM Oracle] --graph-id required for live MiroFish. Switching to fallback.")
            use_fallback = True

    if use_fallback:
        result = run_fallback_oracle(args.question, args.context, args.n_agents)
    else:
        result = run_mirofish_oracle(
            question=args.question,
            context=args.context,
            graph_id=args.graph_id,
            project_id=args.project_id,
            platform=args.platform,
            max_rounds=args.rounds,
        )

    print(json.dumps(result, indent=2))
