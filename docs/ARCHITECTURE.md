# ARCHITECTURE — AYAMSMART

> Bagaimana sistem dibangun dan **kenapa**. Bagian §11 Keputusan wajib dibaca AI baru.
> Terakhir diupdate: 23 Oktober 2026.

---

## 1. Gambaran Sistem

```
 HP / Tablet (browser)
        │  HTML + interaksi (tanpa akses DB, tanpa secret)
        ▼
 Next.js di Vercel ──────────────► Supabase (PostgreSQL)
  • Server Components (baca)         • RLS aktif, tanpa policy publik
  • Server Actions (tulis + cek PIN) • diakses hanya dengan secret key dari server
  • src/lib/recommend.ts (rekomendasi bahan)
        │
        │ POST JSON (header X-Forecast-Secret)
        ▼
 Python Function di Vercel (api/forecast.py)
  • stateless: terima riwayat penjualan → kembalikan prediksi
  • numpy saja (Ridge ditulis sendiri, D-25) + package forecasting/
```

Alur utama: **simpan data → server ambil riwayat → panggil Python → simpan hasil ke `forecasts`
→ dashboard membaca hasil tersimpan.**

---

## 2. Stack

| Lapisan | Teknologi | Catatan |
|---|---|---|
| Framework | Next.js 16.4.2 (App Router, Turbopack) + TypeScript strict | Dibuat dengan create-next-app 16.4.2; Cache Components & Partial Prefetching dimatikan (D-16); Tailwind lewat loader `@tailwindcss/turbopack` di `next.config.ts` (tanpa PostCSS config) |
| Styling | Tailwind CSS v4 murni | Tanpa component library (D-01); tema & token di `STYLEGUIDE.md` (D-17) |
| Font | Plus Jakarta Sans Variable (`@fontsource-variable/plus-jakarta-sans`) | Di-host sendiri, tanpa panggilan Google Fonts saat build |
| Grafik | Recharts 3 | Satu-satunya library UI tambahan |
| Data access | `@supabase/supabase-js` 2.x, hanya di modul `server-only` | D-05 |
| Validasi | Manual di server (`clean*Input` di `src/lib/data/*`) | Tanpa zod, agar dependency tetap ringan (D-23) |
| Database | Supabase (PostgreSQL), region Singapore | Free plan (D-02, D-13) |
| Forecast | Python 3.12 + numpy (tanpa scikit-learn & FastAPI di runtime) | Vercel Python Function di folder `/api` (D-03, D-25); versi dikunci di `.python-version` & `requirements.txt` |
| Hosting | Vercel, region fungsi **Singapura (`sin1`)** via `vercel.json` | Hobby plan, keputusan klien (D-13); region dekat pengguna & Supabase (D-19) |
| Repo & IDE | GitHub (public, akun AYAMSMART) + VS Code lokal | D-09, D-15 |

---

## 3. Struktur Folder

