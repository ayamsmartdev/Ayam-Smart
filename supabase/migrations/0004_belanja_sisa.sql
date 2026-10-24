-- ─────────────────────────────────────────────────────────────────────────────
-- AYAMSMART — 0004_belanja_sisa.sql
-- Stok dicatat sesuai yang penjual tahu (D-29):
--   belanja  = kg yang dibeli + jumlah potong yang didapat (opsional), boleh diisi kapan saja
--   sisa     = potong yang masuk freezer saat tutup (boleh kosong sampai tutup)
-- Kolom "potong disiapkan" (0002/0003) dihapus: penjual tidak menghitung angka itu.
-- Jalankan SETELAH 0003_konversi_per_bahan.sql. Aman dijalankan ulang.
-- Catatan: tabel daily_stock masih kosong saat migrasi ini dibuat (data tes sudah dihapus).
-- ─────────────────────────────────────────────────────────────────────────────

-- Aturan lama "sisa ≤ disiapkan" tidak berlaku lagi.
alter table public.daily_stock drop constraint if exists daily_stock_check;
alter table public.daily_stock drop column if exists prepared_pieces;

alter table public.daily_stock
  add column if not exists bought_kg numeric(6, 2)
  check (bought_kg is null or (bought_kg >= 0 and bought_kg <= 500));

alter table public.daily_stock
  add column if not exists bought_pieces integer
  check (bought_pieces is null or (bought_pieces >= 0 and bought_pieces <= 5000));

-- Sisa diisi saat tutup; pagi/siang baris boleh berisi belanja saja.
alter table public.daily_stock alter column leftover_pieces drop not null;

alter table public.daily_stock drop constraint if exists daily_stock_leftover_max;
alter table public.daily_stock add constraint daily_stock_leftover_max
  check (leftover_pieces is null or leftover_pieces <= 5000);

-- Baris kosong tidak disimpan: minimal salah satu terisi.
alter table public.daily_stock drop constraint if exists daily_stock_not_empty;
alter table public.daily_stock add constraint daily_stock_not_empty
  check (bought_kg is not null or bought_pieces is not null or leftover_pieces is not null);
