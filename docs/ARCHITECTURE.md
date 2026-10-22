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
  • numpy + scikit-learn
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
| Validasi | zod | Validasi input di server |
| Database | Supabase (PostgreSQL), region Singapore | Free plan (D-02, D-13) |
| Forecast | Python 3.12: numpy, scikit-learn, FastAPI | Vercel Python Function (D-03); versi dikunci di `.python-version` |
| Hosting | Vercel, region fungsi **Singapura (`sin1`)** via `vercel.json` | Hobby plan, keputusan klien (D-13); region dekat pengguna & Supabase (D-19) |
| Repo & IDE | GitHub (public, akun AYAMSMART) + VS Code lokal | D-09, D-15 |

---

## 3. Struktur Folder

```
/
├─ AGENTS.md  CLAUDE.md  README.md  .env.example
├─ .python-version                  # "3.12" — sama dengan default Vercel
├─ requirements.txt                 # dependency Python runtime (versi di-pin): numpy, scikit-learn, fastapi
├─ requirements-dev.txt             # khusus lokal: -r requirements.txt + uvicorn, pytest
├─ api/
│  └─ forecast.py                   # Python Function → POST /api/forecast (tipis, panggil package forecasting)
├─ forecasting/                     # package Python murni, bisa dites tanpa server
│  ├─ __init__.py
│  ├─ features.py                   # pembentukan fitur
│  ├─ models.py                     # MA7, seasonal naive, ridge
│  ├─ backtest.py                   # rolling-origin backtest + WAPE + interval
│  └─ run.py                        # orkestrasi per menu
├─ tests/
│  └─ test_forecasting.py           # pytest (dev only)
├─ scripts/
│  └─ generate_demo_data.py         # generator data simulasi (seed tetap)
├─ supabase/
│  └─ migrations/                   # 0001_init.sql, dst. Dijalankan berurutan
└─ src/
   ├─ middleware.ts                 # proteksi halaman tulis dengan cookie PIN
   ├─ app/                          # rute berbahasa Indonesia (D-18)
   │  ├─ layout.tsx                 # font, latar, AppShell, FreshnessGuard; revalidate = 60 (D-19)
   │  ├─ loading.tsx                # kerangka halaman saat rute masih dimuat
   │  ├─ globals.css                # token tema, utilitas glass/glass-bar
   │  ├─ page.tsx                   # Beranda                   ✅ pratinjau
   │  ├─ prediksi/                  # Prediksi per menu         ✅ pratinjau
   │  ├─ bahan/                     # Rekomendasi bahan baku    ✅ pratinjau
   │  ├─ rekap/                     # Rekap harian       (PIN)  ✅ pratinjau
   │  ├─ waste/                     # Food waste         (PIN)  ✅ pratinjau
   │  ├─ lainnya/                   # Menu tambahan (HP)        ✅
   │  ├─ pengaturan/                # Menu, resep, setelan (PIN) ✅ pratinjau (baca saja)
   │  ├─ import/                    # Import CSV         (PIN)  ✅ template; unggah belum
   │  └─ pin/                       # Form PIN                  belum
   ├─ actions/                      # Server Actions (semua tulis data ada di sini) — belum
   ├─ components/
   │  ├─ icons.tsx                  # ikon SVG buatan sendiri
   │  ├─ ui/                        # Panel, Button, Badge, GroupedList, Stepper, Segmented, PageHeader, Toast
   │  ├─ charts/                    # SalesChart (Recharts)
   │  └─ layout/                    # AppShell, SidebarNav, TabBar, BrandMark
   └─ lib/
      ├─ cn.ts                      # gabung class
      ├─ date.ts                    # todayWIB(), addDays(), format tanggal id-ID        ✅
      ├─ format.ts                  # format angka & satuan id-ID                        ✅
      ├─ recommend.ts               # rumus rekomendasi bahan (§7)                       ✅
      ├─ demo-data.ts               # DATA SIMULASI sementara (menu, resep, penjualan)   ✅ sementara
      ├─ preview-forecast.ts        # forecast pratinjau TypeScript (D-18)               ✅ sementara
      ├─ preview.ts                 # penyusun angka pratinjau untuk semua halaman       ✅ sementara
      ├─ supabase-server.ts         # client Supabase server-only (import 'server-only')  belum
      ├─ pin.ts                     # verifikasi PIN, tanda tangan cookie, rate limit     belum
      ├─ dataset.ts                 # baca mode demo/live dari cookie                     belum
      ├─ forecast-client.ts         # panggil Python + simpan hasil                       belum
      └─ csv.ts                     # parse & validasi CSV                                belum
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
| `menus` | `id uuid pk`, `name text unique`, `price int null`, `is_active bool`, `sort_order int`, `created_at` | Master menu, dipakai kedua dataset |
| `ingredients` | `id uuid pk`, `name text unique`, `unit text` (`potong`/`gram`/`porsi`/`ml`/`pcs`), `is_chicken bool`, `created_at` | `is_chicken` untuk konversi ke ekor |
| `menu_ingredients` | `menu_id fk`, `ingredient_id fk`, `qty_per_portion numeric`, pk(`menu_id`,`ingredient_id`) | Resep |
| `daily_sales` | `id`, `dataset`, `sale_date date`, `menu_id fk`, `qty int ≥ 0`, `created_at`, `updated_at`, unique(`dataset`,`sale_date`,`menu_id`) | Upsert per tanggal + menu |
| `daily_context` | `dataset`, `ctx_date date`, `tag text` (`ramai`/`sepi`/`libur`/`gajian`/`tutup`), `note text`, pk(`dataset`,`ctx_date`) | Penanda hari, boleh tanggal mendatang |
| `food_waste` | `id`, `dataset`, `waste_date date`, `menu_id fk null`, `ingredient_id fk null`, `qty numeric > 0`, `reason text` (`tidak_laku`/`rusak`/`kedaluwarsa`/`lainnya`), `note`, `created_at` | Check: tepat satu dari `menu_id`/`ingredient_id` terisi |
| `forecast_runs` | `id uuid pk`, `dataset`, `created_at`, `status text` (`ok`/`failed`), `summary jsonb` | `summary`: per menu → model, error, jumlah hari data, peringatan |
| `forecasts` | `id`, `run_id fk`, `dataset`, `target_date date`, `menu_id fk`, `predicted numeric`, `lower numeric null`, `upper numeric null` | Dashboard membaca run `ok` terbaru |
| `settings` | `key text pk`, `value jsonb` | `buffer_pct`, `pieces_per_chicken`, dll. |
| `pin_attempts` | `key text pk` (hash IP), `count int`, `window_start timestamptz` | Rate limit PIN |

**Aturan data**
- Hari tanpa baris `daily_sales` = tidak ada data (bukan 0). Hari bertanda `tutup` dikeluarkan dari training.
- Tanggal selalu `date` (tanpa jam), dihitung dalam Asia/Jakarta.
- Menu tidak dihapus permanen jika sudah punya data; cukup `is_active = false`.

---

## 5. Alur Data

**Input rekap (F2)**
1. Server Action menerima tanggal + daftar `{menu_id, qty}`, cek PIN, validasi zod.
2. Upsert ke `daily_sales` (dataset aktif). Data dianggap tersimpan di titik ini.
3. Panggil `runForecast(dataset)` (§6). Jika gagal: catat `forecast_runs.status = 'failed'`,
   tampilkan pesan "Data tersimpan, forecast gagal — tekan Hitung ulang". Data tetap aman.

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
    { "menu_id": "uuid", "history": [ { "date": "2026-09-01", "qty": 40 } ] }
  ],
  "context": [ { "date": "2026-10-30", "tag": "gajian" } ]
}
```

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
  ]
}
```

`history` hanya berisi hari yang punya data dan tidak bertanda `tutup`. `start_date` = **hari setelah
tanggal data terakhir**. Contoh: rekap terakhir kemarin → prediksi mulai hari ini; setelah rekap hari ini
disimpan malam harinya → prediksi mulai besok. Halaman yang menampilkan "besok" memilih titik dengan
tanggal besok (WIB) dari hasil ini.

### 6.2 Model

| Kode | Model | Cara kerja |
|---|---|---|
| `ma7` | Rata-rata bergerak | Rata-rata 7 hari data terakhir |
| `snaive` | Seasonal naive | Nilai hari yang sama minggu lalu; jika tidak ada → `ma7` |
| `ridge` | Ridge regression (scikit-learn) | Fitur: one-hot hari dalam seminggu, nilai lag-7, rata-rata 7 hari terakhir saat titik prediksi, one-hot penanda hari, indeks tren. Fitur distandarkan, `alpha` tetap |

Horizon ≤ 7 hari memungkinkan lag-7 dipakai langsung tanpa prediksi rekursif.

### 6.3 Pemilihan Model (per menu)

| Jumlah hari data | Model yang dibandingkan |
|---|---|
| < 7 | Hanya `ma7` + peringatan "data sangat sedikit" |
| 7–27 | `ma7`, `snaive` (backtest jika ≥ 14 hari) |
| ≥ 28 | `ma7`, `snaive`, `ridge` |

Backtest: rolling origin pada hingga 14 titik asal terakhir, horizon 1–5. Metrik **WAPE**
= Σ|aktual − prediksi| / Σ aktual × 100, ditampilkan sebagai "error rata-rata" (D-10).
Model dengan WAPE terkecil dipilih; jika selisih < 1 poin, pilih model yang lebih sederhana.

> Ambang 7 / 14 / 28 hari adalah asumsi awal dan boleh disesuaikan setelah melihat data nyata
> (catat sebagai keputusan baru).

### 6.4 Rentang Prediksi

Kuantil 10% dan 90% dari residual backtest model terpilih, ditambahkan ke prediksi, minimal 0.
Jika residual < 10 titik, `lower` dan `upper` = `null` dan UI tidak menampilkan rentang.

---

## 7. Rekomendasi Bahan Baku

Dihitung di `src/lib/recommend.ts` dari forecast tersimpan:

```
kebutuhan_bahan(i, d)  = Σ_menu prediksi(menu, d) × resep(menu, i)
rekomendasi(i, d)      = ceil( kebutuhan_bahan(i, d) × (1 + buffer_pct / 100) )
ekor_ayam(d)           = ceil( rekomendasi(ayam, d) / pieces_per_chicken )
```

`buffer_pct` default 10 (sementara, menunggu Q-09). Prediksi tidak dibulatkan sebelum dikalikan resep.

---

## 8. Keamanan & PIN

- **Database:** RLS aktif tanpa policy publik. Client Supabase hanya dibuat di modul `server-only`.
- **PIN:** `APP_PIN` dibandingkan dengan timing-safe compare di server.
  Jika benar → cookie `as_pin` = `exp` + HMAC-SHA256(`SESSION_SECRET`, `exp`); `httpOnly`, `secure`,
  `sameSite=lax`, berlaku 30 hari.
- **Proteksi berlapis:** `middleware.ts` mengalihkan halaman tulis ke `/pin`, dan **setiap Server
  Action tulis tetap memverifikasi cookie**.
- **Rate limit:** maksimal 5 percobaan salah per 15 menit per IP (hash) di `pin_attempts`.
- **Ganti PIN / logout semua perangkat:** ubah `APP_PIN` dan `SESSION_SECRET` di Vercel, lalu redeploy.
- **Python:** menolak request tanpa `X-Forecast-Secret` yang cocok. Tidak memegang kredensial DB.
- **Dashboard tanpa PIN:** menunggu keputusan klien (Q-05). Implementasi harus bisa dialihkan dengan satu setelan.

---

## 9. Environment Variables

| Nama | Dipakai di | Keterangan |
|---|---|---|
| `SUPABASE_URL` | Next.js server | URL project |
| `SUPABASE_SECRET_KEY` | Next.js server | Key server-side ("secret" / "service_role") |
| `APP_PIN` | Next.js server | PIN bersama, disarankan 6 digit |
| `SESSION_SECRET` | Next.js server | Penanda tangan cookie PIN |
| `FORECAST_URL` | Next.js server | URL fungsi Python |
| `FORECAST_SECRET` | Next.js server + Python | Secret bersama |

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
| D-03 | 23 Okt 2026 | Forecast di Python (numpy, scikit-learn) sebagai Vercel Function stateless | Ekosistem ML standar dan kredibel; batas bundle Python 500 MB cukup. Jika spike T-10 gagal → forecast pindah ke TypeScript tanpa mengubah kontrak §6.1 | Menunggu spike |
| D-04 | 23 Okt 2026 | Forecast dihitung saat data berubah, hasil disimpan; dashboard hanya membaca | Menghindari cold start Python saat dashboard dibuka dan saat presentasi | Berlaku |
| D-05 | 23 Okt 2026 | Semua akses DB lewat server; RLS aktif tanpa policy publik | Aplikasi publik tanpa login; key di browser selalu bisa dilihat orang | Berlaku |
| D-06 | 23 Okt 2026 | Tanpa login; PIN bersama untuk aksi tulis | Mencegah orang yang tahu link mengubah data, tanpa sistem akun | Menunggu klien (Q-05) |
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
| D-18 | 23 Okt 2026 | UI dibangun lebih dulu sebagai **pratinjau** dengan data simulasi (`lib/demo-data.ts`) dan forecast sementara TypeScript (`lib/preview-forecast.ts`: rata-rata hari yang sama 4 minggu, error = WAPE backtest 14 hari). Rute berbahasa Indonesia (`/prediksi`, `/bahan`, `/rekap`, `/waste`, `/pengaturan`, `/import`, `/lainnya`). Aksi simpan menampilkan pesan pratinjau yang jujur | Klien bisa melihat dan memberi masukan lebih awal (Agile). Forecast sementara tidak menggantikan D-03; kontrak §6.1 tetap. Setelah Supabase & Python siap, sumber data diganti tanpa mengubah halaman | Berlaku (sementara) |
| D-19 | 23 Okt 2026 | Rendering & lokasi: halaman pratinjau **statis ISR** (`revalidate = 60` di layout) + `loading.tsx` + `FreshnessGuard` (muat ulang sekali jika tanggal halaman ≠ tanggal WIB di perangkat); region fungsi Vercel `sin1` | Sebelumnya `force-dynamic` + region default `iad1` (Washington): tiap tap tab ±0,9 dtk (uji jeda 300 ms). Sesudah: ±0,1–0,2 dtk karena halaman di-prefetch penuh dari CDN. Saat halaman membaca cookie/Supabase dan jadi dinamis: pertahankan `loading.tsx`, region `sin1`, dan kueri seringan mungkin | Berlaku |

---

## 12. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Python di Vercel bermasalah (rute, ukuran, cold start) | Forecast tidak jalan | Spike di hari pertama Sprint 1; fallback TypeScript (D-03) |
| Data nyata sangat sedikit | Forecast tidak bermakna | Baseline + peringatan; mode demo terkalibrasi; error ditampilkan jujur |
| Materi klien (menu, resep) terlambat | Rekomendasi tidak bisa dihitung | Menu & resep contoh sementara, bisa diubah di Pengaturan |
| Supabase ter-pause | Aplikasi error saat presentasi | Input harian menjaga aktivitas; cek H-1 |
| Zona waktu salah | Data masuk ke tanggal yang salah | Helper `date.ts` wajib; tidak memakai tanggal UTC |
| Scope bertambah di tengah sprint | Jadwal mundur | Perubahan masuk backlog `TASKS.md`, diprioritaskan di demo sprint |
