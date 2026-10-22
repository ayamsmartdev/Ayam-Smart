# PRD — AYAMSMART

> Product Requirements Document. Menjelaskan **apa** yang dibangun dan **kapan dianggap selesai**.
> Cara membangunnya ada di `ARCHITECTURE.md`. Terakhir diupdate: 23 Oktober 2026.
> Metode Agile: daftar fitur ini adalah prioritas awal dan dapat berkembang bersama klien per sprint.

---

## 1. Latar Belakang

UMKM ayam geprek klien masih mencatat penjualan secara manual dan belum punya riwayat data
digital. Persiapan stok ayam dan bahan baku dilakukan berdasarkan perkiraan, sehingga berisiko
kelebihan stok (menjadi food waste) atau kekurangan stok (kehilangan penjualan).

AYAMSMART membantu pemilik usaha:
1. Mencatat penjualan harian per menu dengan cepat.
2. Melihat tren penjualan.
3. Memperkirakan permintaan 5 hari ke depan.
4. Mengetahui kebutuhan bahan baku yang perlu disiapkan.
5. Mencatat food waste untuk melihat apakah persiapan stok makin tepat.

Aplikasi kasir milik klien sedang dibuat terpisah. AYAMSMART bukan aplikasi kasir.

## 2. Tujuan

| # | Tujuan | Ukuran |
|---|---|---|
| G1 | Pencatatan harian cepat | Rekap satu hari selesai < 1 menit di HP |
| G2 | Forecast yang jujur | Prediksi 5 hari tampil beserta tingkat error dan model yang dipakai |
| G3 | Rekomendasi yang bisa langsung dipakai | Kebutuhan bahan tampil dalam satuan belanja (misalnya ekor ayam) |
| G4 | Bukti dampak | Food waste tercatat dan tampil sebagai tren |
| G5 | Siap presentasi 4 November 2026 | Alur lengkap bisa didemokan < 3 menit di HP tanpa error |

## 3. Pengguna

| Pengguna | Kebutuhan | Perangkat |
|---|---|---|
| Pemilik / pengelola warung | Input rekap & waste, lihat rekomendasi | HP |
| Tim AYAMSMART | Input data, pantau, presentasi | HP, tablet |
| Penonton presentasi | Melihat dashboard dan forecast | Layar presentasi / tablet |

## 4. Fitur

Prioritas: **P1** wajib untuk presentasi, **P2** diusahakan untuk presentasi.

### F1 — Pengaturan Menu, Bahan, dan Resep (P1)
Master data untuk menu (nama, harga opsional, aktif/nonaktif), bahan baku (nama, satuan), dan
resep (jumlah bahan per porsi per menu), buffer stok (%), dan jumlah potong per ekor ayam.

**Kriteria penerimaan**
- Bisa tambah, ubah, dan nonaktifkan menu dan bahan.
- Menu "ayam saja" dan "ayam + nasi" bisa punya resep berbeda.
- Menu nonaktif tidak muncul di form input, tetapi data historisnya tetap ada.

### F2 — Input Rekap Penjualan Harian (P1)
Form rekap per tanggal: daftar menu aktif dengan tombol +/- dan input angka.

**Kriteria penerimaan**
- Default tanggal = hari ini (WIB). Bisa memilih tanggal lain untuk mengisi hari yang terlewat.
- Mengisi ulang tanggal yang sama memperbarui data, bukan menduplikasi.
- Setelah disimpan, forecast dihitung ulang otomatis. Jika forecast gagal, data tetap tersimpan
  dan muncul pesan untuk menghitung ulang.
- Bisa menandai hari sebagai "tutup".

### F3 — Import CSV (P2)
Upload data penjualan historis dengan template.

**Kriteria penerimaan**
- Template bisa diunduh. Kolom: `tanggal` (YYYY-MM-DD), `menu`, `jumlah`.
- Validasi sebelum simpan: format tanggal, angka negatif, menu tidak dikenal, duplikat.
  Baris bermasalah ditampilkan beserta alasannya.
- Pratinjau sebelum konfirmasi simpan.

### F4 — Dashboard Analytics (P1)
**Kriteria penerimaan**
- Ringkasan: total porsi 7 hari terakhir, rata-rata per hari, hari terlaris, tingkat food waste.
- Grafik tren penjualan historis dan prediksi 5 hari dalam satu grafik, dengan pembeda visual yang jelas.
- Filter: semua menu atau per menu; rentang 14 / 30 / 90 hari.
- Kondisi tanpa data menampilkan arahan, bukan grafik kosong.

### F5 — Forecast 5 Hari (P1)
**Kriteria penerimaan**
- Prediksi per menu untuk 5 hari ke depan, dengan rentang bawah–atas jika tersedia.
- Menampilkan model terpilih, jumlah hari data, dan error rata-rata hasil backtest.
- Data terlalu sedikit → memakai baseline dan menampilkan peringatan.
- Tombol "Hitung ulang".

