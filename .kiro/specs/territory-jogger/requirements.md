# Dokumen Persyaratan - Territory Jogger

## Pendahuluan

Territory Jogger adalah aplikasi pelacakan aktivitas jogging berbasis mobile yang menggabungkan mekanik *area control* dari game .io (seperti Paper.io) dengan peta dunia nyata. Pengguna berlari di dunia nyata untuk mengklaim wilayah di peta, memotong wilayah milik pengguna lain, dan bersaing di leaderboard berdasarkan luas area yang dikuasai.

Aplikasi ini dibangun menggunakan Vite + React + TypeScript sebagai frontend, Capacitor.js sebagai wrapper mobile, Leaflet.js sebagai map engine, Turf.js untuk operasi geometri, dan Supabase (PostgreSQL + PostGIS) sebagai backend.

---

## Glosarium

- **Aplikasi**: Aplikasi mobile Territory Jogger.
- **Pengguna**: Individu yang terdaftar dan menggunakan Aplikasi.
- **Sesi Lari**: Periode aktif dari saat Pengguna menekan "Mulai Lari" hingga "Selesai Lari".
- **Jalur**: Urutan koordinat GPS yang direkam selama Sesi Lari.
- **Poligon Klaim**: Area tertutup yang terbentuk ketika Jalur membentuk loop tertutup.
- **Wilayah**: Poligon Klaim yang telah tersimpan di database dan dikuasai oleh seorang Pengguna.
- **Warna Pengguna**: Warna HEX unik yang diasosiasikan dengan seorang Pengguna dan digunakan untuk mewarnai Wilayah miliknya.
- **Peta**: Tampilan peta interaktif berbasis Leaflet.js dengan tile CartoDB Positron.
- **Viewport**: Area peta yang sedang terlihat di layar perangkat Pengguna.
- **GPS_Tracker**: Komponen yang bertanggung jawab merekam koordinat GPS secara real-time menggunakan Capacitor Geolocation API.
- **Geometry_Engine**: Komponen berbasis Turf.js yang menjalankan operasi geometri (deteksi loop, pembuatan poligon, pemotongan wilayah).
- **Territory_Service**: Komponen backend (Supabase) yang menyimpan, memperbarui, dan mengambil data Wilayah.
- **Leaderboard_Service**: Komponen yang menghitung dan menampilkan peringkat Pengguna berdasarkan luas Wilayah.
- **Notification_Service**: Komponen yang mengirimkan notifikasi kepada Pengguna.
- **Privacy_Zone**: Area radius yang ditentukan Pengguna di sekitar lokasi sensitif (misalnya rumah) yang dikecualikan dari peta publik dan klaim.
- **Speed_Guard**: Mekanisme validasi kecepatan untuk mencegah klaim menggunakan kendaraan.
- **Invasion**: Kondisi ketika Wilayah milik seorang Pengguna dipotong oleh Pengguna lain.
- **Decay**: Mekanisme pengurangan Wilayah secara otomatis setelah periode tidak aktif.
- **Leaderboard Daerah**: Papan peringkat yang dikelompokkan berdasarkan batas administratif (Kelurahan, Kecamatan, Kota).
- **PostGIS**: Ekstensi PostgreSQL untuk penyimpanan dan query data geospasial.

---

## Persyaratan

### Persyaratan 1: Autentikasi Pengguna

**User Story:** Sebagai pengguna baru, saya ingin mendaftar dan masuk ke aplikasi, agar identitas dan data wilayah saya tersimpan dengan aman.

#### Kriteria Penerimaan

1. THE Aplikasi SHALL menyediakan formulir pendaftaran dengan kolom nama pengguna, alamat email, dan kata sandi.
2. WHEN Pengguna mengirimkan formulir pendaftaran dengan data valid, THE Territory_Service SHALL membuat akun baru dan mengarahkan Pengguna ke halaman pengaturan profil.
3. IF Pengguna mengirimkan formulir pendaftaran dengan email yang sudah terdaftar, THEN THE Aplikasi SHALL menampilkan pesan kesalahan "Email sudah digunakan".
4. WHEN Pengguna berhasil masuk, THE Aplikasi SHALL menyimpan sesi autentikasi secara lokal sehingga Pengguna tidak perlu masuk ulang saat membuka aplikasi kembali.
5. IF token sesi Pengguna kedaluwarsa, THEN THE Aplikasi SHALL mengarahkan Pengguna ke halaman masuk.

---

### Persyaratan 2: Profil & Identitas Visual Pengguna

