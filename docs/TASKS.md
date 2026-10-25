# TASKS — AYAMSMART

> Backlog per sprint, status, dan log sesi. Update setiap akhir sesi.
> Status: `[ ]` belum · `[~]` dikerjakan · `[x]` selesai · `[-]` dibatalkan (tulis alasannya).
> Pemilik: **F** = Fillian · **K** = Klien (Tim AYAMSMART). Terakhir diupdate: 23 Oktober 2026.

---

## Jadwal

| Sprint | Periode | Fokus | Demo ke klien |
|---|---|---|---|
| Sprint 0 | 23 Okt | Setup akun, repo, deploy pertama | — |
| Sprint 1 | 24–28 Okt | Data inti + forecast + dashboard v1 | 28 Okt |
| Sprint 2 | 29 Okt–1 Nov | Rekomendasi, food waste, CSV, branding, mode demo | 1 Nov |
| Sprint 3 | 2–3 Nov | Uji coba bersama, perbaikan, **feature freeze 3 Nov** | 3 Nov |
| Presentasi | 4–5 Nov | — | — |
| Pendampingan | setelah 5 Nov | Perbaikan, serah terima | — |

> **Aturan tempo:** periode sprint adalah **batas paling lambat**, bukan jadwal yang harus ditunggu.
> Begitu satu task selesai, langsung lanjut ke task berikutnya walaupun tanggal sprintnya belum tiba.
> Urutan task tetap diikuti karena ada ketergantungan (misalnya T-10 sebelum T-17/T-18).
> Demo ke klien boleh dimajukan saat satu kelompok fitur sudah siap dicoba.

---

## Sprint 0 — Setup (23 Okt)

- [x] T-01 Gmail AYAMSMART dibuat
- [~] T-02 (F) Akun GitHub `ayamsmartdev` (login Google), Vercel Hobby & Supabase Free (login GitHub) sudah dibuat. **Sisa:** aktifkan 2FA GitHub & Gmail (authenticator), simpan recovery code
- [x] T-03 (F) Repo public `ayamsmartdev/Ayam-Smart` (D-15); Next.js 16.4.2 diinisialisasi; docs, `.gitignore`, `.python-version` ter-commit; push pertama atas nama `ayamsmartdev`
- [x] T-04 (F) Project Supabase region Singapura; URL & secret key di `.env.local` dan Vercel
- [~] T-05 (F) Repo terhubung ke Vercel, live di https://ayam-smart.vercel.app, env vars Supabase & PIN terisi. **Sisa:** kirim link ke Julius
- [ ] T-06 (F) Kirim ke Julius: pertanyaan terbuka PRD §8 (Q-01–Q-11)

## Sprint 1 — Data & Forecast Inti (24–28 Okt)

> **Prioritas (diputuskan 23 Okt): "Rekap harian live" dulu, spike Python (T-10) sesudahnya**,
> supaya data nyata mulai terkumpul secepatnya. Rencana tahap (AGENTS §4a):
> 1. Skema DB `0001_init.sql` (T-11) — ✅ selesai (project Supabase dibuat ulang di Singapura)
> 2. Koneksi server-only ke Supabase + cek env (`/status`) — ✅ selesai
> 3. PIN: halaman `/pin`, cookie bertanda tangan, proteksi halaman tulis, batas percobaan (T-13) — ✅ selesai
> 4. Rekap harian tersimpan sebagai data `live` + memuat ulang tanggal yang sudah diisi (T-15) — ✅ selesai (diuji 9 langkah dengan Supabase asli)
> 5. CRUD menu & resep (T-14) — dipecah: **5a menu** ✅ · **5b-1 bahan** ✅ · **5b-2 resep** ✅ · **5b-3 setelan** ✅ — dites Fillian dengan Supabase asli
> 6. Update docs (ARCHITECTURE D-20–D-24, STYLEGUIDE, AGENTS §9 & §11) — ✅ selesai
>
> **Rangkaian "Rekap harian live" selesai.** Data nyata bisa mulai dikumpulkan.
> **Berikutnya (pilih satu, konfirmasi Fillian):** (a) T-10 spike Python — menentukan go/no-go D-03 dan membuka T-17/T-18;
> (b) sambungkan Waste ke DB (T-21) + Beranda/Bahan ke data live.

