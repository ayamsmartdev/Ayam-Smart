# AYAMSMART

Aplikasi web untuk UMKM ayam geprek: rekap penjualan harian, dashboard analytics, forecast
permintaan 5 hari, rekomendasi bahan baku, dan pencatatan food waste.

- Aturan pengembangan: [`AGENTS.md`](AGENTS.md)
- Kebutuhan produk: [`docs/PRD.md`](docs/PRD.md)
- Arsitektur dan keputusan teknis: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Rencana kerja: [`docs/TASKS.md`](docs/TASKS.md)
- Panduan tampilan: [`docs/STYLEGUIDE.md`](docs/STYLEGUIDE.md)

Repo: `ayamsmartdev/Ayam-Smart` (public: jangan commit secret atau data nyata klien)

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · Recharts · Supabase (PostgreSQL) ·
Python (numpy, scikit-learn, FastAPI) sebagai Vercel Function · Vercel

> Versi persis dicatat di `package.json` dan `requirements.txt` setelah setup.

## Menjalankan di Lokal

Prasyarat: Node.js LTS, Python 3.12 (sama dengan `.python-version`), Git.

### 1. Persiapan

```bash
# identitas git khusus repo ini (lihat AGENTS.md §2)
git config user.name "ayamsmartdev"
git config user.email "<email akun ayamsmartdev>"

npm install
cp .env.example .env.local   # lalu isi nilainya
```

### 2. Database

Jalankan file migrasi di `supabase/migrations/` secara berurutan lewat SQL Editor Supabase.

### 3. Service forecast (Python)

```bash
# Windows (Python install manager): py -3.12 -m venv .venv
# macOS/Linux: python3.12 -m venv .venv
# Aktifkan: Windows Git Bash → source .venv/Scripts/activate | macOS/Linux → source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn api.forecast:app --port 8000
```

Set `FORECAST_URL=http://localhost:8000/api/forecast` di `.env.local`.

### 4. Aplikasi

```bash
npm run dev
```

## Deploy

Push ke branch `main` di repo akun AYAMSMART → Vercel otomatis build dan deploy.
Environment variables diisi di Vercel → Project → Settings → Environment Variables
(daftar lengkap di `.env.example` dan `docs/ARCHITECTURE.md` §9).

## Data Simulasi

Mode demo memakai data simulasi yang dikalibrasi dari estimasi pemilik usaha dan selalu
diberi label "Simulasi" di aplikasi. Generator: `scripts/generate_demo_data.py`.