```
/
├─ AGENTS.md  CLAUDE.md  README.md  .env.example
├─ .python-version                  # "3.12" — sama dengan default Vercel
├─ requirements.txt                 # dependency Python RUNTIME (dipasang Vercel, versi di-pin): numpy saja
├─ requirements-dev.txt             # khusus laptop: -r requirements.txt + pytest + scikit-learn (pembanding tes)
├─ pytest.ini                       # root repo masuk sys.path untuk tes
├─ api/
│  └─ forecast.py                   # Python Function → /api/forecast (kelas `handler`, cek secret, kontrak §6.1) ✅
├─ forecasting/                     # package Python murni, bisa dites tanpa server
│  ├─ __init__.py
│  ├─ features.py                   # `Series` (riwayat satu kategori) + fitur Ridge ✅
│  ├─ models.py                     # Ridge numpy + peramal ma7 / snaive / ridge ✅
│  ├─ backtest.py                   # rolling-origin backtest + WAPE ✅
│  ├─ run.py                        # pemilihan model, rentang, peringatan per seri ✅
│  └─ contract.py                   # validasi request & susun response §6.1 ✅
├─ tests/
│  ├─ test_models.py                # pytest: Ridge identik dengan scikit-learn ✅ (dev only)
│  ├─ test_forecasting.py           # pytest: fitur, peramal, backtest, pemilihan, rentang, kontrak ✅
│  ├─ test_api_forecast.py          # pytest: HTTP 401/503/400/413/500/200 dengan server lokal ✅
│  └─ test_demo_data.py             # pytest: generator data simulasi ✅
├─ scripts/
│  ├─ generate_demo_data.py         # generator data simulasi dataset 'demo' (seed tetap) → scripts/out/demo_data.sql (diabaikan Git) ✅
│  └─ forecast_demo_request.py      # contoh body POST /api/forecast dari data simulasi → scripts/out/forecast_request.json ✅
├─ supabase/
│  └─ migrations/                   # 0001_init.sql, dst. Dijalankan berurutan
└─ src/
   ├─ proxy.ts                      # Next 16 "proxy" (pengganti middleware): halaman tulis → /pin (D-21)
   ├─ app/                          # rute berbahasa Indonesia (D-18)
   │  ├─ layout.tsx                 # font, latar, AppShell, FreshnessGuard; revalidate = 60 (D-19)
   │  ├─ loading.tsx                # kerangka halaman saat rute masih dimuat
   │  ├─ globals.css                # token tema, utilitas glass/glass-bar
   │  ├─ page.tsx                   # Beranda                         simulasi
   │  ├─ prediksi/                  # Prediksi per menu               simulasi
   │  ├─ bahan/                     # Rekomendasi bahan baku          simulasi
   │  ├─ rekap/                     # Rekap harian            (PIN)   ✅ data nyata (live)
   │  ├─ waste/                     # Food waste              (PIN)   simulasi
   │  ├─ pengaturan/                # Menu, bahan, resep, setelan (PIN) ✅ data nyata
   │  │  ├─ menu-manager.tsx  ingredient-manager.tsx  recipe-editor.tsx  settings-form.tsx
   │  ├─ import/                    # Import CSV              (PIN)   template saja; unggah belum
   │  ├─ lainnya/                   # Menu tambahan (HP)
   │  ├─ pin/                       # Form PIN                        ✅
   │  └─ status/                    # Cek koneksi 10 tabel (tanpa isi data, tidak di navigasi) ✅
   ├─ actions/                      # Server Actions — SEMUA penulisan data, masing-masing cek PIN sendiri
   │  ├─ pin.ts  rekap.ts  menus.ts  ingredients.ts  recipes.ts  settings.ts
   ├─ components/
   │  ├─ icons.tsx                  # ikon SVG buatan sendiri
   │  ├─ ui/                        # Panel, Button, Badge, GroupedList, Stepper, Segmented, PageHeader,
   │  │                             # Toast, ConfirmDialog + DialogError
   │  ├─ hooks/                     # useActionRunner (aksi + error + PIN habis), useLeaveGuard (D-24)
   │  ├─ charts/                    # SalesChart (Recharts)
   │  └─ layout/                    # app-shell, nav (sidebar + tab bar), brand-mark, freshness-guard
   └─ lib/
      ├─ cn.ts  date.ts  format.ts  # util; tanggal selalu WIB lewat date.ts
      ├─ env.ts                     # requireEnv(), server-only
      ├─ supabase-server.ts         # client Supabase server-only (secret key)                  ✅
      ├─ pin-token.ts               # tanda tangan/verifikasi cookie PIN (TANPA server-only: dipakai proxy) ✅
      ├─ pin.ts                     # isPinVerified(), cek PIN, rate limit (server-only)         ✅
      ├─ data/                      # baca & validasi per domain (server-only)                   ✅
      │  ├─ rekap.ts  menus.ts  ingredients.ts  recipes.ts  settings.ts
      ├─ recommend.ts               # rumus rekomendasi bahan (§7)
      ├─ stock.ts                   # hitungan stok & selisih, validasi stok (murni, dipakai server + form)
      ├─ demo-data.ts               # DATA SIMULASI (Beranda/Prediksi/Bahan/Waste)               sementara
      ├─ preview-forecast.ts        # forecast pratinjau TypeScript (D-18)                       sementara
      ├─ preview.ts                 # penyusun angka pratinjau                                  sementara
      ├─ dataset.ts                 # baca mode demo/live dari cookie                            belum
      ├─ forecast-client.ts         # panggil Python + simpan hasil                              belum
      └─ csv.ts                     # parse & validasi CSV                                       belum
```

> File bertanda **sementara** diganti saat data tersambung ke Supabase. Bentuk data yang dikembalikan
> `preview.ts` (`PreviewSnapshot`) dipertahankan supaya halaman tidak perlu dirombak.

> **Catatan rute:** folder `api/` di root adalah Vercel Function, bukan rute Next.js. Jangan
> membuat Route Handler Next.js di `/api/forecast` agar tidak bentrok. Perilaku ini diverifikasi di spike T-10.

---

## 4. Skema Database

Semua tabel memakai RLS aktif tanpa policy (hanya secret key server yang bisa akses).
Kolom `dataset` bernilai `'demo'` atau `'live'` (D-08).

| Tabel | Kolom utama | Catatan |
|---|---|---|
| `menus` | `id uuid pk`, `name text` (unik tanpa beda huruf besar/kecil), `description text null` (isi varian, ≤ 200 karakter), `price int null`, `is_active bool`, `sort_order int`, `created_at`, `updated_at` | **Satu baris = satu kategori menu** (D-26); nama tabel & kolom `menu_id` tetap. Urutan = urutan di Rekap |
| `ingredients` | `id uuid pk`, `name text` (unik), `unit text` (`potong`/`gram`/`kg`/`porsi`/`ml`/`pcs`/`gelas`), `is_chicken bool`, `pieces_per_kg int null` (1–20), `is_active bool`, `created_at`, `updated_at` | `is_chicken` = ayam yang dibeli per kg: wajib satuan potong + `pieces_per_kg` (check, D-28). Tiap potongan (dada, paha, …) punya angkanya sendiri; seed: Ayam (9) |
| `menu_ingredients` | `menu_id fk`, `ingredient_id fk`, `qty_per_portion numeric`, pk(`menu_id`,`ingredient_id`) | Resep |
| `daily_sales` | `id`, `dataset`, `sale_date date`, `menu_id fk`, `qty int ≥ 0`, `created_at`, `updated_at`, unique(`dataset`,`sale_date`,`menu_id`) | Upsert per tanggal + menu |
| `daily_context` | `dataset`, `ctx_date date`, `tag text` (`ramai`/`sepi`/`libur`/`gajian`/`tutup`), `note text`, pk(`dataset`,`ctx_date`) | Penanda hari, boleh tanggal mendatang |
| `food_waste` | `id`, `dataset`, `waste_date date`, `menu_id fk null`, `ingredient_id fk null`, `qty numeric > 0`, `reason text` (`tidak_laku`/`rusak`/`kedaluwarsa`/`lainnya`), `note`, `created_at` | Check: tepat satu dari `menu_id`/`ingredient_id` terisi |
| `forecast_runs` | `id uuid pk`, `dataset`, `created_at`, `status text` (`ok`/`failed`), `summary jsonb` | `summary`: per menu → model, error, jumlah hari data, peringatan |
| `forecasts` | `id`, `run_id fk`, `dataset`, `target_date date`, `menu_id fk`, `predicted numeric`, `lower numeric null`, `upper numeric null` | Dashboard membaca run `ok` terbaru |
| `daily_stock` | `dataset`, `stock_date date`, `ingredient_id fk`, `bought_kg numeric(6,2) null` (0–500), `bought_pieces int null` (0–5000), `leftover_pieces int null` (0–5000), `updated_at`, pk(`dataset`,`stock_date`,`ingredient_id`), check minimal satu terisi | Stok per bahan yang dibeli per kg (D-26, D-28, D-29): belanja (kg + jumlah potong opsional) boleh diisi kapan saja; sisa = potong yang masuk freezer saat tutup. Baris tidak ada = tidak dicatat |
| `settings` | `key text pk`, `value jsonb`, `updated_at` | `buffer_pct` (0–100, default 10). `pieces_per_chicken` dihapus di 0002; `pieces_per_kg` global dari 0002 dipindah ke `ingredients` di 0003 (D-28) |
| `pin_attempts` | `key text pk` (hash IP), `count int`, `window_start timestamptz` | Rate limit PIN |

