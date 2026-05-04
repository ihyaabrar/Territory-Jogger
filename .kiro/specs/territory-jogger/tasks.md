# Rencana Implementasi: Territory Jogger

## Ikhtisar

Implementasi Territory Jogger dilakukan secara bertahap, dimulai dari fondasi proyek dan autentikasi, kemudian GPS tracking, geometri klaim, konflik wilayah, visualisasi peta, leaderboard, privacy zone, notifikasi, hingga optimasi performa. Setiap tahap membangun di atas tahap sebelumnya dan diakhiri dengan integrasi penuh.

Stack teknologi: **Vite + React + TypeScript**, **Capacitor.js v6**, **Leaflet.js v1.9**, **Turf.js v7**, **Supabase (PostgreSQL 15 + PostGIS 3.4)**, **Vitest + fast-check**.

---

## Tasks

- [x] 1. Setup Fondasi Proyek
  - Inisialisasi proyek Vite + React + TypeScript
  - Konfigurasi Capacitor.js v6 untuk wrapper mobile (iOS & Android)
  - Instal dan konfigurasi dependensi utama: Leaflet.js, Turf.js, Supabase JS client, `@transistorsoft/capacitor-background-geolocation`
  - Setup Vitest + fast-check sebagai framework pengujian
  - Buat struktur direktori: `src/components`, `src/services`, `src/hooks`, `src/types`, `src/utils`
  - Definisikan semua TypeScript interface inti: `Coordinate`, `TrackData`, `Territory`, `PrivacyZone`, `RunSession`, `UserProfile`, `LeaderboardEntry`
  - _Persyaratan: 1.1, 3.1, 4.1, 6.1_

- [x] 2. Setup Database Supabase dan Skema PostGIS
  - [x] 2.1 Buat skema database PostgreSQL + PostGIS
    - Buat tabel `profiles` dengan kolom `id`, `username`, `user_color`, `avatar_url`, `created_at`, `last_active`
    - Buat tabel `territories` dengan kolom `id`, `user_id`, `geom GEOMETRY(Polygon, 4326)`, `area_km2`, `created_at`, `updated_at`
    - Buat indeks spasial GIST pada `territories.geom` dan indeks `territories.user_id`
    - Buat tabel `privacy_zones` dengan RLS policy `privacy_zones_owner_only`
    - Buat tabel `invasion_notifications` dengan indeks `victim_id, created_at DESC`
    - Buat tabel `run_sessions`
    - _Persyaratan: 1.2, 2.1, 4.6, 5.6, 8.2, 11.2_

  - [x] 2.2 Buat fungsi RPC dan materialized view
    - Implementasikan fungsi `claim_territory(p_user_id, p_polygon)` dengan logika slicing atomik menggunakan `ST_Intersects`, `ST_Difference`, `ST_MakeValid`, dan `pg_notify`
    - Implementasikan fungsi `territories_in_viewport(min_lng, min_lat, max_lng, max_lat)` yang mengembalikan GeoJSON wilayah dalam viewport
    - Buat materialized view `leaderboard_cache` dengan join ke `admin_boundaries` dan indeks `region_id, total_area_km2 DESC`
    - Setup `pg_cron` untuk refresh `leaderboard_cache` setiap 60 detik
    - _Persyaratan: 5.1, 5.2, 5.3, 5.4, 5.6, 6.3, 7.1, 7.5, 11.2_

- [x] 3. Implementasi Autentikasi Pengguna
  - [x] 3.1 Buat komponen formulir pendaftaran dan login
    - Buat `RegisterForm` dengan validasi kolom username, email, dan password
    - Buat `LoginForm` dengan validasi input
    - Integrasikan dengan Supabase Auth untuk pendaftaran dan login
    - Tampilkan pesan kesalahan "Email sudah digunakan" jika email duplikat
    - _Persyaratan: 1.1, 1.2, 1.3_

  - [x] 3.2 Implementasikan manajemen sesi autentikasi
    - Simpan sesi autentikasi secara lokal menggunakan Supabase session persistence
    - Implementasikan auto-refresh token dan redirect ke halaman login jika token kedaluwarsa
    - Buat `AuthContext` dan hook `useAuth` untuk akses sesi di seluruh aplikasi
    - _Persyaratan: 1.4, 1.5_

  - [ ]* 3.3 Tulis unit test untuk validasi formulir autentikasi
    - Test validasi email, password, dan username dengan input konkret
    - Test pesan kesalahan untuk email duplikat
    - _Persyaratan: 1.1, 1.3_

