"""
Orkestrasi forecast satu seri (ARCHITECTURE §6.3–6.5, D-33).

Model utama = Ridge regression (machine learning):
  ≥ 28 hari data → Ridge; alpha (regularisasi) dipilih per kategori = WAPE backtest terkecil
                   dari RIDGE_ALPHAS. Rata-rata 7 hari hanya dihitung sebagai PEMBANDING.
  < 28 hari      → rata-rata 7 hari (data belum cukup untuk melatih Ridge) + peringatan.
Rentang: kuantil 10% & 90% residual backtest model terpakai (butuh ≥ 10 residual).
"""

from __future__ import annotations

from datetime import date, timedelta

import numpy as np

from forecasting.backtest import backtest_pairs, ridge_backtest_pairs, wape
from forecasting.features import Series
from forecasting.models import (
    RIDGE_ALPHAS,
    fit_ridge,
    forecast_ma7,
    forecast_ridge,
    ridge_factors,
    ridge_training,
)

FEW_DAYS = 7
BACKTEST_MIN_DAYS = 14
RIDGE_MIN_DAYS = 28
MIN_RESIDUALS = 10


def choose_alpha(scores: dict[float, float | None]) -> float:
    """Alpha dengan WAPE terkecil; seri → alpha yang lebih kecil (urutan RIDGE_ALPHAS)."""
    scored = [(s, a) for a, s in scores.items() if s is not None]
    if not scored:
        return RIDGE_ALPHAS[0]
    best = min(s for s, _ in scored)
    return next(
        a for a in RIDGE_ALPHAS if scores.get(a) is not None and scores[a] == best
    )


def forecast_series(series: Series, start_date: date, horizon: int) -> dict:
    """Hasil satu seri sesuai kontrak §6.1 (tanpa `menu_id`)."""
    targets = [start_date + timedelta(days=i) for i in range(horizon)]
    n = len(series.values)
    if n == 0:
        return {
            "model": None,
            "error_pct": None,
            "baseline_error_pct": None,
            "alpha": None,
            "data_days": 0,
            "forecast": [],
            "factors": [],
            "warnings": ["Belum ada data penjualan."],
        }

    baseline_pairs = (
        backtest_pairs("ma7", series, horizon) if n >= BACKTEST_MIN_DAYS else []
    )
    baseline_error = wape(baseline_pairs)
    factors: list[dict] = []
    alpha: float | None = None

    training = ridge_training(series) if n >= RIDGE_MIN_DAYS else None
    if training is not None:
        model = "ridge"
        pairs_by_alpha = ridge_backtest_pairs(series, horizon, RIDGE_ALPHAS)
        scores = {a: wape(p) for a, p in pairs_by_alpha.items()}
        alpha = choose_alpha(scores)
        pairs = pairs_by_alpha[alpha]
        error = scores[alpha]
        preds = forecast_ridge(series, targets, alpha)
        factors = ridge_factors(fit_ridge(*training, alpha=alpha), training[0])
    else:
        model = "ma7"
        pairs = baseline_pairs
        error = baseline_error
        preds = forecast_ma7(series, targets)

    residuals = [a - p for a, p in pairs]
    lo_q = hi_q = None
    if len(residuals) >= MIN_RESIDUALS:
        lo_q, hi_q = (float(q) for q in np.quantile(residuals, [0.10, 0.90]))

    warnings: list[str] = []
    if n < FEW_DAYS:
        warnings.append(
            "Data sangat sedikit (< 7 hari); prediksi memakai rata-rata sederhana."
        )
    elif model == "ma7":
        warnings.append(
            f"Data belum cukup untuk machine learning (perlu {RIDGE_MIN_DAYS} hari); "
            "sementara memakai rata-rata 7 hari."
        )
    if n < BACKTEST_MIN_DAYS:
        warnings.append("Akurasi belum bisa diuji (< 14 hari data).")
    censored = len(series.censored)
    if censored:
        # D-30: hari stok habis tetap dipakai apa adanya; beri tahu prediksi bisa sedikit rendah.
        warnings.append(
            f"Ada {censored} hari stok habis; penjualan hari itu bisa lebih rendah dari "
            "permintaan, jadi prediksi bisa sedikit rendah."
        )

    return {
        "model": model,
        "error_pct": None if error is None else round(error, 1),
        "baseline_error_pct": None
        if baseline_error is None
        else round(baseline_error, 1),
        "alpha": alpha,
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
        "factors": factors,
        "warnings": warnings,
    }