**Aturan data**
- Hari tanpa baris `daily_sales` = tidak ada data (bukan 0). Hari bertanda `tutup` dikeluarkan dari training.
- Tanggal selalu `date` (tanpa jam), dihitung dalam Asia/Jakarta.
- Menu/bahan yang sudah punya riwayat (rekap, waste, resep) tidak bisa dihapus (FK `restrict`); cukup `is_active = false`.
- Satuan bahan dikunci (UI + server) jika bahan sudah dipakai di resep atau waste.
- Rekap menyimpan **semua menu aktif termasuk 0** (0 = terjual nol). Warung tutup = hapus rekap porsi tanggal itu
  + `daily_context.tag = 'tutup'`; **stok tidak dihapus** (isi freezer tetap ada, D-29). Rekap hanya untuk hari ini s.d. 30 hari lalu dan hanya dataset `live` (D-22).
- Stok boleh tidak diisi (semua kosong = baris dihapus). Belanja dan sisa disimpan terpisah (pagi belanja, malam sisa).
  Hanya untuk bahan aktif yang dibeli per kg. Hitungan selisih di `src/lib/stock.ts` (murni, dites):
  `dibeli = bought_pieces ?? round(bought_kg × perkiraan)`, `tersedia = sisa terakhir + dibeli`,
  `sisa seharusnya = tersedia − Σ porsi × resep`, `selisih = sisa seharusnya − leftover_pieces`.
  Sisa terakhir = sisa hari sebelumnya, melewati hari bertanda `tutup` (maks. 7 hari); jika hari buka sebelumnya tidak
  punya sisa → tidak diketahui, selisih tidak dihitung. Perkiraan potong/kg = rata-rata 14 hari (belanja yang potongnya
  terisi), cadangan `ingredients.pieces_per_kg`.
- File SQL: `supabase/migrations/0001_init.sql`, `0002_kategori_stok.sql`, `0003_konversi_per_bahan.sql`, `0004_belanja_sisa.sql` (idempoten, dijalankan berurutan). Database live: project Supabase region Singapura.

---

## 5. Alur Data

**Input rekap (F2) — sudah berjalan** (`src/actions/rekap.ts`)
1. Server Action menerima tanggal + daftar `{menuId, qty}`, cek PIN (`isPinVerified`), validasi manual.
2. Validasi stok (`cleanStockInput`, `src/lib/stock.ts`) sebelum menulis apa pun.
3. Upsert ke `daily_sales` dataset `live` untuk semua kategori aktif; upsert/hapus `daily_stock` per bahan; hapus tag
   `tutup` jika ada. Data tersimpan di titik ini. Stok juga bisa disimpan sendiri lewat `saveStock` (kartu "Simpan stok",
   untuk belanja pagi/siang).
4. **Belum:** panggil `runForecast('live')` (§6). Rencana: jika gagal → `forecast_runs.status = 'failed'` dan pesan
   "Data tersimpan, forecast gagal — tekan Hitung ulang". Data tetap aman.

**Kelola master data — sudah berjalan** (`src/actions/menus.ts`, `ingredients.ts`, `recipes.ts`, `settings.ts`)
- Setiap action: cek PIN → validasi → tulis → `revalidatePath` → `{ ok, message }` atau `{ ok: false, error, needPin? }`.
- Error PostgreSQL diterjemahkan: `23505` (nama dobel) dan `23503` (masih dipakai) → pesan Bahasa Indonesia.
- Simpan resep: upsert baris baru/berubah dulu, baru hapus baris yang dibuang (tidak hilang jika gagal di tengah).

**Import CSV (F3):** parse → validasi per baris → pratinjau → konfirmasi → upsert batch → forecast ulang.

**Mode demo (F9):** cookie `dataset` (`demo`/`live`), dibaca server di setiap halaman. Default `live`;
jika data `live` kosong, dashboard menawarkan pindah ke mode demo.

---

## 6. Pipeline Forecast

### 6.1 Kontrak API

`POST /api/forecast` · header `X-Forecast-Secret: <FORECAST_SECRET>`

Request:
```json
{
  "horizon": 5,
  "start_date": "2026-10-27",
  "series": [
    {
      "menu_id": "uuid",
      "history": [ { "date": "2026-09-01", "qty": 40 } ],
      "censored_dates": [ "2026-09-03" ]
    }
  ],
  "context": [ { "date": "2026-10-30", "tag": "gajian" } ]
}
```

Aturan validasi (`forecasting/contract.py`; salah → **400** dengan pesan Indonesia):

