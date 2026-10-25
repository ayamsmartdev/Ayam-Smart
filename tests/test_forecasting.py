"""Tes pipeline forecast: fitur, peramal, backtest, Ridge utama + alpha, rentang, faktor, kontrak (T-17, D-33)."""

from datetime import date, timedelta

import numpy as np
import pytest

from forecasting.backtest import backtest_pairs, origins_for, ridge_backtest_pairs, wape
from forecasting.contract import MAX_HISTORY, ContractError, handle, parse_request
from forecasting.features import FEATURE_NAMES, Series, feature_row
from forecasting.models import RIDGE_ALPHAS, forecast, forecast_ma7, forecast_ridge
from forecasting.run import choose_alpha, forecast_series
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
def test_ma7():
    s = make_series([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14])
    targets = [D0 + timedelta(days=14 + i) for i in range(3)]
    assert forecast_ma7(s, targets) == [11.0] * 3
    assert forecast_ma7(Series(values={}), targets[:1]) == [0.0]


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
            for m in ("ma7", "ridge")
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
    pairs = backtest_pairs("ma7", s, horizon=1)
    # ma7 h=1 pada deret naik 1/hari: rata-rata 7 hari sebelum target = aktual − 4.
    assert pairs and all(a - p == 4 for a, p in pairs)


def test_backtest_melewati_hari_tutup():
    s = make_series(range(30), skip=(25, 26))
    pairs = backtest_pairs("ma7", s, horizon=3)
    actuals = {a for a, _ in pairs}
    assert 25.0 not in actuals and 26.0 not in actuals


# ── Ridge utama + alpha (D-33) ──────────────────────────────────────────────
def _pattern(n, seed=1, noise=1.0):
    rng = np.random.default_rng(seed)
    return [
        30
        + (12 if d.weekday() >= 5 else 0)
        + (10 if d.day <= 5 else 0)
        + rng.normal(0, noise)
        for d in days(n)
    ]


@pytest.mark.parametrize("alpha", RIDGE_ALPHAS)
def test_backtest_ridge_cepat_sama_dengan_cara_biasa(alpha):
    s = make_series(_pattern(60), skip=(40, 41))
    fast = ridge_backtest_pairs(s, 5, RIDGE_ALPHAS)[alpha]
    slow = []
    for origin in origins_for(s):
        targets = [
            d
            for d in (origin + timedelta(days=h) for h in range(1, 6))
            if d in s.values
        ]
        preds = forecast_ridge(s.upto(origin), targets, alpha)
        slow.extend((s.values[d], p) for d, p in zip(targets, preds, strict=True))
    assert len(fast) == len(slow) > 0
    assert np.allclose(np.array(fast), np.array(slow), atol=1e-8)


def test_pilih_alpha_wape_terkecil_seri_ke_yang_kecil():
    assert (
        choose_alpha({1.0: 20.0, 3.0: 18.0, 10.0: 19.0, 30.0: None, 100.0: 25.0}) == 3.0
    )
    assert (
        choose_alpha({1.0: 18.0, 3.0: 18.0, 10.0: 19.0, 30.0: 18.0, 100.0: 25.0}) == 1.0
    )
    assert choose_alpha({a: None for a in RIDGE_ALPHAS}) == RIDGE_ALPHAS[0]


@pytest.mark.parametrize(
    ("n", "model"), [(6, "ma7"), (27, "ma7"), (28, "ridge"), (90, "ridge")]
)
def test_ridge_dipakai_mulai_28_hari(n, model):
    out = forecast_series(make_series(_pattern(n)), D0 + timedelta(days=n), 3)
    assert out["model"] == model
    if model == "ridge":
        assert out["alpha"] in RIDGE_ALPHAS and out["error_pct"] is not None
        assert not any(
            "belum cukup untuk machine learning" in w for w in out["warnings"]
        )
    else:
        assert out["alpha"] is None and out["factors"] == []
    if 7 <= n < 28:
        assert any("perlu 28 hari" in w for w in out["warnings"])


def test_pembanding_rata_rata_7_hari_ikut_dilaporkan():
    out = forecast_series(make_series(_pattern(90)), D0 + timedelta(days=90), 7)
    assert out["model"] == "ridge" and out["baseline_error_pct"] is not None
    # Pola mingguan + awal bulan kuat: Ridge jauh lebih akurat dari rata-rata biasa.
    assert out["error_pct"] < out["baseline_error_pct"] - 5


def test_faktor_yang_dipelajari_masuk_akal():
    out = forecast_series(
        make_series(_pattern(150, noise=0.5)), D0 + timedelta(days=150), 7
    )
    f = {x["key"]: x["effect"] for x in out["factors"]}
    assert set(f) >= {"hari_0", "hari_6", "tgl_1_5", "tgl_6_10", "tren"}
    assert not any(
        k.startswith("tag_") for k in f
    )  # tag tidak pernah muncul → tidak dilaporkan
    # Akhir pekan (+12) di atas hari kerja, awal bulan (+10) positif, tgl 6–10 kecil.
    assert f["hari_5"] > 3 and f["hari_6"] > 3 and f["hari_0"] < -1
    assert f["tgl_1_5"] > 3 and abs(f["tgl_6_10"]) < f["tgl_1_5"]
    assert (
        abs(sum(f[f"hari_{i}"] for i in range(7))) < 0.2
    )  # selisih terhadap rata-rata hari


def test_faktor_tag_muncul_jika_ada_di_riwayat():
    ctx = {D0 + timedelta(days=i): "gajian" for i in range(0, 120, 30)}
    vals = _pattern(120)
    for i in range(0, 120, 30):
        vals[i] += 15
    out = forecast_series(make_series(vals, context=ctx), D0 + timedelta(days=120), 3)
    f = {x["key"]: x["effect"] for x in out["factors"]}
    assert f.get("tag_gajian", 0) > 3


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
    assert out["error_pct"] is None and out["baseline_error_pct"] is None
    assert any("belum bisa diuji" in w for w in out["warnings"])


def test_pola_mingguan_kuat_ridge_dan_rentang_mengapit_prediksi():
    rng = np.random.default_rng(3)
    vals = [(60 if d.weekday() >= 5 else 30) + rng.normal(0, 2) for d in days(60)]
    out = forecast_series(make_series(vals), D0 + timedelta(days=60), 7)
    assert out["model"] == "ridge" and out["error_pct"] < 15
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
        "baseline_error_pct",
        "alpha",
        "factors",
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
    assert (
        gb["model"] == "ridge" and gb["data_days"] > 100 and gb["alpha"] in RIDGE_ALPHAS
    )
    assert gb["forecast"][0]["date"] == "2026-11-04"
    # Prediksi geprek bakar masuk akal (data simulasi ±29 porsi/hari, lebih ramai awal bulan).
    assert all(15 <= p["predicted"] <= 50 for p in gb["forecast"])
    assert any("stok habis" in w for w in gb["warnings"])
    assert not any("stok habis" in w for w in results["Kentang"]["warnings"])
    for r in results.values():
        assert r["error_pct"] is not None
        for p in r["forecast"]:
            assert p["lower"] <= p["predicted"] <= p["upper"]
