"use client";

import { useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Segmented } from "@/components/ui/segmented";
import { formatDayMonth, formatDayShort } from "@/lib/date";
import { formatNumber } from "@/lib/format";
import type { ChartPoint } from "@/lib/dashboard";

const BRAND = "#2660dc";
const BAND = "#bcd3ff";
const GRID = "#e9e1d8";
const TICK = "#6e625a";

type Range = "14" | "30";

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const isForecast = p.actual === null;
  return (
    <div className="glass-bar rounded-row px-3 py-2 text-[13px]">
      <p className="font-semibold">{formatDayShort(p.date)}</p>
      {isForecast ? (
        <>
          <p className="text-brand-700">Prediksi {formatNumber(p.predicted ?? 0)} porsi</p>
          {p.band ? (
            <p className="text-ink-soft">
              Kisaran {formatNumber(p.band[0])}–{formatNumber(p.band[1])}
            </p>
          ) : null}
        </>
      ) : (
        <p>Terjual {formatNumber(p.actual ?? 0)} porsi</p>
      )}
    </div>
  );
}

/** Penjualan aktual (garis tegas) + prediksi (putus-putus) + kisaran (area biru muda). */
export function SalesChart({ data, showBand = true }: { data: ChartPoint[]; showBand?: boolean }) {
  const [range, setRange] = useState<Range>("14");
  const forecastCount = data.filter((d) => d.actual === null).length;
  const visible = data.slice(-(Number(range) + forecastCount));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-soft" aria-label="Keterangan grafik">
          <li className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full bg-brand-600" aria-hidden="true" />
            Terjual
          </li>
          <li className="flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed border-brand-600" aria-hidden="true" />
            Prediksi
          </li>
          {showBand ? (
            <li className="flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-sm bg-brand-200" aria-hidden="true" />
              Kisaran
            </li>
          ) : null}
        </ul>
        <Segmented
          label="Rentang grafik"
          value={range}
          onChange={setRange}
          options={[
            { value: "14", label: "14 hari" },
            { value: "30", label: "30 hari" },
          ]}
        />
      </div>

      <div className="h-60 w-full landscape:max-lg:h-48 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={visible} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDayMonth}
              tick={{ fill: TICK, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
            />
            {/* Sumbu Y dimulai dekat nilai terendah agar pola naik-turun terbaca; garis grid tetap jujur. */}
            <YAxis
              domain={[(min: number) => Math.max(0, Math.floor((min * 0.8) / 10) * 10), "auto"]}
              tick={{ fill: TICK, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={48}
              allowDecimals={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: GRID, strokeWidth: 1 }} />
            <Area
              dataKey="band"
              stroke="none"
              fill={BAND}
              fillOpacity={0.55}
              isAnimationActive={false}
              connectNulls={false}
            />
            <Line
              dataKey="actual"
              stroke={BRAND}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
            <Line
              dataKey="predicted"
              stroke={BRAND}
              strokeWidth={2.5}
              strokeDasharray="6 5"
              dot={{ r: 3, fill: "#fff", stroke: BRAND, strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