> **Rekap per kategori + stok ayam (diputuskan 24 Okt, D-26, D-27)** — data klien masuk: 41 menu, beli dada per kg,
> tidak ada catatan penjualan. Rencana tahap (AGENTS §4a):
> - K1 Catat keputusan (PRD, ARCHITECTURE D-26/D-27, TASKS) — ✅ selesai
> - K2 Migrasi `0002_kategori_stok.sql` (`menus.description`, `daily_stock`) + rumus rekomendasi ke kg — ✅ selesai
> - K3 Pengaturan memakai istilah kategori + isi varian; varian tampil di Rekap; label bahan "dibeli per kg" — ✅ selesai
> - K2b (usulan saat tes, disetujui Fillian) Potong per kg & stok per bahan, migrasi `0003_konversi_per_bahan.sql` (D-28) — ✅ selesai
>   (K1–K3 + K2b dites Fillian dengan Supabase asli, di-push `b1b75b2`)
> - K4 Rekap: bagian stok ayam per bahan — ✅ selesai (dites & di-push `94df629`; desain stok diganti K6)
> - K5 SQL sekali pakai: "Ayam" → "Ayam dada", 12 kategori + isi varian + resep potong dada (di luar repo) + panduan PDF v2 — ✅ selesai, dijalankan di Supabase
> - K6a (D-29) Migrasi `0004_belanja_sisa.sql`; kartu stok: belanja kg + potong opsional (simpan kapan saja) + sisa saat tutup; tutup tidak menghapus stok — ✅ file siap
> - K6b Selisih (tersedia → sisa seharusnya → selisih) + rata-rata potong/kg 14 hari + label "perkiraan" di bahan; logika murni `src/lib/stock.ts` — ✅ file siap
> K6a + K6b — ✅ selesai (dites Fillian di production, di-push `ad091b6`). Panduan v3 tidak dibuat (keputusan Fillian).

- [x] T-10 (F) **Spike Python di Vercel (hari pertama, go/no-go D-03):** fungsi `api/forecast.py` minimal dengan numpy (Ridge numpy, D-25), deploy berdampingan dengan Next.js, ukur cold start, cek tidak bentrok dengan rute Next.js. Hasil dicatat di ARCHITECTURE §11
  - **10a** ✅ file siap: `api/forecast.py` (BaseHTTPRequestHandler, tanpa FastAPI; wajib `X-Forecast-Secret`; laporkan versi, waktu import, waktu fit), `forecasting/models.py` (Ridge numpy setara scikit-learn StandardScaler+Ridge), `tests/test_models.py` (11 tes, dibandingkan dengan scikit-learn), `requirements.txt` (numpy saja), `requirements-dev.txt`, `pytest.ini`, `vercel.json` (`excludeFiles`). Diuji Fillian di laptop & Vercel
  - **10b** ✅ hasil di Vercel: region `sin1`, import 217 ms, fit 40 ms → 1,1 ms, request 0,15–0,19 dtk, halaman Next.js tidak terganggu, package `forecasting/` ter-bundle. **D-03 = GO** (D-25). Docs diperbarui
- [x] T-11 (F) Migrasi `0001_init.sql` (semua tabel ARCHITECTURE §4, RLS aktif) + seed minimal (setelan default + bahan Ayam; **menu tidak di-seed**, diisi lewat CRUD). Sudah dijalankan di Supabase
- [x] T-12 (F) AppShell responsif (tab bar HP, sidebar ≥1024px) + komponen `ui/` dasar + tema glass (D-17)
- [x] T-1B (F) UI pratinjau semua halaman dengan data simulasi & forecast sementara TypeScript (D-18); diuji di 4 ukuran layar, tanpa scroll horizontal
- [x] T-13 (F) PIN: halaman `/pin`, cookie bertanda tangan, `src/proxy.ts` (Next 16, pengganti middleware), rate limit — selesai, teruji di laptop & Vercel
- [x] T-14 (F) Pengaturan: CRUD menu, bahan, resep, `buffer_pct`, `pieces_per_chicken` — teruji dengan Supabase asli
- [x] T-15 (F) Input rekap harian (stepper +/-, pilih tanggal via `?tanggal=`, tandai tutup, upsert ke `live`)
- [x] T-16 (F) `scripts/generate_demo_data.py`: data simulasi 120 hari untuk 12 kategori + stok ayam dada (dataset `demo`); seed tetap; parameter di satu tempat (`PARAMS`, sumber "klien" vs "asumsi")
  - **16a** ✅ file siap: generator + SQL idempoten (pengaman kategori, tidak menyentuh `live`), 10 tes pytest, diuji di PGlite. Pola: 45 porsi ayam/hari, awal bulan ×1,2 / ×1,1, promo 8%, geprek bakar 65%, tanpa pola mingguan (klien tidak menyebut), stok belanja 5–6 kg & 8–10 potong/kg, ayam bisa habis
  - **16b** ✅ `scripts/out/demo_data.sql` dijalankan di Supabase + dicek Fillian; kalibrasi ulang setelah ±7 hari rekap asli (T-33)