| Field | Aturan |
|---|---|
| `horizon` | bilangan bulat 1–7 |
| `start_date` | `YYYY-MM-DD`; semua tanggal `history` harus sebelum tanggal ini |
| `series` | 1–50 seri, `menu_id` unik (string 1–64 karakter) |
| `history` | ≤ 400 baris, tanggal unik, `qty` angka 0–100.000 (boleh desimal) |
| `censored_dates` | opsional. Hari **stok ayam habis** (sisa freezer 0) untuk kategori ayam. Tanggal yang tidak ada di `history` diabaikan. Hanya memicu peringatan (D-30) |
| `context` | opsional, ≤ 400, satu tag per tanggal, tag ∈ `ramai`, `sepi`, `libur`, `gajian` (boleh tanggal mendatang) |

Status lain: secret salah/tidak ada **401**, `FORECAST_SECRET` kosong di server **503**, body > 1 MB **413**,
galat tak terduga **500** (tanpa detail; detail di log Vercel). `GET` (dengan secret) = cek kesehatan.

Response:
```json
{
  "results": [
    {
      "menu_id": "uuid",
      "model": "ridge",
      "error_pct": 18.2,
      "data_days": 56,
      "forecast": [ { "date": "2026-10-27", "predicted": 42.3, "lower": 35.0, "upper": 50.1 } ],
      "warnings": []
    }
  ],
  "meta": { "version": "t17", "compute_ms": 210.4, "import_ms": 217.0, "cold_start": false }
}
```

Seri tanpa riwayat → `model: null`, `forecast: []`, peringatan "Belum ada data penjualan.". `predicted`,
`lower`, `upper` dibulatkan 1 desimal dan tidak pernah negatif. Waktu hitung lokal (data simulasi):
12 seri × 120 hari ±0,2 dtk; 50 seri × 400 hari (batas maksimum) ±2,5 dtk. Di Vercel `sin1` (25 Okt):
import 224 ms, request 12 seri × 119 hari (±51 KB) 0,88–0,95 dtk dari Semarang termasuk jaringan, hasil identik dengan lokal.

`history` hanya berisi hari yang punya data dan tidak bertanda `tutup`. `start_date` = **hari setelah
tanggal data terakhir**. Contoh: rekap terakhir kemarin → prediksi mulai hari ini; setelah rekap hari ini
disimpan malam harinya → prediksi mulai besok. Halaman yang menampilkan "besok" memilih titik dengan
tanggal besok (WIB) dari hasil ini.

### 6.2 Model

| Kode | Model | Cara kerja |
|---|---|---|
| `ma7` | Rata-rata bergerak | Rata-rata 7 hari tercatat terakhir |
| `snaive` | Seasonal naive | Nilai hari yang sama minggu lalu; jika tidak ada → 2 minggu lalu; jika tidak ada → `ma7` |
| `ridge` | Ridge regression (numpy, setara scikit-learn `StandardScaler` + `Ridge`; D-25), `alpha` = 1 | Fitur (`forecasting/features.py`): one-hot hari dalam seminggu (7), one-hot **awal bulan** tgl 1–5 dan 6–10 (2), one-hot penanda hari (4), lag-7 (kosong → rata-rata minggu lalu), **rata-rata minggu lalu** (d−13…d−7), indeks tren (bulan sejak data pertama). Fitur distandarkan. < 14 baris latih → memakai `ma7` |

Semua fitur hanya memakai nilai ≤ d−7, jadi satu model berlaku untuk horizon 1–7 tanpa prediksi rekursif
(prediksi tidak memakai prediksi). Hari tutup tidak ada di riwayat; lag dan rata-rata hanya memakai hari tercatat.
Hari stok habis tetap dipakai melatih apa adanya (D-30).

### 6.3 Pemilihan Model (per menu)

| Jumlah hari data | Model yang dibandingkan |
|---|---|
| < 7 | Hanya `ma7` + peringatan "data sangat sedikit" |
| 7–27 | `ma7`, `snaive` (backtest jika ≥ 14 hari) |
| ≥ 28 | `ma7`, `snaive`, `ridge` |

Backtest: rolling origin pada hingga 14 titik asal terakhir (tanggal tercatat, kecuali yang paling akhir),
horizon 1…`horizon` request; hanya tanggal yang tercatat yang dinilai. Metrik **WAPE**
= Σ|aktual − prediksi| / Σ aktual × 100, ditampilkan sebagai "error rata-rata" (D-10).
Model dengan WAPE terkecil dipilih; jika selisih < 1 poin, pilih model yang lebih sederhana.

> Ambang 7 / 14 / 28 hari adalah asumsi awal dan boleh disesuaikan setelah melihat data nyata
> (catat sebagai keputusan baru).

### 6.4 Rentang Prediksi

Kuantil 10% dan 90% dari residual backtest model terpilih, ditambahkan ke prediksi, minimal 0.
Jika residual < 10 titik, `lower` dan `upper` = `null` dan UI tidak menampilkan rentang.

### 6.5 Peringatan per seri

| Kondisi | Teks |
|---|---|
| < 7 hari data | "Data sangat sedikit (< 7 hari); prediksi memakai rata-rata sederhana." |
| 7–13 hari | "Akurasi belum bisa diuji (< 14 hari data)." |
| Ada `censored_dates` | "Ada N hari stok habis; penjualan hari itu bisa lebih rendah dari permintaan, jadi prediksi bisa sedikit rendah." |

