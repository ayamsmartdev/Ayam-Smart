# STYLEGUIDE — AYAMSMART

> Panduan tampilan dan pola komponen. Tailwind CSS v4 murni, tanpa component library.
> Terakhir diupdate: 23 Oktober 2026. Keputusan tema: ARCHITECTURE.md D-17.
>
> **Logo final dari klien sudah dipakai** (25 Okt, Q-07): ayam berpola sirkuit, warna dari file logo **cyan `#71CDDD`**
> dan **biru `#158DC5`**. Palet aplikasi (`--color-brand-*`, biru gradasi) **belum** disamakan dengan warna logo;
> bila disamakan, cukup ubah token di `src/app/globals.css`.

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
| `/rekap` | Input rekap harian — **PIN**, data nyata; `?tanggal=YYYY-MM-DD` (hari ini s.d. 30 hari lalu) |
| `/waste` | Food waste — PIN, masih simulasi |
| `/lainnya` | Menu tambahan (HP) |
| `/pengaturan` | Menu, bahan baku, resep, setelan — **PIN**, data nyata |
| `/import` | Import CSV — PIN, baru template |
| `/pin` | Masukkan PIN; `?next=` hanya ke halaman terproteksi. Tanpa tab bar aktif |
| `/status` | Cek koneksi database (jumlah baris per tabel). Tidak ada di navigasi, `noindex` |

Halaman bertanda PIN hanya bisa dibuka setelah PIN benar (ARCHITECTURE §8). Halaman dengan data nyata
tidak menampilkan `SimulasiBadge`.

---

## 7. Komponen

Semua di `src/components/`, ditulis dengan kelas Tailwind biasa dan menerima `className` tambahan
(digabung dengan `cn()` di `src/lib/cn.ts`).

| Komponen | File | Catatan |
|---|---|---|
| `Panel`, `PanelTitle` | `ui/panel.tsx` | `variant="hero"` untuk satu elemen utama per halaman |
| `Button`, `LinkButton` | `ui/button.tsx` | `primary` (gradasi), `secondary` (putih + ring biru), `danger` (sambal), `dangerSoft` (sambal lembut, untuk aksi berisiko sekunder), `plain` |
| `Badge`, `SimulasiBadge` | `ui/badge.tsx` | `SimulasiBadge` wajib tampil selama data simulasi |
| `GroupedList`, `ListRow` | `ui/grouped-list.tsx` | Daftar ala iOS; `href` (pindah halaman) atau `onClick` (mis. buka dialog ubah) menambah chevron |
| `Stepper` | `ui/stepper.tsx` | Tombol bulat 44px + angka yang bisa diketik |
| `Segmented` | `ui/segmented.tsx` | Pilihan 2–3 opsi |
| `PageHeader` | `ui/page-header.tsx` | Large title + subjudul |
| `Toast` | `ui/toast.tsx` | Di atas tab bar, hilang 3,5 detik |
| `ConfirmDialog` | `ui/confirm-dialog.tsx` | `<dialog>` bawaan (fokus terkunci, Esc/klik luar = batal), kaca `glass-bar`, tombol disusun vertikal: utama → berisiko (`dangerSoft`) → `plain`. `onClose` hanya terpicu oleh pengguna, jadi aman berpindah dialog (edit → hapus) |
| `DialogError` | `ui/confirm-dialog.tsx` | Kotak error merah lembut **di dalam** dialog. Toast tidak terlihat saat dialog terbuka (tertutup lapisan modal) |
| `useActionRunner` | `hooks/use-action-runner.ts` | Jalankan Server Action: `pending`, `toast` (sukses), `dialogError` (gagal saat dialog terbuka), `needPin` (sesi PIN habis → tampilkan link "Masukkan PIN lagi") |
| `useLeaveGuard` | `hooks/use-leave-guard.ts` | Tahan klik link saat ada perubahan belum disimpan → tampilkan `ConfirmDialog`; refresh/tutup tab memakai dialog bawaan browser. Setelah pengguna memilih, pindah dengan `router.push` (bukan `window.location`, yang memicu dialog bawaan lagi) |
| `RecipeEditor` | `app/pengaturan/recipe-editor.tsx` | Baris 2 tingkat (pilihan bahan selebar penuh, lalu takaran + satuan di dalam input + tombol hapus) agar muat di 360px |
| Ikon | `icons.tsx` | SVG garis 24px buatan sendiri, `currentColor` |
| `BrandMark`, `BrandWordmark` | `layout/brand-mark.tsx` | Logo klien (ayam sirkuit, tanpa tulisan melengkung) dari `public/brand/ayamsmart-mark.png` + tulisan AYAMSMART. Ikon tab: `src/app/favicon.ico`, `icon.png`, `apple-icon.png` |
| `AppShell`, `SidebarNav`, `TabBar` | `layout/app-shell.tsx`, `layout/nav.tsx` | Kerangka responsif |
| `FreshnessGuard` | `layout/freshness-guard.tsx` | Muat ulang sekali bila tanggal halaman ≠ tanggal WIB perangkat |
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
- Status **belum disimpan** selalu merah tebal (`sambal-700`) dengan titik penanda, dan form yang punya status ini wajib memakai `useLeaveGuard`.
- Segmented & chip pilihan memakai `role="radio"` / `aria-pressed`.
- Error yang muncul saat dialog terbuka **wajib** lewat `DialogError` di dalam dialog itu; toast hanya untuk
  pesan sukses atau error saat tidak ada dialog. Jika error bisa diatasi dengan aksi lain (mis. menu
  berhistori tidak bisa dihapus), tawarkan tombolnya langsung ("Nonaktifkan saja").
- Aksi yang tidak bisa dibatalkan (hapus) selalu lewat `ConfirmDialog` dengan tombol `danger`.

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
- Halaman yang masih simulasi (Waste, Import) menampilkan pesan pratinjau yang jujur saat menyimpan
  ("…belum disimpan karena database belum tersambung"). Halaman data nyata memakai pesan hasil sebenarnya
  ("Rekap tersimpan: 42 porsi.").
- Pesan error dari database diterjemahkan ke bahasa pemilik: nama dobel → "Nama ini sudah dipakai",
  masih dipakai → sarankan menonaktifkan.