- [x] T-17 (F) Package `forecasting/` v1: `ma7`, `snaive`, `ridge`, backtest WAPE, interval, pemilihan model + `pytest`
  - **17a+17b+17c** ✅ file siap (satu sprint atas permintaan Fillian): `features.py` (awal bulan, rata-rata minggu lalu),
    peramal di `models.py`, `backtest.py`, `run.py`, `contract.py`, `api/forecast.py` kontrak §6.1 (+ `censored_dates`),
    `scripts/forecast_demo_request.py`, 78 tes pytest. D-30: hari stok habis tetap dipakai apa adanya (diuji 3 cara)
  - ✅ diuji Fillian & di-push `8b53fe4`: lokal 78 tes + curl identik; Vercel `sin1` (Python 3.12.14) import 224 ms,
    request 12 seri × 119 hari 0,88–0,95 dtk dari Semarang, hasil identik dengan lokal, secret salah → 401
- [x] T-18 (F) Integrasi: simpan rekap → panggil forecast → simpan `forecast_runs` & `forecasts`; tombol "Hitung ulang"; penanganan gagal
  - ✅ file siap (D-31): `lib/forecast-request.ts` (murni), `lib/forecast-client.ts`, `actions/forecast.ts`, `saveRekap` memanggil
    forecast, kartu Prediksi + Hitung ulang di `/rekap`. Diuji di sini: 20 cek unit + 19 cek Playwright (mock Supabase 400 hari
    data simulasi, fungsi Python asli): simpan → 84 titik, baca berhalaman > 1000 baris, `censored_dates` hanya kategori ayam,
    fungsi mati / secret salah → pesan + run failed tanpa membatalkan rekap, run > 30 hari dibersihkan, `next build` lolos
  - ✅ diuji Fillian (lokal + production, `live` masih kosong → "Belum ada rekap penjualan") dan di-push `72372b2`
- [x] T-19 (F) Dashboard v1: kartu ringkasan + grafik historis & prediksi
  - ✅ (sprint T-19 + T-20 + T-25, D-32) Beranda dari forecast tersimpan (beli kg besok − sisa freezer, grafik 30 hari +
    prediksi total, 7 hari + selisih stok, kategori terlaris). Diuji Fillian lokal + production, di-push `ef795f9`
- [x] T-19b (F) **Ridge model utama (D-33)**: alpha per kategori, ma7 cadangan + pembanding, faktor yang dipelajari di Prediksi —
  ✅ diuji Fillian & di-push `140808e`
- [~] T-19c (F) **Rekap hanya rekap porsi (D-34)**: stok ayam → Bahan, kartu prediksi → Prediksi — ✅ file siap (e2e 9 cek + 24 cek
  dashboard). **Sisa:** uji Fillian, push
- [ ] T-1A (F+K) Demo Sprint 1 ke Julius; catat masukan di §Log dan backlog

## Sprint 2 — Fitur Pelengkap (29 Okt–1 Nov)

- [x] T-20 (F) Halaman rekomendasi bahan baku (besok + 7 hari, potong & kg) — ✅ diuji & di-push `ef795f9`
- [ ] T-21 (F) Food waste: form, riwayat (ubah/hapus), grafik, tingkat waste di dashboard
- [ ] T-22 (F) Penanda kondisi hari (termasuk tanggal mendatang) + dipakai di forecast
- [ ] T-23 (F) Import CSV: template, validasi, pratinjau, upsert
- [x] T-24 (F) Halaman forecast detail per kategori (model, error, jumlah hari data, peringatan) — ✅ di /prediksi (`ef795f9`; faktor menyusul T-19b)
- [x] T-25 (F) Toggle mode demo/data nyata + label "Simulasi" — ✅ D-32, diuji & di-push `ef795f9`
- [~] T-26 (F) Branding: wordmark + logo sementara & palet gradasi biru sudah ada (STYLEGUIDE); **sisa:** logo & HEX final dari klien (Q-07)
- [ ] T-27 (F+K) Demo Sprint 2 ke Julius; prioritaskan sisa masukan