> **Catatan akurasi (data simulasi, 4 seed × 150 hari, 30 titik asal, horizon 5, vs permintaan sebenarnya):**
> geprek bakar ±19%, kategori ayam kecil (1–6 porsi/hari) 35–93% karena angkanya kecil dan acak. Untuk
> rekomendasi kg yang dipakai adalah **jumlah prediksi semua kategori ayam**, dan errornya jauh lebih kecil:
> **WAPE 14,0%**, rata-rata kurang 1,25 porsi/hari (kesalahan antarkategori saling menutup). T-19/T-20
> menampilkan error per kategori apa adanya. Angka simulasi, bukan data warung.

---

## 7. Rekomendasi Bahan Baku

Dihitung di `src/lib/recommend.ts` dari forecast tersimpan:

```
kebutuhan_bahan(i, d)  = Σ_kategori prediksi(kategori, d) × resep(kategori, i)
rekomendasi(i, d)      = ceil( kebutuhan_bahan(i, d) × (1 + buffer_pct / 100) )
beli_kg(i)             = ceil_0,5( max(0, rekomendasi(i) − sisa_freezer(i)) / pieces_per_kg(i) )   ← hanya bahan dibeli per kg
```

`buffer_pct` default 10 (sementara, menunggu Q-09). Prediksi tidak dibulatkan sebelum dikalikan resep.
`sisa_freezer(i)` = `leftover_pieces` bahan i pada hari terakhir yang tercatat (0 jika tidak ada); untuk total 5 hari
dikurangkan sekali. `ceil_0,5` = dibulatkan ke atas ke kelipatan 0,5 kg (D-27). `pieces_per_kg(i)` untuk rekomendasi
live (T-20) = **rata-rata potong/kg 14 hari terakhir** dari belanja, cadangan angka di pengaturan bahan (D-29).

---

## 8. Keamanan & PIN

Sudah diimplementasikan (D-21). Lokasi: `src/lib/pin-token.ts`, `src/lib/pin.ts`, `src/actions/pin.ts`, `src/proxy.ts`.

- **Database:** RLS aktif tanpa policy publik. Client Supabase hanya di modul `server-only` (secret key).
- **Cookie `as_pin`:** nilai `"<exp>.<hmac>"`, hmac = HMAC-SHA256(`SESSION_SECRET`, `pin:<exp>:<APP_PIN>`);
  `httpOnly`, `secure` (production), `sameSite=lax`, berlaku 30 hari.
  Karena `APP_PIN` ikut ditandatangani, **mengganti PIN otomatis membuat semua perangkat masuk ulang**.
- **Proteksi berlapis:** `src/proxy.ts` (Next 16 menamai ulang `middleware` menjadi `proxy`, runtime Node) mengalihkan
  `/rekap`, `/waste`, `/pengaturan`, `/import` ke `/pin?next=…`. **Setiap Server Action tulis tetap memanggil
  `isPinVerified()`** — dokumentasi Next menegaskan proxy bukan satu-satunya pengaman.
- `pin-token.ts` **tidak boleh** mengimpor `server-only` (paket itu menolak dipakai di proxy).
- **Rate limit:** 5 percobaan salah per 15 menit per IP. Kunci = SHA-256(IP + `SESSION_SECRET`); IP asli tidak disimpan.
- **Fail-closed:** jika `pin_attempts` tidak bisa dibaca/ditulis (DB mati), PIN ditolak dengan pesan jelas.
- **`next`** setelah PIN hanya boleh ke halaman terproteksi di aplikasi ini (cegah open redirect).
- **Sesi habis saat mengisi form:** proxy memotong request Server Action → client (`useActionRunner`) menampilkan
  pesan + tombol "Masukkan PIN lagi"; data tidak tersimpan.
- **Ganti PIN:** ubah `APP_PIN` di Vercel lalu redeploy. Logout paksa tanpa ganti PIN: ganti `SESSION_SECRET`.
- **Python (rencana):** menolak request tanpa `X-Forecast-Secret` yang cocok; tidak memegang kredensial DB.
- **Dashboard tanpa PIN:** Beranda & Prediksi terbuka; keputusan akhir menunggu klien (Q-05).
- **`/status`:** hanya jumlah baris per tabel, `robots: noindex`, tidak di navigasi.

---

## 9. Environment Variables

| Nama | Dipakai di | Keterangan |
|---|---|---|
| `SUPABASE_URL` | Next.js server | URL project |
| `SUPABASE_SECRET_KEY` | Next.js server | Key server-side ("secret" / "service_role") |
| `APP_PIN` | Next.js server | PIN bersama, disarankan 6 digit |
| `SESSION_SECRET` | Next.js server | Penanda tangan cookie PIN + garam hash IP; ganti = semua perangkat logout |
| `FORECAST_URL` | Next.js server | URL fungsi Python — belum dipakai Next.js (T-18) |
| `FORECAST_SECRET` | Next.js server + Python | Secret bersama; sudah dicek `api/forecast.py` (kosong → 503). Next.js memakainya mulai T-18. Nilai di Vercel = `.env.local`; mengubahnya hanya lewat dashboard Vercel lalu **Redeploy** |

Tidak ada variabel `NEXT_PUBLIC_*`. Nilai asli hanya di `.env.local` (laptop Fillian) dan Vercel.

---

## 10. Akun, Deploy & Serah Terima

**Akun (D-09)**
- Satu Gmail AYAMSMART (idealnya dibuat tim klien dengan HP mereka). GitHub, Supabase, dan Vercel
  didaftarkan dengan email itu dan dikelola Fillian sampai pelunasan.
- 2FA memakai aplikasi authenticator; recovery code disimpan dan diserahkan saat serah terima.
- Fillian bekerja di VS Code lokal dengan git config **lokal repo** atas nama `ayamsmartdev` dan remote
  `https://ayamsmartdev@github.com/...`, agar commit author dan akun push = pemilik Vercel (lihat AGENTS.md §2).
