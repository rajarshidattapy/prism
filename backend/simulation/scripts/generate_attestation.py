"""
Generate a cryptographic attestation for a MiroFish simulation output.

The attestation is a SHA-256 hash of the canonical JSON result,
suitable for posting on-chain via the PRISM `seed_simulation_result` instruction.

Usage:
    python simulation/scripts/generate_attestation.py --result outputs/result_1234.json
"""

import argparse
import hashlib
import json
import sys
from pathlib import Path

OUTPUTS_DIR = Path(__file__).parent.parent / "outputs"


def canonical_json(obj: dict) -> bytes:
    """Deterministic JSON serialization for hashing."""
    return json.dumps(obj, sort_keys=True, separators=(",", ":")).encode("utf-8")


def generate_attestation(result: dict) -> dict:
    # Only hash the deterministic fields — exclude timestamp to allow re-verification
    hashable = {
        "question": result["question"],
        "context": result["context"],
        "n_agents": result["n_agents"],
        "yes_probability": result["yes_probability"],
        "yes_basis_points": result["yes_basis_points"],
        "persona_breakdown": result["persona_breakdown"],
    }

    payload = canonical_json(hashable)
    sha256_hash = hashlib.sha256(payload).hexdigest()

    attestation = {
        "simulation_hash": sha256_hash,
        "hash_bytes": list(bytes.fromhex(sha256_hash)),  # [u8; 32] for on-chain
        "yes_basis_points": result["yes_basis_points"],
        "no_basis_points": result["no_basis_points"],
        "n_agents": result["n_agents"],
        "question": result["question"],
        "timestamp": result["timestamp"],
    }

    print(f"[Attestation] SHA-256: {sha256_hash}")
    print(f"[Attestation] YES basis points: {result['yes_basis_points']}")
    print(f"[Attestation] On-chain call:")
    print(f"  seed_simulation_result(")
    print(f"    simulation_hash = {attestation['hash_bytes'][:8]}...{attestation['hash_bytes'][-4:]},")
    print(f"    yes_probability = {result['yes_basis_points']},")
    print(f"  )")

    return attestation


def latest_result() -> dict:
    results = sorted(OUTPUTS_DIR.glob("result_*.json"))
    if not results:
        print("[Error] No simulation outputs found. Run run_matrix.py first.")
        sys.exit(1)
    return json.loads(results[-1].read_text())


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate PRISM simulation attestation")
    parser.add_argument("--result", default=None, help="Path to result JSON (defaults to latest)")
    args = parser.parse_args()

    if args.result:
        result = json.loads(Path(args.result).read_text())
    else:
        result = latest_result()

    attestation = generate_attestation(result)

    out_path = OUTPUTS_DIR / f"attestation_{result['timestamp']}.json"
    out_path.write_text(json.dumps(attestation, indent=2))
    print(f"\n[Attestation] Saved to: {out_path}")
    print(json.dumps(attestation, indent=2))
