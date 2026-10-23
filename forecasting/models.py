"""
Model forecast (ARCHITECTURE §6.2). Hanya bergantung pada numpy (D-25).

Ridge di sini setara dengan scikit-learn
`make_pipeline(StandardScaler(), Ridge(alpha=alpha))`:
- fitur distandarkan memakai rata-rata dan simpangan baku populasi (ddof=0);
  kolom konstan dibagi 1, bukan 0;
- intercept tidak ikut dipenalti.
Kesetaraannya dibuktikan di tests/test_models.py (dibandingkan dengan scikit-learn).

MA7 dan seasonal naive ditambahkan di T-17.
"""

from dataclasses import dataclass

import numpy as np
from numpy.typing import ArrayLike, NDArray

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
