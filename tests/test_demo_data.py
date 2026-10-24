"""Tes generator data simulasi (scripts/generate_demo_data.py)."""

from datetime import date, timedelta

import pytest

from scripts.generate_demo_data import (
    PARAMS,
    all_categories,
    month_multiplier,
    render_sql,
    simulate,
    summary,
)

END = date(2026, 10, 23)


@pytest.fixture(scope="module")
def data():
    return simulate(END, days=120, seed=42)


def _chicken_by_day(d):
    chicken = set(PARAMS["chicken_shares"])
    out: dict[date, int] = {}
    for day, cat, q in d.sales:
        if cat in chicken:
            out[day] = out.get(day, 0) + q
    return out


def test_hasil_sama_untuk_seed_sama_dan_beda_untuk_seed_lain():
    a, b, c = simulate(END, 60, 7), simulate(END, 60, 7), simulate(END, 60, 8)
    assert a.sales == b.sales and a.stock == b.stock and a.closed == b.closed
    assert a.sales != c.sales


def test_rentang_tanggal_dan_tidak_ada_tanggal_masa_depan(data):
    assert data.start == END - timedelta(days=119) and data.end == END
    days = (
        {d for d, _, _ in data.sales} | {d for d, *_ in data.stock} | set(data.closed)
    )
    assert min(days) >= data.start and max(days) <= END
    assert len(days) == 120


def test_hari_tutup_tanpa_penjualan_dan_tanpa_stok(data):
    closed = set(data.closed)
    assert closed, "seed 42 seharusnya punya hari tutup untuk menguji alur tutup"
    assert not closed & {d for d, _, _ in data.sales}
    assert not closed & {d for d, *_ in data.stock}


def test_setiap_hari_buka_berisi_12_kategori(data):
    per_day: dict[date, set[str]] = {}
    for d, c, _ in data.sales:
        per_day.setdefault(d, set()).add(c)
    assert all(cats == set(all_categories()) for cats in per_day.values())
    assert len(all_categories()) == 12


def test_rata_rata_hari_biasa_sesuai_perkiraan_pemilik(data):
    by_day = _chicken_by_day(data)
    normal = [q for d, q in by_day.items() if d.day >= 11]
    assert 40 <= sum(normal) / len(normal) <= 50  # klien: 40–50 porsi ayam


def test_awal_bulan_lebih_ramai_dari_tanggal_tua(data):
    by_day = _chicken_by_day(data)
    early = [q for d, q in by_day.items() if d.day <= 5]
    late = [q for d, q in by_day.items() if d.day >= 11]
    assert sum(early) / len(early) >= 1.05 * sum(late) / len(late)
    assert (
        month_multiplier(1, PARAMS)
        > month_multiplier(8, PARAMS)
        > month_multiplier(20, PARAMS)
        == 1.0
    )


def test_geprek_bakar_60_sampai_70_persen(data):
    assert 0.60 <= summary(data)["geprek_bakar_share"] <= 0.70  # klien: 60–70%


def test_stok_konsisten_dan_penjualan_tidak_melebihi_stok(data):
    pieces = {
        c: PARAMS["pieces_per_portion"].get(c, 1) for c in PARAMS["chicken_shares"]
    }
    used: dict[date, int] = {}
    for d, c, q in data.sales:
        if c in pieces:
            used[d] = used.get(d, 0) + q * pieces[c]
    lo, hi = PARAMS["pieces_per_kg_range"]
    prev = PARAMS["initial_leftover"]
    for d, kg, bought, leftover in data.stock:
        assert kg in {5.0, 5.5, 6.0}
        assert leftover >= 0
        if bought is not None:
            assert lo * kg - 0.5 <= bought <= hi * kg + 0.5
            available = prev + bought
            assert used[d] + leftover <= available
            assert available - used[d] - leftover <= PARAMS["untracked_max"]
        prev = leftover


def test_ada_hari_jumlah_potong_tidak_diisi(data):
    # Menguji jalur "perkiraan" di aplikasi.
    assert any(b is None for _, _, b, _ in data.stock)
    assert any(b is not None for _, _, b, _ in data.stock)


def test_sql_hanya_menyentuh_dataset_demo_dan_lengkap(data):
    sql = render_sql(data)
    assert "raise exception" in sql  # kategori/bahan tidak lengkap → batal semua
    assert "'live'" not in sql
    assert sql.count("where dataset = 'demo'") >= 3
    assert sql.count("\n  ('") == len(data.sales) + len(data.stock) + len(data.closed)
    assert sql.strip().endswith("where dataset = 'demo';")
    # Kata kunci SQL tidak boleh dipakai sebagai nama kolom alias (mis. "left").
    assert "v.left" not in sql and ", left)" not in sql