**User Story:** Sebagai pengguna, saya ingin memiliki warna unik dan avatar, agar wilayah saya dapat dikenali di peta dan leaderboard.

#### Kriteria Penerimaan

1. WHEN Pengguna pertama kali mendaftar, THE Territory_Service SHALL menetapkan satu Warna Pengguna unik dalam format HEX yang belum digunakan oleh Pengguna lain.
2. THE Aplikasi SHALL memungkinkan Pengguna mengubah Warna Pengguna mereka ke nilai HEX pilihan sendiri.
3. IF Warna Pengguna yang dipilih sudah digunakan oleh Pengguna lain, THEN THE Aplikasi SHALL menampilkan pesan kesalahan dan meminta Pengguna memilih warna lain.
4. THE Aplikasi SHALL memungkinkan Pengguna mengunggah atau memilih avatar dari koleksi yang tersedia.
5. THE Aplikasi SHALL menampilkan Warna Pengguna dan avatar pada profil, Wilayah di Peta, dan entri Leaderboard Daerah.

---

### Persyaratan 3: Pelacakan GPS Real-Time

**User Story:** Sebagai pengguna yang sedang berlari, saya ingin posisi GPS saya direkam secara akurat dan terus-menerus, agar jalur lari saya dapat digunakan untuk mengklaim wilayah.

#### Kriteria Penerimaan

1. WHEN Pengguna menekan tombol "Mulai Lari", THE GPS_Tracker SHALL mulai merekam koordinat GPS Pengguna dengan interval maksimum 3 detik.
2. WHILE Sesi Lari aktif, THE GPS_Tracker SHALL terus merekam koordinat GPS meskipun aplikasi berjalan di latar belakang (background mode) menggunakan Capacitor Geolocation API.
3. WHILE Sesi Lari aktif, THE Aplikasi SHALL menampilkan Jalur lari Pengguna secara real-time di atas Peta menggunakan Warna Pengguna.
4. WHEN Pengguna menekan tombol "Selesai Lari", THE GPS_Tracker SHALL menghentikan perekaman koordinat dan menyimpan Jalur final.
5. IF sinyal GPS tidak tersedia selama lebih dari 30 detik saat Sesi Lari aktif, THEN THE Aplikasi SHALL menampilkan peringatan "Sinyal GPS lemah" dan menjeda perekaman Jalur.
6. THE Speed_Guard SHALL memvalidasi bahwa kecepatan rata-rata Pengguna tidak melebihi 20 km/jam selama Sesi Lari berlangsung.
7. IF kecepatan Pengguna melebihi 20 km/jam selama lebih dari 10 detik berturut-turut, THEN THE Speed_Guard SHALL menghentikan perekaman Jalur dan menampilkan peringatan "Kecepatan terlalu tinggi - klaim dibatalkan".

---

### Persyaratan 4: Deteksi Loop dan Pembuatan Poligon Klaim

**User Story:** Sebagai pengguna yang berlari, saya ingin aplikasi secara otomatis mendeteksi ketika saya membentuk rute tertutup, agar area yang saya kelilingi langsung diklaim sebagai wilayah saya.

#### Kriteria Penerimaan

1. WHILE Sesi Lari aktif, THE Geometry_Engine SHALL secara terus-menerus memeriksa apakah Jalur saat ini membentuk loop tertutup dengan mendeteksi perpotongan diri sendiri (self-intersection).
2. WHEN Geometry_Engine mendeteksi loop tertutup pada Jalur, THE Geometry_Engine SHALL membuat Poligon Klaim dari area yang dikelilingi oleh loop tersebut.
3. WHEN Poligon Klaim terbentuk, THE Geometry_Engine SHALL menyederhanakan geometri Poligon Klaim menggunakan algoritma simplifikasi Turf.js dengan toleransi maksimum 0,00001 derajat sebelum dikirim ke server.
4. THE Geometry_Engine SHALL menghitung luas Poligon Klaim dalam satuan km² menggunakan Turf.js.
5. IF luas Poligon Klaim kurang dari 0,001 km², THEN THE Geometry_Engine SHALL mengabaikan Poligon Klaim tersebut dan melanjutkan perekaman Jalur tanpa membuat klaim.
6. WHEN Poligon Klaim valid terbentuk, THE Territory_Service SHALL menyimpan Poligon Klaim sebagai Wilayah baru milik Pengguna dalam format Geometry(Polygon, 4326) di PostGIS.

---

### Persyaratan 5: Konflik Wilayah (Slicing)