- **Kondisi aktual:** GitHub `ayamsmartdev` login via Google (Gmail AYAMSMART); Vercel dan Supabase
  login via OAuth GitHub `ayamsmartdev`. Artinya **akun GitHub adalah kunci utama**: siapa pun yang
  menguasai GitHub (dan Gmail di belakangnya) menguasai Vercel dan Supabase. 2FA di GitHub dan Gmail wajib.
- Repo: `ayamsmartdev/Ayam-Smart` (public, D-15). Tidak boleh berisi secret maupun data nyata klien.

**Deploy:** push ke `main` → Vercel build otomatis. Region fungsi `sin1` (Singapura) diatur di `vercel.json`;
project Supabase juga di Singapura agar server dan database berdekatan.

**Batasan platform yang harus diingat**
- Vercel Hobby: deploy dari commit author yang bukan pemilik akun diblokir pada repo private. Repo ini
  public, tetapi commit tetap memakai identitas `ayamsmartdev` agar aman jika suatu saat dijadikan private.
- Vercel Hobby dibatasi untuk penggunaan non-komersial menurut fair use guidelines Vercel (D-13).
- Supabase Free: project di-pause setelah 1 minggu tidak aktif. Cek H-1 presentasi.

**Checklist serah terima**
- [ ] Pelunasan diterima
- [ ] Ganti password Gmail; serahkan Gmail + GitHub ke klien (Vercel & Supabase ikut karena login via GitHub)
- [ ] Cek tidak ada metode login lain milik Fillian di Vercel/Supabase (email/password tambahan, akun terhubung)
- [ ] Ganti nomor HP & email pemulihan Google ke milik klien; pastikan data Fillian tidak tersisa
- [ ] Reset 2FA ke perangkat klien; serahkan recovery code baru
- [ ] Rotasi `SESSION_SECRET`, `FORECAST_SECRET`; klien menentukan `APP_PIN` baru
- [ ] Logout semua sesi Fillian; hapus kredensial `ayamsmartdev` dari Git Credential Manager laptop Fillian
- [ ] Panduan singkat penggunaan diserahkan
- [ ] Clone untuk portofolio Fillian (izin klien sudah ada): tanpa `.env`, tanpa data klien di riwayat git

---

## 11. Keputusan

> Jangan menghapus entri. Perubahan = entri baru + tandai entri lama "digantikan oleh D-xx".

