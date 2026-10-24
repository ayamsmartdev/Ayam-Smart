"""
Backtest rolling-origin + WAPE (ARCHITECTURE §6.3, D-10).

Untuk tiap titik asal (hingga 14 tanggal tercatat terakhir, kecuali yang paling akhir):
riwayat dipotong sampai titik asal, model meramal 1…horizon hari ke depan, lalu
dibandingkan dengan angka yang benar-benar tercatat.
"""

from __future__ import annotations

from datetime import date, timedelta

from forecasting.features import Series
from forecasting.models import forecast

BACKTEST_ORIGINS = 14


def origins_for(series: Series, n_origins: int = BACKTEST_ORIGINS) -> list[date]:
    dates = series.dates
    return dates[-(n_origins + 1) : -1] if len(dates) > 1 else []


def backtest_pairs(
    model: str,
    series: Series,
    horizon: int,
    n_origins: int = BACKTEST_ORIGINS,
) -> list[tuple[float, float]]:
    """Pasangan (aktual, prediksi) dari semua titik asal dan horizon."""
    pairs: list[tuple[float, float]] = []
    for origin in origins_for(series, n_origins):
        targets = [
            d
            for d in (origin + timedelta(days=h) for h in range(1, horizon + 1))
            if d in series.values
        ]
        if not targets:
            continue
        preds = forecast(model, series.upto(origin), targets)
        pairs.extend((series.values[d], p) for d, p in zip(targets, preds, strict=True))
    return pairs


def wape(pairs: list[tuple[float, float]]) -> float | None:
    """Σ|aktual − prediksi| / Σ aktual × 100. None jika belum ada pasangan atau Σ aktual = 0."""
    total = sum(a for a, _ in pairs)
    if not pairs or total <= 0:
        return None
    return sum(abs(a - p) for a, p in pairs) / total * 100.0