- [x] 4. Implementasi Profil dan Identitas Visual Pengguna
  - [x] 4.1 Buat halaman pengaturan profil
    - Buat komponen `ProfileSettings` dengan form ubah username, warna, dan avatar
    - Implementasikan pemilihan warna HEX dengan color picker
    - Implementasikan upload avatar dan pemilihan dari koleksi yang tersedia
    - _Persyaratan: 2.2, 2.4, 2.5_

  - [x] 4.2 Implementasikan logika penetapan dan validasi warna unik
    - Saat pendaftaran, panggil fungsi server untuk menetapkan warna unik yang belum digunakan pengguna lain
    - Saat pengguna mengubah warna, validasi keunikan ke server sebelum menyimpan
    - Tampilkan pesan kesalahan dan saran warna alternatif jika warna sudah digunakan
    - _Persyaratan: 2.1, 2.2, 2.3_

  - [ ]* 4.3 Tulis property test untuk keunikan warna pengguna
    - **Properti 7: Keunikan Warna Pengguna**
    - Generator: serangkaian pendaftaran pengguna acak (N = 2–50 pengguna)
    - Verifikasi: tidak ada dua profil dengan `user_color` yang sama
    - **Memvalidasi: Persyaratan 2.1, 2.3**

- [x] 5. Checkpoint — Pastikan semua test lulus
  - Pastikan semua test lulus, tanyakan kepada pengguna jika ada pertanyaan.

- [x] 6. Implementasi GPS Tracker
  - [x] 6.1 Buat service `GPSTracker` dengan background geolocation
    - Implementasikan `GPSTracker` menggunakan `@transistorsoft/capacitor-background-geolocation`
    - Konfigurasi `desiredAccuracy: HIGH`, `distanceFilter: 5` meter, interval maksimum 3 detik
    - Implementasikan `startSession()`, `stopSession()`, `getCurrentPosition()`, `onPositionUpdate()`
    - Tangani izin GPS: tampilkan dialog permintaan izin; jika ditolak permanen, arahkan ke pengaturan
    - _Persyaratan: 3.1, 3.2, 3.4_

  - [x] 6.2 Implementasikan Speed Guard
    - Implementasikan buffer kecepatan 10 detik terakhir menggunakan sliding window
    - Jika rata-rata kecepatan > 20 km/jam selama > 10 detik berturut-turut, hentikan sesi dan tampilkan peringatan "Kecepatan terlalu tinggi - klaim dibatalkan"
    - Implementasikan callback `onSpeedViolation`
    - _Persyaratan: 3.6, 3.7_

  - [ ]* 6.3 Tulis property test untuk Speed Guard
    - **Properti 5: Speed Guard Mendeteksi dan Menghentikan Kecepatan Berlebih**
    - Generator: urutan data kecepatan acak dengan jendela > 20 km/jam selama > 10 detik
    - Verifikasi: sesi dihentikan dan tidak ada klaim yang diproses setelah pelanggaran
    - **Memvalidasi: Persyaratan 3.6, 3.7**

  - [x] 6.4 Implementasikan penanganan GPS lost dan debounce
    - Jika tidak ada update GPS selama > 30 detik, pause sesi dan tampilkan peringatan "Sinyal GPS lemah"
    - Implementasikan debounce pembaruan peta: maksimum 1 update/detik ke layer Leaflet
    - Abaikan titik GPS dengan akurasi > 50 meter
    - _Persyaratan: 3.5, 11.4_

  - [ ]* 6.5 Tulis property test untuk debounce GPS
    - **Properti 12: Debounce GPS Membatasi Frekuensi Update**
    - Generator: urutan update GPS acak dengan interval acak (0–5000ms)
    - Verifikasi: tidak ada lebih dari 1 update per detik yang diteruskan ke layer peta
    - **Memvalidasi: Persyaratan 11.4**

