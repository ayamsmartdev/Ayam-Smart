"""
Model forecast (ARCHITECTURE §6.2). Hanya bergantung pada numpy (D-25).

Ridge di sini setara dengan scikit-learn
`make_pipeline(StandardScaler(), Ridge(alpha=alpha))`:
- fitur distandarkan memakai rata-rata dan simpangan baku populasi (ddof=0);
  kolom konstan dibagi 1, bukan 0;
- intercept tidak ikut dipenalti.
Kesetaraannya dibuktikan di tests/test_models.py (dibandingkan dengan scikit-learn).

Peramal (forecaster) — semua menerima riwayat yang SUDAH dipotong sampai titik asal
(`origin`) dan daftar tanggal target (origin+1 … origin+h, h ≤ 7):
- `ma7`    : rata-rata 7 hari tercatat terakhir
- `snaive` : nilai hari yang sama minggu lalu (atau 2 minggu lalu); jika tidak ada → ma7
- `ridge`  : Ridge pada fitur `forecasting.features`
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

import numpy as np
from numpy.typing import ArrayLike, NDArray

from forecasting.features import Series, feature_row

FloatArray = NDArray[np.float64]


@dataclass(frozen=True)
class RidgeModel:
    coef: FloatArray
    intercept: float
    mean: FloatArray
    scale: FloatArray

    def predict(self, features: ArrayLike) -> FloatArray:
        x = _as_matrix(features)
        if x.shape[1] != self.coef.shape[0]:
            raise ValueError(
                f"Jumlah fitur {x.shape[1]} tidak sama dengan saat fit "
                f"({self.coef.shape[0]})."
            )
        return ((x - self.mean) / self.scale) @ self.coef + self.intercept


def fit_ridge(features: ArrayLike, target: ArrayLike, alpha: float = 1.0) -> RidgeModel:
    """Latih Ridge regression: minimalkan ||y - Xw - b||² + alpha·||w||²."""
    if not alpha > 0:
        raise ValueError("alpha harus lebih dari 0.")
    x = _as_matrix(features)
    y = np.asarray(target, dtype=np.float64)
    if y.ndim != 1 or y.shape[0] != x.shape[0]:
        raise ValueError("Panjang target harus sama dengan jumlah baris fitur.")
    if x.shape[0] == 0:
        raise ValueError("Data latih kosong.")
    if not np.isfinite(y).all():
        raise ValueError("Target berisi nilai kosong atau tak hingga.")

    mean = x.mean(axis=0)
    scale = x.std(axis=0)
    scale[scale < 10 * np.finfo(np.float64).eps] = 1.0
    xs = (x - mean) / scale  # rata-rata tiap kolom = 0

    y_mean = float(y.mean())
    gram = xs.T @ xs + alpha * np.eye(xs.shape[1])
    coef = np.linalg.solve(gram, xs.T @ (y - y_mean))
    # Karena xs sudah terpusat, intercept = rata-rata target.
    return RidgeModel(coef=coef, intercept=y_mean, mean=mean, scale=scale)


def _as_matrix(features: ArrayLike) -> FloatArray:
    x = np.asarray(features, dtype=np.float64)
    if x.ndim != 2:
        raise ValueError("Fitur harus berbentuk tabel 2 dimensi (baris × kolom).")
    if not np.isfinite(x).all():
        raise ValueError("Fitur berisi nilai kosong atau tak hingga.")
    return x


# ── Peramal ─────────────────────────────────────────────────────────────────
#: Urutan dari yang paling sederhana; dipakai sebagai pemecah seri (D-10).
MODEL_ORDER = ("ma7", "snaive", "ridge")
RIDGE_ALPHA = 1.0
#: Minimal baris latih Ridge; kurang dari ini Ridge memakai ma7.
RIDGE_MIN_ROWS = 14


def _clip(values: list[float]) -> list[float]:
    return [max(0.0, float(v)) for v in values]


def ma7_value(series: Series) -> float:
    """Rata-rata 7 hari tercatat terakhir."""
    recent = [series.values[d] for d in series.dates[-7:]]
    return sum(recent) / len(recent) if recent else 0.0


def forecast_ma7(series: Series, targets: list[date]) -> list[float]:
    return _clip([ma7_value(series)] * len(targets))


def forecast_snaive(series: Series, targets: list[date]) -> list[float]:
    fallback = ma7_value(series)
    out = []
    for d in targets:
        value = fallback
        for weeks in (1, 2):
            past = d - timedelta(days=7 * weeks)
            if past in series.values:
                value = series.values[past]
                break
        out.append(value)
    return _clip(out)


def forecast_ridge(series: Series, targets: list[date]) -> list[float]:
    dates = series.dates
    if not dates:
        return [0.0] * len(targets)
    start = dates[0]
    rows, ys = [], []
    for d in dates:
        x = feature_row(series, d, start)
        if x is not None:
            rows.append(x)
            ys.append(series.values[d])
    if len(rows) < RIDGE_MIN_ROWS:
        return forecast_ma7(series, targets)
    model = fit_ridge(np.vstack(rows), np.array(ys), alpha=RIDGE_ALPHA)
    preds = []
    fallback = ma7_value(series)
    for d in targets:
        x = feature_row(series, d, start)
        preds.append(fallback if x is None else float(model.predict(x[None, :])[0]))
    return _clip(preds)


def forecast(name: str, series: Series, targets: list[date]) -> list[float]:
    if name == "ma7":
        return forecast_ma7(series, targets)
    if name == "snaive":
        return forecast_snaive(series, targets)
    if name == "ridge":
        return forecast_ridge(series, targets)
    raise ValueError(f"Model tidak dikenal: {name}")
