-- ═════════════════════════════════════════════════════════════════════════════
-- AYAMSMART — Isi kategori menu + resep dari data klien (24 Okt 2026)
-- SEKALI PAKAI. JANGAN disimpan di folder repo / JANGAN di-commit: berisi data asli klien.
-- Jalankan di Supabase → SQL Editor SETELAH migrasi 0003. Aman dijalankan ulang:
-- kategori yang sudah ada diperbarui (isi varian & urutan), tidak diduplikasi.
-- Sumber: daftar 41 menu klien, dikelompokkan jadi 12 kategori (D-26).
-- Kulit crispy belum diberi resep: isi kulit per porsi belum diketahui (PRD Q-12).
-- ═════════════════════════════════════════════════════════════════════════════
begin;

-- 1. Bahan ayam: klien hanya membeli dada, 1 kg = 9–10 potong (bawaan 9, D-27).
update public.ingredients
   set name = 'Ayam dada'
 where lower(trim(name)) = 'ayam' and is_chicken;

insert into public.ingredients (name, unit, is_chicken, pieces_per_kg)
select 'Ayam dada', 'potong', true, 9
 where not exists (select 1 from public.ingredients where lower(trim(name)) = 'ayam dada');

-- 2. Kategori menu (urutan = urutan baris di Rekap; yang paling laris di atas).
with v(name, description, sort_order) as (
  values
    ('Geprek bakar',        'sambel bawang, sambal ijo, mayosam, keju, mozarela, saus keju, saus keju leleh', 0),
    ('Geprek',              'sambel bawang, sambel ijo, mayosam, keju, mozarela, saus keju, keju slice leleh', 1),
    ('Crispy steak single', 'crispy chicken steak single, crispy steak bakar single',                         2),
    ('Crispy steak double', 'crispy chicken steak double, crispy steak bakar double (2 potong)',              3),
    ('Ayam katsu',          'saus, bakar, sambel bawang',                                                     4),
    ('Spesial',             'ayam bakar madu, ayam bakar pedas manis, korean spicy chicken, spicy chicken',   5),
    ('Ayam crispy',         'saus, mayo',                                                                     6),
    ('Kulit crispy',        'saus, sambel bawang, saus keju',                                                 7),
    ('Lele',                'lele crispy, lele crispy bakar',                                                 8),
    ('Nugget',              'saus, geprek, mayosam',                                                          9),
    ('Bakso & sosis',       'bakso geprek, sosis goreng jumbo, sosis bakar jumbo',                           10),
    ('Kentang',             'kentang goreng saus, kentang crispy saus, kentang crispy bumbu tabur',          11)
),
upd as (
  update public.menus m
     set description = v.description, sort_order = v.sort_order
    from v
   where lower(trim(m.name)) = lower(trim(v.name))
  returning m.id
)
insert into public.menus (name, description, sort_order)
select v.name, v.description, v.sort_order
  from v
 where lower(trim(v.name)) not in (select lower(trim(name)) from public.menus);

-- 3. Resep: potong ayam dada per porsi (semua menu ayam 1 potong, steak double 2).
with r(menu, qty) as (
  values
    ('Geprek bakar', 1), ('Geprek', 1), ('Crispy steak single', 1), ('Crispy steak double', 2),
    ('Ayam katsu', 1), ('Spesial', 1), ('Ayam crispy', 1)
)
insert into public.menu_ingredients (menu_id, ingredient_id, qty_per_portion)
select m.id, i.id, r.qty
  from r
  join public.menus m on lower(trim(m.name)) = lower(r.menu)
 cross join (select id from public.ingredients where lower(trim(name)) = 'ayam dada') i
on conflict (menu_id, ingredient_id) do update set qty_per_portion = excluded.qty_per_portion;

commit;

-- 4. Cek hasil: 12 baris, 7 kategori dengan potong dada (steak double = 2).
select m.sort_order + 1 as no,
       m.name           as kategori,
       coalesce(mi.qty_per_portion::text, '–') as potong_dada,
       m.description    as isi_varian
  from public.menus m
  left join public.menu_ingredients mi
         on mi.menu_id = m.id
        and mi.ingredient_id = (select id from public.ingredients where lower(trim(name)) = 'ayam dada')
 order by m.sort_order;
