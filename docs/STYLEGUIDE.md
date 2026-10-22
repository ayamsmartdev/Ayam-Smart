# STYLEGUIDE — AYAMSMART

> Panduan tampilan dan pola komponen. Tailwind CSS v4 murni, tanpa component library.
> Terakhir diupdate: 23 Oktober 2026. Keputusan tema: ARCHITECTURE.md D-17.
>
> **Palet brand masih SEMENTARA** sampai logo dan kode warna final dari klien (PRD Q-07).
> Saat datang, cukup ubah token `--color-brand-*` di `src/app/globals.css`.

---

## 1. Arah Desain

**Hangat, tenang, dan langsung menjawab.** Pemilik warung membuka aplikasi untuk satu pertanyaan:
*besok siapkan berapa?* Jawaban itu tampil sebagai satu kalimat besar di beranda; elemen lain dibuat tenang.

1. **Satu elemen menonjol per halaman.** Di beranda: kalimat "Siapkan **118** potong ayam". Jangan
   menambah sorotan bersaing (badge warna-warni, banyak angka besar).
2. **Kaca ala iOS di atas latar hangat-ke-biru.** Kaca butuh sesuatu di belakangnya; latar statis
   dari krem nasi (atas) ke biru langit (bawah) memberi kedalaman tanpa animasi.
3. **Warmth dari dunia ayam geprek, bukan template.** Aksen keemasan *kriuk* (warna ayam goreng) dan
   merah *sambal*; netral memakai abu-abu hangat, bukan abu-abu dingin.
4. **Jari dulu.** Target sentuh minimal 44px, input minimal 16px (iOS tidak auto-zoom).
5. **Jujur secara visual.** Prediksi dibedakan dari data aktual; data simulasi selalu berlabel.
6. **Mode terang saja** (D-14).

**Hindari:** semua konten dijadikan kartu identik, label huruf kapital di atas judul, panah "→" di
tombol, satu kata disorot warna dalam judul, animasi masuk di setiap bagian.

---

## 2. Warna

Token didefinisikan di `src/app/globals.css` (`@theme`), dipakai sebagai kelas Tailwind
(`text-ink`, `bg-kriuk-50`, `from-brand-500`, dst.).

### Inti

| Nama | Hex | Token | Dipakai untuk |
|---|---|---|---|
| Nasi | `#FFF8F0` | `nasi` | Latar atas, warna dasar body |
| Langit | `#EAF1FB` | `langit` | Latar bawah |
| Arang | `#2A2420` | `ink` | Teks utama (kontras 14,5:1 di atas Nasi) |
| Arang lembut | `#6E625A` | `ink-soft` | Teks sekunder (5,6:1) |
| Arang pudar | `#A2968C` | `ink-faint` | **Dekoratif saja** (ikon chevron), bukan teks |
| Garis | `#E9E1D8` | `line` | Pemisah baris, grid grafik |

### Brand — gradasi biru

| Token | Hex | Catatan |
|---|---|---|
| `brand-50` / `100` / `200` | `#EEF4FF` / `#DCE8FF` / `#BCD3FF` | Latar ikon, kisaran prediksi |
| `brand-400` | `#5B97F5` | Ujung terang gradasi logo |
| `brand-500` | `#2F6FE8` | Ujung terang gradasi tombol (teks putih 4,6:1) |
| `brand-600` | `#2660DC` | Garis grafik |
| `brand-700` | `#1F4FD1` | Ujung gelap gradasi, teks tautan (teks putih 6,8:1) |
| `brand-800` | `#1E3FA6` | Ujung gelap angka bergradasi |

Gradasi tombol utama: `bg-linear-to-br from-brand-500 to-brand-700`.
Angka bergradasi: utilitas `text-brand-gradient`.

### Aksen

| Token | Hex | Dipakai untuk |
|---|---|---|
| `kriuk-50` / `100` | `#FDF4E3` / `#FAE6C2` | Latar badge Simulasi, ikon ayam, bar menu terlaris |
| `kriuk-500` | `#E39B2D` | Titik badge, bar menu terlaris |
| `kriuk-700` | `#8F5716` | Teks keemasan (≥4,5:1 di atas `kriuk-50`) |
| `sambal-50` / `500` / `700` | `#FCECE9` / `#D4483B` / `#A7312A` | Food waste, tombol hapus/catat waste |
| `daun-50` / `600` | `#EAF6EF` / `#2E7D55` | Tren naik, berhasil |

