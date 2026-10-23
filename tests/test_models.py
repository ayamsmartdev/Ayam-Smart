"""
Ridge numpy (forecasting.models) harus identik dengan scikit-learn
StandardScaler + Ridge. scikit-learn hanya dipasang untuk tes (requirements-dev.txt).
"""

import numpy as np
import pytest

from forecasting.models import fit_ridge

sk_pipeline = pytest.importorskip("sklearn.pipeline")
sk_linear = pytest.importorskip("sklearn.linear_model")
sk_pre = pytest.importorskip("sklearn.preprocessing")

TOL = {"rtol": 1e-8, "atol": 1e-8}


def _sklearn_predict(x_train, y_train, x_test, alpha):
    model = sk_pipeline.make_pipeline(
        sk_pre.StandardScaler(), sk_linear.Ridge(alpha=alpha)
    )
    return model.fit(x_train, y_train).predict(x_test)


def _sales_like(days=120, seed=7):
    """Fitur mirip §6.2: one-hot hari, lag-7, rata-rata 7 hari, tren."""
    rng = np.random.default_rng(seed)
    dow = np.arange(days) % 7
    qty = 40 + 8 * (dow >= 5) + rng.normal(0, 4, days)
    rows = np.arange(7, days)
    x = np.column_stack(
        [
            np.eye(7)[dow[rows]],
            qty[rows - 7],
            [qty[r - 7 : r].mean() for r in rows],
            rows / days,
        ]
    )
    return x, qty[rows]


@pytest.mark.parametrize("alpha", [0.1, 1.0, 10.0])
def test_sama_dengan_sklearn_pada_data_mirip_penjualan(alpha):
    x, y = _sales_like()
    split = len(y) - 14
    ours = fit_ridge(x[:split], y[:split], alpha).predict(x[split:])
    np.testing.assert_allclose(
        ours, _sklearn_predict(x[:split], y[:split], x[split:], alpha), **TOL
    )


def test_sama_dengan_sklearn_saat_ada_kolom_konstan():
    rng = np.random.default_rng(1)
    x = rng.normal(size=(30, 4))
    x[:, 2] = 5.0  # mis. penanda hari yang tidak pernah muncul
    y = x @ np.array([1.5, -2.0, 0.0, 0.7]) + rng.normal(0, 0.1, 30)
    np.testing.assert_allclose(
        fit_ridge(x, y).predict(x), _sklearn_predict(x, y, x, 1.0), **TOL
    )


def test_sama_dengan_sklearn_saat_fitur_lebih_banyak_dari_data():
    rng = np.random.default_rng(2)
    x = rng.normal(size=(8, 12))
    y = rng.normal(size=8)
    np.testing.assert_allclose(
        fit_ridge(x, y, 2.0).predict(x), _sklearn_predict(x, y, x, 2.0), **TOL
    )


@pytest.mark.parametrize(
    ("x", "y", "alpha"),
    [
        ([[1.0], [2.0]], [1.0, 2.0], 0.0),  # alpha harus > 0
        ([1.0, 2.0], [1.0, 2.0], 1.0),  # fitur bukan 2 dimensi
        ([[1.0], [2.0]], [1.0], 1.0),  # panjang beda
        ([[1.0], [float("nan")]], [1.0, 2.0], 1.0),  # ada NaN
        (np.empty((0, 2)), [], 1.0),  # kosong
    ],
)
def test_input_tidak_valid_ditolak(x, y, alpha):
    with pytest.raises(ValueError):
        fit_ridge(x, y, alpha)


def test_jumlah_fitur_saat_prediksi_harus_sama():
    model = fit_ridge([[1.0, 2.0], [2.0, 1.0], [3.0, 3.0]], [1.0, 2.0, 3.0])
    with pytest.raises(ValueError):
        model.predict([[1.0]])
