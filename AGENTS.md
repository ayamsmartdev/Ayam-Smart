# AGENTS.md — AYAMSMART

> Aturan kerja untuk semua sesi pengembangan AYAMSMART antara Fillian dan AI (Claude atau AI lain).
> Terakhir diupdate: 23 Oktober 2026
>
> **AI baru / sesi baru:** baca file ini sampai habis sebelum mengerjakan apa pun. File ini plus
> dokumen di urutan baca (§1) cukup untuk melanjutkan tanpa bertanya ulang ke Fillian.

---

## 0. Ringkasan Proyek

Aplikasi web untuk UMKM ayam geprek: rekap penjualan harian per menu, dashboard analytics,
forecast permintaan 5 hari ke depan (machine learning), rekomendasi bahan baku, dan pencatatan
food waste. Dipakai di **HP dan tablet, portrait dan landscape**, dari lebih dari satu perangkat.
Tanpa login; aksi yang mengubah data dilindungi **PIN bersama**.

- **Developer:** Fillian
- **Klien:** Tim AYAMSMART (kontak: Julius)
- **Tenggat:** aplikasi siap dipakai untuk presentasi **4 November 2026**
- **Metode:** Agile, 3 sprint (lihat `docs/TASKS.md`)

---

## 1. Urutan Baca di Awal Sesi

1. `AGENTS.md` (file ini), termasuk **§11 Kondisi Terkini**
2. `docs/ARCHITECTURE.md` **§11 Keputusan** (wajib), lalu bagian lain yang relevan dengan task
3. `docs/TASKS.md`: sprint aktif dan log terakhir
4. `docs/PRD.md` jika task menyentuh fitur atau kriteria penerimaan
5. `docs/STYLEGUIDE.md` jika task menyentuh UI

Jangan bertanya ke Fillian hal yang sudah dijawab di dokumen-dokumen ini.

---

## 2. Akses Repo

Repo **PUBLIC** milik akun GitHub AYAMSMART: **`ayamsmartdev/Ayam-Smart`**
(`https://github.com/ayamsmartdev/Ayam-Smart`). Status public disetujui klien (D-15).

AI membaca file langsung dari GitHub. **Fillian tidak perlu melampirkan file manual.**

| # | Metode | Kapan dipakai |
|---|---|---|
| 1 | `curl https://raw.githubusercontent.com/ayamsmartdev/Ayam-Smart/main/{path}` | Baca 1 file spesifik **(default)** |
| 2 | `curl https://api.github.com/repos/ayamsmartdev/Ayam-Smart/contents/{path}` | Lihat daftar file dalam 1 folder |
| 3 | `git clone --depth 1 https://github.com/ayamsmartdev/Ayam-Smart.git` | **Last resort**, jika butuh banyak file sekaligus |

- **Hanya baca file yang relevan** dengan task. Jangan membaca seluruh repo secara spekulatif.
- Dalam satu sesi, file yang sudah dibaca tidak perlu dibaca ulang kecuali Fillian sudah commit perubahan.
- AI tetap **read-only**. Semua write/push dilakukan Fillian.
- Fillian bekerja di **VS Code lokal** (bukan Codespace) di branch `main`.
  Perubahan baru terlihat oleh AI setelah di-push. Jika `curl` belum menunjukkan perubahan terbaru,
  tanyakan apakah sudah di-push (cache raw GitHub bisa tertunda beberapa menit).
- **Karena repo public:** jangan pernah commit secret, file `.env*` (kecuali `.env.example`), atau
  **data penjualan/waste nyata milik klien** (CSV, seed, dump SQL, screenshot berisi data). Data nyata
  hanya ada di Supabase. File di repo hanya boleh berisi data simulasi.
- **Semua commit wajib memakai identitas akun `ayamsmartdev`** supaya rapi dan deploy Vercel tidak
  bermasalah. Repo ini memakai git config **lokal** (bukan global) dan remote dengan username:
  ```bash
  git config user.name "ayamsmartdev"
  git config user.email "<email akun ayamsmartdev>"
  git remote set-url origin https://ayamsmartdev@github.com/ayamsmartdev/Ayam-Smart.git
  ```
  Cek sebelum push: `git log -1 --format="%an <%ae>"`. Jangan pernah mengubah git config global.

---

## 3. Output & Git Workflow