**Aturan kontras:** teks berukuran < 18px wajib ≥ 4,5:1 terhadap latarnya. Cek dengan kalkulator
kontras sebelum menambah warna baru.

---

## 3. Kaca (Glassmorphism)

Dua utilitas di `globals.css`:

| Utilitas | Dipakai di | Isi |
|---|---|---|
| `glass` | Panel, daftar, sidebar | Putih 58%, `backdrop-blur 22px` + saturasi 170%, border putih tipis, highlight atas, bayangan cokelat hangat |
| `glass-bar` | Top bar, tab bar, toast, bar total | Lebih pekat (72%) agar konten di belakangnya tidak mengganggu |

- Tanpa dukungan `backdrop-filter`, keduanya otomatis jadi putih hampir solid (fallback `@supports`).
- **Jangan menumpuk kaca di atas kaca** lebih dari satu lapis; isi panel memakai `bg-white/55` biasa.
- Bayangan selalu hangat (`rgb(74 52 30 / …)`), bukan hitam.
- Blur berat di HP murah: batasi elemen `glass` yang terlihat bersamaan; jangan pakai untuk item di dalam daftar panjang.

### Latar aplikasi

Kelas `.app-backdrop` (fixed, statis): dua cahaya lembut (peach kiri atas, biru kanan bawah) di atas
gradasi Nasi → Langit. Tidak dianimasikan.

---

## 4. Radius (berjenjang menurut hierarki)

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `rounded-hero` | 28px | Satu elemen utama per halaman, sidebar |
| `rounded-panel` | 22px | Panel, daftar berkelompok |
| `rounded-row` | 14px | Elemen di dalam panel (ikon kotak, item sidebar, input) |
| `rounded-full` | — | Tombol, segmented control, badge, chip |

---

## 5. Tipografi

Font: **Plus Jakarta Sans Variable** dari paket npm `@fontsource-variable/plus-jakarta-sans`
(di-host sendiri, tanpa panggilan ke Google Fonts). Satu keluarga untuk semua teks.

| Peran | Kelas |
|---|---|
| Angka utama (hero) | `text-[64px] sm:text-[80px] font-extrabold tracking-tight tabular-nums text-brand-gradient` |
| Judul halaman (large title iOS) | `text-[28px] sm:text-[32px] font-bold tracking-tight` |
| Judul panel | `text-[17px] font-semibold tracking-tight` |
| Judul grup daftar | `text-[15px] font-semibold text-ink-soft` |
| Isi | `text-[16px]` (body), paragraf `text-[15px] leading-relaxed` |
| Keterangan | `text-[13px] text-ink-soft` |
| Angka di daftar/statistik | `font-bold tabular-nums`, ukuran 18–24px |

- Kalimat biasa (sentence case), **tanpa label huruf kapital**.
- Paragraf dibatasi `max-w-prose` (< 80 karakter per baris).
- Angka & tanggal lewat `src/lib/format.ts` dan `src/lib/date.ts`: `1.250`, `9,8%`, `Jum, 23 Okt`.

---

## 6. Layout & Navigasi

| Lebar | Navigasi | Catatan |
|---|---|---|
| < 1024px (`lg`) | Top bar kaca + **tab bar mengambang** di bawah | HP portrait/landscape, tablet portrait |
| ≥ 1024px | **Sidebar kaca** kiri, lebar 256px | Tablet landscape, laptop |

- Tab bar (5): Beranda · Prediksi · Rekap · Waste · Lainnya. Halaman Bahan, Menu & resep, dan
  Import dibuka dari Lainnya dan menandai tab Lainnya aktif.
- Sidebar menampilkan semua 7 halaman langsung + catatan Simulasi di bawah.
- Konten: `mx-auto max-w-5xl px-4 sm:px-6`, padding bawah `pb-36` agar tidak tertutup tab bar.
- Beranda di `lg`: dua kolom `lg:grid-cols-[1.4fr_1fr]` (hero + grafik | ringkasan + menu terlaris).
- HP landscape: varian `landscape:max-lg:` merapatkan top bar, tab bar jadi ikon + label sebaris,
  grafik `h-48`.
- Safe area iOS: top bar `pt-[env(safe-area-inset-top)]`, tab bar `bottom-[max(0.75rem,env(safe-area-inset-bottom))]`.

