"""AgentVault local visual demo server. No blockchain transactions."""
import json
import sys
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from simulation.vault import Vault, SIMULATION_LABEL
from simulation.receipts import verify_action_receipt

FRONTEND = ROOT / "frontend"
NOW = datetime(2026, 9, 29, 12, 0, 0)


def make_vault():
    return Vault(
        owner="owner-1",
        authorised_agent="agent-1",
        balance=500,
        daily_limits_by_tier={0: 100, 1: 150, 2: 200},
        owner_max_daily_limit=200,
        max_per_transaction=100,
        recipient_caps={"merchant-1": 50},
        approval_threshold=20,
        allowlist={"merchant-1"},
    )


def run_scenario(scenario):
    vault = make_vault()

    if scenario in ("allowed", "blocked"):
        recipient = "merchant-1" if scenario == "allowed" else "unknown-merchant"
        result = vault.submit_payment(
            caller="agent-1", recipient=recipient, amount=10, now=NOW,
            reason="AgentVault visual demo", model_id="agentvault-demo",
        )
    elif scenario in ("approval", "approved", "rejected"):
        pending = vault.submit_payment(
            caller="agent-1", recipient="merchant-1", amount=30, now=NOW,
            reason="AgentVault owner approval demo", model_id="agentvault-demo",
        )
        if pending["status"] != "Pending":
            raise RuntimeError("Expected payment to require owner approval")
        if scenario == "approval":
            result = pending
        elif scenario == "approved":
            result = vault.approve_payment(
                caller="owner-1", payment_id=pending["payment_id"], now=NOW,
            )
        else:
            result = vault.reject_payment(
                caller="owner-1", payment_id=pending["payment_id"],
            )
    else:
        raise ValueError("Unknown scenario")

    receipt = result.get("receipt", {})
    valid = verify_action_receipt(receipt)
    if not valid:
        raise RuntimeError("Receipt verification failed")

    return {
        "scenario": scenario,
        "label": result.get("label", SIMULATION_LABEL),
        "status": result["status"],
        "reason": result["reason"],
        "balance": vault.balance,
        "receipt_valid": valid,
        "receipt_hash": receipt.get("receipt_hash", "N/A"),
        "simulation_only": True,
        "blockchain_transaction_submitted": False,
    }


class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, data):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/health":
            return self.send_json(200, {
                "ok": True, "simulation_only": True
            })
        if self.path in ("/", "/index.html"):
            page = FRONTEND / "simulator.html"
            if not page.is_file():
                return self.send_json(404, {"error": "Dashboard not created yet"})
            body = page.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            return self.wfile.write(body)
        return self.send_json(404, {"error": "Not found"})

    def do_POST(self):
        if self.path != "/api/run":
            return self.send_json(404, {"error": "Not found"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length > 4096:
                return self.send_json(413, {"error": "Request too large"})
            payload = json.loads(self.rfile.read(length) or b"{}")
            return self.send_json(200, run_scenario(payload.get("scenario")))
        except ValueError as exc:
            return self.send_json(400, {"error": str(exc)})
        except Exception as exc:
            print("Scenario error:", repr(exc))
            return self.send_json(500, {"error": "Scenario failed; check server terminal"})

    def log_message(self, fmt, *args):
        print("[AgentVault] " + (fmt % args))


if __name__ == "__main__":
    print("AgentVault: http://127.0.0.1:8000")
    print("LOCAL SIMULATION ONLY � NO BLOCKCHAIN TRANSACTIONS")
    ThreadingHTTPServer(("127.0.0.1", 8000), Handler).serve_forever()
