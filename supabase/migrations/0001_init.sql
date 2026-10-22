-- ─────────────────────────────────────────────────────────────────────────────
-- AYAMSMART — 0001_init.sql
-- Skema awal (ARCHITECTURE.md §4). Jalankan sekali di Supabase → SQL Editor.
-- Aman dijalankan ulang: memakai IF NOT EXISTS / ON CONFLICT DO NOTHING.
--
-- Keamanan (D-05): RLS aktif di semua tabel TANPA policy publik.
-- Browser tidak pernah mengakses tabel; hanya server Next.js dengan secret key.
-- Kolom `dataset`: 'demo' (simulasi) atau 'live' (data nyata) — tidak pernah dicampur (D-08).
-- ─────────────────────────────────────────────────────────────────────────────

-- updated_at otomatis ─────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Master data ─────────────────────────────────────────────────────────────────
create table if not exists public.menus (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) between 1 and 80),
  price       integer check (price is null or price >= 0),
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists menus_name_unique on public.menus (lower(trim(name)));

create table if not exists public.ingredients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) between 1 and 80),
  unit        text not null check (unit in ('potong', 'gram', 'kg', 'porsi', 'ml', 'pcs', 'gelas')),
  is_chicken  boolean not null default false,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists ingredients_name_unique on public.ingredients (lower(trim(name)));

-- Resep: jumlah bahan per porsi menu
create table if not exists public.menu_ingredients (
  menu_id          uuid not null references public.menus (id) on delete cascade,
  ingredient_id    uuid not null references public.ingredients (id) on delete restrict,
  qty_per_portion  numeric(10, 2) not null check (qty_per_portion > 0),
  primary key (menu_id, ingredient_id)
);

-- Data harian ─────────────────────────────────────────────────────────────────
-- Baris tidak ada = hari itu belum direkap (BUKAN penjualan 0).
create table if not exists public.daily_sales (
  id          bigint generated always as identity primary key,
  dataset     text not null check (dataset in ('demo', 'live')),
  sale_date   date not null,
  menu_id     uuid not null references public.menus (id) on delete restrict,
  qty         integer not null check (qty >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (dataset, sale_date, menu_id)
);
create index if not exists daily_sales_dataset_date on public.daily_sales (dataset, sale_date);

-- Penanda hari (boleh untuk tanggal mendatang). 'tutup' → hari dikeluarkan dari training.
create table if not exists public.daily_context (
  dataset     text not null check (dataset in ('demo', 'live')),
  ctx_date    date not null,
  tag         text not null check (tag in ('ramai', 'sepi', 'libur', 'gajian', 'tutup')),
  note        text,
  updated_at  timestamptz not null default now(),
  primary key (dataset, ctx_date)
);

create table if not exists public.food_waste (
  id             bigint generated always as identity primary key,
  dataset        text not null check (dataset in ('demo', 'live')),
  waste_date     date not null,
  menu_id        uuid references public.menus (id) on delete restrict,
  ingredient_id  uuid references public.ingredients (id) on delete restrict,
  qty            numeric(10, 2) not null check (qty > 0),
  reason         text not null check (reason in ('tidak_laku', 'rusak', 'kedaluwarsa', 'lainnya')),
  note           text,
  created_at     timestamptz not null default now(),
  -- tepat satu: waste berupa menu ATAU bahan
  check (num_nonnulls(menu_id, ingredient_id) = 1)
);
create index if not exists food_waste_dataset_date on public.food_waste (dataset, waste_date);

-- Forecast (diisi server setelah memanggil fungsi Python, ARCHITECTURE §6) ───
create table if not exists public.forecast_runs (
  id          uuid primary key default gen_random_uuid(),
  dataset     text not null check (dataset in ('demo', 'live')),
  status      text not null check (status in ('ok', 'failed')),
  summary     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists forecast_runs_dataset_created on public.forecast_runs (dataset, created_at desc);

create table if not exists public.forecasts (
  id           bigint generated always as identity primary key,
  run_id       uuid not null references public.forecast_runs (id) on delete cascade,
  dataset      text not null check (dataset in ('demo', 'live')),
  target_date  date not null,
  menu_id      uuid not null references public.menus (id) on delete cascade,
  predicted    numeric(10, 2) not null check (predicted >= 0),
  lower        numeric(10, 2) check (lower is null or lower >= 0),
  upper        numeric(10, 2) check (upper is null or upper >= 0),
  unique (run_id, target_date, menu_id)
);

-- Setelan & keamanan ──────────────────────────────────────────────────────────
create table if not exists public.settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

-- Batas percobaan PIN (key = hash IP)
create table if not exists public.pin_attempts (
  key           text primary key,
  count         integer not null default 0,
  window_start  timestamptz not null default now()
);

-- Trigger updated_at ──────────────────────────────────────────────────────────
drop trigger if exists menus_updated_at on public.menus;
create trigger menus_updated_at before update on public.menus
  for each row execute function public.set_updated_at();

drop trigger if exists ingredients_updated_at on public.ingredients;
create trigger ingredients_updated_at before update on public.ingredients
  for each row execute function public.set_updated_at();

drop trigger if exists daily_sales_updated_at on public.daily_sales;
create trigger daily_sales_updated_at before update on public.daily_sales
  for each row execute function public.set_updated_at();

drop trigger if exists daily_context_updated_at on public.daily_context;
create trigger daily_context_updated_at before update on public.daily_context
  for each row execute function public.set_updated_at();

drop trigger if exists settings_updated_at on public.settings;
create trigger settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

-- RLS: aktif, tanpa policy publik (D-05) ─────────────────────────────────────
alter table public.menus            enable row level security;
alter table public.ingredients      enable row level security;
alter table public.menu_ingredients enable row level security;
alter table public.daily_sales      enable row level security;
alter table public.daily_context    enable row level security;
alter table public.food_waste       enable row level security;
alter table public.forecast_runs    enable row level security;
alter table public.forecasts        enable row level security;
alter table public.settings         enable row level security;
alter table public.pin_attempts     enable row level security;

-- Seed minimal: hanya yang pasti benar untuk warung ayam geprek ──────────────
-- Menu TIDAK di-seed: menu asli dimasukkan lewat halaman Menu & resep.
insert into public.settings (key, value) values
  ('buffer_pct', '10'::jsonb),
  ('pieces_per_chicken', '8'::jsonb)
on conflict (key) do nothing;

insert into public.ingredients (name, unit, is_chicken) values
  ('Ayam', 'potong', true)
on conflict do nothing;
