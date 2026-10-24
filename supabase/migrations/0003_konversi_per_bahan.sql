-- ─────────────────────────────────────────────────────────────────────────────
-- AYAMSMART — 0003_konversi_per_bahan.sql
-- Potong per kg dan stok freezer dicatat PER BAHAN, bukan global (D-28).
-- Contoh: dada 9 potong/kg, paha diisi sendiri; masing-masing punya stok sendiri.
-- Jalankan SETELAH 0002_kategori_stok.sql. Aman dijalankan ulang.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Konversi potong → kg disimpan di bahan yang dibeli per kg (is_chicken = true).
alter table public.ingredients
  add column if not exists pieces_per_kg integer
  check (pieces_per_kg is null or pieces_per_kg between 1 and 20);

-- Pindahkan nilai setelan global (dari 0002) ke bahan yang sudah ada; bawaan 9.
update public.ingredients
   set pieces_per_kg = coalesce(
         (select (value #>> '{}')::int from public.settings where key = 'pieces_per_kg'),
         9)
 where is_chicken and pieces_per_kg is null;

-- Bahan "dibeli per kg" wajib bersatuan potong dan wajib punya angka potong per kg.
alter table public.ingredients drop constraint if exists ingredients_per_kg_check;
alter table public.ingredients add constraint ingredients_per_kg_check
  check (not is_chicken or (unit = 'potong' and pieces_per_kg is not null));

delete from public.settings where key = 'pieces_per_kg';

-- 2. Stok per bahan. Kolom diberi nama umum (potong), tidak khusus "chicken".
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'daily_stock' and column_name = 'chicken_prepared'
  ) then
    alter table public.daily_stock rename column chicken_prepared to prepared_pieces;
    alter table public.daily_stock rename column chicken_leftover to leftover_pieces;
  end if;
end $$;

alter table public.daily_stock
  add column if not exists ingredient_id uuid references public.ingredients (id) on delete restrict;

-- Baris lama (jika ada) diarahkan ke bahan ayam pertama.
update public.daily_stock
   set ingredient_id = (select id from public.ingredients where is_chicken order by created_at limit 1)
 where ingredient_id is null;

alter table public.daily_stock alter column ingredient_id set not null;

alter table public.daily_stock drop constraint if exists daily_stock_pkey;
alter table public.daily_stock add constraint daily_stock_pkey
  primary key (dataset, stock_date, ingredient_id);