## Sprint 3 — Stabilisasi (2–3 Nov)

- [ ] T-30 (F+K) Uji coba bersama di perangkat nyata tim (HP & tablet)
- [ ] T-31 (F) Uji matriks responsif (STYLEGUIDE §6)
- [ ] T-32 (F) Perbaikan bug; **mulai 3 Nov hanya perbaikan bug**
- [ ] T-33 (F) Data demo final (sudah dikalibrasi); skrip demo singkat untuk tim. **Wajib sebelum demo:** buat ulang SQL demo dengan
  `--end` = sehari sebelum presentasi (mis. `--end 2026-11-03`), jalankan di Supabase, lalu Hitung prediksi di mode Simulasi —
  kalau tidak, prediksi demo sudah lewat tanggalnya dan kartu "besok" kosong
- [ ] T-34 (F) Backup data (export SQL/CSV); cek project Supabase aktif H-1

## Setelah Presentasi

- [ ] T-40 (F) Pendampingan & perbaikan sesuai masukan klien
- [ ] T-41 (F) Serah terima (checklist ARCHITECTURE §10)
- [ ] T-42 (F) Clone ke repo pribadi untuk portofolio (bersih dari secret & data klien)

---

## Backlog (belum dijadwalkan)

- Forecast menyesuaikan food waste
- Estimasi kerugian waste dalam rupiah
- Import otomatis dari aplikasi kasir klien
- PWA (pasang di home screen)
- Multi-cabang / akun pengguna

---

## Log

> Satu baris per sesi, terbaru di bawah. Format: `YYYY-MM-DD — ringkasan (task terkait)`.