- AI **hanya generate file** untuk di-download/apply manual oleh Fillian via VS Code.
- **Fillian yang menjalankan semua git command** (`git add`, `commit`, `push`). AI cukup memberi commit message.
- Format commit message: **1 baris judul + bullets ringkas**.
- Output file selalu disajikan dalam tabel:

  | File Generated | Lokasi di Repo | Status |
  |---|---|---|
  | `page.tsx` | `src/app/input/page.tsx` | new / replace |

---

## 4. Pola Kerja: Present → Test → Lanjut

AI **tidak boleh lanjut ke langkah berikutnya** tanpa konfirmasi Fillian:

1. AI generate dan present file
2. Fillian apply ke repo, test di browser
3. Fillian laporan hasil ("udah jalan bro" / "ada bug X")
4. Baru AI lanjut

Kalau Fillian bilang **"sudah aku apply dan commit"** sebelum file yang sama diedit lagi, AI wajib
**wajib re-fetch** file itu dari raw GitHub sebelum mengeditnya.

---

## 5. Gaya Penjelasan (Wajib Dipertahankan)

AI **selalu menjelaskan apa yang dikerjakan**, bukan langsung kasih kode tanpa konteks:

- **Root cause analysis** saat debug: jelaskan KENAPA bug terjadi sebelum fix
- **Alasan keputusan teknis**: kenapa pendekatan ini vs alternatif
- **Trade-off** kalau ada beberapa opsi desain
- **Verifikasi logic** sebelum present: `node -e` untuk TypeScript/JS, `python -c` atau `pytest` untuk Python
- **Syntax/type check** sebelum present: `npx tsc --noEmit` (atau `npx esbuild`) untuk TS,
  `python -m py_compile` untuk Python

Ini bukan dianggap verbose. Ini cara kerja yang sudah terbukti efektif dan Fillian nyaman dengannya.

---

## 6. Prinsip Arsitektur (Tidak Boleh Dilanggar)

Detail dan alasannya ada di `docs/ARCHITECTURE.md` §11 Keputusan.

- **Browser tidak pernah mengakses Supabase langsung.** Semua baca/tulis lewat server Next.js
  (Server Components, Server Actions, Route Handlers) memakai secret key. RLS aktif tanpa policy publik.
- **Python hanya untuk forecast:** fungsi stateless yang menerima JSON dan mengembalikan JSON.
  Python tidak menyimpan state dan tidak memegang kredensial database.
- **Forecast dihitung saat data berubah atau tombol "Hitung ulang" ditekan**, hasilnya disimpan ke
  tabel `forecasts`. Dashboard hanya membaca hasil tersimpan, tidak pernah menunggu Python.
- **Gagal forecast tidak boleh menggagalkan penyimpanan data.**
- **Data simulasi dan data nyata dipisah** lewat kolom `dataset` (`'demo'` | `'live'`). Jangan pernah dicampur.
- **Semua tanggal bisnis bertipe `date` dalam zona Asia/Jakarta.**
- **Tailwind CSS murni (v4)**, tanpa component library. Komponen buatan sendiri di `src/components/ui/`.
- **Ringan:** hindari dependency besar, skema DB sederhana, join minimal, JSONB untuk data yang selalu dipakai utuh.

---

## 7. Model AI

Sebelum task kompleks (multi-file, desain skema baru, integrasi lintas komponen), AI **wajib
merekomendasikan model yang lebih kuat atau lebih cepat** (misalnya Opus vs Sonnet) dan menunggu
konfirmasi Fillian sebelum mulai.

---

## 8. Dokumentasi

Paket dokumen sengaja ramping. **Jangan membuat file dokumentasi baru tanpa persetujuan Fillian.**

| File | Diupdate saat |
|---|---|
| `AGENTS.md` §11 | Setiap akhir sesi, jika kondisi berubah |
| `docs/TASKS.md` | Setiap akhir sesi: status task + 1 baris di §Log |
| `docs/ARCHITECTURE.md` §11 | Ada keputusan baru atau keputusan berubah |
| `docs/PRD.md` | Fitur atau kriteria penerimaan berubah |
| `docs/STYLEGUIDE.md` | Pola UI, warna, atau komponen berubah |

- **Keputusan tidak boleh dibalik diam-diam.** Tambahkan entri baru di ARCHITECTURE §11 dan tandai
  entri lama "digantikan oleh D-xx". Jangan hapus entri lama.
- Setiap update dokumen, AI memberi ringkasan singkat apa yang berubah.

---

## 9. Aturan Kode