- [x] 7. Implementasi Geometry Engine
  - [x] 7.1 Implementasikan deteksi loop dan pembuatan poligon klaim
    - Implementasikan `detectLoop(track)` menggunakan `turf.kinks()` untuk mendeteksi self-intersection
    - Ekstrak sub-jalur yang membentuk loop dan buat polygon dengan `turf.polygon()`
    - Implementasikan `createClaimPolygon(track, loopResult)` yang mengembalikan `Feature<Polygon>`
    - _Persyaratan: 4.1, 4.2_

  - [ ]* 7.2 Tulis property test untuk deteksi loop
    - **Properti 1: Deteksi Loop Menghasilkan Poligon Valid**
    - Generator: jalur acak dengan self-intersection yang disengaja (menggunakan `fc.array` koordinat dengan loop deterministik)
    - Verifikasi: `turf.booleanValid(polygon) === true` dan polygon mencakup area yang dikelilingi
    - **Memvalidasi: Persyaratan 4.1, 4.2**

  - [x] 7.3 Implementasikan simplifikasi dan validasi poligon
    - Implementasikan `simplifyPolygon(polygon)` menggunakan `turf.simplify` dengan toleransi 0,00001 derajat
    - Jika polygon tidak valid setelah simplifikasi, coba ulang dengan toleransi 0,000001; jika gagal, batalkan klaim
    - Implementasikan `calculateArea(polygon)` menggunakan `turf.area()` → konversi ke km²
    - Implementasikan `isValidClaim(polygon)`: luas ≥ 0,001 km²
    - _Persyaratan: 4.3, 4.4, 4.5, 11.1_

  - [ ]* 7.4 Tulis property test untuk simplifikasi poligon
    - **Properti 2: Simplifikasi Mempertahankan Validitas dan Luas**
    - Generator: poligon valid acak dengan berbagai kompleksitas (10–500 titik)
    - Verifikasi: poligon hasil simplifikasi tetap valid; selisih luas < 5%
    - **Memvalidasi: Persyaratan 4.3, 4.4, 11.1**

  - [ ]* 7.5 Tulis property test untuk validasi minimum luas klaim
    - **Properti 6: Validasi Minimum Luas Klaim**
    - Generator: poligon acak dengan luas < 0,001 km²
    - Verifikasi: klaim ditolak, state database tidak berubah
    - **Memvalidasi: Persyaratan 4.5**

- [x] 8. Implementasi Privacy Zone di Geometry Engine
  - [x] 8.1 Implementasikan pemotongan Privacy Zone pada poligon klaim
    - Implementasikan `applyPrivacyZones(polygon, zones)` menggunakan `turf.circle()` dan `turf.difference()`
    - Jika hasil `difference` adalah null, batalkan klaim
    - Integrasikan pemanggilan `applyPrivacyZones` ke dalam alur pembuatan poligon klaim sebelum pengiriman ke server
    - _Persyaratan: 8.3, 8.5_

  - [ ]* 8.2 Tulis property test untuk Privacy Zone
    - **Properti 4: Privacy Zone Mengecualikan Area Sensitif dari Klaim dan Jalur**
    - Generator: poligon klaim acak + privacy zone acak (titik pusat + radius 50–500m)
    - Verifikasi: `turf.booleanDisjoint(clippedPolygon, privacyCircle) === true`
    - **Memvalidasi: Persyaratan 8.3, 8.5**

- [x] 9. Checkpoint — Pastikan semua test lulus
  - Pastikan semua test lulus, tanyakan kepada pengguna jika ada pertanyaan.

- [x] 10. Implementasi Territory Service (Klaim dan Slicing)
  - [x] 10.1 Buat service frontend untuk klaim wilayah
    - Buat `TerritoryService` di frontend yang memanggil RPC `claim_territory` via Supabase client
    - Implementasikan retry logic: maksimum 3 kali dengan exponential backoff jika request timeout > 10 detik
    - Simpan klaim secara lokal di IndexedDB jika koneksi terputus; sinkronisasi saat koneksi pulih
    - _Persyaratan: 4.6, 5.6_

  - [x] 10.2 Implementasikan alur konflik wilayah (slicing) di frontend
    - Setelah klaim berhasil, proses respons server untuk memperbarui state wilayah lokal
    - Tampilkan animasi atau feedback visual saat klaim berhasil dan saat wilayah lawan terpotong
    - _Persyaratan: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 10.3 Tulis property test untuk konservasi area slicing
    - **Properti 3: Slicing Mempertahankan Konservasi Area**
    - Generator: dua poligon acak yang berpotongan
    - Verifikasi: `area(remainder) ≈ area(B) - area(intersection(A, B))` dalam toleransi ±0,1%
    - **Memvalidasi: Persyaratan 5.2, 5.3, 5.6**

  - [ ]* 10.4 Tulis property test untuk round-trip penyimpanan klaim
    - **Properti 8: Round-Trip Penyimpanan Klaim**
    - Generator: poligon klaim valid acak
    - Verifikasi: geometri yang diambil kembali ekuivalen dengan yang disimpan
    - **Memvalidasi: Persyaratan 4.6**