- 2026-10-22 — Deal dengan klien, DP 50% diterima, perjanjian kerja sama disepakati.
- 2026-10-23 — Perencanaan teknis selesai; paket dokumentasi v1 dibuat (AGENTS, PRD, ARCHITECTURE, TASKS, STYLEGUIDE).
- 2026-10-23 — Akun GitHub `ayamsmartdev`, Vercel, Supabase dibuat; repo `ayamsmartdev/Ayam-Smart` dibuat, belum push (T-01, T-02, T-03).
- 2026-10-23 — Repo diputuskan public (D-15); AGENTS.md §2 diganti ke workflow raw GitHub + larangan commit data nyata.
- 2026-10-23 — Laptop: Node 24.22.1, npm 11.19.1, Python 3.12.10 (`py -3.12`), Git 2.56. Next.js 16.4.2 diinisialisasi, `npm run dev` OK (T-03).
- 2026-10-23 — Push pertama (`13dd990`, author `ayamsmartdev`); deploy Vercel live; Cache Components dimatikan (D-16) (T-03, T-05).
- 2026-10-23 — UI pratinjau selesai: tema warm + glass iOS + gradasi biru (D-17), 7 halaman dengan data simulasi (D-18), STYLEGUIDE ditulis ulang (T-12, T-1B, T-26).
- 2026-10-23 — Perpindahan halaman di HP terasa lambat: penyebab `force-dynamic` + server di Washington. Diganti ISR 60 dtk + loading.tsx + FreshnessGuard + region `sin1` (D-19); tap tab ±0,9 dtk → ±0,1–0,2 dtk.
- 2026-10-23 — Evaluasi: pembuatan UI melanggar AGENTS §4 (39 file sekaligus). Ditambahkan §4a: task besar dipecah jadi tahap kecil, 1 tahap = 1 commit, berhenti & konfirmasi tiap tahap.
- 2026-10-23 — Prioritas diubah: Rekap harian live sebelum spike Python. Rekap live **tahap 1/6 selesai**: `supabase/migrations/0001_init.sql` (10 tabel, RLS, seed minimal) lolos uji PGlite. Project Supabase awalnya dibuat di Seoul; disarankan dibuat ulang di Singapura (masih kosong).
- 2026-10-23 — Supabase dibuat ulang di region Singapura, env lokal & Vercel diperbarui. Rekap live **tahap 2/6 selesai**: `lib/env.ts`, `lib/supabase-server.ts` (server-only), halaman `/status` (cek 10 tabel, tanpa menampilkan isi data).
- 2026-10-23 — Rekap live **tahap 3/6 selesai**: PIN (`lib/pin-token.ts`, `lib/pin.ts`, `actions/pin.ts`, `/pin`, `src/proxy.ts`). Next.js 16 memakai `proxy.ts` (bukan `middleware.ts`). Cookie ikut menandatangani APP_PIN → ganti PIN = semua perangkat logout. Teruji: redirect, 5x salah → blokir 15 mnt, IP di-hash, cookie httpOnly/secure 30 hari, DB mati → fail-closed.
- 2026-10-23 — Rekap live **tahap 4/6 selesai**: `lib/data/rekap.ts`, `actions/rekap.ts` (cek PIN + validasi server), `/rekap` dinamis dengan `?tanggal=`. Semua menu aktif disimpan termasuk 0; tutup = hapus rekap + tag `tutup`; tanggal hanya hari ini s.d. 30 hari lalu. Teruji: simpan, reload, ubah (upsert), tutup/buka, tanggal ngawur, sesi PIN habis.
- 2026-10-23 — Revisi tahap 4 (permintaan Fillian saat testing): status "Ada perubahan yang belum disimpan" jadi merah; dialog konfirmasi saat pindah halaman (`ConfirmDialog` + `useLeaveGuard`: Simpan lalu pindah / Pindah tanpa menyimpan / Batal) + dialog browser saat refresh/tutup tab.
- 2026-10-23 — Rekap live **tahap 5a selesai**: CRUD menu (`lib/data/menus.ts`, `actions/menus.ts`, `/pengaturan` + `menu-manager.tsx`): tambah, ubah nama/harga, aktif/nonaktif, urutan, hapus (hanya menu tanpa riwayat). Perbaikan `ConfirmDialog`: penutupan oleh kode tidak memicu onClose; error ditampilkan di dalam dialog (toast tertutup lapisan modal).
- 2026-10-23 — Rekap live **tahap 5b-1 selesai**: kelola bahan baku (`lib/data/ingredients.ts`, `actions/ingredients.ts`, `ingredient-manager.tsx`). Satuan dikunci (UI + server) jika bahan dipakai di resep/waste; hapus hanya bahan tak terpakai; opsi "hitung dalam ekor" hanya untuk satuan potong. Refactor: `useActionRunner` + `DialogError` dipakai bersama Menu & Bahan.
- 2026-10-23 — Rekap live **tahap 5b-2 selesai** (digabung dengan 5b-1 atas permintaan Fillian): resep per menu (`lib/data/recipes.ts`, `actions/recipes.ts`, `recipe-editor.tsx`, ringkasan resep di daftar menu). Simpan resep: upsert dulu lalu hapus baris yang dibuang (tidak hilang jika gagal di tengah). Takaran desimal (maks 2 angka); `formatQuantity` kini menampilkan desimal (0,5 kg).
- 2026-10-23 — Rekap live **tahap 5b-3 selesai**: setelan cadangan % (0–100) & potong per ekor (1–20) (`lib/data/settings.ts`, `actions/settings.ts`, `settings-form.tsx`) dengan status merah + dialog pindah halaman. Zip gabungan 5b-1+5b-2+5b-3.
- 2026-10-23 — Tahap 5b-1/5b-2/5b-3 lolos uji Fillian dengan Supabase asli (T-14). Rekap live **tahap 6/6 selesai**: docs diselaraskan dengan kode (struktur folder nyata, §8 keamanan, D-20–D-24, aturan kode baru di AGENTS §9, §11 ditulis ulang). Rangkaian "Rekap harian live" selesai.
- 2026-10-23 — T-10 **tahap 10a**. Keputusan (disetujui Fillian): runtime forecast **hanya numpy**, Ridge ditulis sendiri dan dites identik dengan scikit-learn (scikit-learn hanya dev); tanpa FastAPI → D-25 (dicatat di ARCHITECTURE pada 10b). Alasan: paket 264 MB → 69 MB, import lokal ±1 dtk → ±0,14 dtk, hasil prediksi sama. Dipilih folder `/api` (stabil) daripada Vercel Services (beta); Services jadi cadangan.
- 2026-10-23 — T-10 **selesai (10b)**: diuji Fillian — lokal 11 tes lolos, fungsi menolak tanpa/salah secret; di Vercel `sin1` import 217 ms, fit 40/1,1 ms, request 0,15–0,19 dtk, rute Next.js aman. D-03 berlaku, D-25 dicatat (Ridge numpy, tanpa scikit-learn/FastAPI di runtime). Berikutnya T-16.
- 2026-10-24 — Data klien masuk (CSV + Excel, tidak disimpan di repo): 41 menu/11 kelompok, 40–50 porsi ayam/hari, beli dada per kg (9–10 potong/kg), sisa ke freezer, ramai awal bulan, favorit geprek bakar 60–70%, tidak ada catatan penjualan. Diputuskan Fillian: rekap per kategori + stok ayam (D-26), ayam per kg (D-27). K1–K3 dikerjakan berurutan atas permintaan Fillian.
- 2026-10-24 — Setup komputer rumah (Node 24.22.1, Git 2.56, Python 3.12.10, `.env.local` baru; secret lokal dibuat ulang). Migrasi 0002 dijalankan di Supabase, tes Setelan & Bahan K1–K3 lolos. Ditambah K2b: potong per kg & stok per bahan (D-28) agar siap jika ada paha/sayap.
- 2026-10-24 — K4 + K5 lolos uji Fillian (12 kategori live, PIN disetujui klien). Alur harian dibahas: omzet & harga ayam di luar scope, lembar turus di luar scope. Diputuskan D-29: stok = belanja (kg + potong opsional) + sisa saat tutup → selisih; ukuran ayam berubah harian sehingga potong/kg jadi perkiraan + rata-rata 14 hari. K6a + K6b dikerjakan.
- 2026-10-24 — K6 lolos uji production. T-16a: generator data simulasi + 10 tes; bug alias SQL `left` (kata kunci) ketahuan saat uji PGlite dan diperbaiki. Simulasi dengan kebiasaan beli 5–6 kg: ayam habis ±16% hari (awal bulan/promo) — temuan simulasi, bukan fakta warung.
- 2026-10-24 — T-16 selesai (16b dijalankan di Supabase). T-17a/b/c dikerjakan sekaligus: forecast v1 sesuai kontrak §6.1, 78 tes. Usulan awal "buang hari stok habis dari latihan" **dibatalkan** setelah diuji di simulasi (lebih buruk: hari habis = hari ramai); imputasi hanya membantu tipis → D-30 memakai data apa adanya + peringatan. Generator kini mencatat permintaan sebelum stok habis (khusus evaluasi, tidak masuk SQL).
- 2026-10-25 — T-17 lolos uji Fillian (lokal + Vercel, hasil identik) dan di-push `8b53fe4`. `FORECAST_SECRET` di Vercel diganti ke nilai `.env.local` komputer rumah (secret lokal dibuat ulang saat setup); env Vercel hanya bisa diubah lewat dashboard + Redeploy. Berikutnya T-18.
- 2026-10-25 — T-18 file siap (D-31): forecast dihitung saat rekap disimpan + tombol Hitung ulang + kartu Prediksi di `/rekap`. Catatan: `next dev` (16.4) menambahkan blok "nextjs-agent-rules" ke `AGENTS.md`; dimatikan lewat `agentRules: false` di `next.config.ts`.
- 2026-10-25 — T-18 lolos uji & di-push `72372b2`. Ketoko (kasir klien, desktop) dicek: export .xlsx berbentuk laporan cetak, transaksi masih kosong → T-23 menunggu contoh berisi data; usulan ke Julius: isi "Jenis" item Ketoko = 12 kategori. Sprint T-19 + T-20 + T-25 (+T-24) file siap (D-32): Beranda/Prediksi/Bahan dari forecast tersimpan, mode demo/live otomatis. Pemisahan stok/prediksi dari Rekap ditunda (keputusan Fillian).
- 2026-10-25 — Sprint T-19/T-20/T-24/T-25 lolos uji lokal + production (pindah halaman sedikit lebih lambat, masih ditoleransi), di-push `ef795f9`. Fillian: "rata-rata 7 hari bukan machine learning" → D-33: Ridge model utama dengan alpha per kategori (Ridge ≤ rata-rata 7 hari di 10/12 kategori simulasi), ma7 hanya cadangan & pembanding, faktor yang dipelajari ditampilkan.
- 2026-10-25 — D-33 (Ridge model utama) lolos uji & di-push `140808e`. D-34 dikerjakan atas usulan Fillian: Rekap hanya porsi, stok ayam di Bahan, prediksi & Hitung ulang di Prediksi.
