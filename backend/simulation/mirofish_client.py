"""
MiroFish HTTP Client for PRISM

Wraps the MiroFish Flask API (running on port 5001) so the PRISM oracle
pipeline can orchestrate OASIS simulations without touching miro_backend code.

MiroFish backend must be running:
    cd miro_backend && python run.py

API base: http://localhost:5001/api
"""

import json
import time
import urllib.request
import urllib.error
import urllib.parse
from typing import Any, Dict, List, Optional


MIROFISH_BASE = "http://localhost:5001/api"
DEFAULT_TIMEOUT = 30


# ── Low-level HTTP helpers ────────────────────────────────────────────────────

def _request(
    method: str,
    path: str,
    body: Optional[Dict] = None,
    timeout: int = DEFAULT_TIMEOUT,
) -> Dict[str, Any]:
    url = f"{MIROFISH_BASE}{path}"
    data = json.dumps(body).encode("utf-8") if body else None
    headers = {"Content-Type": "application/json", "Accept": "application/json"}

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"MiroFish API error {e.code} on {method} {path}: {e.read().decode()}")
    except urllib.error.URLError as e:
        raise ConnectionError(
            f"Cannot reach MiroFish backend at {url}.\n"
            f"Start it with: cd miro_backend && python run.py\n"
            f"Error: {e.reason}"
        )


def _get(path: str, timeout: int = DEFAULT_TIMEOUT) -> Dict:
    return _request("GET", path, timeout=timeout)


def _post(path: str, body: Dict = None, timeout: int = DEFAULT_TIMEOUT) -> Dict:
    return _request("POST", path, body=body, timeout=timeout)


# ── Health check ──────────────────────────────────────────────────────────────

def is_alive() -> bool:
    """Check if the MiroFish backend is reachable."""
    try:
        _get("/health", timeout=3)
        return True
    except Exception:
        # Try root path as fallback (some Flask apps don't have /health)
        try:
            _get("/", timeout=3)
            return True
        except Exception:
            return False


# ── Simulation lifecycle ──────────────────────────────────────────────────────

def create_simulation(
    project_id: str,
    graph_id: str,
    enable_twitter: bool = True,
    enable_reddit: bool = True,
) -> str:
    """Create a new simulation. Returns simulation_id."""
    resp = _post("/simulation/create", {
        "project_id": project_id,
        "graph_id": graph_id,
        "enable_twitter": enable_twitter,
        "enable_reddit": enable_reddit,
    })
    return resp["data"]["simulation_id"]


def prepare_simulation(
    simulation_id: str,
    simulation_requirement: str,
    document_text: str,
    use_llm_for_profiles: bool = True,
    parallel_profile_count: int = 3,
) -> Dict:
    """
    Prepare the simulation: reads Zep entities, generates OASIS agent profiles,
    and creates the simulation config. Blocking — can take 1–5 minutes.
    """
    resp = _post(f"/simulation/{simulation_id}/prepare", {
        "simulation_requirement": simulation_requirement,
        "document_text": document_text,
        "use_llm_for_profiles": use_llm_for_profiles,
        "parallel_profile_count": parallel_profile_count,
    }, timeout=600)
    return resp.get("data", resp)


def start_simulation(
    simulation_id: str,
    platform: str = "reddit",  # twitter | reddit | parallel
    max_rounds: int = 5,
) -> Dict:
    """Start the OASIS simulation process."""
    resp = _post(f"/simulation/{simulation_id}/start", {
        "platform": platform,
        "max_rounds": max_rounds,
    })
    return resp.get("data", resp)


def get_run_status(simulation_id: str) -> Dict:
    """Get current run state (status, round progress, action counts)."""
    resp = _get(f"/simulation/{simulation_id}/run-status")
    return resp.get("data", resp)


def wait_for_completion(
    simulation_id: str,
    poll_interval: int = 5,
    max_wait: int = 1800,
    on_progress=None,
) -> Dict:
    """
    Poll until simulation completes or fails. Returns final run state.

    Args:
        on_progress: optional callback(status_dict) called each poll tick
    """
    elapsed = 0
    while elapsed < max_wait:
        state = get_run_status(simulation_id)
        status = state.get("runner_status", "unknown")

        if on_progress:
            on_progress(state)

        if status in ("completed", "stopped", "failed"):
            return state

        time.sleep(poll_interval)
        elapsed += poll_interval

    raise TimeoutError(f"Simulation {simulation_id} did not complete within {max_wait}s")


def stop_simulation(simulation_id: str) -> Dict:
    resp = _post(f"/simulation/{simulation_id}/stop")
    return resp.get("data", resp)


# ── Actions & data retrieval ──────────────────────────────────────────────────

def get_actions(
    simulation_id: str,
    platform: Optional[str] = None,
    limit: int = 1000,
) -> List[Dict]:
    """Fetch agent actions from the simulation."""
    path = f"/simulation/{simulation_id}/actions?limit={limit}"
    if platform:
        path += f"&platform={platform}"
    resp = _get(path, timeout=60)
    return resp.get("data", {}).get("actions", [])


def get_agent_stats(simulation_id: str) -> List[Dict]:
    resp = _get(f"/simulation/{simulation_id}/agent-stats")
    return resp.get("data", {}).get("stats", [])


# ── Interview ─────────────────────────────────────────────────────────────────

def interview_all_agents(
    simulation_id: str,
    prompt: str,
    platform: Optional[str] = None,
    timeout: int = 180,
) -> Dict:
    """
    Send a question to every agent in the simulation.
    Used to extract structured YES/NO sentiment for market resolution.
    """
    resp = _post(f"/simulation/{simulation_id}/interview/all", {
        "prompt": prompt,
        "platform": platform,
    }, timeout=timeout + 30)
    return resp.get("data", resp)


def interview_agent(
    simulation_id: str,
    agent_id: int,
    prompt: str,
    platform: Optional[str] = None,
    timeout: int = 60,
) -> Dict:
    resp = _post(f"/simulation/{simulation_id}/interview/{agent_id}", {
        "prompt": prompt,
        "platform": platform,
    }, timeout=timeout + 10)
    return resp.get("data", resp)


# ── Convenience: get simulation list ─────────────────────────────────────────

def list_simulations(project_id: Optional[str] = None) -> List[Dict]:
    path = "/simulation/list"
    if project_id:
        path += f"?project_id={project_id}"
    resp = _get(path)
    return resp.get("data", {}).get("simulations", [])