- [x] 11. Implementasi Visualisasi Peta
  - [x] 11.1 Buat komponen peta Leaflet dengan tile CartoDB Positron
    - Buat komponen `MapView` menggunakan Leaflet.js dengan tile CartoDB Positron
    - Implementasikan layer untuk menampilkan wilayah sebagai poligon berwarna sesuai `user_color` pemilik
    - Tampilkan marker posisi pengguna saat ini selama sesi lari aktif
    - Tampilkan jalur lari real-time menggunakan Warna Pengguna
    - _Persyaratan: 6.1, 6.2, 6.6, 3.3_

  - [x] 11.2 Implementasikan query viewport dan pembaruan inkremental
    - Panggil `territories_in_viewport(bbox)` saat peta dibuka atau digeser/di-zoom
    - Perbarui data wilayah dalam waktu maksimum 2 detik setelah perubahan viewport
    - Implementasikan pembaruan layer Leaflet secara inkremental (hanya tambah/hapus/ubah poligon yang berubah)
    - _Persyaratan: 6.3, 6.4, 11.3_

  - [ ]* 11.3 Tulis property test untuk filter viewport
    - **Properti 9: Filter Viewport Tidak Melewatkan Wilayah**
    - Generator: viewport acak + dataset wilayah acak (termasuk yang di dalam dan di luar viewport)
    - Verifikasi: semua wilayah yang berpotongan dengan viewport dikembalikan; tidak ada yang di luar viewport
    - **Memvalidasi: Persyaratan 6.2, 6.3_**

  - [x] 11.4 Implementasikan Supabase Realtime untuk pembaruan peta live
    - Subscribe ke channel Supabase Realtime untuk event INSERT/UPDATE/DELETE pada tabel `territories`
    - Perbarui layer peta secara inkremental saat menerima event realtime
    - Implementasikan reconnect otomatis dengan backoff; fallback ke polling setiap 5 detik jika Realtime terputus
    - _Persyaratan: 6.5_

- [x] 12. Implementasi Privacy Zone (UI dan Manajemen)
  - [x] 12.1 Buat UI manajemen Privacy Zone
    - Buat komponen `PrivacyZoneManager` untuk menambah, melihat, dan menghapus Privacy Zone
    - Implementasikan pemilihan titik pusat di peta dan input radius (50–500 meter)
    - Simpan Privacy Zone ke tabel `privacy_zones` via Supabase (RLS memastikan hanya pemilik yang bisa akses)
    - _Persyaratan: 8.1, 8.2_

  - [x] 12.2 Sembunyikan jalur lari di area Privacy Zone dari pengguna lain
    - Saat merender jalur lari di peta, potong segmen yang melewati Privacy Zone pengguna sebelum ditampilkan ke pengguna lain
    - _Persyaratan: 8.4_

- [x] 13. Implementasi Leaderboard Daerah
  - [x] 13.1 Buat halaman dan komponen Leaderboard
    - Buat komponen `LeaderboardPage` dengan tab untuk kategori Kelurahan, Kecamatan, dan Kota
    - Tampilkan daftar peringkat: username, avatar, warna pengguna, total luas wilayah (km²)
    - Sorot entri pengguna yang sedang login
    - _Persyaratan: 7.2, 7.3, 7.4, 7.6_

  - [x] 13.2 Implementasikan `LeaderboardService` frontend
    - Buat `LeaderboardService` yang memanggil `leaderboard_cache` via Supabase
    - Implementasikan polling setiap 60 detik untuk memperbarui data leaderboard
    - _Persyaratan: 7.1, 7.5_

  - [ ]* 13.3 Tulis property test untuk leaderboard
    - **Properti 10: Leaderboard Diurutkan dengan Benar dan Lengkap**
    - Generator: dataset pengguna acak dengan luas wilayah acak
    - Verifikasi: urutan descending berdasarkan luas; setiap entri mengandung semua field yang diperlukan (username, avatar, warna, luas)
    - **Memvalidasi: Persyaratan 7.1, 7.4**

- [x] 14. Checkpoint — Pastikan semua test lulus
  - Pastikan semua test lulus, tanyakan kepada pengguna jika ada pertanyaan.

