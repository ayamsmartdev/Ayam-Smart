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
- [~] T-04 (F) Buat project Supabase (region Singapore); simpan URL & secret key ke `.env.local` dan Vercel
- [~] T-05 (F) Repo terhubung ke Vercel, deploy pertama live di https://ayam-smart.vercel.app. **Sisa:** isi env vars Supabase; kirim link ke Julius
- [ ] T-06 (F) Kirim ke Julius: pertanyaan terbuka PRD §8 (Q-01–Q-11)

## Sprint 1 — Data & Forecast Inti (24–28 Okt)

- [ ] T-10 (F) **Spike Python di Vercel (hari pertama, go/no-go D-03):** fungsi `api/forecast.py` minimal dengan numpy + scikit-learn, deploy berdampingan dengan Next.js, ukur cold start, cek tidak bentrok dengan rute Next.js. Hasil dicatat di ARCHITECTURE §11
- [ ] T-11 (F) Migrasi `0001_init.sql` (semua tabel ARCHITECTURE §4, RLS aktif) + seed menu, bahan, resep contoh
- [x] T-12 (F) AppShell responsif (tab bar HP, sidebar ≥1024px) + komponen `ui/` dasar + tema glass (D-17)
- [x] T-1B (F) UI pratinjau semua halaman dengan data simulasi & forecast sementara TypeScript (D-18); diuji di 4 ukuran layar, tanpa scroll horizontal
- [ ] T-13 (F) PIN: halaman `/pin`, cookie bertanda tangan, middleware, rate limit
- [ ] T-14 (F) Pengaturan: CRUD menu, bahan, resep, `buffer_pct`, `pieces_per_chicken`
- [ ] T-15 (F) Input rekap harian (stepper +/-, pilih tanggal, tandai tutup, upsert)
- [ ] T-16 (F) `scripts/generate_demo_data.py`: data simulasi 120 hari dengan pola mingguan, gajian, dan noise; seed tetap; parameter siap dikalibrasi ke Q-04
- [ ] T-17 (F) Package `forecasting/` v1: `ma7`, `snaive`, `ridge`, backtest WAPE, interval, pemilihan model + `pytest`
- [ ] T-18 (F) Integrasi: simpan rekap → panggil forecast → simpan `forecast_runs` & `forecasts`; tombol "Hitung ulang"; penanganan gagal
- [ ] T-19 (F) Dashboard v1: kartu ringkasan + grafik historis & prediksi
- [ ] T-1A (F+K) Demo Sprint 1 ke Julius; catat masukan di §Log dan backlog

## Sprint 2 — Fitur Pelengkap (29 Okt–1 Nov)

- [ ] T-20 (F) Halaman rekomendasi bahan baku (besok + 5 hari, potong & ekor)
- [ ] T-21 (F) Food waste: form, riwayat (ubah/hapus), grafik, tingkat waste di dashboard
- [ ] T-22 (F) Penanda kondisi hari (termasuk tanggal mendatang) + dipakai di forecast
- [ ] T-23 (F) Import CSV: template, validasi, pratinjau, upsert
- [ ] T-24 (F) Halaman forecast detail per menu (model, error, jumlah hari data, peringatan)
- [ ] T-25 (F) Toggle mode demo/data nyata + label "Simulasi"
- [~] T-26 (F) Branding: wordmark + logo sementara & palet gradasi biru sudah ada (STYLEGUIDE); **sisa:** logo & HEX final dari klien (Q-07)
- [ ] T-27 (F+K) Demo Sprint 2 ke Julius; prioritaskan sisa masukan

## Sprint 3 — Stabilisasi (2–3 Nov)

- [ ] T-30 (F+K) Uji coba bersama di perangkat nyata tim (HP & tablet)
- [ ] T-31 (F) Uji matriks responsif (STYLEGUIDE §6)
- [ ] T-32 (F) Perbaikan bug; **mulai 3 Nov hanya perbaikan bug**
- [ ] T-33 (F) Data demo final (sudah dikalibrasi); skrip demo singkat untuk tim
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
