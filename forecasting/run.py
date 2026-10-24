"""
Orkestrasi forecast satu seri (ARCHITECTURE §6.3–6.4).

Pemilihan model menurut jumlah hari data tercatat:
  < 7   → ma7 saja + peringatan "data sangat sedikit"
  7–27  → ma7, snaive (backtest jika ≥ 14 hari)
  ≥ 28  → ma7, snaive, ridge
Model dengan WAPE terkecil dipilih; selisih < 1 poin → model yang lebih sederhana.
Rentang: kuantil 10% & 90% residual backtest model terpilih (butuh ≥ 10 residual).
"""

from __future__ import annotations

from datetime import date, timedelta

import numpy as np

from forecasting.backtest import backtest_pairs, wape
from forecasting.features import Series
from forecasting.models import MODEL_ORDER, forecast

FEW_DAYS = 7
BACKTEST_MIN_DAYS = 14
RIDGE_MIN_DAYS = 28
TIE_POINTS = 1.0
MIN_RESIDUALS = 10


def candidates(data_days: int) -> tuple[str, ...]:
    if data_days < FEW_DAYS:
        return ("ma7",)
    if data_days < RIDGE_MIN_DAYS:
        return ("ma7", "snaive")
    return MODEL_ORDER


def choose(scores: dict[str, float | None]) -> str:
    """Model dengan WAPE terkecil; dalam selisih < 1 poin pilih yang lebih sederhana."""
    scored = {m: s for m, s in scores.items() if s is not None}
    if not scored:
        return next(m for m in MODEL_ORDER if m in scores)
    best = min(scored.values())
    return next(m for m in MODEL_ORDER if m in scored and scored[m] - best < TIE_POINTS)


def forecast_series(series: Series, start_date: date, horizon: int) -> dict:
    """Hasil satu seri sesuai kontrak §6.1 (tanpa `menu_id`)."""
    targets = [start_date + timedelta(days=i) for i in range(horizon)]
    n = len(series.values)
    warnings: list[str] = []
    if n == 0:
        return {
            "model": None,
            "error_pct": None,
            "data_days": 0,
            "forecast": [],
            "warnings": ["Belum ada data penjualan."],
        }

    cands = candidates(n)
    scores: dict[str, float | None] = {m: None for m in cands}
    pairs_by_model: dict[str, list[tuple[float, float]]] = {}
    if n >= BACKTEST_MIN_DAYS:
        for m in cands:
            pairs_by_model[m] = backtest_pairs(m, series, horizon)
            scores[m] = wape(pairs_by_model[m])
    model = choose(scores)

    preds = forecast(model, series, targets)
    residuals = [a - p for a, p in pairs_by_model.get(model, [])]
    lo_q = hi_q = None
    if len(residuals) >= MIN_RESIDUALS:
        lo_q, hi_q = (float(q) for q in np.quantile(residuals, [0.10, 0.90]))

    if n < FEW_DAYS:
        warnings.append(
            "Data sangat sedikit (< 7 hari); prediksi memakai rata-rata sederhana."
        )
    elif n < BACKTEST_MIN_DAYS:
        warnings.append("Akurasi belum bisa diuji (< 14 hari data).")
    censored = len(series.censored)
    if censored:
        # D-30: hari stok habis tetap dipakai apa adanya; beri tahu prediksi bisa sedikit rendah.
        warnings.append(
            f"Ada {censored} hari stok habis; penjualan hari itu bisa lebih rendah dari "
            "permintaan, jadi prediksi bisa sedikit rendah."
        )

    error = scores.get(model)
    return {
        "model": model,
        "error_pct": None if error is None else round(error, 1),
        "data_days": n,
        "forecast": [
            {
                "date": d.isoformat(),
                "predicted": round(p, 1),
                "lower": None if lo_q is None else round(max(0.0, p + lo_q), 1),
                "upper": None if hi_q is None else round(max(0.0, p + hi_q), 1),
            }
            for d, p in zip(targets, preds, strict=True)
        ],
        "warnings": warnings,
    }
