"""
AYAMSMART — buat contoh body request `POST /api/forecast` dari DATA SIMULASI (bukan data klien).

Dipakai untuk menguji fungsi forecast lokal / di Vercel dengan curl:
    py -3.12 scripts/forecast_demo_request.py                  # 120 hari s.d. kemarin (WIB)
    py -3.12 scripts/forecast_demo_request.py --end 2026-11-03 --horizon 5
File keluaran: scripts/out/forecast_request.json (diabaikan Git).

Bentuknya sama dengan yang nanti dikirim Next.js (T-18): satu seri per kategori, hari tutup
tidak ada di history, hari stok ayam habis dikirim sebagai `censored_dates` untuk kategori ayam.
`menu_id` di sini = nama kategori (di aplikasi = UUID kategori).
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from generate_demo_data import PARAMS, _yesterday_wib, all_categories, simulate


def build_request(end: date, days: int = 120, seed: int = 42, horizon: int = 5) -> dict:
    data = simulate(end, days, seed)
    history: dict[str, list[dict]] = defaultdict(list)
    for d, cat, qty in data.sales:
        history[cat].append({"date": d.isoformat(), "qty": qty})
    stockouts = [d.isoformat() for d in data.stockout_dates]
    chicken = set(PARAMS["chicken_shares"])
    series = []
    for cat in all_categories():
        item: dict = {"menu_id": cat, "history": history[cat]}
        if cat in chicken and stockouts:
            item["censored_dates"] = stockouts
        series.append(item)
    return {
        "horizon": horizon,
        "start_date": (end + timedelta(days=1)).isoformat(),
        "series": series,
        "context": [],
    }


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        description="Buat contoh request forecast dari data simulasi."
    )
    ap.add_argument(
        "--end", type=date.fromisoformat, default=None, help="Bawaan: kemarin WIB"
    )
    ap.add_argument("--days", type=int, default=120)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--horizon", type=int, default=5)
    ap.add_argument(
        "--out",
        type=Path,
        default=Path(__file__).resolve().parent / "out" / "forecast_request.json",
    )
    args = ap.parse_args(argv)
    if not 7 <= args.days <= 400 or not 1 <= args.horizon <= 7:
        ap.error("--days harus 7–400 dan --horizon 1–7.")
    body = build_request(
        args.end or _yesterday_wib(), args.days, args.seed, args.horizon
    )
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(body), encoding="utf-8")
    print(
        f"Tersimpan: {args.out} ({len(body['series'])} seri, mulai {body['start_date']})",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
