"""
Backtest rolling-origin + WAPE (ARCHITECTURE §6.3, D-10, D-33).

Untuk tiap titik asal (hingga 14 tanggal tercatat terakhir, kecuali yang paling akhir):
riwayat dipotong sampai titik asal, model meramal 1…horizon hari ke depan, lalu
dibandingkan dengan angka yang benar-benar tercatat.
"""

from __future__ import annotations

from datetime import date, timedelta

import numpy as np

from forecasting.features import Series, feature_row
from forecasting.models import RIDGE_MIN_ROWS, forecast, ma7_value

BACKTEST_ORIGINS = 14


def origins_for(series: Series, n_origins: int = BACKTEST_ORIGINS) -> list[date]:
    dates = series.dates
    return dates[-(n_origins + 1) : -1] if len(dates) > 1 else []


def _targets(series: Series, origin: date, horizon: int) -> list[date]:
    return [
        d
        for d in (origin + timedelta(days=h) for h in range(1, horizon + 1))
        if d in series.values
    ]


def backtest_pairs(
    model: str,
    series: Series,
    horizon: int,
    n_origins: int = BACKTEST_ORIGINS,
) -> list[tuple[float, float]]:
    """Pasangan (aktual, prediksi) dari semua titik asal dan horizon."""
    pairs: list[tuple[float, float]] = []
    for origin in origins_for(series, n_origins):
        targets = _targets(series, origin, horizon)
        if not targets:
            continue
        preds = forecast(model, series.upto(origin), targets)
        pairs.extend((series.values[d], p) for d, p in zip(targets, preds, strict=True))
    return pairs


def ridge_backtest_pairs(
    series: Series,
    horizon: int,
    alphas: tuple[float, ...],
    n_origins: int = BACKTEST_ORIGINS,
) -> dict[float, list[tuple[float, float]]]:
    """
    Backtest Ridge untuk beberapa alpha sekaligus. Hasilnya sama dengan memanggil
    `forecast_ridge(series.upto(origin), targets, alpha)` per titik asal (dites), tetapi
    fitur dihitung sekali: fitur tanggal d hanya memakai data ≤ d−7 ≤ titik asal, jadi
    sama di riwayat penuh maupun terpotong. Standarisasi & Gram dihitung sekali per titik asal.
    """
    dates = series.dates
    out: dict[float, list[tuple[float, float]]] = {a: [] for a in alphas}
    if not dates:
        return out
    start = dates[0]
    feats = {d: feature_row(series, d, start) for d in dates}
    for origin in origins_for(series, n_origins):
        targets = _targets(series, origin, horizon)
        if not targets:
            continue
        actual = [series.values[d] for d in targets]
        train = [d for d in dates if d <= origin and feats[d] is not None]
        if len(train) < RIDGE_MIN_ROWS:
            fallback = max(0.0, ma7_value(series.upto(origin)))
            for a in alphas:
                out[a].extend((y, fallback) for y in actual)
            continue
        x = np.vstack([feats[d] for d in train])
        y = np.array([series.values[d] for d in train])
        mean = x.mean(axis=0)
        scale = x.std(axis=0)
        scale[scale < 10 * np.finfo(np.float64).eps] = 1.0
        xs = (x - mean) / scale
        y_mean = float(y.mean())
        gram = xs.T @ xs
        xty = xs.T @ (y - y_mean)
        fallback = ma7_value(series.upto(origin))
        rows = [feats[d] for d in targets]
        for a in alphas:
            coef = np.linalg.solve(gram + a * np.eye(gram.shape[0]), xty)
            for yv, r in zip(actual, rows, strict=True):
                p = (
                    fallback
                    if r is None
                    else float(((r - mean) / scale) @ coef + y_mean)
                )
                out[a].append((yv, max(0.0, p)))
    return out


def wape(pairs: list[tuple[float, float]]) -> float | None:
    """Σ|aktual − prediksi| / Σ aktual × 100. None jika belum ada pasangan atau Σ aktual = 0."""
    total = sum(a for a, _ in pairs)
    if not pairs or total <= 0:
        return None
    return sum(abs(a - p) for a, p in pairs) / total * 100.0
