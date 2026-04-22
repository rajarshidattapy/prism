"""
MiroFish OASIS Matrix Runner
Simulates N agents across persona archetypes to generate a baseline YES probability
for a PRISM prediction market question.

Usage:
    python simulation/scripts/run_matrix.py \
        --question "Will ETH break $5k before end of Q2?" \
        --n_agents 10000 \
        --context "ETF approved, institutional inflow strong"
"""

import argparse
import json
import random
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from models.sentiment_parser import parse_score, score_to_probability

OUTPUTS_DIR = Path(__file__).parent.parent / "outputs"
PROMPTS_PATH = Path(__file__).parent.parent / "models" / "agent_prompts.json"


def load_personas() -> list[dict]:
    return json.loads(PROMPTS_PATH.read_text())["personas"]


def simulate_agent(persona: dict, question: str, context: str, noise: float) -> float:
    """
    Simulate a single agent's YES probability given their persona bias.
    Returns a value in [0, 1].
    """
    context_score = parse_score(context)
    question_score = parse_score(question)

    # Combine question signal + context signal + persona bias + noise
    raw = (
        question_score * 0.3
        + context_score * 0.4
        + persona["bias"] * 0.2
        + random.gauss(0, noise) * 0.1
    )
    return score_to_probability(raw)


def run_matrix(question: str, context: str, n_agents: int, noise: float = 0.15) -> dict:
    personas = load_personas()
    total_yes_weight = 0.0
    total_weight = 0.0
    agent_results = []

    print(f"[MiroFish] Running {n_agents:,} agent simulation...")
    print(f"[MiroFish] Question: {question}")
    print(f"[MiroFish] Context:  {context}\n")

    start = time.time()

    for persona in personas:
        # Allocate agents proportionally to persona weight
        n = max(1, int(n_agents * persona["weight"]))
        persona_yes_sum = 0.0

        for _ in range(n):
            p = simulate_agent(persona, question, context, noise)
            persona_yes_sum += p

        avg_yes = persona_yes_sum / n
        total_yes_weight += avg_yes * persona["weight"]
        total_weight += persona["weight"]

        agent_results.append({
            "persona": persona["id"],
            "n_agents": n,
            "avg_yes_probability": round(avg_yes, 4),
        })
        print(f"  [{persona['name']}] n={n:,} | avg YES prob: {avg_yes:.3f}")

    elapsed = time.time() - start
    yes_probability = total_yes_weight / total_weight
    yes_basis_points = int(yes_probability * 10000)

    result = {
        "question": question,
        "context": context,
        "n_agents": n_agents,
        "yes_probability": round(yes_probability, 4),
        "yes_basis_points": yes_basis_points,
        "no_basis_points": 10000 - yes_basis_points,
        "elapsed_seconds": round(elapsed, 2),
        "persona_breakdown": agent_results,
        "timestamp": int(time.time()),
    }

    print(f"\n[MiroFish] Simulation complete in {elapsed:.2f}s")
    print(f"[MiroFish] Result: YES {yes_probability:.3f} ({yes_basis_points} bps) | NO {1-yes_probability:.3f}")

    # Persist output
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUTPUTS_DIR / f"result_{result['timestamp']}.json"
    out_path.write_text(json.dumps(result, indent=2))
    print(f"[MiroFish] Output saved: {out_path}")

    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MiroFish OASIS Matrix Runner")
    parser.add_argument("--question", required=True, help="The prediction market question")
    parser.add_argument("--context", default="", help="Current market context / news")
    parser.add_argument("--n_agents", type=int, default=10000, help="Number of agents to simulate")
    parser.add_argument("--noise", type=float, default=0.15, help="Agent noise factor (0-1)")
    args = parser.parse_args()

    result = run_matrix(args.question, args.context, args.n_agents, args.noise)
    print(json.dumps(result, indent=2))