### Rute

| Rute | Halaman |
|---|---|
| `/` | Beranda |
| `/prediksi` | Prediksi 5 hari per menu |
| `/bahan` | Rekomendasi bahan (besok / 5 hari) |
| `/rekap` | Input rekap harian |
| `/waste` | Food waste |
| `/lainnya` | Menu tambahan (HP) |
| `/pengaturan` | Menu & resep, setelan perhitungan |
| `/import` | Import CSV |

---

## 7. Komponen

Semua di `src/components/`, ditulis dengan kelas Tailwind biasa dan menerima `className` tambahan
(digabung dengan `cn()` di `src/lib/cn.ts`).

| Komponen | File | Catatan |
|---|---|---|
| `Panel`, `PanelTitle` | `ui/panel.tsx` | `variant="hero"` untuk satu elemen utama per halaman |
| `Button`, `LinkButton` | `ui/button.tsx` | `primary` (gradasi), `secondary` (putih + ring biru), `danger` (sambal), `plain` |
| `Badge`, `SimulasiBadge` | `ui/badge.tsx` | `SimulasiBadge` wajib tampil selama data simulasi |
| `GroupedList`, `ListRow` | `ui/grouped-list.tsx` | Daftar ala iOS; `href` menambah chevron |
| `Stepper` | `ui/stepper.tsx` | Tombol bulat 44px + angka yang bisa diketik |
| `Segmented` | `ui/segmented.tsx` | Pilihan 2–3 opsi |
| `PageHeader` | `ui/page-header.tsx` | Large title + subjudul |
| `Toast` | `ui/toast.tsx` | Di atas tab bar, hilang 3,5 detik |
| Ikon | `icons.tsx` | SVG garis 24px buatan sendiri, `currentColor` |
| `BrandMark`, `BrandWordmark` | `layout/brand-mark.tsx` | Logo sementara (squircle biru + paha ayam) |
| `AppShell`, `SidebarNav`, `TabBar` | `layout/` | Kerangka responsif |
| `SalesChart` | `charts/sales-chart.tsx` | Recharts, tanpa animasi |

### Grafik

- Aktual: garis `#2660DC` tegas 2,5px. Prediksi: garis sama, putus-putus `6 5`, titik berongga.
- Kisaran prediksi: area `#BCD3FF` opasitas 55%.
- Garis prediksi tersambung dari titik aktual terakhir.
- Sumbu Y dimulai dekat nilai terendah (80% dari minimum, dibulatkan ke puluhan) agar pola terbaca.
- Legenda ditulis manual di atas grafik (bukan legenda bawaan Recharts).
- Animasi dimatikan.

### Aksesibilitas wajib

- Fokus keyboard terlihat: outline biru 2px (global `:focus-visible`).
- Tombol ikon punya `aria-label`; navigasi aktif memakai `aria-current="page"`.
- Status tidak hanya dibedakan warna (contoh: "Naik 5%", bukan hanya hijau).
- Segmented & chip pilihan memakai `role="radio"` / `aria-pressed`.

---

## 8. Gerak

- Tidak ada animasi otomatis. Gerak hanya sebagai respons aksi: tombol mengecil sedikit saat
  ditekan (`active:scale-[.97]`), toggle bergeser, toast muncul.

---

## 9. Matriks Uji Responsif

| Perangkat | Ukuran (CSS px) | Orientasi |
|---|---|---|
| HP | 390 × 844 | Portrait |
| HP | 844 × 390 | Landscape |
| Tablet | 768 × 1024 | Portrait |
| Tablet | 1024 × 768 | Landscape |

Lulus jika: tidak ada scroll horizontal, tidak ada teks terpotong, tab bar tidak menutupi konten
akhir, target sentuh ≥ 44px, grafik terbaca.

---

## 10. Gaya Bahasa UI

- Bahasa Indonesia sederhana, kalimat pendek, sentence case.
- Tombol memakai kata kerja yang menyebut hasilnya: "Simpan rekap", "Catat waste", "Lihat semua bahan".
- Pesan error/kosong memberi langkah berikutnya, tidak meminta maaf.
- Hindari klaim berlebihan ("akurat", "pasti", "AI canggih"); pakai "perkiraan" dan tampilkan selisih.
- Selama database belum tersambung, aksi simpan menampilkan pesan pratinjau yang jujur
  ("…belum disimpan karena database belum tersambung").