- **Pagination wajib** untuk query Supabase ke tabel yang bisa >1000 baris. PostgREST diam-diam
  memotong ke 1000 baris tanpa error:
  ```typescript
  const FETCH_SIZE = 1000;
  let all: Row[] = [];
  for (let from = 0; ; from += FETCH_SIZE) {
    const { data, error } = await supabase
      .from('daily_sales')
      .select('*')
      .range(from, from + FETCH_SIZE - 1);
    if (error) throw error;
    all = all.concat(data ?? []);
    if ((data ?? []).length < FETCH_SIZE) break;
  }
  ```
- **Tanggal:** pakai helper di `src/lib/date.ts` (misalnya `todayWIB()`). Jangan pakai
  `new Date().toISOString().slice(0, 10)` karena itu tanggal UTC, bisa salah hari sebelum jam 07.00 WIB.
- **Secret hanya di env server.** Jangan pernah memberi prefix `NEXT_PUBLIC_` pada key apa pun.
  Jangan commit file `.env*` selain `.env.example`.
- **Setiap aksi yang mengubah data** wajib divalidasi di server dan mengecek PIN, walaupun halaman sudah dilindungi.
- **Baris yang tidak ada ≠ nol.** Hari tanpa rekap = "tidak ada data", bukan penjualan 0.
- **UI Bahasa Indonesia**, angka dan tanggal format `id-ID`.
- **Data simulasi wajib berlabel "Simulasi"** di UI.
- **Kejujuran klaim:** tampilkan error forecast apa adanya. Jangan menulis "akurat", "AI canggih",
  atau klaim sejenis di UI.
- TypeScript `strict`, hindari `any`. Tidak ada dead code atau import yang tidak terpakai.
- Python: versi dependency di-pin di `requirements.txt`. Dependency hanya `numpy`, `scikit-learn`,
  `fastapi` kecuali disetujui Fillian.

---

## 10. Komunikasi

- **Bahasa:** Indonesia casual ("bro")
- **Gaya:** langsung to the point, tapi tetap jelaskan reasoning
- Ambiguitas scope sebelum task besar → tanya dulu, jangan berasumsi
- Beberapa opsi desain → jelaskan trade-off, beri rekomendasi, tunggu konfirmasi
- **Jangan tanya lebih dari 1 pertanyaan sekaligus.** Tanya yang paling krusial dulu.

---

## 11. Kondisi Terkini

> Snapshot kondisi proyek SEKARANG. Update setiap akhir sesi. Harus tetap benar jika dibaca tanpa konteks chat.

**Terakhir diupdate:** 23 Oktober 2026

- **Status:** project Next.js 16.4.2 (create-next-app, Turbopack, template app + Tailwind) sudah
  diinisialisasi di lokal dan `npm run dev` berjalan. Belum ada kode fitur.
- **Sudah jadi:** paket dokumentasi (`AGENTS.md`, `CLAUDE.md`, `README.md`, `.env.example`, `.python-version`, `docs/*`).
  Python 3.12.10 terpasang di laptop (dipanggil dengan `py -3.12`; `python` default di laptop = 3.15, jangan dipakai).
- **Deploy:** https://ayam-smart.vercel.app (auto-deploy dari `main`). Cache Components dimatikan (D-16).
- **Sedang dikerjakan:** Sprint 0: project Supabase + `.env.local` (T-04). Sprint 1 dimulai 24 Okt dengan spike Python (T-10).
- **Akun:** Gmail AYAMSMART, GitHub `ayamsmartdev` (login via Google), Vercel Hobby dan Supabase Free
  (keduanya login via GitHub `ayamsmartdev`) sudah dibuat. 2FA belum diaktifkan (T-02).
- **Keputusan yang belum final:** spike Python di Vercel (D-03) belum diuji; PIN (D-06) menunggu persetujuan klien.
- **Masalah diketahui:** belum ada.
- **Menunggu klien:** lihat `docs/PRD.md` §8 Pertanyaan Terbuka.

---

## 12. Checklist Sebelum Present File ke Fillian

- [ ] Type/syntax check lulus (`npx tsc --noEmit` / `python -m py_compile`)
- [ ] Logic penting diverifikasi dengan simulasi (`node -e` / `python -c` / `pytest`)
- [ ] File yang diedit adalah versi terbaru (dibaca ulang jika Fillian sudah commit)
- [ ] Tidak melanggar §6 Prinsip Arsitektur dan §9 Aturan Kode
- [ ] Tabel output (File Generated / Lokasi di Repo / Status) sudah ada
- [ ] Commit message sudah disiapkan
- [ ] Tidak ada dead code / import tidak terpakai
- [ ] Dokumen yang terdampak sudah diupdate (§8)
