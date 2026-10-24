"""Tes HTTP fungsi forecast (api/forecast.py) dengan server lokal di thread terpisah."""

import http.client
import importlib.util
import json
import threading
import urllib.error
import urllib.request
from datetime import date
from http.server import HTTPServer
from pathlib import Path

import pytest

from scripts.forecast_demo_request import build_request

SECRET = "rahasia-tes"
_spec = importlib.util.spec_from_file_location(
    "api_forecast", Path(__file__).resolve().parent.parent / "api" / "forecast.py"
)
api = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(api)


class _QuietHandler(api.handler):
    def log_message(self, *args):  # jangan penuhi output tes
        pass


@pytest.fixture(scope="module")
def base_url():
    server = HTTPServer(("127.0.0.1", 0), _QuietHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{server.server_address[1]}/api/forecast"
    server.shutdown()


@pytest.fixture
def secret(monkeypatch):
    monkeypatch.setenv("FORECAST_SECRET", SECRET)


def call(url, method="GET", body=None, secret=SECRET, raw=None):
    data = (
        raw
        if raw is not None
        else (None if body is None else json.dumps(body).encode())
    )
    req = urllib.request.Request(url, data=data, method=method)
    if secret is not None:
        req.add_header("X-Forecast-Secret", secret)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as err:
        return err.code, json.loads(err.read())


def test_tanpa_env_secret_503(base_url, monkeypatch):
    monkeypatch.delenv("FORECAST_SECRET", raising=False)
    assert call(base_url)[0] == 503
    assert call(base_url, "POST", {})[0] == 503


@pytest.mark.parametrize("wrong", [None, "", "salah"])
def test_secret_salah_401(base_url, secret, wrong):
    status, body = call(base_url, secret=wrong)
    assert status == 401 and "X-Forecast-Secret" in body["error"]
    assert call(base_url, "POST", {}, secret=wrong)[0] == 401


def test_get_cek_kesehatan(base_url, secret):
    status, body = call(base_url)
    assert status == 200 and body["ok"] is True and body["version"] == api.API_VERSION
    assert "import_ms" in body and "numpy" in body


def test_post_json_rusak_400(base_url, secret):
    status, body = call(base_url, "POST", raw=b"{bukan json")
    assert status == 400 and "JSON" in body["error"]


def test_post_kontrak_salah_400(base_url, secret):
    status, body = call(
        base_url, "POST", {"horizon": 9, "start_date": "2026-11-04", "series": []}
    )
    assert status == 400 and "horizon" in body["error"]


def test_post_body_terlalu_besar_413(base_url, secret):
    # Server menolak dari header Content-Length sebelum membaca body, jadi cukup kirim header.
    host, port = base_url.split("//")[1].split("/")[0].split(":")
    conn = http.client.HTTPConnection(host, int(port), timeout=10)
    conn.putrequest("POST", "/api/forecast")
    conn.putheader("X-Forecast-Secret", SECRET)
    conn.putheader("Content-Length", str(api.MAX_BODY_BYTES + 1))
    conn.endheaders()
    resp = conn.getresponse()
    assert resp.status == 413
    conn.close()


def test_post_data_simulasi_200(base_url, secret):
    status, body = call(
        base_url, "POST", build_request(date(2026, 11, 3), days=120, horizon=5)
    )
    assert status == 200
    assert len(body["results"]) == 12
    assert body["meta"]["version"] == api.API_VERSION and body["meta"]["compute_ms"] > 0
    gb = next(r for r in body["results"] if r["menu_id"] == "Geprek bakar")
    assert [p["date"] for p in gb["forecast"]] == [f"2026-11-0{d}" for d in range(4, 9)]


def test_galat_tak_terduga_500_tanpa_detail(base_url, secret, monkeypatch):
    def boom(_payload):
        raise RuntimeError("detail rahasia")

    monkeypatch.setattr(api, "handle", boom)
    status, body = call(base_url, "POST", {})
    assert status == 500 and "rahasia" not in body["error"]
