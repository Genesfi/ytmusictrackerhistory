# YT Music Track & History Enhancer 🎵

Ekstensi browser canggih (Chrome / Edge / Brave / Opera) untuk **YouTube Music** (`music.youtube.com`) yang melacak riwayat lagu sebenarnya secara real-time, menghitung jumlah pemutaran (*play count counter*), mengelompokkan kebiasaan mendengar ke dalam **Smart Mood & Genre**, membuat **Playlist Pribadi otomatis di akun Anda**, menyisipkan shelf Beranda 1:1 native lengkap dengan scrollbar slider, dan menambahkan tombol shortcut "Histori" di sidebar navigasi.

---

## ✨ Fitur Utama

### 1. 🧠 Smart Mood & Genre Tracker
* **Klasifikasi Otomatis**: Menganalisis teks lagu, artis, judul, dan karakter bahasa (Jepang, Korea, Indonesia, Internasional) secara cerdas ke dalam 7 kelompok mood:
  * 🌧️ **Galau & Melow** (Ballad, akustik, patah hati, rindu, sedih, slowed)
  * ⚡ **Energik & Semangat** (Rock, metal, EDM, remix, phonk, workout, beat cepat)
  * ☕ **Santai & Chill** (Lo-Fi, R&B, jazz, sore/senja, cozy, relax)
  * 🌸 **Anime & J-Pop / K-Pop** (Harucha, KAF, Yoasobi, Eve, Ado, OST Anime)
  * 🎸 **Indie & Pop Indo** (eñau, Ari Lesmana, Perunggu, Hindia, Sal Priadi, Bernadya)
  * 🎯 **Fokus & Belajar** (Instrumental, piano, ambient, coding, study)
  * ✨ **Pop & Hits** (Lagu pop umum dan hits global)
* **Banner Analisis Mood Dominan**: Menampilkan persentase mood yang paling sering Anda dengarkan lengkap dengan visual bar gradien.

### 2. 🎶 Authentic Playlist Maker & Full Queue Player
* **▶️ Putar Mix (Full Up Next Queue)**:
  * Memuat seluruh lagu di kelompok mood tersebut ke dalam **Antrean (*Up Next / Berikutnya*)** YouTube Music secara otomatis.
  * Anda bisa langsung menikmati transisi lagu berikutnya, acak (*shuffle*), atau putar berulang (*repeat*).
* **➕ Buat Playlist Pribadi di Akun YouTube Music**:
  * Menggunakan *InnerTube API* dengan autentikasi `SAPISIDHASH` untuk **benar-benar membuat Playlist Baru (Private)** di akun YouTube Music Anda.
  * Menamai playlist sesuai mood (misal: `Mood: 🌸 Anime & J-Pop - YT Tracker`) dan otomatis membuka halaman playlist baru Anda.

### 3. 📊 Real-Time Song Tracking & Accurate Play Counter
* **Pencatatan Nyata**: Melacak setiap lagu yang benar-benar Anda putar secara berurutan waktu (bukan algoritma rekomendasi YT Music).
* **Play Counter Akurat**: Menghitung berapa kali tiap lagu telah diputar (misal: `🔥 15x diputar`).
* **Ambang Batas Scrobble**: Hanya menghitung +1 putaran jika lagu didengarkan minimal durasi tertentu (default: 20 detik, dapat diatur) untuk mencegah salah hitung saat skip cepat.

### 4. 🏠 1:1 Native Shelf di Beranda YouTube Music
* **Tampilan Asli 1:1**: Menyisipkan baris rak *"Terakhir Diputar"* dan *"Paling Sering Diputar"* langsung di halaman Beranda YouTube Music.
* **Bottom Scrollbar Slider**: Dilengkapi *drag-and-drop slider bar* horizontal di bawah barisan kartu lagu dengan akselerasi perangkat keras GPU tanpa lag.
* **One-Click Play**: Klik kartu apa saja untuk langsung memutar lagu.

### 5. 📑 Shortcut Tombol "Histori" di Sidebar Navigasi
* Menambahkan menu **"Histori"** langsung di sidebar navigasi samping (sejajar dengan Beranda, Eksplorasi, Koleksi) untuk membuka riwayat YouTube Music dengan satu klik.

### 6. 📱 Dashboard Popup yang Elegan & Cepat
* **Tab Navigasi**: `Terakhir`, `Top`, `Mood`, dan `Opsi`.
* **Fitur Pencarian Cepat**: Saring riwayat lagu berdasarkan judul, artis, atau album.
* **Pengaturan Fleksibel**: Toggle aktifkan/nonaktifkan shelf beranda, shortcut sidebar, dan ambang batas detik pemutaran.

---

## 🚀 Cara Memasang (Install) di Browser

1. Buka browser Chromium favorit Anda (Google Chrome, Microsoft Edge, Brave, Opera, Vivaldi, dll).
2. Buka halaman ekstensi browser:
   * **Chrome / Brave:** `chrome://extensions`
   * **Edge:** `edge://extensions`
3. Aktifkan **"Developer mode"** (Mode Pengembang) di pojok kanan atas.
4. Klik tombol **"Load unpacked"** (Muat yang belum dibongkar).
5. Pilih folder ekstensi ini:
   ```
   F:\Extension\yt-music-tracker
   ```
6. Buka atau refresh tab [YouTube Music](https://music.youtube.com).
7. Selesai! Nikmati tracking riwayat nyata, mood playlist maker, dan rak beranda interaktif Anda.

---

## 👨‍💻 Kontributor & Lisensi

Dibuat & dikembangkan oleh **Gusti N.** untuk pengalaman mendengarkan YouTube Music yang lebih personal dan kaya fitur.
