/**
 * Format angka gaya Indonesia: 1.250 dan 9,8.
 * @param digits jumlah desimal minimum (dan maksimum jika maxDigits tidak diisi)
 * @param maxDigits jumlah desimal maksimum; desimal nol di belakang tidak ditampilkan
 */
export function formatNumber(value: number, digits = 0, maxDigits = digits): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: Math.max(digits, maxDigits),
  }).format(value);
}

export function formatPercent(value: number, digits = 1): string {
  return `${formatNumber(value, digits)}%`;
}

/**
 * Jumlah bahan dengan satuan yang mudah dibaca (gram ≥ 1000 → kg).
 * Desimal tampil hanya bila ada (0,5 kg; 1 porsi), maksimal 2 angka.
 */
export function formatQuantity(value: number, unit: string): string {
  if (unit === "gram" && value >= 1000) return `${formatNumber(value / 1000, 0, 2)} kg`;
  if (unit === "gram") return `${formatNumber(value, 0, 2)} g`;
  return `${formatNumber(value, 0, 2)} ${unit}`;
}
