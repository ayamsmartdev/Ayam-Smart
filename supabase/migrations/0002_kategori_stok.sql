-- ─────────────────────────────────────────────────────────────────────────────
-- AYAMSMART — 0002_kategori_stok.sql
-- Rekap per kategori + stok ayam dada (D-26) dan ayam dihitung per kg (D-27).
-- Jalankan SETELAH 0001_init.sql di Supabase → SQL Editor. Aman dijalankan ulang.
-- Tidak menghapus data rekap/menu yang sudah ada.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Kategori menu memakai tabel `menus`; tambah isi varian (pengingat saat rekap).
alter table public.menus
  add column if not exists description text
  check (description is null or length(description) <= 200);

-- 2. Stok ayam dada per hari, dalam potong.
--    prepared = potong siap jual hari itu (segar + diambil dari freezer)
--    leftover = potong sisa yang masuk freezer saat tutup
--    Baris tidak ada = stok hari itu tidak dicatat (bukan 0).
create table if not exists public.daily_stock (
  dataset           text not null check (dataset in ('demo', 'live')),
  stock_date        date not null,
  chicken_prepared  integer not null check (chicken_prepared >= 0),
  chicken_leftover  integer not null check (chicken_leftover >= 0),
  updated_at        timestamptz not null default now(),
  primary key (dataset, stock_date),
  check (chicken_leftover <= chicken_prepared)
);

drop trigger if exists daily_stock_updated_at on public.daily_stock;
create trigger daily_stock_updated_at before update on public.daily_stock
  for each row execute function public.set_updated_at();

-- RLS aktif tanpa policy publik (D-05), sama seperti tabel lain.
alter table public.daily_stock enable row level security;

-- 3. Setelan: potong dada per kg menggantikan potong per ekor.
--    Nilai lama tidak dipindahkan karena artinya berbeda (ekor ≠ kg).
insert into public.settings (key, value) values ('pieces_per_kg', '9'::jsonb)
on conflict (key) do nothing;

delete from public.settings where key = 'pieces_per_chicken';