**User Story:** Sebagai pengguna, saya ingin wilayah lawan terpotong ketika saya berlari melewatinya dan membentuk klaim baru, agar ada elemen kompetisi nyata dalam permainan.

#### Kriteria Penerimaan

1. WHEN Poligon Klaim baru terbentuk, THE Territory_Service SHALL mengambil semua Wilayah milik Pengguna lain yang berpotongan dengan Poligon Klaim baru dari database menggunakan query PostGIS.
2. WHEN Wilayah milik Pengguna lain berpotongan dengan Poligon Klaim baru, THE Geometry_Engine SHALL menghitung geometri sisa Wilayah tersebut menggunakan operasi `difference` Turf.js.
3. WHEN geometri sisa Wilayah dihitung, THE Territory_Service SHALL memperbarui Wilayah yang terpotong di database dengan geometri sisa dan luas yang telah diperbarui.
4. IF operasi `difference` menghasilkan geometri kosong atau null, THEN THE Territory_Service SHALL menghapus Wilayah tersebut dari database.
5. WHEN Wilayah milik seorang Pengguna berkurang akibat Invasion, THE Notification_Service SHALL mengirimkan notifikasi push kepada Pengguna pemilik Wilayah dengan pesan "Wilayahmu sedang diserang!".
6. THE Territory_Service SHALL menyelesaikan seluruh operasi pemotongan dan pembaruan Wilayah dalam satu transaksi database untuk menjaga konsistensi data.

---

### Persyaratan 6: Visualisasi Peta

**User Story:** Sebagai pengguna, saya ingin melihat semua wilayah yang dikuasai di peta secara real-time, agar saya dapat merencanakan strategi lari saya.

#### Kriteria Penerimaan

1. THE Aplikasi SHALL menampilkan Peta interaktif menggunakan Leaflet.js dengan tile CartoDB Positron sebagai latar belakang.
2. WHILE Aplikasi aktif, THE Aplikasi SHALL menampilkan semua Wilayah yang berada dalam Viewport Pengguna dengan warna yang sesuai dengan Warna Pengguna masing-masing pemilik.
3. THE Territory_Service SHALL hanya mengirimkan data Wilayah yang bounding box-nya berpotongan dengan Viewport saat ini untuk mengoptimalkan performa.
4. WHEN Pengguna menggeser atau memperbesar/memperkecil Peta, THE Aplikasi SHALL memperbarui data Wilayah yang ditampilkan sesuai Viewport baru dalam waktu maksimum 2 detik.
5. WHILE Sesi Lari aktif, THE Aplikasi SHALL memperbarui tampilan Wilayah di Peta secara real-time menggunakan Supabase Realtime ketika ada perubahan Wilayah dari Pengguna lain.
6. THE Aplikasi SHALL menampilkan posisi Pengguna saat ini sebagai penanda (marker) di atas Peta selama Sesi Lari aktif.

---

### Persyaratan 7: Leaderboard Daerah

**User Story:** Sebagai pengguna, saya ingin melihat peringkat saya dibandingkan pengguna lain di area sekitar saya, agar saya termotivasi untuk berlari lebih banyak dan mengklaim lebih banyak wilayah.

#### Kriteria Penerimaan

1. THE Leaderboard_Service SHALL menghitung peringkat Pengguna berdasarkan total luas Wilayah (km²) yang dikuasai dalam batas administratif yang dipilih.
2. THE Aplikasi SHALL menyediakan tiga kategori Leaderboard Daerah: Kelurahan, Kecamatan, dan Kota.
3. WHEN Pengguna membuka halaman Leaderboard, THE Leaderboard_Service SHALL menampilkan daftar peringkat yang diurutkan dari luas Wilayah terbesar ke terkecil untuk kategori yang dipilih.
4. THE Aplikasi SHALL menampilkan nama pengguna, avatar, Warna Pengguna, dan total luas Wilayah (dalam km²) untuk setiap entri di Leaderboard Daerah.
5. THE Leaderboard_Service SHALL memperbarui data peringkat maksimum setiap 60 detik.
6. THE Aplikasi SHALL menyorot entri Pengguna yang sedang masuk di Leaderboard Daerah agar mudah ditemukan.

---

### Persyaratan 8: Privacy Zone

**User Story:** Sebagai pengguna, saya ingin melindungi lokasi sensitif saya (seperti rumah) dari peta publik, agar privasi dan keamanan saya terjaga.

#### Kriteria Penerimaan

