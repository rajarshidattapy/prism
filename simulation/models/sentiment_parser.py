"""
Lightweight sentiment parser for MiroFish agent responses.
Uses keyword matching for MVP; replace with a fine-tuned model in production.
"""

import re
import json
from pathlib import Path
from typing import Optional

_PROMPTS = json.loads((Path(__file__).parent / "agent_prompts.json").read_text())
_POS = set(_PROMPTS["sentiment_modifiers"]["positive_keywords"])
_NEG = set(_PROMPTS["sentiment_modifiers"]["negative_keywords"])
_NEU = set(_PROMPTS["sentiment_modifiers"]["neutral_keywords"])


def parse_score(text: str) -> float:
    """
    Returns a sentiment score in [-1, 1].
    Positive = bullish, negative = bearish.
    """
    words = re.findall(r"\b\w+\b", text.lower())
    pos = sum(1 for w in words if w in _POS)
    neg = sum(1 for w in words if w in _NEG)
    total = pos + neg
    if total == 0:
        return 0.0
    return (pos - neg) / total


def score_to_probability(score: float) -> float:
    """Maps [-1, 1] score to [0, 1] YES probability using a sigmoid-like transform."""
    return 1 / (1 + 2.718281828 ** (-score * 3))


def classify(score: float) -> str:
    if score > 0.2:
        return "BULLISH"
    elif score < -0.2:
        return "BEARISH"
    return "NEUTRAL"


if __name__ == "__main__":
    samples = [
        "The institutional adoption and ETF approval is incredibly bullish for ETH",
        "SEC regulation and ban fears are causing massive FUD and crash concerns",
        "Market looks stable, sideways consolidation expected for now",
    ]
    for s in samples:
        sc = parse_score(s)
        prob = score_to_probability(sc)
        print(f"Text: {s[:60]}...")
        print(f"  Score: {sc:.3f} | Prob: {prob:.3f} | {classify(sc)}\n")
