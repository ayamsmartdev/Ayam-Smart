"""
AYAMSMART — fungsi forecast (Vercel Python Function, folder /api). ARCHITECTURE §6.

- POST /api/forecast : hitung prediksi sesuai kontrak §6.1 (`forecasting.contract`).
- GET  /api/forecast : cek kesehatan (versi, waktu import), tanpa menghitung.

Keamanan:
- Setiap request wajib membawa header X-Forecast-Secret yang sama dengan env
  FORECAST_SECRET. Tanpa itu → 401. Env kosong → 503 (fail-closed).
- Fungsi ini stateless dan tidak memegang kredensial database (D-05).
- Pesan galat tidak memuat isi data; galat tak terduga → 500 tanpa detail.

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
import traceback
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

import numpy as np

# Root repo masuk sys.path agar package `forecasting/` bisa diimport, baik di
# Vercel maupun saat file ini dijalankan langsung.
_ROOT = str(Path(__file__).resolve().parent.parent)
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from forecasting.contract import ContractError, handle

# Muat library aljabar linear numpy (LAPACK) sekarang, bukan saat request pertama.
np.linalg.solve(np.eye(2), np.ones(2))

IMPORT_MS = round((time.perf_counter() - _T0) * 1000, 1)
API_VERSION = "d33"
MAX_BODY_BYTES = 1_000_000
SECRET_HEADER = "X-Forecast-Secret"
_calls = 0


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


class handler(BaseHTTPRequestHandler):
    """Nama kelas `handler` wajib untuk Python Function di folder /api."""

    def do_GET(self) -> None:
        if self._reject():
            return
        self._send(
            200,
            {
                "ok": True,
                "version": API_VERSION,
                "python": platform.python_version(),
                "numpy": np.__version__,
                "region": os.environ.get("VERCEL_REGION"),
                "import_ms": IMPORT_MS,
                "cold_start": self._count_call() == 1,
            },
        )

    def do_POST(self) -> None:
        if self._reject():
            return
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            length = -1
        if length < 0:
            self._send(400, {"error": "Content-Length tidak valid."})
            return
        if length > MAX_BODY_BYTES:
            self._send(413, {"error": "Body terlalu besar (maks 1 MB)."})
            return
        try:
            payload = json.loads(self.rfile.read(length) or b"null")
        except ValueError:
            self._send(400, {"error": "Body bukan JSON yang valid."})
            return

        cold = self._count_call() == 1
        t0 = time.perf_counter()
        try:
            body = handle(payload)
        except ContractError as exc:
            self._send(400, {"error": str(exc)})
            return
        except Exception:  # noqa: BLE001 — galat apa pun → 500 tanpa detail
            traceback.print_exc()  # masuk log Vercel; tidak dikirim ke klien
            self._send(500, {"error": "Forecast gagal dihitung."})
            return
        body["meta"] = {
            "version": API_VERSION,
            "compute_ms": round((time.perf_counter() - t0) * 1000, 1),
            "import_ms": IMPORT_MS,
            "cold_start": cold,
        }
        self._send(200, body)

    # ── util ────────────────────────────────────────────────────────────────
    def _count_call(self) -> int:
        global _calls
        _calls += 1
        return _calls

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

    def _send(self, status: int, body: dict) -> None:
        data = json.dumps(body, ensure_ascii=False).encode()
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