1. THE Aplikasi SHALL memungkinkan Pengguna menentukan satu atau lebih Privacy Zone dengan memilih titik pusat di Peta dan menentukan radius dalam meter (minimum 50 meter, maksimum 500 meter).
2. WHEN Pengguna menyimpan Privacy Zone, THE Territory_Service SHALL menyimpan data Privacy Zone (titik pusat dan radius) yang hanya dapat diakses oleh Pengguna pemiliknya.
3. WHILE Sesi Lari aktif, THE Geometry_Engine SHALL secara otomatis memotong bagian Poligon Klaim yang berada di dalam area Privacy Zone sebelum Poligon Klaim dikirim ke server.
4. THE Aplikasi SHALL tidak menampilkan Jalur lari Pengguna yang melewati area Privacy Zone kepada Pengguna lain.
5. THE Territory_Service SHALL memastikan bahwa tidak ada Wilayah milik Pengguna lain yang dapat mencakup area Privacy Zone seorang Pengguna.

---

### Persyaratan 9: Notifikasi Invasion

**User Story:** Sebagai pengguna, saya ingin mendapatkan notifikasi ketika wilayah saya diserang, agar saya dapat merespons dan mempertahankan wilayah saya.

#### Kriteria Penerimaan

1. WHEN Wilayah milik Pengguna berkurang akibat Invasion oleh Pengguna lain, THE Notification_Service SHALL mengirimkan notifikasi push ke perangkat Pengguna dalam waktu maksimum 10 detik setelah Invasion terjadi.
2. THE Notification_Service SHALL menyertakan nama penyerang, perkiraan luas wilayah yang hilang (dalam km²), dan lokasi Invasion dalam notifikasi.
3. THE Aplikasi SHALL menampilkan riwayat notifikasi Invasion yang dapat diakses Pengguna dari menu profil.
4. THE Aplikasi SHALL memungkinkan Pengguna mengaktifkan atau menonaktifkan notifikasi Invasion dari pengaturan aplikasi.
5. WHILE Pengguna sedang dalam Sesi Lari aktif, THE Aplikasi SHALL menampilkan peringatan Invasion secara in-app (overlay di atas Peta) selain notifikasi push.

---

### Persyaratan 10: Decay Wilayah (Opsional)

**User Story:** Sebagai pengguna aktif, saya ingin wilayah pengguna yang tidak aktif lama-kelamaan berkurang, agar peta tetap dinamis dan pengguna aktif mendapat keuntungan.

#### Kriteria Penerimaan

1. WHERE fitur Decay diaktifkan, THE Territory_Service SHALL secara otomatis mengurangi luas Wilayah milik Pengguna yang tidak melakukan Sesi Lari selama lebih dari 7 hari.
2. WHERE fitur Decay diaktifkan, THE Territory_Service SHALL mengurangi luas setiap Wilayah yang terdampak sebesar 10% per hari setelah periode tidak aktif 7 hari.
3. WHERE fitur Decay diaktifkan, IF luas Wilayah setelah Decay kurang dari 0,001 km², THEN THE Territory_Service SHALL menghapus Wilayah tersebut dari database.
4. WHERE fitur Decay diaktifkan, THE Notification_Service SHALL mengirimkan notifikasi kepada Pengguna 24 jam sebelum Decay pertama kali diterapkan pada Wilayah mereka.

---

### Persyaratan 11: Performa dan Optimasi

**User Story:** Sebagai pengguna, saya ingin aplikasi berjalan lancar tanpa lag meskipun ada banyak wilayah di peta, agar pengalaman berlari saya tidak terganggu.

#### Kriteria Penerimaan

1. THE Geometry_Engine SHALL menyederhanakan Jalur lari menggunakan `turf.simplify` sebelum mengirimkan data ke Territory_Service untuk mengurangi ukuran payload.
2. THE Territory_Service SHALL menggunakan indeks spasial (spatial index) PostGIS pada kolom geometri Wilayah untuk memastikan query berdasarkan Viewport selesai dalam waktu maksimum 500ms.
3. THE Aplikasi SHALL merender Wilayah di Peta menggunakan layer Leaflet yang dioptimalkan sehingga frame rate tampilan tidak turun di bawah 30 FPS pada perangkat dengan spesifikasi menengah.
4. THE GPS_Tracker SHALL menggunakan mekanisme debounce sehingga pembaruan posisi ke Peta tidak terjadi lebih dari satu kali per detik untuk mengurangi beban rendering.
5. THE Territory_Service SHALL mengimplementasikan mekanisme caching untuk data Wilayah yang sering diakses sehingga waktu respons query berulang tidak melebihi 200ms.