### F6 — Rekomendasi Bahan Baku (P1)
**Kriteria penerimaan**
- Kebutuhan bahan untuk besok dan 5 hari ke depan, sudah termasuk buffer.
- Ayam ditampilkan dalam potong dan ekor.
- Menampilkan asal perhitungan (prediksi × resep + buffer) agar bisa dijelaskan.

### F7 — Food Waste (P1)
**Kriteria penerimaan**
- Form: tanggal, item (menu atau bahan), jumlah, alasan (tidak laku, rusak, kedaluwarsa, lainnya), catatan.
- Riwayat dalam tabel, bisa diubah dan dihapus.
- Grafik waste per hari dan tingkat waste (%) di dashboard.

### F8 — Penanda Kondisi Hari (P2)
Penanda manual per tanggal: ramai, sepi, libur, gajian, tutup. Bisa diisi untuk tanggal mendatang.

**Kriteria penerimaan**
- Penanda dipakai sebagai fitur forecast jika datanya cukup, dan tampil di grafik.

### F9 — Mode Demo (P1)
**Kriteria penerimaan**
- Beralih antara data simulasi dan data nyata dengan satu tombol.
- Mode simulasi selalu menampilkan label "Simulasi".
- Data simulasi dan data nyata tidak pernah tercampur.

### F10 — PIN Akses (P1, menunggu persetujuan klien)
**Kriteria penerimaan**
- Halaman yang mengubah data meminta PIN sekali per perangkat, lalu diingat 30 hari.
- Percobaan PIN salah dibatasi.
- Status tampilan dashboard tanpa PIN mengikuti keputusan klien (Q-05).

### F11 — Branding AYAMSMART (P1)
**Kriteria penerimaan**
- Logo (atau wordmark sementara) dan palet gradasi biru sesuai `STYLEGUIDE.md`.

## 5. Kebutuhan Non-Fungsional

| Area | Kebutuhan |
|---|---|
| Responsif | Layak dipakai di HP dan tablet, portrait dan landscape (matriks uji di `STYLEGUIDE.md` §6) |
| Kinerja | Dashboard membaca hasil forecast tersimpan; tidak menunggu perhitungan saat dibuka |
| Keandalan | Kegagalan forecast tidak menghalangi penyimpanan data |
| Keamanan | Browser tidak mengakses database langsung; secret hanya di server; aksi tulis butuh PIN |
| Kejujuran | Data simulasi berlabel; error forecast ditampilkan apa adanya |
| Bahasa | Bahasa Indonesia, format angka dan tanggal Indonesia |

## 6. Bukan Prioritas Saat Ini (Backlog)

Bisa diangkat ke sprint jika disepakati bersama klien:
- Integrasi langsung dengan aplikasi kasir klien
- Forecast yang otomatis menyesuaikan dengan food waste
- Estimasi kerugian waste dalam rupiah
- Multi-cabang, akun pengguna, hak akses berbeda
- Notifikasi, aplikasi mobile native / PWA

## 7. Kriteria Siap Presentasi

- [ ] Alur input rekap → forecast terbarui → rekomendasi bahan berjalan di HP
- [ ] Semua halaman P1 layak di 4 ukuran layar uji
- [ ] Mode demo berisi data simulasi yang terkalibrasi dan berlabel
- [ ] Data nyata yang sudah terkumpul tampil di mode data nyata
- [ ] Tidak ada error di console pada alur demo

## 8. Pertanyaan Terbuka

| ID | Pertanyaan | Untuk | Status |
|---|---|---|---|
| Q-01 | Daftar menu dan harga; menu mana yang memakai ayam dan berapa potong | Klien | Terbuka |
| Q-02 | Resep/rasio bahan per porsi (ayam, nasi, sambal, tepung, minyak, sebisanya) | Klien | Terbuka |
| Q-03 | Ayam dibeli per ekor atau per kg; 1 ekor dipotong jadi berapa potong | Klien | Terbuka |
| Q-04 | Estimasi pemilik: rata-rata porsi hari biasa vs akhir pekan, hari paling ramai/sepi, hari tutup (untuk kalibrasi simulasi) | Klien | Terbuka |
| Q-05 | Persetujuan PIN; dashboard boleh dilihat tanpa PIN atau ikut dilindungi | Klien | Terbuka |
| Q-06 | Siapa yang menginput rekap harian, dan kapan | Klien | Terbuka |
| Q-07 | Logo dan kode warna HEX (sementara pakai palet usulan) | Klien | Terbuka |
| Q-08 | Contoh format export aplikasi kasir yang sedang dibuat | Klien | Terbuka |
| Q-09 | Buffer stok yang diinginkan (default sementara 10%) | Klien | Terbuka |
| Q-10 | Info kebijakan penggunaan komersial Vercel Hobby sudah disampaikan; keputusan plan | Klien | Terbuka |
| Q-11 | Gmail AYAMSMART dibuat | Klien | Selesai (23 Okt) |
