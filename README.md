# 🏃 Territory Runner

<div align="center">

![Territory Runner](https://img.shields.io/badge/Territory-Jogger-FF6B35?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTMgM0wxOSAxMkwxMyAyMUg1TDExIDEyTDUgM0gxM1oiIGZpbGw9IndoaXRlIi8+PC9zdmc+)

**Aplikasi jogging gamifikasi berbasis GPS — klaim wilayah nyata dengan berlari!**

Terinspirasi dari Paper.io × Strava × Google Maps

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL+PostGIS-3ECF8E?logo=supabase)](https://supabase.com)
[![Leaflet](https://img.shields.io/badge/Leaflet.js-1.9-199900?logo=leaflet)](https://leafletjs.com)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vitejs.dev)

</div>

---

## 📱 Tentang Aplikasi

**Territory Runner** adalah aplikasi mobile web yang menggabungkan mekanik *area control* dari game .io (seperti Paper.io) dengan peta dunia nyata. Pengguna berlari di dunia nyata untuk **mengklaim wilayah** di peta, memotong wilayah milik pengguna lain, dan bersaing di leaderboard berdasarkan luas area yang dikuasai.

### 🎯 Konsep Utama

```
Berlari → Membentuk Loop → Klaim Wilayah → Potong Wilayah Lawan → Naik Peringkat
```

---

## ✨ Fitur Utama

### 🗺️ Real-time GPS Territory Mapping
- **Tracing**: Merekam jalur lari secara real-time menggunakan GPS browser
- **Claiming**: Deteksi otomatis saat jalur membentuk loop tertutup → klaim wilayah
- **Slicing**: Wilayah lawan terpotong saat kamu berlari melewatinya
- **Visualisasi**: Peta dark CartoDB dengan poligon berwarna per pengguna

### 🏃 Activity Tracking (Strava-inspired)
- Distance, Duration, Pace, Calories real-time
- **Minimizable run card** — swipe down jadi mini bar, swipe up jadi full
- **Post-run summary** dengan visualisasi jalur SVG + share
- Riwayat aktivitas lengkap dengan filter (7 hari / 30 hari / semua)

### 🏆 Leaderboard Daerah
- Peringkat berdasarkan luas wilayah (km²)
- Kategori: Kelurahan, Kecamatan, Kota
- Podium top 3 dengan medal 🥇🥈🥉

### 🔔 Notifikasi Invasion
- Push notification saat wilayahmu diserang
- In-app alert overlay saat sesi lari aktif
- Riwayat notifikasi dengan read/unread status

### 🔒 Privacy Zone
- Tentukan area sensitif (rumah, kantor) yang tidak bisa diklaim
- Radius 50–500 meter, dilindungi dengan RLS Supabase

### 📊 Dashboard
- Stats harian: Kalori, Jarak, Waktu
- Weekly activity chart (bar chart orange)
- Territory overview card
- Recent activities feed

### ⚡ Speed Guard
- Batas kecepatan 20 km/jam untuk mencegah cheat kendaraan
- Sliding window 10 detik untuk deteksi akurat

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Vite 6 |
| **Mobile Wrapper** | Capacitor.js v6 |
| **Peta** | Leaflet.js 1.9 + CartoDB Positron |
| **Geometri** | Turf.js v7 |
| **Backend** | Supabase (PostgreSQL 17 + PostGIS) |
| **Realtime** | Supabase Realtime (WebSocket) |
| **State** | Zustand v5 |
| **Testing** | Vitest + fast-check (property-based) |
| **Notifikasi** | Supabase Edge Functions + Browser Notification API |

---

## 🏗️ Arsitektur

```
┌─────────────────────────────────────────────────────────┐
│                    Mobile Client                         │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ GPS      │  │ Geometry     │  │ Map Layer        │  │
│  │ Tracker  │→ │ Engine       │→ │ (Leaflet.js)     │  │
│  │ (Browser)│  │ (Turf.js)    │  │                  │  │
│  └──────────┘  └──────────────┘  └──────────────────┘  │
│                       ↓                                  │
│              ┌──────────────────┐                        │
│              │ Territory Service│                        │
│              │ (Retry + Cache)  │                        │
│              └──────────────────┘                        │
└─────────────────────────┬───────────────────────────────┘
                          │ REST / RPC / WebSocket
┌─────────────────────────▼───────────────────────────────┐
│                    Supabase Backend                      │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Auth     │  │ PostgreSQL   │  │ Edge Functions   │  │
│  │ Service  │  │ + PostGIS    │  │ (Deno)           │  │
│  └──────────┘  └──────────────┘  └──────────────────┘  │
│                ┌──────────────┐                          │
│                │ Realtime     │                          │
│                │ (WebSocket)  │                          │
│                └──────────────┘                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Struktur Proyek

```
Territory-Jogger/
├── src/
│   ├── components/
│   │   ├── auth/           # Login, Register forms
│   │   ├── dashboard/      # Home screen (Summary)
│   │   ├── history/        # Riwayat aktivitas
│   │   ├── leaderboard/    # Peringkat daerah
│   │   ├── map/            # MapView (Leaflet)
│   │   ├── notifications/  # InvasionAlert, NotificationHistory
│   │   ├── privacy/        # PrivacyZoneManager
│   │   ├── profile/        # ProfileSettings
│   │   ├── run/            # RunSession, PostRunSummary
│   │   └── ui/             # Icons, Logo
│   ├── services/
│   │   ├── gpsTracker.ts       # GPS tracking + Speed Guard
│   │   ├── geometryEngine.ts   # Turf.js operations
│   │   ├── territoryService.ts # Claim + viewport query
│   │   ├── leaderboardService.ts
│   │   ├── privacyZoneService.ts
│   │   ├── profileService.ts
│   │   └── runSessionService.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useRealtimeTerritories.ts
│   │   ├── useMapViewport.ts
│   │   └── useInvasionNotifications.ts
│   ├── stores/
│   │   └── territoryStore.ts   # Zustand store
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces
│   └── utils/
│       ├── colorUtils.ts
│       ├── territoryCache.ts   # In-memory cache
│       └── trackUtils.ts
├── supabase/
│   ├── functions/
│   │   ├── invasion-notify/    # Edge Function notifikasi
│   │   └── decay-territories/  # Edge Function decay harian
│   └── migrations/
│       └── decay_territories.sql
├── .kiro/specs/territory-jogger/
│   ├── requirements.md
│   ├── design.md
│   └── tasks.md
└── capacitor.config.ts
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js v22+
- npm v10+
- Akun Supabase (free tier cukup)

### 1. Clone & Install

```bash
git clone https://github.com/ihyaabrar/Territory-Jogger.git
cd Territory-Jogger
npm install
```

### 2. Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com)
2. Aktifkan ekstensi **PostGIS** di Database → Extensions
3. Jalankan SQL berikut di SQL Editor:

```sql
-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  user_color TEXT NOT NULL DEFAULT '#FF6B35',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW()
);

-- Territories table
CREATE TABLE territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  geom GEOMETRY(Polygon, 4326) NOT NULL,
  area_km2 FLOAT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX territories_geom_idx ON territories USING GIST (geom);
CREATE INDEX territories_user_id_idx ON territories (user_id);

-- Privacy zones
CREATE TABLE privacy_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  center GEOMETRY(Point, 4326) NOT NULL,
  radius_m INTEGER NOT NULL CHECK (radius_m BETWEEN 50 AND 500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE privacy_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "privacy_zones_owner_only" ON privacy_zones
  FOR ALL USING (auth.uid() = user_id);

-- Run sessions
CREATE TABLE run_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  distance_km FLOAT,
  duration_sec INTEGER,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ
);

-- Invasion notifications
CREATE TABLE invasion_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  victim_id UUID NOT NULL REFERENCES profiles(id),
  attacker_id UUID NOT NULL REFERENCES profiles(id),
  area_lost_km2 FLOAT NOT NULL,
  location GEOMETRY(Point, 4326),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

4. Buat RPC functions (lihat `supabase/migrations/`)

### 3. Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run Development Server

```bash
npm run dev
```

Buka [http://localhost:5173](http://localhost:5173)

---

## 📱 Build untuk Mobile (Android)

> Memerlukan Java 17+ dan Android Studio

```bash
# Build web
npm run build

# Sync ke Capacitor
npx cap sync android

# Buka di Android Studio
npx cap open android
```

---

## 🧪 Testing

```bash
# Run semua tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Coverage

- **54 property-based tests** menggunakan fast-check
- 12 properti kebenaran diverifikasi:
  - Loop detection menghasilkan polygon valid
  - Simplifikasi mempertahankan luas (±5%)
  - Slicing konservasi area (±0.1%)
  - Privacy Zone mengecualikan area sensitif
  - Speed Guard deteksi kecepatan berlebih
  - Validasi minimum luas klaim (0.001 km²)
  - Keunikan warna pengguna
  - Round-trip penyimpanan klaim
  - Filter viewport tidak melewatkan wilayah
  - Leaderboard diurutkan dengan benar
  - Decay mengurangi luas proporsional
  - Debounce GPS membatasi frekuensi update

---

## 🗄️ Database Schema

```
profiles          → User data + warna unik
territories       → Polygon wilayah (PostGIS)
privacy_zones     → Area sensitif (RLS protected)
run_sessions      → Riwayat sesi lari
invasion_notifications → Notifikasi serangan
decay_warnings    → Pre-decay alerts
```

### Key RPC Functions

| Function | Deskripsi |
|----------|-----------|
| `claim_territory(user_id, polygon)` | Klaim wilayah + slicing atomik |
| `territories_in_viewport(bbox)` | Query wilayah dalam viewport |
| `apply_territory_decay()` | Decay harian (via pg_cron) |

---

## 🔧 Konfigurasi

### Speed Guard
```typescript
const MAX_SPEED_KMH = 20  // km/jam
const SPEED_WINDOW_MS = 10_000  // 10 detik
```

### Territory Decay
```typescript
const DECAY_RATE = 0.10  // 10% per hari
const INACTIVE_THRESHOLD_DAYS = 7
const MIN_AREA_KM2 = 0.001
```

### GPS Settings
```typescript
const MAX_ACCURACY_M = 50  // meter
const GPS_LOST_TIMEOUT_MS = 30_000  // 30 detik
const MAP_UPDATE_DEBOUNCE_MS = 1_000  // 1 detik
```

---

## 🌐 Deployment

### Vercel / Netlify

```bash
npm run build
# Upload folder dist/
```

### Environment Variables yang diperlukan:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## 📊 Algoritma Klaim Wilayah

```typescript
// 1. Rekam koordinat GPS
const track: Coordinate[] = []

// 2. Deteksi self-intersection (loop)
const loop = turf.kinks(lineString(track))

// 3. Buat polygon dari loop
const claimPolygon = turf.polygon([loopCoords])

// 4. Potong Privacy Zone
const clipped = turf.difference(claimPolygon, privacyCircle)

// 5. Simplifikasi (kurangi ukuran payload)
const simplified = turf.simplify(clipped, { tolerance: 0.00001 })

// 6. Kirim ke server (atomik)
// Server: ST_Difference untuk potong wilayah lawan
await supabase.rpc('claim_territory', { polygon: simplified })
```

---

## 🤝 Kontribusi

1. Fork repository
2. Buat branch: `git checkout -b feature/nama-fitur`
3. Commit: `git commit -m 'feat: tambah fitur X'`
4. Push: `git push origin feature/nama-fitur`
5. Buat Pull Request

---

## 📄 Lisensi

MIT License — lihat [LICENSE](LICENSE)

---

## 👨‍💻 Developer

**Ihya Abrar**
- GitHub: [@ihyaabrar](https://github.com/ihyaabrar)
- Project: [Territory Runner](https://github.com/ihyaabrar/Territory-Jogger)

---

<div align="center">

**Berlari lebih bermakna dengan Territory Runner** 🏃🗺️

*Klaim wilayahmu, kalahkan lawan, jadilah yang terkuat!*

</div>
