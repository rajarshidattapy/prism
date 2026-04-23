"""
OASIS Actions Analyzer — PRISM Oracle Layer

Reads OASIS actions.jsonl files (produced by miro_backend simulation runner)
and extracts a YES probability for a prediction market question.

Two sources:
1. Agent interview responses (structured YES/NO answers)
2. Agent post content (CREATE_POST actions analyzed by sentiment parser)

The combined score is the market's MiroFish-derived initial odds.
"""

import json
import re
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).parent.parent))
from backend.simulation.models.sentiment_parser import parse_score, score_to_probability


# ── Interview response parser ─────────────────────────────────────────────────

def _parse_interview_response(text: str) -> float | None:
    """
    Extract YES probability from an agent's interview response.
    Returns 0.0–1.0 or None if unparseable.
    """
    t = text.strip().lower()

    # Explicit YES / NO
    if re.search(r"\byes\b", t):
        # Look for a percentage qualifier
        m = re.search(r"(\d{1,3})\s*%", t)
        return float(m.group(1)) / 100 if m else 0.85

    if re.search(r"\bno\b", t):
        m = re.search(r"(\d{1,3})\s*%", t)
        return 1.0 - float(m.group(1)) / 100 if m else 0.15

    # Numeric probability embedded in text
    m = re.search(r"probability.*?(\d{1,3})\s*%", t)
    if m:
        return float(m.group(1)) / 100

    # Fall back to sentiment scoring
    score = parse_score(text)
    if abs(score) > 0.05:
        return score_to_probability(score)

    return None


def analyze_interviews(interview_results: dict[str, Any]) -> dict[str, Any]:
    """
    Parse the output of `interview_all_agents`.

    The miro_backend returns a nested dict keyed by agent_id with the agent's
    text response. We parse each to extract a probability and aggregate.
    """
    responses = []

    # Handle both direct results dict and nested structure
    result_data = interview_results.get("result", interview_results)
    if isinstance(result_data, dict):
        items = result_data.items()
    elif isinstance(result_data, list):
        items = [(i, r) for i, r in enumerate(result_data)]
    else:
        return {"yes_probability": 0.5, "n_parsed": 0, "agent_responses": []}

    parsed_probs = []
    agent_responses = []

    for agent_id, response in items:
        text = ""
        if isinstance(response, str):
            text = response
        elif isinstance(response, dict):
            text = (
                response.get("response")
                or response.get("content")
                or response.get("text")
                or str(response)
            )

        prob = _parse_interview_response(text)
        agent_responses.append({
            "agent_id": agent_id,
            "response_snippet": text[:200],
            "extracted_probability": prob,
        })

        if prob is not None:
            parsed_probs.append(prob)

    yes_probability = sum(parsed_probs) / len(parsed_probs) if parsed_probs else 0.5

    return {
        "yes_probability": yes_probability,
        "n_total": len(list(items)) if not isinstance(result_data, list) else len(result_data),
        "n_parsed": len(parsed_probs),
        "agent_responses": agent_responses,
    }


# ── Post content analyzer ─────────────────────────────────────────────────────

def analyze_actions_file(actions_jsonl_path: str) -> dict[str, Any]:
    """
    Parse an OASIS actions.jsonl file and extract YES probability from
    CREATE_POST / CREATE_COMMENT content.
    """
    path = Path(actions_jsonl_path)
    if not path.exists():
        return {"yes_probability": 0.5, "n_posts": 0, "error": "file not found"}

    post_scores = []
    action_counts: dict[str, int] = {}
    n_posts = 0

    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue

            # Skip event markers (simulation_start, round_end, etc.)
            if "event_type" in record:
                action_type = record.get("event_type", "unknown")
                action_counts[action_type] = action_counts.get(action_type, 0) + 1
                continue

            action_type = record.get("action_type", "")
            action_counts[action_type] = action_counts.get(action_type, 0) + 1

            if action_type in ("CREATE_POST", "CREATE_COMMENT", "QUOTE_POST"):
                args = record.get("action_args", {})
                content = (
                    args.get("content")
                    or args.get("text")
                    or args.get("title", "")
                    or str(args)
                )
                if content and len(content) > 10:
                    score = parse_score(content)
                    post_scores.append(score_to_probability(score))
                    n_posts += 1

    if not post_scores:
        return {
            "yes_probability": 0.5,
            "n_posts": 0,
            "action_counts": action_counts,
            "note": "No post content found to analyze",
        }

    yes_probability = sum(post_scores) / len(post_scores)

    return {
        "yes_probability": yes_probability,
        "yes_basis_points": int(yes_probability * 10000),
        "n_posts": n_posts,
        "action_counts": action_counts,
    }


# ── Combined aggregator ───────────────────────────────────────────────────────

def aggregate_oracle_probability(
    interview_result: dict | None,
    twitter_actions_path: str | None,
    reddit_actions_path: str | None,
    interview_weight: float = 0.6,
    posts_weight: float = 0.4,
) -> dict[str, Any]:
    """
    Combine interview responses and post content into a single YES probability.

    Interview responses are more reliable (direct answers) so they get 60%
    weight; post content sentiment analysis gets 40%.
    """
    interview_prob = None
    posts_prob = None
    details: dict[str, Any] = {}

    if interview_result:
        parsed = analyze_interviews(interview_result)
        interview_prob = parsed["yes_probability"]
        details["interview"] = parsed

    post_probs = []
    for path, platform in [(twitter_actions_path, "twitter"), (reddit_actions_path, "reddit")]:
        if path:
            r = analyze_actions_file(path)
            if r["n_posts"] > 0:
                post_probs.append(r["yes_probability"])
                details[f"{platform}_posts"] = r

    if post_probs:
        posts_prob = sum(post_probs) / len(post_probs)

    # Weighted combination
    if interview_prob is not None and posts_prob is not None:
        yes_probability = interview_prob * interview_weight + posts_prob * posts_weight
    elif interview_prob is not None:
        yes_probability = interview_prob
    elif posts_prob is not None:
        yes_probability = posts_prob
    else:
        yes_probability = 0.5

    yes_probability = max(0.01, min(0.99, yes_probability))
    yes_basis_points = int(yes_probability * 10000)

    return {
        "yes_probability": round(yes_probability, 4),
        "yes_basis_points": yes_basis_points,
        "no_basis_points": 10000 - yes_basis_points,
        "details": details,
    }


if __name__ == "__main__":
    # Quick test on a local actions.jsonl file
    import sys

    if len(sys.argv) < 2:
        print("Usage: python analyze_actions.py <path/to/actions.jsonl>")
        sys.exit(1)

    result = analyze_actions_file(sys.argv[1])
    print(json.dumps(result, indent=2))