- [x] 15. Implementasi Notifikasi Invasion
  - [x] 15.1 Buat Supabase Edge Function untuk notifikasi push
    - Buat Edge Function yang mendengarkan `pg_notify('invasion', ...)` dari trigger PostgreSQL
    - Kirim notifikasi push via FCM (Android) dan APNs (iOS) dengan payload: nama penyerang, luas wilayah hilang, lokasi invasion
    - Simpan notifikasi ke tabel `invasion_notifications`
    - _Persyaratan: 9.1, 9.2_

  - [x] 15.2 Buat UI riwayat notifikasi dan in-app alert
    - Buat komponen `NotificationHistory` yang dapat diakses dari menu profil
    - Implementasikan in-app overlay di atas peta saat invasion terjadi selama sesi lari aktif
    - Implementasikan toggle aktifkan/nonaktifkan notifikasi invasion dari pengaturan aplikasi
    - _Persyaratan: 9.3, 9.4, 9.5_

- [x] 16. Implementasi Decay Wilayah (Opsional)
  - [x] 16.1 Buat job Decay di Supabase
    - Buat fungsi PostgreSQL yang mengurangi luas wilayah sebesar 10% per hari setelah 7 hari tidak aktif
    - Hapus wilayah jika luas < 0,001 km² setelah decay
    - Schedule job via `pg_cron`
    - _Persyaratan: 10.1, 10.2, 10.3_

  - [x] 16.2 Implementasikan notifikasi pre-decay
    - Kirim notifikasi 24 jam sebelum decay pertama kali diterapkan pada wilayah pengguna
    - _Persyaratan: 10.4_

  - [ ]* 16.3 Tulis property test untuk decay wilayah
    - **Properti 11: Decay Mengurangi Luas Secara Proporsional**
    - Generator: wilayah dengan berbagai durasi tidak aktif (7–365 hari) dan luas acak
    - Verifikasi: pengurangan luas = 10% per hari setelah 7 hari; wilayah dihapus jika luas < 0,001 km²
    - **Memvalidasi: Persyaratan 10.1, 10.2, 10.3**

- [x] 17. Optimasi Performa
  - [x] 17.1 Implementasikan caching data wilayah
    - Implementasikan mekanisme caching di sisi klien untuk data wilayah yang sering diakses (target respons query berulang ≤ 200ms)
    - Implementasikan cache invalidation saat menerima event Realtime
    - _Persyaratan: 11.5_

  - [x] 17.2 Optimasi rendering Leaflet
    - Audit dan optimalkan layer Leaflet agar frame rate tidak turun di bawah 30 FPS pada perangkat spesifikasi menengah
    - Gunakan teknik virtualisasi atau clustering untuk wilayah di luar viewport
    - _Persyaratan: 11.3_

- [x] 18. Integrasi Akhir dan Wiring
  - [x] 18.1 Hubungkan semua komponen dalam alur utama
    - Pastikan alur lengkap berjalan: GPS_Tracker → Geometry_Engine → Privacy Zone filter → Territory_Service → Realtime update → MapView
    - Pastikan alur notifikasi berjalan: claim_territory → pg_notify → Edge Function → FCM/APNs → in-app alert
    - Pastikan alur leaderboard berjalan: territories → leaderboard_cache → LeaderboardService → LeaderboardPage
    - _Persyaratan: 3.1–3.7, 4.1–4.6, 5.1–5.6, 6.1–6.6, 7.1–7.6, 8.1–8.5, 9.1–9.5_

  - [ ]* 18.2 Tulis integration test untuk alur klaim wilayah end-to-end
    - Test alur lengkap klaim wilayah menggunakan Supabase local dev
    - Test query viewport dengan dataset wilayah sintetis (1000+ poligon)
    - Test Supabase Realtime dengan simulasi update bersamaan
    - _Persyaratan: 4.6, 5.6, 6.5_

- [x] 19. Checkpoint Final — Pastikan semua test lulus
  - Pastikan semua test lulus, tanyakan kepada pengguna jika ada pertanyaan.

---

## Catatan

- Task yang ditandai `*` bersifat opsional dan dapat dilewati untuk MVP yang lebih cepat
- Setiap task mereferensikan persyaratan spesifik untuk keterlacakan
- Property test menggunakan `fast-check` dengan minimum 100 iterasi per properti
- Setiap property test diberi tag komentar: `// Feature: territory-jogger, Property {N}: {deskripsi singkat}`
- Property test melengkapi unit test, bukan menggantikannya
- Checkpoint memastikan validasi inkremental di setiap tahap utama
