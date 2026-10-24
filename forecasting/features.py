"""
Riwayat satu seri (kategori) dan fitur Ridge (ARCHITECTURE §6.2, D-30).

Fitur untuk tanggal target d (tanpa prediksi rekursif, berlaku untuk horizon ≤ 7):
- one-hot hari dalam seminggu (7)
- one-hot awal bulan: tanggal 1–5 dan 6–10 (2). Klien: "hari rame awal bulan".
- one-hot penanda hari: ramai, sepi, libur, gajian (4). Boleh untuk tanggal mendatang.
- lag-7: nilai d−7 (jika tidak ada → rata-rata minggu lalu)
- rata-rata minggu lalu: rata-rata nilai d−13 … d−7 yang tercatat
- indeks tren: (d − awal riwayat) dalam bulan

Karena semua fitur hanya memakai nilai ≤ d−7, satu model berlaku untuk h = 1…7 tanpa
memprediksi hari-hari di antaranya (D-30).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta

import numpy as np

CONTEXT_TAGS = ("ramai", "sepi", "libur", "gajian")
DOM_BUCKETS = ((1, 5), (6, 10))
FEATURE_NAMES = (
    *(f"hari_{i}" for i in range(7)),
    *(f"tgl_{lo}_{hi}" for lo, hi in DOM_BUCKETS),
    *(f"tag_{t}" for t in CONTEXT_TAGS),
    "lag7",
    "rata_minggu_lalu",
    "tren",
)
MAX_HORIZON = 7


@dataclass(frozen=True)
class Series:
    """Riwayat satu seri. `values` hanya hari buka yang tercatat (hari tutup tidak ada)."""

    values: dict[date, float]
    #: Hari stok habis (angkanya bisa lebih rendah dari permintaan). Tetap dipakai melatih
    #: apa adanya — hasil uji D-30 — dan hanya dipakai untuk peringatan.
    censored: frozenset[date] = field(default_factory=frozenset)
    #: Penanda hari (tag), boleh untuk tanggal mendatang.
    context: dict[date, str] = field(default_factory=dict)

    @property
    def dates(self) -> list[date]:
        return sorted(self.values)

    def upto(self, origin: date) -> Series:
        """Potong riwayat sampai `origin` (dipakai backtest agar tidak mengintip masa depan)."""
        return Series(
            values={d: v for d, v in self.values.items() if d <= origin},
            censored=frozenset(d for d in self.censored if d <= origin),
            context=self.context,
        )


def feature_row(series: Series, target: date, start: date) -> np.ndarray | None:
    """Fitur untuk tanggal target. None jika minggu lalu tidak punya data sama sekali."""
    window = [
        series.values[d]
        for d in (target - timedelta(days=k) for k in range(7, 14))
        if d in series.values
    ]
    if not window:
        return None
    prev_week_mean = sum(window) / len(window)
    lag7 = series.values.get(target - timedelta(days=7), prev_week_mean)
    tag = series.context.get(target)
    row = [
        *(1.0 if target.weekday() == i else 0.0 for i in range(7)),
        *(1.0 if lo <= target.day <= hi else 0.0 for lo, hi in DOM_BUCKETS),
        *(1.0 if tag == t else 0.0 for t in CONTEXT_TAGS),
        lag7,
        prev_week_mean,
        (target - start).days / 30.0,
    ]
    return np.array(row, dtype=np.float64)
