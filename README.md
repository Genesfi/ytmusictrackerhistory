# YT Music Track & History Enhancer 🎵

Ekstensi browser canggih (Chrome / Edge / Brave / Opera / Vivaldi) untuk **YouTube Music** (`music.youtube.com`) yang melacak riwayat lagu sebenarnya secara real-time, menghitung jumlah pemutaran (*play count counter*), mengelompokkan kebiasaan mendengar dengan **Dual-Dimension Smart Mood & Genre Classifier (Genre × Emosi/Sentimen)**, membuat **Playlist Pribadi otomatis di akun YouTube Music Anda**, menyisipkan shelf Beranda 1:1 native lengkap dengan scrollbar slider GPU-accelerated, dan menambahkan tombol shortcut "Histori" di sidebar navigasi.

---

## ✨ Fitur Utama

### 1. 🧠 Dual-Dimension Smart Mood & Genre Classifier
Menganalisis lagu berdasarkan 2 dimensi sekaligus: **Genre/Bahasa** dan **Sentimen/Energi (Valence & Energy)**:
* 🌧️ **Indie Senja & Galau**: Lagu indie melow, ballad, patah hati (*Perunggu - 33x, Ini Abadi, eñau, Hindia, Bernadya, Nadin Amizah, Sal Priadi*).
* ☀️ **Indie Semangat & Ceria**: Lagu indie upbeat, semangat, bertenaga (*Barasuara, Perunggu - Tarung Bebas, The Changcuters, Reality Club, Efek Rumah Kaca*).
* 🌸 **J-Pop / Anime Melow & Galau**: Lagu Jepang akustik/ballad/cover syahdu (*Harucha - 1991, KotoHa, KAF, Radwimps - Suzume, Eve - slow*).
* ⚡ **J-Pop & Anime Energik / Rock**: Lagu anime cepat, hype, rock (*Yoasobi, Ado, LiSA, Kenshi Yonezu - Kick Back, OP Anime*).
* 🌧️ **Pop Galau & Patah Hati**: Lagu pop sedih bertema rindu, luka, dan perpisahan.
* ☕ **Santai, Chill & Lo-Fi**: Lo-Fi, R&B, Jazz, santai sore, musik santai kedai kopi.
* ⚡ **Rock, EDM & High Energy**: Rock keras, Metal, Phonk, Hardcore, Workout & Gym.
* 🎯 **Fokus & Instrumental**: Piano, Orchestra, Ambient, Coding & Belajar.
* ✨ **Pop & Hits Ceria**: Pop umum ceria, dansa, dan cinta bahagia.
* 🔥 **Top Hits**: Lagu-lagu yang paling sering Anda putar (putaran $\ge$ 2x).

> **Smart Badges**: Setiap lagu di daftar riwayat otomatis memiliki label badge sub-genre berwarna (misal: `[🌧️ Indie Galau]`, `[⚡ J-Pop Hype]`, dll.).

---

### 2. 🎶 Authentic Playlist Maker & Full Queue Player
* **🔥 Top Hits & Mood Playlist Maker**:
  * Di tab **"Top"** dan **"Mood"**, tersedia tombol aksi instan untuk membuat **Playlist Baru (Status: Private)** resmi di akun YouTube Music Anda via *InnerTube API* (contoh: `Mood: 🌧️ Indie Senja & Galau - YT Tracker` atau `Top Hits: Paling Sering Diputar - YT Tracker`).
  * Otomatis mengarahkan dan membuka halaman playlist baru Anda.
* **▶️ Putar Mix (Full Up Next Queue)**:
  * Memuat seluruh lagu di kelompok mood atau Top Hits ke dalam **Antrean (*Up Next / Berikutnya*)** YouTube Music secara berurutan.
  * Anda bisa langsung menikmati lagu berikutnya secara otomatis, acak (*shuffle*), atau putar berulang (*repeat*).

---

### 3. 📊 Real-Time Song Tracking & Accurate Play Counter
* **Pencatatan Nyata**: Melacak setiap lagu yang benar-benar Anda dengarkan secara berurutan waktu (bukan algoritma rekomendasi YouTube Music).
* **Play Counter Akurat**: Menghitung berapa kali tiap lagu telah diputar (misal: `🔥 15x diputar`).
* **Ambang Batas Scrobble**: Hanya menghitung +1 putaran jika lagu didengarkan minimal durasi tertentu (default: 20 detik, dapat diatur di popup) untuk mencegah salah hitung saat skip cepat.

---

### 4. 🏠 1:1 Native Shelf di Beranda YouTube Music
* **Tampilan Asli 1:1**: Menyisipkan baris rak *"Terakhir Diputar"* dan *"Paling Sering Diputar"* langsung di halaman Beranda YouTube Music.
* **Interactive Bottom Slider**: Dilengkapi *slider scrollbar* horizontal di bawah barisan kartu lagu dengan akselerasi perangkat keras GPU tanpa lag.
* **One-Click Play**: Klik kartu apa saja untuk langsung memutar lagu.

---

### 5. 🪟 In-Page Floating Sidebar Drawer
* **Tombol Melayang (*Floating Trigger*)**: Terdapat tombol tab `[ 🎵 Tracker ]` melayang di tepi kanan layar YouTube Music yang dapat diklik kapan saja.
* **Panel Glassmorphism Slide-out**: Panel samping meluncur mulus dari sisi kanan dengan efek blur kaca modern.
* **Tidak Pernah Tertutup Otomatis**: Panel dapat tetap terbuka saat Anda mencari musik atau mendengarkan lagu, lengkap dengan tab *Terakhir*, *Top Hits*, *Mood*, *Putar Mix*, dan *Buat Playlist*.
* **Tutup Cepat**: Klik tombol `[ ✕ ]` atau tekan tombol `Esc` di keyboard.

### 6. 📑 Shortcut Tombol "Histori" di Sidebar Navigasi
* Menambahkan menu **"Histori"** langsung di sidebar navigasi samping (sejajar dengan Beranda, Eksplorasi, Koleksi) untuk membuka riwayat YouTube Music dengan satu klik.

### 7. 📱 Dashboard Popup yang Elegan & Cepat
* **Tab Navigasi**: `Terakhir`, `Top`, `Mood`, dan `Opsi`.
* **Horizontal Mousewheel & Drag**: Barisan chip mood dapat digeser dengan *mousewheel* atau klik-dan-seret (*drag-to-scroll*).
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
