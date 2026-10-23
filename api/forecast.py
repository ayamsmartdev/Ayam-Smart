"""
AYAMSMART — fungsi forecast (Vercel Python Function, folder /api).

TAHAP T-10a (SPIKE): belum menghitung forecast sungguhan. Tujuannya membuktikan
fungsi Python + numpy + package lokal `forecasting/` bisa berjalan di Vercel
berdampingan dengan Next.js, lalu mengukur waktu import (cold start) dan waktu
fit Ridge. Kontrak forecast asli: ARCHITECTURE §6.1, dikerjakan di T-17.

Keamanan:
- Setiap request wajib membawa header X-Forecast-Secret yang sama dengan env
  FORECAST_SECRET. Tanpa itu → 401. Env kosong → 503 (fail-closed).
- Fungsi ini stateless dan tidak memegang kredensial database (D-05).

Jalankan lokal (Windows):  py -3.12 api\\forecast.py  → http://localhost:8000/api/forecast
"""

# numpy dan forecasting sengaja diimport setelah _T0 untuk mengukur cold start.
import time

_T0 = time.perf_counter()

import hmac
import json
import os
import platform
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

import numpy as np

# Root repo masuk sys.path agar package `forecasting/` bisa diimport, baik di
# Vercel maupun saat file ini dijalankan langsung.
_ROOT = str(Path(__file__).resolve().parent.parent)
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from forecasting.models import fit_ridge

# Muat library aljabar linear numpy (LAPACK) sekarang, bukan saat request pertama,
# supaya IMPORT_MS mencerminkan cold start yang sebenarnya.
np.linalg.solve(np.eye(2), np.ones(2))

IMPORT_MS = round((time.perf_counter() - _T0) * 1000, 1)
_STARTED_AT = time.time()
_calls = 0

MAX_BODY_BYTES = 1_000_000
SECRET_HEADER = "X-Forecast-Secret"


def _check_secret(provided: str | None) -> int | None:
    """None jika lolos; selain itu kode HTTP penolakan."""
    expected = os.environ.get("FORECAST_SECRET", "").strip()
    if not expected:
        return 503
    if not provided:
        return 401
    if not hmac.compare_digest(provided.strip().encode(), expected.encode()):
        return 401
    return None


def _fit_probe() -> dict:
    """Fit Ridge pada 120 hari data sintetis dengan fitur mirip rencana §6.2."""
    t0 = time.perf_counter()
    rng = np.random.default_rng(42)
    days = 120
    dow = np.arange(days) % 7
    qty = 40 + 8 * (dow >= 5) + rng.normal(0, 4, days)

    rows = np.arange(7, days)
    features = np.column_stack(
        [
            np.eye(7)[dow[rows]],  # one-hot hari dalam seminggu
            qty[rows - 7],  # lag-7
            [qty[r - 7 : r].mean() for r in rows],  # rata-rata 7 hari terakhir
            rows / days,  # indeks tren
        ]
    )
    predicted = fit_ridge(features, qty[rows], alpha=1.0).predict(features[-5:])
    return {
        "fit_ms": round((time.perf_counter() - t0) * 1000, 1),
        "sample_prediction": [round(float(v), 1) for v in predicted],
    }


class handler(BaseHTTPRequestHandler):
    """Nama kelas `handler` wajib untuk Python Function di folder /api."""

    def do_GET(self) -> None:
        if self._reject():
            return
        self._send(200, self._spike_report())

    def do_POST(self) -> None:
        if self._reject():
            return
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_BODY_BYTES:
            self._send(413, {"error": "Body terlalu besar (maks 1 MB)."})
            return
        try:
            payload = json.loads(self.rfile.read(length) or b"{}")
        except ValueError:
            self._send(400, {"error": "Body bukan JSON yang valid."})
            return
        series = payload.get("series") if isinstance(payload, dict) else None
        report = self._spike_report()
        report["series_count"] = len(series) if isinstance(series, list) else 0
        self._send(200, report)

    # ── util ────────────────────────────────────────────────────────────────
    def _reject(self) -> bool:
        code = _check_secret(self.headers.get(SECRET_HEADER))
        if code is None:
            return False
        message = (
            "FORECAST_SECRET belum diatur di server."
            if code == 503
            else f"Header {SECRET_HEADER} tidak ada atau salah."
        )
        self._send(code, {"error": message})
        return True

    def _spike_report(self) -> dict:
        global _calls
        _calls += 1
        return {
            "ok": True,
            "stage": "spike-t10a",
            "python": platform.python_version(),
            "numpy": np.__version__,
            "model": "ridge (numpy)",
            "region": os.environ.get("VERCEL_REGION"),
            "import_ms": IMPORT_MS,
            "cold_start": _calls == 1,
            "instance_age_s": round(time.time() - _STARTED_AT, 1),
            **_fit_probe(),
        }

    def _send(self, status: int, body: dict) -> None:
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    url = f"http://localhost:{port}/api/forecast"
    print(f"Forecast lokal: {url} (import {IMPORT_MS} ms)")
    HTTPServer(("127.0.0.1", port), handler).serve_forever()