| ID | Tanggal | Keputusan | Alasan | Status |
|---|---|---|---|---|
| D-01 | 22 Okt 2026 | Next.js + TypeScript + Tailwind v4 murni, tanpa component library | Kustomisasi penuh per komponen; stack dikuasai developer | Berlaku |
| D-02 | 22 Okt 2026 | Supabase PostgreSQL sebagai database | Banyak perangkat harus melihat data yang sama; kasir belum ada sehingga aplikasi mengumpulkan data sendiri | Berlaku |
| D-03 | 23 Okt 2026 | Forecast di Python (numpy, scikit-learn) sebagai Vercel Function stateless | Ekosistem ML standar dan kredibel; batas bundle Python 500 MB cukup. Jika spike T-10 gagal → forecast pindah ke TypeScript tanpa mengubah kontrak §6.1 | Berlaku — spike T-10 lolos (lihat D-25 untuk dependency) |
| D-04 | 23 Okt 2026 | Forecast dihitung saat data berubah, hasil disimpan; dashboard hanya membaca | Menghindari cold start Python saat dashboard dibuka dan saat presentasi | Berlaku |
| D-05 | 23 Okt 2026 | Semua akses DB lewat server; RLS aktif tanpa policy publik | Aplikasi publik tanpa login; key di browser selalu bisa dilihat orang | Berlaku |
| D-06 | 23 Okt 2026 | Tanpa login; PIN bersama untuk aksi tulis | Mencegah orang yang tahu link mengubah data, tanpa sistem akun | Berlaku — diimplementasikan (D-21); persetujuan klien Q-05 masih ditunggu |
| D-07 | 23 Okt 2026 | Input = rekap harian per menu + import CSV, bukan sistem kasir | Kasir klien dibuat terpisah; rekap cukup untuk forecast harian | Berlaku |
| D-08 | 23 Okt 2026 | Data simulasi dipisah lewat kolom `dataset`, dikalibrasi dari estimasi pemilik, wajib berlabel | Riwayat data nyata belum ada; kejujuran saat presentasi | Berlaku |
| D-09 | 23 Okt 2026 | Semua akun atas nama AYAMSMART, dikelola Fillian sampai serah terima; commit pakai identitas AYAMSMART | Vercel Hobby tidak mendukung kolaborator pada repo private; serah terima cukup ganti kredensial | Berlaku |
| D-10 | 23 Okt 2026 | Metrik error = WAPE, ditampilkan sebagai "error rata-rata" | MAPE tidak terdefinisi saat penjualan 0 dan bias pada angka kecil | Berlaku |
| D-11 | 23 Okt 2026 | Forecast per menu per hari; bahan baku diturunkan lewat resep | Satu potong ayam dipakai beberapa menu; resep menangani menu "ayam saja" vs paket | Berlaku |
| D-12 | 23 Okt 2026 | Dokumentasi ramping: AGENTS, PRD, ARCHITECTURE, TASKS, STYLEGUIDE | Cukup untuk kontinuitas antar AI tanpa beban dokumen berlebih | Berlaku |
| D-13 | 23 Okt 2026 | Hosting Vercel Hobby (pilihan klien); risiko kebijakan non-komersial dicatat dan disampaikan ke klien | Biaya nol untuk tahap awal; plan menjadi keputusan klien setelah serah terima | Berlaku |
| D-14 | 23 Okt 2026 | UI hanya mode terang | Dipakai di warung/area terang; menghemat waktu sprint | Berlaku |
| D-15 | 23 Okt 2026 | Repo GitHub **public**. Konsekuensi: secret dan data nyata klien tidak pernah di-commit; hanya data simulasi di repo | Klien menyerahkan keputusan ke Fillian; AI bisa membaca repo langsung via raw GitHub (workflow sama dengan SmartWMS) | Berlaku |
| D-16 | 23 Okt 2026 | Cache Components dan Partial Prefetching Next.js 16 dimatikan (hapus `cacheComponents` & `partialPrefetching` dari `next.config.ts`) | Hampir semua halaman dinamis (cookie mode demo/PIN, data harus selalu terbaru); model caching baru menambah aturan Suspense/`"use cache"` tanpa manfaat berarti untuk tenggat 2 minggu | Berlaku |
| D-17 | 23 Okt 2026 | Tema visual: latar hangat Nasi → Langit, kaca ala iOS (`glass`, `glass-bar`), gradasi biru brand, aksen kriuk (keemasan) & sambal (merah), font Plus Jakarta Sans; detail di `STYLEGUIDE.md` | Permintaan klien/Fillian: minimalis, nyaman di mata, warm tapi cocok dengan gradasi biru, glassmorphism iOS. Warna aksen diambil dari dunia ayam geprek agar tidak terasa template | Berlaku |
| D-18 | 23 Okt 2026 | UI dibangun lebih dulu sebagai **pratinjau** dengan data simulasi (`lib/demo-data.ts`) dan forecast sementara TypeScript (`lib/preview-forecast.ts`: rata-rata hari yang sama 4 minggu, error = WAPE backtest 14 hari). Rute berbahasa Indonesia (`/prediksi`, `/bahan`, `/rekap`, `/waste`, `/pengaturan`, `/import`, `/lainnya`). Aksi simpan menampilkan pesan pratinjau yang jujur | Klien bisa melihat dan memberi masukan lebih awal (Agile). Forecast sementara tidak menggantikan D-03; kontrak §6.1 tetap. Setelah Supabase & Python siap, sumber data diganti tanpa mengubah halaman | Berlaku (sementara) — Rekap & Pengaturan sudah data nyata; Beranda, Prediksi, Bahan, Waste masih simulasi |
| D-19 | 23 Okt 2026 | Rendering & lokasi: halaman pratinjau **statis ISR** (`revalidate = 60` di layout) + `loading.tsx` + `FreshnessGuard` (muat ulang sekali jika tanggal halaman ≠ tanggal WIB di perangkat); region fungsi Vercel `sin1` | Sebelumnya `force-dynamic` + region default `iad1` (Washington): tiap tap tab ±0,9 dtk (uji jeda 300 ms). Sesudah: ±0,1–0,2 dtk karena halaman di-prefetch penuh dari CDN. Saat halaman membaca cookie/Supabase dan jadi dinamis: pertahankan `loading.tsx`, region `sin1`, dan kueri seringan mungkin | Berlaku |
| D-20 | 23 Okt 2026 | Prioritas "Rekap harian live" (DB, PIN, rekap, kelola menu/bahan/resep/setelan) **sebelum** spike Python | Data nyata adalah bottleneck; tiap hari tanpa rekap = data hilang. Forecast pratinjau cukup untuk demo sementara | Berlaku |
| D-21 | 23 Okt 2026 | PIN memakai `src/proxy.ts` (Next 16) + `isPinVerified()` di setiap Server Action; cookie HMAC ikut menandatangani `APP_PIN`; rate limit dengan IP di-hash; fail-closed | Proxy hanya pengecekan cepat (sesuai dok Next 16); ganti PIN harus mencabut semua sesi; tidak menyimpan data pribadi | Berlaku |
| D-22 | 23 Okt 2026 | Aturan data rekap & master: simpan semua menu aktif termasuk 0; tutup = hapus rekap + tag `tutup`; rentang 30 hari; hanya `live`; menu/bahan berhistori dinonaktifkan, bukan dihapus; satuan bahan dikunci bila dipakai | Membedakan "terjual 0" vs "belum direkap"; menjaga riwayat penjualan & arti takaran resep | Berlaku |
| D-23 | 23 Okt 2026 | Validasi input manual di server (`clean*Input`), tanpa zod | Skema input kecil & sederhana; menghindari dependency tambahan. Menggantikan rencana zod di §2 awal | Berlaku |
| D-24 | 23 Okt 2026 | Pola UI kelola data: `useActionRunner` untuk semua aksi; error saat dialog terbuka tampil DI DALAM dialog (`DialogError`); form dengan status "belum disimpan" wajib `useLeaveGuard`; `ConfirmDialog.onClose` hanya terpicu oleh pengguna | Ditemukan saat testing: toast tertutup lapisan modal, dan perpindahan antar-dialog membatalkan dialog baru | Berlaku |
| D-25 | 23 Okt 2026 | Runtime forecast **hanya numpy**: Ridge (standarisasi + penalti, intercept tidak dipenalti) ditulis di `forecasting/models.py` dan dibuktikan identik dengan scikit-learn lewat `tests/test_models.py` (toleransi 1e-8); scikit-learn hanya dependency dev. Tanpa FastAPI (kelas `handler` bawaan). Fungsi di folder `/api`, bukan Vercel Services | Hasil prediksi sama, tetapi paket 264 → 69 MB dan import lokal ±1 dtk → ±0,14 dtk. Spike di Vercel (`sin1`): import 217 ms, fit 40 ms (pertama) / 1,1 ms, request 0,15–0,19 dtk dari laptop Fillian. `/api` stabil; Services masih beta & perlu ubah struktur (jadi cadangan). Melengkapi D-03 | Berlaku |
| D-26 | 24 Okt 2026 | **Rekap per kategori menu** (±12 baris), bukan per menu (41), ditambah **stok ayam dada harian** (potong disiapkan & sisa masuk freezer, tabel `daily_stock`). Kategori disimpan di tabel `menus` (+ kolom `description` untuk isi varian) | Klien tidak punya catatan penjualan ("dilihat dari habisnya bahan"); 41 baris dari ingatan rawan asal isi. Per menu ±1 porsi/hari → prediksi tidak stabil; per kategori angkanya besar (geprek bakar ±28/hari). Indikator sukses klien = stok ayam. Tabel `menus` dipakai ulang agar resep, rekap, forecast tidak berubah. Detail varian bisa didapat nanti dari export platform online/kasir | Berlaku; bagian "potong disiapkan" digantikan D-29 |
| D-27 | 24 Okt 2026 | Ayam dihitung **per kg dada**: setelan `pieces_per_kg` (default 9) menggantikan potong per ekor; rekomendasi beli = (rekomendasi potong − sisa freezer) ÷ potong per kg, dibulatkan ke atas per 0,5 kg | Klien hanya membeli dada per kg di pasar, 1 kg = 9–10 potong (Q-03). Angka 9 = batas bawah agar tidak kekurangan. Pembulatan 0,5 kg = asumsi satuan beli di pasar, bisa diubah | Diubah sebagian oleh D-28 (potong per kg pindah ke tiap bahan) |
| D-28 | 24 Okt 2026 | **Potong per kg dan stok freezer per bahan**, bukan global: `ingredients.pieces_per_kg` (wajib jika dibeli per kg) dan `daily_stock.ingredient_id`. Setelan global `pieces_per_kg` dihapus (0003) | Diusulkan saat review: jika kelak ada menu paha/sayap, satu angka global membuat rekomendasi kg salah tanpa peringatan. Dibuat sebelum ada data stok dan sebelum form stok (K4), jadi hampir tanpa biaya. Warung yang hanya memakai dada tetap melihat satu baris | Berlaku |
| D-29 | 24 Okt 2026 | Stok dicatat sesuai yang penjual tahu: **belanja** (kg + jumlah potong opsional, bisa disimpan kapan saja) dan **sisa masuk freezer** saat tutup; sistem menghitung tersedia → sisa seharusnya (dari rekap × resep) → **selisih** ("tidak tercatat: food waste, dipakai sendiri, atau salah hitung rekap"). Potong/kg pengaturan jadi perkiraan cadangan; rekomendasi memakai rata-rata 14 hari. Warung tutup tidak menghapus stok. Hanya ayam (bahan dibeli per kg); bahan lain di luar scope | Klien menghitung "dari habisnya bahan" dan tidak menghitung potong yang disiapkan. Ukuran ayam berubah tiap hari (1 kg bisa 8–10 potong), jadi angka tetap di pengaturan memicu selisih palsu; jumlah potong asli opsional agar belanja tetap tercatat walau tidak dihitung. Selisih mengukur indikator sukses klien ("stok ayam") tanpa input tambahan. Diputuskan bersama Fillian | Berlaku |
| D-30 | 24 Okt 2026 | Forecast v1 (T-17): fitur Ridge ditambah **awal bulan** (tgl 1–5, 6–10) dan rata-rata minggu lalu; semua fitur ≥ d−7 sehingga horizon 1–7 tanpa rekursi. **Hari stok habis tetap dipakai melatih apa adanya** (tidak dibuang, tidak diimputasi); dikirim sebagai `censored_dates` hanya untuk peringatan | Klien: "hari rame awal bulan". Soal stok habis diuji pada data simulasi (8 seed × 150 hari, 30 titik asal terakhir, horizon 5, dibandingkan dengan **permintaan sebenarnya**): total porsi ayam Ridge WAPE 14,9% (apa adanya) vs 15,3% (buang hari habis) vs 14,9% (imputasi); pipeline lengkap 15,5% vs 15,5% (imputasi). Geprek bakar: 17,8% vs 17,7%. Membuang hari habis **lebih buruk** karena hari habis justru hari ramai (usulan awal dibatalkan); imputasi hanya membantu tipis dan tidak konsisten, jadi tidak sebanding dengan kerumitannya. Semua cara masih kurang ±2 porsi/hari; diatasi lewat cadangan % di rekomendasi. Angka ini dari simulasi, ulangi setelah data asli ±4 minggu | Berlaku |

---

## 12. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Python di Vercel bermasalah (rute, ukuran, cold start) | Forecast tidak jalan | **Teratasi:** spike T-10 lolos (D-25). Sisa risiko: rute `/api/*` diambil alih folder `/api` → jangan buat `src/app/api/` |
| Data nyata sangat sedikit | Forecast tidak bermakna | Baseline + peringatan; mode demo terkalibrasi; error ditampilkan jujur |
| Materi klien (menu, resep) terlambat | Rekomendasi tidak bisa dihitung | Menu & resep contoh sementara, bisa diubah di Pengaturan |
| Supabase ter-pause | Aplikasi error saat presentasi | Input harian menjaga aktivitas; cek H-1 |
| Zona waktu salah | Data masuk ke tanggal yang salah | Helper `date.ts` wajib; tidak memakai tanggal UTC |
| Scope bertambah di tengah sprint | Jadwal mundur | Perubahan masuk backlog `TASKS.md`, diprioritaskan di demo sprint |

| hapus aja ini perubahan cuma mau pamer lewat commit -m wkwk