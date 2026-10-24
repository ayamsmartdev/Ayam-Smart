"""
Kontrak `POST /api/forecast` (ARCHITECTURE §6.1): validasi request dan susun response.

Semua kesalahan input menjadi `ContractError` dengan pesan berbahasa Indonesia;
handler HTTP mengubahnya menjadi status 400.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date
from typing import Any

from forecasting.features import CONTEXT_TAGS, MAX_HORIZON, Series
from forecasting.run import forecast_series

MAX_SERIES = 50
MAX_HISTORY = 400
MAX_CONTEXT = 400
MAX_QTY = 100_000
MAX_ID_LENGTH = 64


class ContractError(ValueError):
    """Request tidak sesuai kontrak."""


@dataclass(frozen=True)
class ForecastRequest:
    horizon: int
    start_date: date
    series: list[tuple[str, Series]]


def _parse_date(value: Any, where: str) -> date:
    if not isinstance(value, str) or len(value) != 10:
        raise ContractError(f"{where}: tanggal harus berformat YYYY-MM-DD.")
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise ContractError(f"{where}: tanggal '{value}' tidak valid.") from None


def _is_int(value: Any) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


def _parse_qty(value: Any, where: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ContractError(f"{where}: qty harus angka.")
    if not math.isfinite(value) or value < 0 or value > MAX_QTY:
        raise ContractError(f"{where}: qty harus 0–{MAX_QTY}.")
    return float(value)


def _parse_list(value: Any, where: str, max_len: int, required: bool = True) -> list:
    if value is None and not required:
        return []
    if not isinstance(value, list):
        raise ContractError(f"{where} harus berupa daftar.")
    if len(value) > max_len:
        raise ContractError(f"{where} maksimal {max_len} baris.")
    return value


def _parse_context(raw: Any, start: date) -> dict[date, str]:
    context: dict[date, str] = {}
    for i, item in enumerate(_parse_list(raw, "context", MAX_CONTEXT, required=False)):
        where = f"context[{i}]"
        if not isinstance(item, dict):
            raise ContractError(f"{where} harus berupa objek.")
        d = _parse_date(item.get("date"), where)
        tag = item.get("tag")
        if tag not in CONTEXT_TAGS:
            raise ContractError(
                f"{where}: tag harus salah satu dari {', '.join(CONTEXT_TAGS)}."
            )
        if d in context:
            raise ContractError(f"{where}: tanggal {d} muncul dua kali.")
        context[d] = tag
    return context


def _parse_series(
    item: Any, i: int, start: date, context: dict[date, str]
) -> tuple[str, Series]:
    where = f"series[{i}]"
    if not isinstance(item, dict):
        raise ContractError(f"{where} harus berupa objek.")
    menu_id = item.get("menu_id")
    if (
        not isinstance(menu_id, str)
        or not menu_id.strip()
        or len(menu_id) > MAX_ID_LENGTH
    ):
        raise ContractError(
            f"{where}: menu_id wajib diisi (maks {MAX_ID_LENGTH} karakter)."
        )

    values: dict[date, float] = {}
    for j, row in enumerate(
        _parse_list(item.get("history"), f"{where}.history", MAX_HISTORY)
    ):
        rw = f"{where}.history[{j}]"
        if not isinstance(row, dict):
            raise ContractError(f"{rw} harus berupa objek.")
        d = _parse_date(row.get("date"), rw)
        if d >= start:
            raise ContractError(f"{rw}: tanggal harus sebelum start_date ({start}).")
        if d in values:
            raise ContractError(f"{rw}: tanggal {d} muncul dua kali.")
        values[d] = _parse_qty(row.get("qty"), rw)

    censored: set[date] = set()
    raw_censored = item.get("censored_dates")
    for j, value in enumerate(
        _parse_list(
            raw_censored, f"{where}.censored_dates", MAX_HISTORY, required=False
        )
    ):
        d = _parse_date(value, f"{where}.censored_dates[{j}]")
        # Tanggal yang tidak ada di history (mis. hari tutup) diabaikan.
        if d in values:
            censored.add(d)

    return menu_id, Series(values=values, censored=frozenset(censored), context=context)


def parse_request(payload: Any) -> ForecastRequest:
    if not isinstance(payload, dict):
        raise ContractError("Body harus berupa objek JSON.")
    horizon = payload.get("horizon")
    if not _is_int(horizon) or not 1 <= horizon <= MAX_HORIZON:
        raise ContractError(f"horizon harus bilangan bulat 1–{MAX_HORIZON}.")
    start = _parse_date(payload.get("start_date"), "start_date")
    context = _parse_context(payload.get("context"), start)

    raw_series = _parse_list(payload.get("series"), "series", MAX_SERIES)
    if not raw_series:
        raise ContractError("series minimal 1.")
    series = [
        _parse_series(item, i, start, context) for i, item in enumerate(raw_series)
    ]
    ids = [menu_id for menu_id, _ in series]
    if len(set(ids)) != len(ids):
        raise ContractError("menu_id di series tidak boleh kembar.")
    return ForecastRequest(horizon=horizon, start_date=start, series=series)


def run_request(req: ForecastRequest) -> dict:
    return {
        "results": [
            {"menu_id": menu_id, **forecast_series(s, req.start_date, req.horizon)}
            for menu_id, s in req.series
        ]
    }


def handle(payload: Any) -> dict:
    """Validasi lalu hitung. Melempar `ContractError` jika input salah."""
    return run_request(parse_request(payload))
