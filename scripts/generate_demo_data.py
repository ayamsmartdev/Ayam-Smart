"""
AYAMSMART — generator DATA SIMULASI (dataset 'demo', D-08). Bukan data nyata klien.

Membuat N hari penjualan per kategori + stok ayam dada (belanja, sisa freezer) dengan pola
dari perkiraan pemilik (PRD Q-04) dan beberapa ASUMSI yang ditandai jelas di PARAMS.
Hasilnya file SQL untuk Supabase → SQL Editor. Seed tetap → hasil selalu sama.

Pemakaian (Windows):
    py -3.12 scripts/generate_demo_data.py                     # 120 hari s.d. kemarin (WIB)
    py -3.12 scripts/generate_demo_data.py --end 2026-11-03    # s.d. tanggal tertentu
File keluaran: scripts/out/demo_data.sql (diabaikan Git; buat ulang kapan saja).

Kalibrasi ulang (T-33): ubah angka di PARAMS setelah rekap asli terkumpul, lalu jalankan lagi.
"""

from __future__ import annotations

import argparse
import math
import sys
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import numpy as np

# ── Parameter simulasi (SATU tempat untuk kalibrasi) ─────────────────────────
# Sumber: "klien" = dari jawaban pemilik (24 Okt 2026); "asumsi" = belum ada info, ganti jika ada data.
PARAMS: dict = {
    # Porsi ayam per hari biasa. Klien: 40–50 porsi ayam → titik tengah 45.
    "base_chicken_portions": 45.0,
    # Klien: "hari rame awal bulan, tanggal tua standard". Besaran kenaikan = asumsi.
    # Format: (tanggal awal, tanggal akhir, pengali).
    "month_multiplier": [(1, 5, 1.20), (6, 10, 1.10)],
    # Klien: ramai tergantung promo Shopee/Grab/Gojek. Frekuensi & besaran = asumsi.
    "promo_probability": 0.08,
    "promo_multiplier": 1.25,
    # Pola mingguan: klien tidak menyebut → sengaja datar (1,0), jangan dikarang.
    # Urutan Senin..Minggu.
    "weekday_multiplier": [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
    # Variasi acak harian (lognormal) di atas Poisson. Asumsi.
    "daily_noise_sigma": 0.08,
    # Hari tutup: klien belum menjawab (Q-04). Asumsi: jarang.
    "closed_probability": 0.02,
    # Pembagian porsi ayam per kategori. Klien: geprek bakar 60–70%. Sisanya = asumsi.
    "chicken_shares": {
        "Geprek bakar": 0.65,
        "Geprek": 0.12,
        "Spesial": 0.07,
        "Crispy steak single": 0.05,
        "Ayam katsu": 0.05,
        "Ayam crispy": 0.04,
        "Crispy steak double": 0.02,
    },
    # Potong dada per porsi. Klien: 1 untuk semua menu ayam, 2 untuk steak double.
    "pieces_per_portion": {"Crispy steak double": 2},
    # Rata-rata porsi/hari kategori non-ayam. Klien belum memberi angka → asumsi kecil.
    "other_means": {
        "Kulit crispy": 3.0,
        "Lele": 4.0,
        "Nugget": 4.0,
        "Bakso & sosis": 3.0,
        "Kentang": 5.0,
    },
    # Belanja harian. Klien: "standart beli 5–6 kg", 1 kg = 9–10 potong
    # (dipakai 8–10 agar ada hari ayam kecil). Aturan: sisa kemarin ≥ 10 → 5 kg;
    # ≥ 5 → 5,5 kg; selain itu 6 kg.
    "buy_kg_rule": [(10, 5.0), (5, 5.5)],
    "buy_kg_default": 6.0,
    "pieces_per_kg_range": (8, 10),
    # Ayam tidak tercatat per hari (rusak/dipakai sendiri), 0..N potong. Asumsi.
    "untracked_max": 2,
    # Peluang penjual mengisi jumlah potong saat belanja (sisanya hanya kg). Asumsi.
    "count_pieces_probability": 0.7,
    "initial_leftover": 6,
}

STOCK_INGREDIENT = "Ayam dada"


@dataclass
class DemoData:
    start: date
    end: date
    # (tanggal, kategori, porsi)
    sales: list[tuple[date, str, int]] = field(default_factory=list)
    # (tanggal, kg dibeli, potong dibeli atau None, sisa ke freezer)
    stock: list[tuple[date, float, int | None, int]] = field(default_factory=list)
    closed: list[date] = field(default_factory=list)
    stockout_days: int = 0
    untracked_total: int = 0


def month_multiplier(day: int, params: dict) -> float:
    for lo, hi, mult in params["month_multiplier"]:
        if lo <= day <= hi:
            return mult
    return 1.0


def _buy_kg(prev_leftover: int, params: dict) -> float:
    for min_leftover, kg in params["buy_kg_rule"]:
        if prev_leftover >= min_leftover:
            return kg
    return params["buy_kg_default"]


def simulate(
    end: date, days: int = 120, seed: int = 42, params: dict | None = None
) -> DemoData:
    """Simulasi harian. Penjualan ayam dibatasi stok yang tersedia (bisa kehabisan)."""
    p = PARAMS if params is None else params
    rng = np.random.default_rng(seed)
    start = end - timedelta(days=days - 1)
    data = DemoData(start=start, end=end)

    cats = list(p["chicken_shares"])
    shares = np.array([p["chicken_shares"][c] for c in cats], dtype=float)
    shares = shares / shares.sum()
    ppp = np.array([p["pieces_per_portion"].get(c, 1) for c in cats])
    lo_ppk, hi_ppk = p["pieces_per_kg_range"]
    prev_leftover = int(p["initial_leftover"])

    for i in range(days):
        d = start + timedelta(days=i)
        # Urutan pemanggilan rng dibuat tetap agar hasil deterministik per seed.
        closed = rng.random() < p["closed_probability"]
        promo = rng.random() < p["promo_probability"]
        noise = math.exp(rng.normal(0.0, p["daily_noise_sigma"]))
        if closed:
            data.closed.append(d)
            continue  # stok freezer tidak berubah; tidak ada baris stok (sama seperti alur nyata)

        mult = month_multiplier(d.day, p) * p["weekday_multiplier"][d.weekday()]
        lam = (
            p["base_chicken_portions"]
            * mult
            * (p["promo_multiplier"] if promo else 1.0)
            * noise
        )
        demand = rng.multinomial(rng.poisson(lam), shares)

        kg = _buy_kg(prev_leftover, p)
        ppk = int(rng.integers(lo_ppk, hi_ppk + 1))
        bought = round(kg * ppk)
        available = prev_leftover + bought

        sold = demand.copy()
        if int((sold * ppp).sum()) > available:
            data.stockout_days += 1
            # Kurangi porsi sampai muat di stok, mulai dari kategori dengan porsi terbanyak.
            while int((sold * ppp).sum()) > available:
                sold[int(np.argmax(sold))] -= 1
        used = int((sold * ppp).sum())
        untracked = min(int(rng.integers(0, p["untracked_max"] + 1)), available - used)
        leftover = available - used - untracked
        data.untracked_total += untracked

        for c, q in zip(cats, sold, strict=True):
            data.sales.append((d, c, int(q)))
        for c, mean in p["other_means"].items():
            data.sales.append((d, c, int(rng.poisson(mean * mult))))

        counted = rng.random() < p["count_pieces_probability"]
        data.stock.append((d, kg, bought if counted else None, leftover))
        prev_leftover = leftover

    return data


def all_categories(params: dict | None = None) -> list[str]:
    p = PARAMS if params is None else params
    return [*p["chicken_shares"], *p["other_means"]]


def _q(text: str) -> str:
    return "'" + text.replace("'", "''") + "'"


def render_sql(data: DemoData, params: dict | None = None) -> str:
    """SQL idempoten: hapus dataset 'demo' lama, isi ulang. Tidak menyentuh data 'live'."""
    cats = all_categories(params)
    cat_list = ", ".join(_q(c.lower()) for c in cats)
    sales_values = ",\n".join(
        f"  ({_q(d.isoformat())}, {_q(c)}, {q})" for d, c, q in data.sales
    )
    stock_values = ",\n".join(
        f"  ({_q(d.isoformat())}, {kg:.2f}, {'null' if pcs is None else pcs}, {left})"
        for d, kg, pcs, left in data.stock
    )
    closed_values = ",\n".join(f"  ({_q(d.isoformat())})" for d in data.closed)

    parts = [
        "-- AYAMSMART — DATA SIMULASI (dataset 'demo'). Dibuat oleh scripts/generate_demo_data.py.",
        f"-- Rentang {data.start} s.d. {data.end}. Bukan data nyata klien. Aman dijalankan ulang.",
        "begin;",
        "",
        "-- Pastikan semua kategori & bahan yang dipakai simulasi ada (kalau tidak, batalkan semuanya).",
        "do $$",
        "begin",
        f"  if (select count(*) from public.menus where lower(trim(name)) in ({cat_list})) <> {len(cats)} then",
        "    raise exception 'Kategori demo tidak lengkap: jalankan SQL isi kategori klien dulu.';",
        "  end if;",
        f"  if not exists (select 1 from public.ingredients where lower(trim(name)) = {_q(STOCK_INGREDIENT.lower())}) then",
        f"    raise exception 'Bahan {STOCK_INGREDIENT} tidak ada.';",
        "  end if;",
        "end $$;",
        "",
        "delete from public.daily_sales   where dataset = 'demo';",
        "delete from public.daily_stock   where dataset = 'demo';",
        "delete from public.daily_context where dataset = 'demo';",
        "",
        "insert into public.daily_sales (dataset, sale_date, menu_id, qty)",
        "select 'demo', v.d::date, m.id, v.q",
        "  from (values",
        sales_values,
        "  ) as v(d, cat, q)",
        "  join public.menus m on lower(trim(m.name)) = lower(v.cat);",
        "",
        "insert into public.daily_stock (dataset, stock_date, ingredient_id, bought_kg, bought_pieces, leftover_pieces)",
        "select 'demo', v.d::date, i.id, v.kg, v.pcs, v.sisa",
        "  from (values",
        stock_values,
        "  ) as v(d, kg, pcs, sisa)",
        f"  cross join (select id from public.ingredients where lower(trim(name)) = {_q(STOCK_INGREDIENT.lower())}) i;",
    ]
    if data.closed:
        parts += [
            "",
            "insert into public.daily_context (dataset, ctx_date, tag, note)",
            "select 'demo', v.d::date, 'tutup', 'simulasi'",
            "  from (values",
            closed_values,
            "  ) as v(d);",
        ]
    parts += [
        "",
        "commit;",
        "",
        "-- Cek: jumlah baris per tabel untuk dataset demo.",
        "select 'daily_sales' as tabel, count(*) as baris from public.daily_sales where dataset = 'demo'",
        "union all select 'daily_stock', count(*) from public.daily_stock where dataset = 'demo'",
        "union all select 'daily_context', count(*) from public.daily_context where dataset = 'demo';",
        "",
    ]
    return "\n".join(parts)


def summary(data: DemoData, params: dict | None = None) -> dict:
    p = PARAMS if params is None else params
    chicken = set(p["chicken_shares"])
    by_day: dict[date, int] = {}
    gb_total = 0
    for d, c, q in data.sales:
        if c in chicken:
            by_day[d] = by_day.get(d, 0) + q
            if c == "Geprek bakar":
                gb_total += q
    total = sum(by_day.values())
    return {
        "open_days": len(by_day),
        "closed_days": len(data.closed),
        "avg_chicken_portions": round(total / max(len(by_day), 1), 1),
        "geprek_bakar_share": round(gb_total / max(total, 1), 3),
        "stockout_days": data.stockout_days,
        "avg_leftover": round(
            sum(s[3] for s in data.stock) / max(len(data.stock), 1), 1
        ),
        "untracked_total": data.untracked_total,
    }


def _yesterday_wib() -> date:
    # WIB = UTC+7 tetap (tanpa paket tzdata, aman di Windows).
    return (datetime.now(timezone(timedelta(hours=7))) - timedelta(days=1)).date()


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Buat SQL data simulasi (dataset 'demo').")
    ap.add_argument(
        "--end",
        type=date.fromisoformat,
        default=None,
        help="Tanggal terakhir (YYYY-MM-DD). Bawaan: kemarin WIB",
    )
    ap.add_argument("--days", type=int, default=120)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument(
        "--out",
        type=Path,
        default=Path(__file__).resolve().parent / "out" / "demo_data.sql",
    )
    args = ap.parse_args(argv)

    end = args.end or _yesterday_wib()
    if not 7 <= args.days <= 400:
        ap.error("--days harus 7–400.")
    data = simulate(end, args.days, args.seed)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(render_sql(data), encoding="utf-8")

    s = summary(data)
    print(f"Tersimpan: {args.out}", file=sys.stderr)
    print(f"Rentang {data.start} s.d. {data.end}, seed {args.seed}", file=sys.stderr)
    for k, v in s.items():
        print(f"  {k}: {v}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
