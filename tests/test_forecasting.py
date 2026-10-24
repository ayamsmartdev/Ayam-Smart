"""Tes pipeline forecast: fitur, peramal, backtest, pemilihan model, rentang, kontrak (T-17)."""

from datetime import date, timedelta

import numpy as np
import pytest

from forecasting.backtest import backtest_pairs, origins_for, wape
from forecasting.contract import MAX_HISTORY, ContractError, handle, parse_request
from forecasting.features import FEATURE_NAMES, Series, feature_row
from forecasting.models import forecast, forecast_ma7, forecast_ridge, forecast_snaive
from forecasting.run import candidates, choose, forecast_series
from scripts.forecast_demo_request import build_request

D0 = date(2026, 6, 1)  # Senin


def make_series(values, start=D0, skip=(), censored=(), context=None) -> Series:
    vals = {
        start + timedelta(days=i): float(v)
        for i, v in enumerate(values)
        if i not in set(skip)
    }
    return Series(
        values=vals,
        censored=frozenset(start + timedelta(days=i) for i in censored),
        context=context or {},
    )


def days(n: int) -> list[date]:
    return [D0 + timedelta(days=i) for i in range(n)]


# ── fitur ───────────────────────────────────────────────────────────────────
def test_fitur_hanya_memakai_data_minimal_7_hari_sebelumnya():
    s = make_series(range(1, 31))
    target = D0 + timedelta(days=20)
    row = feature_row(s, target, D0)
    assert row is not None and len(row) == len(FEATURE_NAMES)
    # Mengubah nilai d−6 … d tidak boleh mengubah fitur (tidak mengintip masa depan).
    changed = Series(
        values={**s.values, **{target - timedelta(days=k): 999.0 for k in range(7)}}
    )
    assert np.array_equal(feature_row(changed, target, D0), row)
    named = dict(zip(FEATURE_NAMES, row, strict=True))
    assert named["lag7"] == s.values[target - timedelta(days=7)]
    assert named["rata_minggu_lalu"] == pytest.approx(np.mean(range(8, 15)))
    assert named[f"hari_{target.weekday()}"] == 1.0


def test_fitur_awal_bulan_dan_penanda_hari():
    s = make_series([10] * 40, context={date(2026, 7, 3): "gajian"})
    jul3 = dict(zip(FEATURE_NAMES, feature_row(s, date(2026, 7, 3), D0), strict=True))
    jul8 = dict(zip(FEATURE_NAMES, feature_row(s, date(2026, 7, 8), D0), strict=True))
    jul20 = dict(zip(FEATURE_NAMES, feature_row(s, date(2026, 7, 20), D0), strict=True))
    assert (jul3["tgl_1_5"], jul3["tgl_6_10"], jul3["tag_gajian"]) == (1.0, 0.0, 1.0)
    assert (jul8["tgl_1_5"], jul8["tgl_6_10"], jul8["tag_gajian"]) == (0.0, 1.0, 0.0)
    assert (jul20["tgl_1_5"], jul20["tgl_6_10"]) == (0.0, 0.0)


def test_fitur_lag7_kosong_memakai_rata_minggu_lalu_dan_none_jika_minggu_lalu_kosong():
    s = make_series([10 * (i + 1) for i in range(15)], skip=(7,))  # d−7 (8 Juni) kosong
    row = dict(
        zip(FEATURE_NAMES, feature_row(s, D0 + timedelta(days=14), D0), strict=True)
    )
    # Minggu lalu = 2–8 Juni tanpa 8 Juni → 20…70.
    assert row["lag7"] == row["rata_minggu_lalu"] == pytest.approx(45.0)
    assert feature_row(s, D0 + timedelta(days=3), D0) is None


# ── peramal ─────────────────────────────────────────────────────────────────
def test_ma7_dan_snaive():
    s = make_series([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14])
    targets = [D0 + timedelta(days=14 + i) for i in range(3)]
    assert forecast_ma7(s, targets) == [11.0] * 3
    assert forecast_snaive(s, targets) == [8.0, 9.0, 10.0]
    # Minggu lalu kosong → 2 minggu lalu; dua-duanya kosong → ma7.
    s2 = make_series([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], skip=(7,))
    assert forecast_snaive(s2, targets[:1]) == [1.0]
    s3 = make_series([5] * 6 + [7] * 3, start=D0)
    assert forecast_snaive(s3, [D0 + timedelta(days=30)]) == forecast_ma7(s3, [D0])


def test_ridge_menangkap_pola_mingguan_dan_awal_bulan():
    rng = np.random.default_rng(1)
    vals = []
    for d in days(150):
        v = 30 + (12 if d.weekday() >= 5 else 0) + (10 if d.day <= 5 else 0)
        vals.append(v + rng.normal(0, 1))
    s = make_series(vals)
    targets = [
        date(2026, 11, 1),
        date(2026, 11, 2),
        date(2026, 11, 12),
    ]  # Min, Sen, Kam
    pred = forecast_ridge(s, targets)
    assert pred[0] == pytest.approx(52, abs=3)
    assert pred[1] == pytest.approx(40, abs=3)
    # Kamis tanggal tua: sedikit terangkat karena lag-7 jatuh di awal bulan (Ridge menyusut).
    assert pred[2] == pytest.approx(30, abs=4)


