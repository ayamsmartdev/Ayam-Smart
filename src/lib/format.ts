/** Format angka gaya Indonesia: 1.250 dan 9,8. */
export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatPercent(value: number, digits = 1): string {
  return `${formatNumber(value, digits)}%`;
}

/** Jumlah bahan dengan satuan yang mudah dibaca (gram ≥ 1000 → kg). */
export function formatQuantity(value: number, unit: string): string {
  if (unit === "gram" && value >= 1000) return `${formatNumber(value / 1000, 1)} kg`;
  if (unit === "gram") return `${formatNumber(value)} g`;
  return `${formatNumber(value)} ${unit}`;
}
