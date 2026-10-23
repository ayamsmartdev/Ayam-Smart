-- ═════════════════════════════════════════════════════════════════════════════
-- AYAMSMART — Bersihkan data testing (sekali pakai, JANGAN di-commit ke repo)
-- Jalankan di Supabase → SQL Editor, SEBELUM tim klien mulai mengisi data asli.
-- Yang DIHAPUS : semua menu, resep, rekap, penanda hari, food waste, forecast,
--                bahan baku selain "Ayam", catatan percobaan PIN.
-- Yang DIPERTAHANKAN / DIKEMBALIKAN ke bawaan : bahan "Ayam" (potong, dihitung
--                per ekor, aktif), setelan cadangan 10% dan 8 potong per ekor.
-- Satu transaksi: kalau satu perintah gagal, tidak ada yang terhapus.
-- ═════════════════════════════════════════════════════════════════════════════
begin;

delete from public.forecasts;
delete from public.forecast_runs;
delete from public.food_waste;
delete from public.daily_sales;
delete from public.daily_context;
delete from public.menu_ingredients;
delete from public.menus;
delete from public.ingredients where lower(trim(name)) <> 'ayam';

update public.ingredients
   set name = 'Ayam', unit = 'potong', is_chicken = true, is_active = true
 where lower(trim(name)) = 'ayam';

insert into public.ingredients (name, unit, is_chicken)
select 'Ayam', 'potong', true
 where not exists (select 1 from public.ingredients where lower(trim(name)) = 'ayam');

insert into public.settings (key, value) values
  ('buffer_pct', '10'::jsonb),
  ('pieces_per_chicken', '8'::jsonb)
on conflict (key) do update set value = excluded.value;

delete from public.pin_attempts;

commit;

-- Cek hasil: seharusnya ingredients = 1, settings = 2, tabel lain = 0.
select 'menus' as tabel, count(*) as baris from public.menus
union all select 'ingredients',      count(*) from public.ingredients
union all select 'menu_ingredients', count(*) from public.menu_ingredients
union all select 'daily_sales',      count(*) from public.daily_sales
union all select 'daily_context',    count(*) from public.daily_context
union all select 'food_waste',       count(*) from public.food_waste
union all select 'forecast_runs',    count(*) from public.forecast_runs
union all select 'forecasts',        count(*) from public.forecasts
union all select 'settings',         count(*) from public.settings
union all select 'pin_attempts',     count(*) from public.pin_attempts;
