# STYLEGUIDE — AYAMSMART

> Panduan tampilan dan pola komponen. Tailwind CSS v4 murni, tanpa component library.
> Terakhir diupdate: 23 Oktober 2026.
>
> **Status palet: SEMENTARA.** Klien baru menyebut "gradasi biru"; logo dan kode warna final
> menunggu Q-07. Saat palet final datang, cukup ubah token di §2.

---

## 1. Prinsip

1. **Jari dulu, mata kedua:** dipakai di warung, sering satu tangan. Target sentuh minimal 44px.
2. **Satu layar, satu tugas:** input rekap tidak dicampur dengan grafik.
3. **Angka paling penting paling besar:** prediksi besok dan kebutuhan ayam harus terbaca dalam 2 detik.
4. **Jujur secara visual:** prediksi dibedakan jelas dari data aktual; data simulasi selalu berlabel.
5. **Mode terang saja** (D-14).

---

## 2. Warna (Token)

Didefinisikan di `src/app/globals.css`:

```css
@import "tailwindcss";

@theme {
  /* Brand — gradasi biru (SEMENTARA) */
  --color-brand-50:  #eff6ff;
  --color-brand-100: #dbeafe;
  --color-brand-200: #bfdbfe;
  --color-brand-300: #93c5fd;
  --color-brand-400: #60a5fa;
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  --color-brand-700: #1d4ed8;
  --color-brand-800: #1e40af;
  --color-brand-900: #1e3a8a;
  --color-brand-accent: #0ea5e9; /* titik awal gradasi */

  --font-sans: var(--font-jakarta), ui-sans-serif, system-ui, sans-serif;
}
```

| Peran | Kelas Tailwind | Dipakai untuk |
|---|---|---|
| Gradasi brand | `bg-linear-to-br from-brand-accent to-brand-700` | Header, tombol utama, kartu sorotan |
| Teks utama | `text-slate-900` | Isi |
| Teks sekunder | `text-slate-500` | Label, keterangan |
| Latar halaman | `bg-slate-50` | Body |
| Permukaan | `bg-white` + `border-slate-200` | Kartu |
| Sukses | `emerald-600` / latar `emerald-50` | Tersimpan, error forecast rendah |
| Peringatan | `amber-600` / latar `amber-50` | Data sedikit, badge "Simulasi" |
| Bahaya | `rose-600` / latar `rose-50` | Hapus, gagal |

> Gradasi memakai sintaks Tailwind v4 (`bg-linear-to-*`). Teks putih di atas gradasi
> wajib dicek kontrasnya di ujung terang (`brand-accent`).

**Warna grafik**
- Aktual: garis/batang `brand-600`, solid
- Prediksi: garis `brand-600` **putus-putus**, titik berongga
- Rentang prediksi: area `brand-200` transparansi ~40%
- Food waste: `rose-500`
- Penanda hari: titik kecil warna netral `slate-400` dengan tooltip

---

## 3. Tipografi

Font: **Plus Jakarta Sans** via `next/font/google` (variabel `--font-jakarta`).

| Peran | Kelas |
|---|---|
| Judul halaman | `text-xl font-bold sm:text-2xl` |
| Judul kartu | `text-sm font-semibold text-slate-700` |
| Angka besar (KPI) | `text-3xl font-bold tabular-nums` |
| Isi | `text-base` |
| Keterangan | `text-sm text-slate-500` |
| Input form | minimal `text-base` (16px) agar iOS tidak auto-zoom |

Angka selalu `tabular-nums` dan format `id-ID` (`1.250`, `18,2%`). Tanggal: `Sen, 26 Okt`.

---

## 4. Layout & Navigasi

| Kondisi | Layout |
|---|---|
| < `lg` (HP portrait/landscape, tablet portrait) | Header ringkas + **bottom navigation** 5 item |
| ≥ `lg` (tablet landscape, laptop) | **Sidebar** kiri + konten |

- Item navigasi: Dashboard · Forecast · Input · Waste · Lainnya (Rekomendasi, Import, Pengaturan).
  Di sidebar semua item tampil langsung.
- Konten: `mx-auto w-full max-w-6xl px-4 sm:px-6`.
- Bottom nav: `fixed inset-x-0 bottom-0 pb-[env(safe-area-inset-bottom)]`; konten diberi
  padding bawah agar tidak tertutup.
- Grid kartu: `grid gap-4 sm:grid-cols-2 lg:grid-cols-4`.
- HP landscape (tinggi sempit): gunakan varian `landscape:` untuk merapatkan header dan
  membatasi tinggi grafik (`landscape:h-56`).
- Toggle mode demo/data nyata selalu terlihat di header.

---

## 5. Komponen (`src/components/ui/`)

Setiap komponen menerima `className` tambahan. Gabungkan kelas dengan helper `cn()` sederhana
(`src/lib/cn.ts`) tanpa dependency tambahan.

| Komponen | Kelas dasar |
|---|---|
| Button primary | `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-linear-to-br from-brand-accent to-brand-700 px-4 font-semibold text-white shadow-sm active:scale-[.98] disabled:opacity-50` |
| Button secondary | `… rounded-xl border border-slate-300 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50` |
| Button danger | `… rounded-xl bg-rose-600 px-4 font-semibold text-white` |
| Card | `rounded-2xl border border-slate-200 bg-white p-4 shadow-sm` |
| Input / Select | `min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200` |
| Stepper (+/-) | Tombol bulat `size-11` kiri-kanan, angka `text-xl font-bold tabular-nums` di tengah, input bisa diketik |
| Badge Simulasi | `rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200` |
| Stat (KPI) | Card + label `text-sm text-slate-500` + angka `text-3xl font-bold` + catatan kecil |
| Toast | Pojok bawah, di atas bottom nav, hilang otomatis 3 detik |
| Modal | Fokus terkunci di dalam modal, tutup dengan Esc dan klik latar, tombol tutup terlihat |
| EmptyState | Ikon + kalimat penjelas + satu tombol aksi |
| Skeleton | `animate-pulse rounded-xl bg-slate-200` |

**Aksesibilitas wajib**
- Semua tombol ikon punya `aria-label`.
- Fokus keyboard terlihat (`focus-visible:ring-2 focus-visible:ring-brand-400`).
- Status tidak hanya dibedakan dengan warna (tambahkan teks/ikon).

---

## 6. Matriks Uji Responsif

Setiap halaman P1 wajib dicek di DevTools dan minimal satu HP nyata:

| Perangkat | Ukuran (CSS px) | Orientasi |
|---|---|---|
| HP kecil | 360 × 800 | Portrait |
| HP kecil | 800 × 360 | Landscape |
| Tablet | 768 × 1024 | Portrait |
| Tablet | 1024 × 768 | Landscape |

Lulus jika: tidak ada scroll horizontal, tidak ada teks terpotong, bottom nav tidak menutupi
konten, semua target sentuh ≥ 44px, grafik terbaca.

---

## 7. Gaya Bahasa UI

- Bahasa Indonesia sederhana, kalimat pendek, sapaan netral.
- Tombol memakai kata kerja: "Simpan rekap", "Hitung ulang", "Tambah menu".
- Pesan error menjelaskan langkah berikutnya: "Data tersimpan, tapi forecast gagal. Tekan Hitung ulang."
- Hindari klaim berlebihan ("akurat", "pasti"); gunakan "perkiraan" dan tampilkan error.