def test_ridge_kurang_data_memakai_ma7_dan_tidak_pernah_negatif():
    s = make_series([4, 5, 6, 7, 8, 9, 10, 11, 12, 13])
    assert forecast_ridge(s, [D0 + timedelta(days=10)]) == forecast_ma7(s, [D0])
    falling = make_series([max(0, 60 - 2 * i) for i in range(40)])
    assert (
        min(
            forecast(m, falling, [D0 + timedelta(days=40 + i) for i in range(7)])[0]
            for m in ("ma7", "snaive", "ridge")
        )
        >= 0
    )


def test_model_tidak_dikenal_ditolak():
    with pytest.raises(ValueError):
        forecast("lstm", make_series([1, 2]), [D0])


# ── backtest ────────────────────────────────────────────────────────────────
def test_wape():
    assert wape([(10, 8), (10, 13)]) == pytest.approx(25.0)
    assert wape([]) is None
    assert wape([(0, 1), (0, 0)]) is None


def test_backtest_tidak_mengintip_masa_depan():
    vals = list(range(40))
    s = make_series(vals)
    origins = origins_for(s)
    assert len(origins) == 14 and origins[-1] == D0 + timedelta(days=38)
    pairs = backtest_pairs("snaive", s, horizon=1)
    # snaive h=1: prediksi = nilai 7 hari sebelum target → selalu aktual − 7.
    assert pairs and all(a - p == 7 for a, p in pairs)


def test_backtest_melewati_hari_tutup():
    s = make_series(range(30), skip=(25, 26))
    pairs = backtest_pairs("ma7", s, horizon=3)
    actuals = {a for a, _ in pairs}
    assert 25.0 not in actuals and 26.0 not in actuals


# ── pemilihan model ─────────────────────────────────────────────────────────
@pytest.mark.parametrize(
    ("n", "expected"),
    [
        (1, ("ma7",)),
        (6, ("ma7",)),
        (7, ("ma7", "snaive")),
        (27, ("ma7", "snaive")),
        (28, ("ma7", "snaive", "ridge")),
    ],
)
def test_kandidat_menurut_jumlah_hari(n, expected):
    assert candidates(n) == expected


def test_pilih_wape_terkecil_dan_seri_kurang_1_poin_pilih_yang_sederhana():
    assert choose({"ma7": 20.0, "snaive": 15.0, "ridge": 12.0}) == "ridge"
    assert choose({"ma7": 12.5, "snaive": 15.0, "ridge": 12.0}) == "ma7"
    assert choose({"ma7": 13.0, "snaive": 12.2, "ridge": 12.0}) == "snaive"
    assert choose({"ma7": None, "snaive": None}) == "ma7"
    assert choose({"ma7": None, "snaive": 30.0}) == "snaive"


def test_seri_kosong():
    out = forecast_series(Series(values={}), D0, 5)
    assert out["model"] is None and out["forecast"] == [] and out["data_days"] == 0
    assert out["warnings"] == ["Belum ada data penjualan."]


def test_data_sedikit_ma7_tanpa_rentang_dan_ada_peringatan():
    out = forecast_series(make_series([10, 12, 11]), D0 + timedelta(days=3), 5)
    assert out["model"] == "ma7" and out["error_pct"] is None and out["data_days"] == 3
    assert [p["date"] for p in out["forecast"]] == [
        (D0 + timedelta(days=3 + i)).isoformat() for i in range(5)
    ]
    assert all(p["predicted"] == 11.0 and p["lower"] is None for p in out["forecast"])
    assert "sangat sedikit" in out["warnings"][0]


def test_10_hari_belum_diuji():
    out = forecast_series(make_series([10] * 10), D0 + timedelta(days=10), 3)
    assert out["error_pct"] is None and "belum bisa diuji" in out["warnings"][0]


def test_pola_mingguan_kuat_memilih_bukan_ma7_dan_rentang_mengapit_prediksi():
    rng = np.random.default_rng(3)
    vals = [(60 if d.weekday() >= 5 else 30) + rng.normal(0, 2) for d in days(60)]
    out = forecast_series(make_series(vals), D0 + timedelta(days=60), 7)
    assert out["model"] in ("snaive", "ridge") and out["error_pct"] < 15
    for p in out["forecast"]:
        assert p["lower"] is not None and p["lower"] <= p["predicted"] <= p["upper"]
        assert p["lower"] >= 0


def test_hari_stok_habis_hanya_menjadi_peringatan():
    vals = [20 + (i % 7) for i in range(30)]
    a = forecast_series(make_series(vals), D0 + timedelta(days=30), 3)
    b = forecast_series(make_series(vals, censored=(5, 12)), D0 + timedelta(days=30), 3)
    assert a["forecast"] == b["forecast"] and a["model"] == b["model"]
    assert any("2 hari stok habis" in w for w in b["warnings"])
    assert not any("stok habis" in w for w in a["warnings"])


# ── kontrak ─────────────────────────────────────────────────────────────────
def body(**over):
    base = {
        "horizon": 3,
        "start_date": "2026-06-11",
        "series": [
            {
                "menu_id": "a",
                "history": [
                    {"date": (D0 + timedelta(days=i)).isoformat(), "qty": 10 + i}
                    for i in range(10)
                ],
            }
        ],
    }
    base.update(over)
    return base


def test_kontrak_valid_dan_bentuk_response():
    out = handle(body(context=[{"date": "2026-06-12", "tag": "gajian"}]))
    assert list(out) == ["results"] and len(out["results"]) == 1
    r = out["results"][0]
    assert set(r) == {
        "menu_id",
        "model",
        "error_pct",
        "data_days",
        "forecast",
        "warnings",
    }
    assert r["menu_id"] == "a" and r["data_days"] == 10 and len(r["forecast"]) == 3
    assert set(r["forecast"][0]) == {"date", "predicted", "lower", "upper"}


def test_censored_dates_di_luar_history_diabaikan():
    s = body()["series"][0]
    s["censored_dates"] = ["2026-06-02", "2026-05-01"]
    req = parse_request(body(series=[s]))
    assert req.series[0][1].censored == frozenset({date(2026, 6, 2)})


def _hist(n):
    return [
        {"date": (D0 - timedelta(days=n - i)).isoformat(), "qty": 1} for i in range(n)
    ]


@pytest.mark.parametrize(
    ("over", "pesan"),
    [
        ({"horizon": 0}, "horizon"),
        ({"horizon": 8}, "horizon"),
        ({"horizon": True}, "horizon"),
        ({"horizon": "3"}, "horizon"),
        ({"start_date": "11-06-2026"}, "start_date"),
        ({"start_date": "2026-02-30"}, "tidak valid"),
        ({"series": []}, "minimal 1"),
        ({"series": "x"}, "daftar"),
        ({"series": [{"menu_id": "a", "history": []}] * 51}, "maksimal 50"),
        ({"series": [{"menu_id": "", "history": []}]}, "menu_id"),
        (
            {
                "series": [
                    {"menu_id": "a", "history": []},
                    {"menu_id": "a", "history": []},
                ]
            },
            "kembar",
        ),
        (
            {
                "series": [
                    {"menu_id": "a", "history": [{"date": "2026-06-01", "qty": -1}]}
                ]
            },
            "qty",
        ),
        (
            {
                "series": [
                    {"menu_id": "a", "history": [{"date": "2026-06-01", "qty": "5"}]}
                ]
            },
            "qty",
        ),
        (
            {
                "series": [
                    {
                        "menu_id": "a",
                        "history": [{"date": "2026-06-01", "qty": float("nan")}],
                    }
                ]
            },
            "qty",
        ),
        (
            {
                "series": [
                    {"menu_id": "a", "history": [{"date": "2026-06-11", "qty": 1}]}
                ]
            },
            "sebelum start_date",
        ),
        (
            {
                "series": [
                    {"menu_id": "a", "history": [{"date": "2026-06-01", "qty": 1}] * 2}
                ]
            },
            "dua kali",
        ),
        (
            {"series": [{"menu_id": "a", "history": _hist(MAX_HISTORY + 1)}]},
            "maksimal 400",
        ),
        ({"context": [{"date": "2026-06-12", "tag": "hujan"}]}, "tag"),
        ({"context": [{"date": "2026-06-12", "tag": "ramai"}] * 2}, "dua kali"),
    ],
)
def test_kontrak_menolak_input_salah(over, pesan):
    with pytest.raises(ContractError, match=pesan):
        parse_request(body(**over))


@pytest.mark.parametrize("payload", [None, [], "x", 5])
def test_kontrak_body_bukan_objek(payload):
    with pytest.raises(ContractError, match="objek"):
        parse_request(payload)


# ── integrasi dengan data simulasi ──────────────────────────────────────────
def test_integrasi_data_simulasi_120_hari():
    req = build_request(date(2026, 11, 3), days=120, horizon=5)
    out = handle(req)
    results = {r["menu_id"]: r for r in out["results"]}
    assert len(results) == 12
    gb = results["Geprek bakar"]
    assert gb["model"] in ("ma7", "snaive", "ridge") and gb["data_days"] > 100
    assert gb["forecast"][0]["date"] == "2026-11-04"
    # Prediksi geprek bakar masuk akal (data simulasi ±29 porsi/hari, lebih ramai awal bulan).
    assert all(15 <= p["predicted"] <= 50 for p in gb["forecast"])
    assert any("stok habis" in w for w in gb["warnings"])
    assert not any("stok habis" in w for w in results["Kentang"]["warnings"])
    for r in results.values():
        assert r["error_pct"] is not None
        for p in r["forecast"]:
            assert p["lower"] <= p["predicted"] <= p["upper"]
