/**
 * YouTube Music Floating In-Page Tracker Sidebar Drawer
 * Renders an interactive, glassmorphic slide-out dashboard directly inside music.youtube.com
 */

(function () {
    if (window.__ytm_floating_drawer_installed) return;
    window.__ytm_floating_drawer_installed = true;

    const STORAGE_KEY_HISTORY = 'ytm_tracker_history';
    const STORAGE_KEY_STATS = 'ytm_tracker_stats';
    const STORAGE_KEY_SETTINGS = 'ytm_tracker_settings';

    let historyData = [];
    let statsData = {};
    let currentTab = 'recent'; // 'recent', 'top', 'mood'
    let selectedMood = 'jpop_mellow';
    let searchQuery = '';
    let currentPage = 1;
    const ITEMS_PER_PAGE = 25;
    let isOpen = false;

    // Mood & Sentiment Definitions (1:1 with Popup)
    const MOOD_DEFINITIONS = {
        top: { id: 'top', name: '🔥 Paling Sering Diputar', shortName: '🔥 Top Hits', color: '#ff4e45', keywords: [] },
        indie_galau: { id: 'indie_galau', name: '🌧️ Indie Senja & Galau', shortName: '🌧️ Indie Galau', color: '#a29bfe', keywords: ['enau', 'eñau', 'perunggu', 'hindia', 'bernadya', 'nadin', 'feby putri', 'sal priadi', 'fourtwnty', 'danilla', 'kunto aji', 'fiersa besari', 'pamungkas', 'arash buana', 'raissa', 'idgitaf', 'morad', 'soegi', 'iksanskuter', 'jason ranti', '33x', 'abadi', 'sesi', 'potret', 'terbuang'] },
        indie_senang: { id: 'indie_senang', name: '☀️ Indie Semangat & Ceria', shortName: '☀️ Indie Ceria', color: '#fdcb6e', keywords: ['barasuara', 'feast', '.feast', 'the changcuters', 'reality club', 'efek rumah kaca', 'sheila on 7', 'maliq', 'ran', 'diskoria', 'tarung', 'bebas', 'nyala', 'api', 'bakar'] },
        jpop_mellow: { id: 'jpop_mellow', name: '🌸 J-Pop / Anime Melow & Galau', shortName: '🌸 J-Pop Melow', color: '#fd79a8', keywords: ['harucha', 'kotoha', 'kaf', 'aimer', 'zutomayo', 'yorushika', 'radwimps', 'suzume', 'nandemonaiya', 'daisy crown', 'empty old city', 'fallen petals', 'cover', 'utaite', 'acoustic', 'piano', '1991'] },
        jpop_hype: { id: 'jpop_hype', name: '⚡ J-Pop & Anime Energik / Rock', shortName: '⚡ J-Pop Hype', color: '#e84393', keywords: ['yoasobi', 'ado', 'lisa', 'eve', 'kenshi yonezu', 'kick back', 'vocaloid', 'miku', 'hololive', 'suisei', 'opening', 'op', 'rock', 'metal', 'hype', 'speed'] },
        galau: { id: 'galau', name: '🌧️ Pop Galau & Patah Hati', shortName: '🌧️ Pop Galau', color: '#6c5ce7', keywords: ['galau', 'sedih', 'sad', 'lara', 'ballad', 'acoustic', 'akustik', 'heartbreak', 'crying', 'rindu', 'slow', 'slowed', 'reverb', 'kemarin', 'kenangan', 'sendiri', 'lonely', 'nangis', 'patah', 'duka', 'pilu', 'terluka', 'hampa', 'kehilangan', 'berpisah', 'usai', 'pamit', 'takut', 'trauma', 'sakit', 'tears', 'hurt', 'pain', 'broken', 'sorrow', 'alone'] },
        chill: { id: 'chill', name: '☕ Santai, Chill & Lo-Fi', shortName: '☕ Chill & Lo-Fi', color: '#00cec9', keywords: ['chill', 'lofi', 'lo-fi', 'relax', 'santai', 'jazz', 'r&b', 'soul', 'coffee', 'kopi', 'senja', 'sore', 'sunset', 'beach', 'vibe', 'calm', 'calming', 'cozy', 'malam', 'night', 'smooth', 'groove', 'rest', 'rehat', 'pantai'] },
        energic: { id: 'energic', name: '⚡ Rock, EDM & High Energy', shortName: '⚡ Rock & EDM', color: '#ff4757', keywords: ['rock', 'metal', 'edm', 'remix', 'phonk', 'workout', 'gym', 'beat', 'power', 'hype', 'run', 'running', 'hardcore', 'party', 'dance', 'fast', 'speed', 'nightcore', 'dubstep', 'electro', 'semangat', 'bakar', 'membara', 'energi', 'dj', 'bass', 'distorsi', 'guitar'] },
        fokus: { id: 'fokus', name: '🎯 Fokus & Instrumental', shortName: '🎯 Fokus', color: '#0984e3', keywords: ['instrumental', 'piano', 'study', 'focus', 'belajar', 'ambient', 'concentration', 'coding', 'reading', 'meditation', 'sleep', 'tidur', 'rain', 'hujan', 'cello', 'violin', 'orchestra', 'bgm', 'peaceful', 'klasik', 'classical'] },
        pop: { id: 'pop', name: '✨ Pop & Hits Ceria', shortName: '✨ Pop Hits', color: '#00b894', keywords: ['pop', 'hits', 'love', 'cinta', 'lagu', 'music', 'single', 'feat', 'ft.', 'happy', 'senang', 'bahagia', 'indah', 'bersama', 'dance'] }
    };

    const SAD_SENTIMENT_WORDS = ['33x', 'terbuang', 'potret', 'abadi', 'sesi', 'rindu', 'sedih', 'sad', 'lara', 'duka', 'pilu', 'tangis', 'nangis', 'air mata', 'hampa', 'hilang', 'kehilangan', 'kelam', 'patah', 'sendiri', 'lonely', 'usai', 'pamit', 'kemarin', 'luka', 'terluka', 'mati', 'kecewa', 'sunyi', 'sepi', 'takut', 'trauma', 'sakit', 'fall', 'tears', 'hurt', 'pain', 'broken', 'sorrow', 'farewell', 'goodbye', 'alone', 'cry', 'dark', 'empty', 'slow', 'slowed', 'reverb', 'acoustic', 'akustik', 'piano', 'melow', 'mellow', 'ballad', 'sesaat', 'daisy crown', 'empty old city', 'fallen petals'];
    const HAPPY_HYPE_WORDS = ['tarung', 'bebas', 'nyala', 'api', 'semangat', 'senang', 'bahagia', 'gembira', 'menari', 'cinta', 'indah', 'bersama', 'tertawa', 'senyum', 'terang', 'cahaya', 'pesta', 'dansa', 'jalan', 'rock', 'metal', 'hype', 'fast', 'speed', 'jump', 'power', 'beat', 'party', 'dance', 'run', 'happy', 'joy', 'smile', 'bright', 'sun', 'shine', 'love', 'sweet', 'fly', 'sparkle', 'up', 'kick back', 'anthem', 'hero', 'fight', 'bakar', 'membara'];

    function classifySongMood(song) {
        if (!song) return 'pop';
        const text = `${song.title || ''} ${song.artist || ''} ${song.album || ''}`.toLowerCase();

        const isJapaneseOrKorean = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/.test(text) ||
            ['harucha', 'kotoha', 'kaf', 'yoasobi', 'ado', 'eve', 'aimer', 'lisa', 'radwimps', 'zutomayo', 'yorushika', 'vocaloid', 'anime', 'jpop', 'j-pop', 'utaite', 'miku'].some(k => text.includes(k));

        if (isJapaneseOrKorean) {
            const isMellow = SAD_SENTIMENT_WORDS.some(w => text.includes(w)) || ['cover', 'acoustic', 'ballad', 'slow', 'harucha', 'kotoha', 'kaf', 'aimer'].some(w => text.includes(w));
            const isHype = HAPPY_HYPE_WORDS.some(w => text.includes(w)) || ['yoasobi', 'ado', 'lisa', 'kick back', 'op', 'opening', 'rock', 'metal'].some(w => text.includes(w));
            if (isMellow && !isHype) return 'jpop_mellow';
            if (isHype && !isMellow) return 'jpop_hype';
            return isMellow ? 'jpop_mellow' : 'jpop_hype';
        }

        const isIndie = MOOD_DEFINITIONS.indie_galau.keywords.some(k => text.includes(k)) || MOOD_DEFINITIONS.indie_senang.keywords.some(k => text.includes(k));
        if (isIndie) {
            const isHappy = MOOD_DEFINITIONS.indie_senang.keywords.some(k => text.includes(k)) || HAPPY_HYPE_WORDS.some(w => text.includes(w));
            const isSad = SAD_SENTIMENT_WORDS.some(w => text.includes(w)) || MOOD_DEFINITIONS.indie_galau.keywords.some(k => text.includes(k));
            if (isHappy && !isSad) return 'indie_senang';
            return 'indie_galau';
        }

        if (MOOD_DEFINITIONS.fokus.keywords.some(kw => text.includes(kw))) return 'fokus';
        if (MOOD_DEFINITIONS.energic.keywords.some(kw => text.includes(kw))) return 'energic';
        if (MOOD_DEFINITIONS.chill.keywords.some(kw => text.includes(kw))) return 'chill';
        if (SAD_SENTIMENT_WORDS.some(w => text.includes(w)) || MOOD_DEFINITIONS.galau.keywords.some(kw => text.includes(kw))) return 'galau';

        return 'pop';
    }

    function getMoodAnalysis() {
        const allSongs = Object.values(statsData).length > 0 ? Object.values(statsData) : historyData;
        const moodGroups = {};
        const moodPlayCounts = {};

        Object.keys(MOOD_DEFINITIONS).forEach(k => {
            moodGroups[k] = [];
            moodPlayCounts[k] = 0;
        });

        let totalPlays = 0;
        allSongs.forEach(song => {
            const mood = classifySongMood(song);
            if (moodGroups[mood]) {
                const playCount = song.playCount || 1;
                moodGroups[mood].push(song);
                moodPlayCounts[mood] += playCount;
                totalPlays += playCount;
            }
        });

        const topTracks = Object.values(statsData || {}).filter(s => (s.playCount || 0) >= 2).sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
        if (topTracks.length > 0) {
            moodGroups.top = topTracks.slice(0, 50);
            moodPlayCounts.top = topTracks.reduce((acc, s) => acc + (s.playCount || 1), 0);
        }

        Object.keys(moodGroups).forEach(k => {
            if (k !== 'top') {
                moodGroups[k].sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
            }
        });

        let dominantKey = 'jpop_mellow';
        let maxPlays = -1;
        Object.keys(moodPlayCounts).forEach(k => {
            if (k !== 'top' && moodPlayCounts[k] > maxPlays && moodGroups[k].length > 0) {
                maxPlays = moodPlayCounts[k];
                dominantKey = k;
            }
        });

        const dominantDef = MOOD_DEFINITIONS[dominantKey] || MOOD_DEFINITIONS.pop;
        const dominantPct = totalPlays > 0 ? Math.round((maxPlays / totalPlays) * 100) : 0;

        return {
            groups: moodGroups,
            dominantKey,
            dominantDef,
            dominantPct,
            totalPlays
        };
    }

    function formatRelativeTime(timestamp) {
        if (!timestamp) return '';
        const now = Date.now();
        const diffMs = now - timestamp;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffSec < 60) return 'Baru saja';
        if (diffMin < 60) return `${diffMin}m lalu`;
        if (diffHour < 24) return `${diffHour}j lalu`;
        return `${diffDay}h lalu`;
    }

    // Play Track directly in YouTube Music SPA
    function playTrackInPage(videoId, watchUrl) {
        if (videoId) {
            window.dispatchEvent(new CustomEvent('ytm-navigate-request', {
                detail: { path: `/watch?v=${videoId}`, videoId: videoId }
            }));
        } else if (watchUrl) {
            window.dispatchEvent(new CustomEvent('ytm-navigate-request', {
                detail: { path: watchUrl.replace(/^https?:\/\/music\.youtube\.com/, '') }
            }));
        }
    }

    // Toast Notification helper in page
    function showDrawerToast(message) {
        let toast = document.getElementById('ytm-drawer-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'ytm-drawer-toast';
            toast.className = 'ytm-drawer-toast';
            const drawer = document.getElementById('ytm-floating-drawer');
            if (drawer) drawer.appendChild(toast);
            else document.body.appendChild(toast);
        }
        toast.innerText = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    }

    // Initialize Floating Trigger Button & Drawer HTML
    function initFloatingUI() {
        if (document.getElementById('ytm-floating-trigger-btn')) return;

        // 1. Floating Toggle Button (Pinned right middle edge)
        const triggerBtn = document.createElement('button');
        triggerBtn.id = 'ytm-floating-trigger-btn';
        triggerBtn.className = 'ytm-floating-trigger-btn';
        triggerBtn.title = 'Buka YT Music Tracker Sidebar';
        triggerBtn.innerHTML = `
            <div class="ytm-trigger-icon-wrap">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
            </div>
            <span class="ytm-trigger-text">Tracker</span>
        `;

        triggerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleDrawer();
        });
        document.body.appendChild(triggerBtn);

        // 2. Sliding Drawer Container
        const drawer = document.createElement('div');
        drawer.id = 'ytm-floating-drawer';
        drawer.className = 'ytm-floating-drawer';
        drawer.innerHTML = `
            <!-- Header -->
            <div class="ytm-drawer-header">
                <div class="ytm-drawer-title-row">
                    <div class="ytm-drawer-logo">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="#ff0033">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                        </svg>
                        <span>Tracker History</span>
                        <span class="ytm-drawer-tag">Live</span>
                    </div>
                    <button class="ytm-drawer-close-btn" id="ytm-drawer-close" title="Tutup Panel">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>

                <!-- Stats Overview -->
                <div class="ytm-drawer-stats-row">
                    <div class="ytm-drawer-stat-card">
                        <div class="ytm-stat-icon-wrap note">🎵</div>
                        <div>
                            <div class="ytm-stat-val" id="ytm-drawer-stat-unique">0</div>
                            <div class="ytm-stat-lbl">Lagu Unik</div>
                        </div>
                    </div>
                    <div class="ytm-drawer-stat-card">
                        <div class="ytm-stat-icon-wrap fire">🔥</div>
                        <div>
                            <div class="ytm-stat-val" id="ytm-drawer-stat-total">0</div>
                            <div class="ytm-stat-lbl">Total Putar</div>
                        </div>
                    </div>
                </div>

                <!-- Search Bar -->
                <div class="ytm-drawer-search-wrap">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="#888">
                        <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                    </svg>
                    <input type="text" id="ytm-drawer-search" placeholder="Cari lagu, artis, atau album..." />
                </div>

                <!-- Navigation Tabs -->
                <div class="ytm-drawer-tabs">
                    <button class="ytm-drawer-tab-btn active" id="ytm-tab-recent">Terakhir</button>
                    <button class="ytm-drawer-tab-btn" id="ytm-tab-top">Top Hits</button>
                    <button class="ytm-drawer-tab-btn" id="ytm-tab-mood">Mood</button>
                    <button class="ytm-drawer-tab-btn" id="ytm-tab-settings">⚙️ Opsi</button>
                </div>
            </div>

            <!-- Top Tab Actions -->
            <div id="ytm-drawer-top-actions" style="display: none; padding: 6px 14px 4px 14px;">
                <div class="ytm-drawer-actions-bar">
                    <button class="ytm-drawer-btn btn-play-mix" id="ytm-btn-play-top-mix">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                        <span>Putar Top Mix</span>
                    </button>
                    <button class="ytm-drawer-btn btn-create-playlist" id="ytm-btn-create-top-playlist">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z"/></svg>
                        <span id="ytm-create-top-text">Buat Playlist Top</span>
                    </button>
                </div>
            </div>

            <!-- Mood Container -->
            <div id="ytm-drawer-mood-container" style="display: none; padding: 0 14px;">
                <div class="ytm-drawer-mood-banner">
                    <div class="ytm-mood-banner-title">Mood Dominan Mendengarkan</div>
                    <div class="ytm-mood-banner-main">
                        <span id="ytm-dominant-mood-label">🌸 J-Pop Melow</span>
                        <span class="ytm-mood-banner-pct" id="ytm-dominant-mood-pct">0%</span>
                    </div>
                    <div class="ytm-mood-progress-bg">
                        <div class="ytm-mood-progress-fill" id="ytm-dominant-mood-bar" style="width: 0%;"></div>
                    </div>
                </div>

                <div class="ytm-drawer-chips-scroll" id="ytm-drawer-chips-list">
                    <!-- Rendered dynamically -->
                </div>

                <div class="ytm-drawer-actions-bar">
                    <button class="ytm-drawer-btn btn-play-mix" id="ytm-btn-play-mood-mix">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                        <span>Putar Mix</span>
                    </button>
                    <button class="ytm-drawer-btn btn-create-playlist" id="ytm-btn-create-mood-playlist">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z"/></svg>
                        <span id="ytm-create-mood-text">Buat Playlist</span>
                    </button>
                </div>

                <div class="ytm-drawer-section-header">
                    <span id="ytm-mood-selected-title">Lagu di Mood Ini</span>
                    <span id="ytm-mood-song-count" style="font-size:10px; color:#888;">0 lagu</span>
                </div>
            </div>

            <!-- Settings Container -->
            <div id="ytm-drawer-settings-container" style="display: none; padding: 12px 14px; overflow-y: auto; flex: 1;">
                <div class="ytm-drawer-setting-card">
                    <div class="ytm-setting-row">
                        <div>
                            <div class="ytm-setting-label">Floating Drawer di Web</div>
                            <div class="ytm-setting-desc">Tampilkan tombol floating melayang [ 🎵 Tracker ] di halaman.</div>
                        </div>
                        <label class="ytm-switch">
                            <input type="checkbox" id="ytm-drawer-setting-floating" checked>
                            <span class="ytm-slider"></span>
                        </label>
                    </div>
                </div>

                <div class="ytm-drawer-setting-card">
                    <div class="ytm-setting-row">
                        <div>
                            <div class="ytm-setting-label">Shelf "Terakhir Diputar" di Beranda</div>
                            <div class="ytm-setting-desc">Tampilkan baris riwayat lagu di halaman utama YT Music.</div>
                        </div>
                        <label class="ytm-switch">
                            <input type="checkbox" id="ytm-drawer-setting-shelf" checked>
                            <span class="ytm-slider"></span>
                        </label>
                    </div>
                </div>

                <div class="ytm-drawer-setting-card">
                    <div class="ytm-setting-row">
                        <div>
                            <div class="ytm-setting-label">Tombol "Histori" di Sidebar</div>
                            <div class="ytm-setting-desc">Sematkan pintasan menu Histori di navigasi samping.</div>
                        </div>
                        <label class="ytm-switch">
                            <input type="checkbox" id="ytm-drawer-setting-sidebar" checked>
                            <span class="ytm-slider"></span>
                        </label>
                    </div>
                </div>

                <div class="ytm-drawer-setting-card">
                    <div class="ytm-setting-label">Waktu Minimal Hitung Putar (Scrobble)</div>
                    <div class="ytm-setting-desc">Lagu harus diputar minimal selama durasi ini untuk dihitung 1x play.</div>
                    <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 6px; margin-bottom: 4px;">
                        <span style="color: #aaa;">Ambang Detik:</span>
                        <span style="color: #ff4e45; font-weight: 700;"><span id="ytm-drawer-min-sec-val">20</span> detik</span>
                    </div>
                    <input type="range" class="ytm-range-slider" id="ytm-drawer-setting-min-sec" min="5" max="90" step="5" value="20" style="width: 100%;">
                </div>

                <div class="ytm-drawer-setting-card" style="border-color: rgba(255, 0, 51, 0.25);">
                    <div class="ytm-setting-label" style="color: #ff4d6d;">Hapus Data Riwayat</div>
                    <div class="ytm-setting-desc">Bersihkan seluruh riwayat lagu dan play count yang tersimpan.</div>
                    <button class="ytm-drawer-btn" id="ytm-drawer-btn-clear-history" style="background: rgba(255, 77, 109, 0.15); color: #ff4d6d; border: 1px solid rgba(255, 77, 109, 0.3); margin-top: 8px; width: 100%;">
                        Bersihkan Semua Riwayat
                    </button>
                </div>
            </div>

            <!-- Song List Container -->
            <div class="ytm-drawer-list" id="ytm-drawer-song-list">
                <!-- Rendered dynamically -->
            </div>

            <!-- Pagination Footer -->
            <div class="ytm-drawer-footer" id="ytm-drawer-footer">
                <div class="ytm-page-info">
                    Hal <span id="ytm-cur-page">1</span>/<span id="ytm-total-pages">1</span> (<span id="ytm-total-items">0</span>)
                </div>
                <div class="ytm-page-btn-group">
                    <button class="ytm-p-btn" id="ytm-btn-prev" title="Sebelumnya">‹</button>
                    <button class="ytm-p-btn" id="ytm-btn-next" title="Berikutnya">›</button>
                </div>
            </div>
        `;

        document.body.appendChild(drawer);

        // Bind Drawer Events
        document.getElementById('ytm-drawer-close').addEventListener('click', closeDrawer);

        // Tabs
        document.getElementById('ytm-tab-recent').addEventListener('click', () => switchTab('recent'));
        document.getElementById('ytm-tab-top').addEventListener('click', () => switchTab('top'));
        document.getElementById('ytm-tab-mood').addEventListener('click', () => switchTab('mood'));
        document.getElementById('ytm-tab-settings').addEventListener('click', () => switchTab('settings'));

        // Search
        let searchDebounce = null;
        document.getElementById('ytm-drawer-search').addEventListener('input', (e) => {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => {
                searchQuery = e.target.value;
                currentPage = 1;
                renderDrawerContent();
            }, 150);
        });

        // Pagination
        document.getElementById('ytm-btn-prev').addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderDrawerContent();
            }
        });

        document.getElementById('ytm-btn-next').addEventListener('click', () => {
            currentPage++;
            renderDrawerContent();
        });

        // Top Actions
        document.getElementById('ytm-btn-play-top-mix').addEventListener('click', () => {
            const topList = Object.values(statsData || {}).sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
            const videoIds = topList.map(s => s.videoId).filter(v => v && v.length === 11).slice(0, 50);
            if (videoIds.length === 0) return showDrawerToast('⚠️ Belum ada lagu teratas');

            window.dispatchEvent(new CustomEvent('ytm-play-mix-request', {
                detail: {
                    title: 'Top Hits: Paling Sering Diputar - YT Tracker',
                    description: 'Antrean 50 lagu paling sering diputar dibuat otomatis oleh YT Music Tracker',
                    videoIds: videoIds
                }
            }));
            showDrawerToast('▶️ Memuat antrean Top Hits!');
        });

        document.getElementById('ytm-btn-create-top-playlist').addEventListener('click', () => {
            const topList = Object.values(statsData || {}).sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
            const videoIds = topList.map(s => s.videoId).filter(v => v && v.length === 11).slice(0, 50);
            if (videoIds.length === 0) return showDrawerToast('⚠️ Belum ada lagu teratas');

            const btnText = document.getElementById('ytm-create-top-text');
            if (btnText) btnText.innerText = '⏳ Membuat...';

            const onRes = (e) => {
                window.removeEventListener('ytm-create-playlist-response', onRes);
                if (btnText) btnText.innerText = 'Buat Playlist Top';
                if (e.detail && e.detail.success) {
                    showDrawerToast('✅ Playlist Top Hits berhasil dibuat!');
                } else {
                    showDrawerToast(`❌ ${(e.detail && e.detail.error) || 'Gagal'}`);
                }
            };
            window.addEventListener('ytm-create-playlist-response', onRes);

            window.dispatchEvent(new CustomEvent('ytm-create-playlist-request', {
                detail: {
                    title: 'Top Hits: Paling Sering Diputar - YT Tracker',
                    description: 'Daftar lagu paling sering diputar dibuat otomatis oleh YT Music Tracker.',
                    videoIds: videoIds
                }
            }));
        });

        // Mood Actions
        document.getElementById('ytm-btn-play-mood-mix').addEventListener('click', () => {
            const analysis = getMoodAnalysis();
            const currentSongs = analysis.groups[selectedMood] || [];
            const videoIds = currentSongs.map(s => s.videoId).filter(v => v && v.length === 11);
            const currentDef = MOOD_DEFINITIONS[selectedMood] || MOOD_DEFINITIONS.pop;

            if (videoIds.length === 0) return showDrawerToast('⚠️ Tidak ada lagu di mood ini');

            window.dispatchEvent(new CustomEvent('ytm-play-mix-request', {
                detail: {
                    title: `Mood Mix: ${currentDef.name}`,
                    description: `Antrean lagu mood ${currentDef.name} dibuat oleh YT Music Tracker`,
                    videoIds: videoIds
                }
            }));
            showDrawerToast('▶️ Memuat antrean Mood Mix!');
        });

        document.getElementById('ytm-btn-create-mood-playlist').addEventListener('click', () => {
            const analysis = getMoodAnalysis();
            const currentSongs = analysis.groups[selectedMood] || [];
            const videoIds = currentSongs.map(s => s.videoId).filter(v => v && v.length === 11);
            const currentDef = MOOD_DEFINITIONS[selectedMood] || MOOD_DEFINITIONS.pop;

            if (videoIds.length === 0) return showDrawerToast('⚠️ Tidak ada lagu di mood ini');

            const btnText = document.getElementById('ytm-create-mood-text');
            if (btnText) btnText.innerText = '⏳ Membuat...';

            const onRes = (e) => {
                window.removeEventListener('ytm-create-playlist-response', onRes);
                if (btnText) btnText.innerText = 'Buat Playlist';
                if (e.detail && e.detail.success) {
                    showDrawerToast('✅ Playlist Mood berhasil dibuat!');
                } else {
                    showDrawerToast(`❌ ${(e.detail && e.detail.error) || 'Gagal'}`);
                }
            };
            window.addEventListener('ytm-create-playlist-response', onRes);

            window.dispatchEvent(new CustomEvent('ytm-create-playlist-request', {
                detail: {
                    title: `Mood: ${currentDef.name} - YT Tracker`,
                    description: `Dibuat otomatis oleh YT Music Tracker (${currentSongs.length} lagu).`,
                    videoIds: videoIds
                }
            }));
        });

        // Settings bindings in Drawer
        const drawerFloatingToggle = document.getElementById('ytm-drawer-setting-floating');
        const drawerShelfToggle = document.getElementById('ytm-drawer-setting-shelf');
        const drawerSidebarToggle = document.getElementById('ytm-drawer-setting-sidebar');
        const drawerMinSec = document.getElementById('ytm-drawer-setting-min-sec');
        const drawerMinSecVal = document.getElementById('ytm-drawer-min-sec-val');
        const drawerBtnClear = document.getElementById('ytm-drawer-btn-clear-history');

        function saveDrawerSettings() {
            const settings = {
                enableFloatingDrawer: drawerFloatingToggle ? drawerFloatingToggle.checked : true,
                enableHomeShelf: drawerShelfToggle ? drawerShelfToggle.checked : true,
                enableSidebarHistory: drawerSidebarToggle ? drawerSidebarToggle.checked : true,
                minScrobbleSeconds: parseInt(drawerMinSec ? drawerMinSec.value : 20, 10) || 20
            };
            chrome.storage.local.set({ [STORAGE_KEY_SETTINGS]: settings }, () => {
                showDrawerToast('💾 Pengaturan disimpan!');
            });
        }

        if (drawerFloatingToggle) drawerFloatingToggle.addEventListener('change', saveDrawerSettings);
        if (drawerShelfToggle) drawerShelfToggle.addEventListener('change', saveDrawerSettings);
        if (drawerSidebarToggle) drawerSidebarToggle.addEventListener('change', saveDrawerSettings);
        if (drawerMinSec) {
            drawerMinSec.addEventListener('input', (e) => {
                if (drawerMinSecVal) drawerMinSecVal.innerText = e.target.value;
                saveDrawerSettings();
            });
        }

        if (drawerBtnClear) {
            drawerBtnClear.addEventListener('click', () => {
                if (confirm('Apakah Anda yakin ingin menghapus semua riwayat dan play count?')) {
                    chrome.storage.local.set({
                        [STORAGE_KEY_HISTORY]: [],
                        [STORAGE_KEY_STATS]: {}
                    }, () => {
                        historyData = [];
                        statsData = {};
                        loadDataAndRender();
                        showDrawerToast('🗑️ Riwayat berhasil dibersihkan');
                    });
                }
            });
        }

        // Close on Escape key
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen) {
                closeDrawer();
            }
        });

        // Close on click / tap outside drawer
        document.addEventListener('pointerdown', (e) => {
            if (!isOpen) return;
            const drawer = document.getElementById('ytm-floating-drawer');
            const triggerBtn = document.getElementById('ytm-floating-trigger-btn');
            const path = (e.composedPath && e.composedPath()) || [];
            
            const isInsideDrawer = (drawer && drawer.contains(e.target)) || path.includes(drawer);
            const isInsideTrigger = (triggerBtn && triggerBtn.contains(e.target)) || path.includes(triggerBtn);

            if (!isInsideDrawer && !isInsideTrigger) {
                closeDrawer();
            }
        });
    }

    function loadDrawerSettings() {
        if (!chrome.storage || !chrome.storage.local) return;
        chrome.storage.local.get([STORAGE_KEY_SETTINGS], (res) => {
            const settings = res[STORAGE_KEY_SETTINGS] || {};
            const drawerFloatingToggle = document.getElementById('ytm-drawer-setting-floating');
            const drawerShelfToggle = document.getElementById('ytm-drawer-setting-shelf');
            const drawerSidebarToggle = document.getElementById('ytm-drawer-setting-sidebar');
            const drawerMinSec = document.getElementById('ytm-drawer-setting-min-sec');
            const drawerMinSecVal = document.getElementById('ytm-drawer-min-sec-val');

            if (drawerFloatingToggle) drawerFloatingToggle.checked = settings.enableFloatingDrawer !== false;
            if (drawerShelfToggle) drawerShelfToggle.checked = settings.enableHomeShelf !== false;
            if (drawerSidebarToggle) drawerSidebarToggle.checked = settings.enableSidebarHistory !== false;
            if (drawerMinSec) drawerMinSec.value = settings.minScrobbleSeconds || 20;
            if (drawerMinSecVal) drawerMinSecVal.innerText = settings.minScrobbleSeconds || 20;
        });
    }

    function toggleDrawer() {
        if (isOpen) closeDrawer();
        else openDrawer();
    }

    function openDrawer() {
        isOpen = true;
        const drawer = document.getElementById('ytm-floating-drawer');
        const triggerBtn = document.getElementById('ytm-floating-trigger-btn');
        if (drawer) drawer.classList.add('open');
        if (triggerBtn) triggerBtn.classList.add('active');
        loadDataAndRender();
    }

    function closeDrawer() {
        isOpen = false;
        const drawer = document.getElementById('ytm-floating-drawer');
        const triggerBtn = document.getElementById('ytm-floating-trigger-btn');
        if (drawer) drawer.classList.remove('open');
        if (triggerBtn) triggerBtn.classList.remove('active');
    }

    function switchTab(tab) {
        currentTab = tab;
        currentPage = 1;

        document.getElementById('ytm-tab-recent').classList.toggle('active', tab === 'recent');
        document.getElementById('ytm-tab-top').classList.toggle('active', tab === 'top');
        document.getElementById('ytm-tab-mood').classList.toggle('active', tab === 'mood');
        document.getElementById('ytm-tab-settings').classList.toggle('active', tab === 'settings');

        const topActions = document.getElementById('ytm-drawer-top-actions');
        const moodContainer = document.getElementById('ytm-drawer-mood-container');
        const settingsContainer = document.getElementById('ytm-drawer-settings-container');
        const songList = document.getElementById('ytm-drawer-song-list');
        const footer = document.getElementById('ytm-drawer-footer');

        if (topActions) topActions.style.display = (tab === 'top') ? 'block' : 'none';
        if (moodContainer) moodContainer.style.display = (tab === 'mood') ? 'block' : 'none';
        if (settingsContainer) settingsContainer.style.display = (tab === 'settings') ? 'block' : 'none';
        if (songList) songList.style.display = (tab === 'settings') ? 'none' : 'block';
        if (footer) footer.style.display = (tab === 'mood' || tab === 'settings') ? 'none' : 'flex';

        if (tab === 'settings') {
            loadDrawerSettings();
        } else {
            renderDrawerContent();
        }
    }

    function loadDataAndRender() {
        if (!chrome.storage || !chrome.storage.local) return;
        chrome.storage.local.get([STORAGE_KEY_HISTORY, STORAGE_KEY_STATS], (res) => {
            historyData = res[STORAGE_KEY_HISTORY] || [];
            statsData = res[STORAGE_KEY_STATS] || {};

            const uniqueCount = Object.keys(statsData).length;
            const totalScrobbles = Object.values(statsData).reduce((acc, curr) => acc + (curr.playCount || 0), 0);

            const statUnique = document.getElementById('ytm-drawer-stat-unique');
            const statTotal = document.getElementById('ytm-drawer-stat-total');
            if (statUnique) statUnique.innerText = uniqueCount;
            if (statTotal) statTotal.innerText = totalScrobbles;

            renderDrawerContent();
        });
    }

    function renderDrawerContent() {
        if (currentTab === 'mood') {
            renderMoodView();
        } else {
            renderRegularList();
        }
    }

    function renderRegularList() {
        const listEl = document.getElementById('ytm-drawer-song-list');
        if (!listEl) return;

        let songs = [];
        if (currentTab === 'recent') {
            songs = [...historyData];
        } else if (currentTab === 'top') {
            songs = Object.values(statsData).sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            songs = songs.filter(s =>
                (s.title && s.title.toLowerCase().includes(q)) ||
                (s.artist && s.artist.toLowerCase().includes(q)) ||
                (s.album && s.album.toLowerCase().includes(q))
            );
        }

        const totalItems = songs.length;
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const curPageEl = document.getElementById('ytm-cur-page');
        const totalPagesEl = document.getElementById('ytm-total-pages');
        const totalItemsEl = document.getElementById('ytm-total-items');
        if (curPageEl) curPageEl.innerText = currentPage;
        if (totalPagesEl) totalPagesEl.innerText = totalPages;
        if (totalItemsEl) totalItemsEl.innerText = totalItems;

        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const pageSongs = songs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

        if (pageSongs.length === 0) {
            listEl.innerHTML = `
                <div class="ytm-drawer-empty">
                    <p>${searchQuery ? 'Tidak ada lagu yang cocok dengan pencarian.' : 'Belum ada riwayat lagu yang tercatat.'}</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = pageSongs.map(song => {
            const thumb = song.thumbnailUrl || 'https://music.youtube.com/img/on_platform_logo_dark.svg';
            const title = song.title || 'Lagu';
            const artist = song.artist || 'Artis';
            const playCount = song.playCount || (statsData[song.id] ? statsData[song.id].playCount : 0) || 1;
            const timeAgo = song.playedAt ? formatRelativeTime(song.playedAt) : (song.lastPlayed ? formatRelativeTime(song.lastPlayed) : '');
            const targetUrl = song.watchUrl || (song.videoId ? `https://music.youtube.com/watch?v=${song.videoId}` : '');

            const songMoodKey = classifySongMood(song);
            const songMoodDef = MOOD_DEFINITIONS[songMoodKey];

            return `
                <div class="ytm-drawer-song-item" data-video-id="${song.videoId || ''}" data-url="${targetUrl}">
                    <div class="ytm-song-thumb-wrap">
                        <img class="ytm-song-thumb" src="${thumb}" alt="${title}" loading="lazy" />
                        <div class="ytm-song-play-overlay">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="#fff"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                    </div>
                    <div class="ytm-song-info">
                        <div class="ytm-song-title" title="${title}">${title}</div>
                        <div class="ytm-song-artist" title="${artist}">${artist}</div>
                    </div>
                    <div class="ytm-song-meta">
                        <div style="display: flex; align-items: center; gap: 4px;">
                            ${playCount > 1 ? `<span class="ytm-badge-count">🔥 ${playCount}x</span>` : ''}
                            ${timeAgo ? `<span class="ytm-badge-time">${timeAgo}</span>` : ''}
                        </div>
                        ${songMoodDef ? `<span class="ytm-badge-mood" style="color: ${songMoodDef.color};">${songMoodDef.shortName}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        listEl.querySelectorAll('.ytm-drawer-song-item').forEach(el => {
            el.addEventListener('click', () => {
                const videoId = el.getAttribute('data-video-id');
                const url = el.getAttribute('data-url');
                playTrackInPage(videoId, url);
            });
        });
    }

    function renderMoodView() {
        const listEl = document.getElementById('ytm-drawer-song-list');
        const chipsList = document.getElementById('ytm-drawer-chips-list');
        const dominantLabel = document.getElementById('ytm-dominant-mood-label');
        const dominantPct = document.getElementById('ytm-dominant-mood-pct');
        const dominantBar = document.getElementById('ytm-dominant-mood-bar');
        const selectedTitle = document.getElementById('ytm-mood-selected-title');
        const songCountEl = document.getElementById('ytm-mood-song-count');

        const analysis = getMoodAnalysis();
        const dominantDef = MOOD_DEFINITIONS[analysis.dominantKey] || MOOD_DEFINITIONS.pop;

        if (dominantLabel) dominantLabel.innerText = `${dominantDef.name}`;
        if (dominantPct) dominantPct.innerText = `${analysis.dominantPct}%`;
        if (dominantBar) dominantBar.style.width = `${Math.max(5, analysis.dominantPct)}%`;

        const activeMoods = Object.keys(MOOD_DEFINITIONS).filter(k => (analysis.groups[k] && analysis.groups[k].length > 0) || k === analysis.dominantKey);

        if (!analysis.groups[selectedMood] || analysis.groups[selectedMood].length === 0) {
            selectedMood = analysis.dominantKey;
        }

        chipsList.innerHTML = activeMoods.map(k => {
            const def = MOOD_DEFINITIONS[k];
            const count = analysis.groups[k] ? analysis.groups[k].length : 0;
            const isActive = selectedMood === k;
            return `
                <button class="ytm-drawer-chip ${isActive ? 'active' : ''}" data-mood="${k}">
                    <span>${def.shortName}</span>
                    <span style="opacity: 0.65; font-size: 9px;">(${count})</span>
                </button>
            `;
        }).join('');

        chipsList.querySelectorAll('.ytm-drawer-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                selectedMood = chip.getAttribute('data-mood');
                renderMoodView();
            });
        });

        // Mousewheel & drag on drawer chips
        if (!chipsList.__wheelHooked) {
            chipsList.__wheelHooked = true;
            chipsList.addEventListener('wheel', (e) => {
                if (e.deltaY !== 0) {
                    e.preventDefault();
                    chipsList.scrollLeft += e.deltaY * 0.9;
                }
            }, { passive: false });

            let isDown = false;
            let startX = 0;
            let initialScroll = 0;
            chipsList.addEventListener('mousedown', (e) => {
                isDown = true;
                startX = e.pageX - chipsList.offsetLeft;
                initialScroll = chipsList.scrollLeft;
            });
            window.addEventListener('mouseup', () => isDown = false);
            chipsList.addEventListener('mousemove', (e) => {
                if (!isDown) return;
                e.preventDefault();
                const x = e.pageX - chipsList.offsetLeft;
                chipsList.scrollLeft = initialScroll - (x - startX) * 1.2;
            });
        }

        const currentSongs = analysis.groups[selectedMood] || [];
        const currentDef = MOOD_DEFINITIONS[selectedMood] || MOOD_DEFINITIONS.pop;

        if (selectedTitle) selectedTitle.innerText = `${currentDef.name}`;
        if (songCountEl) songCountEl.innerText = `${currentSongs.length} lagu`;

        if (currentSongs.length === 0) {
            listEl.innerHTML = `
                <div class="ytm-drawer-empty">
                    <p>Belum ada lagu yang tergolong dalam mood ini.</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = currentSongs.map(song => {
            const thumb = song.thumbnailUrl || 'https://music.youtube.com/img/on_platform_logo_dark.svg';
            const title = song.title || 'Lagu';
            const artist = song.artist || 'Artis';
            const playCount = song.playCount || 1;
            const targetUrl = song.watchUrl || (song.videoId ? `https://music.youtube.com/watch?v=${song.videoId}` : '');

            const songMoodKey = classifySongMood(song);
            const songMoodDef = MOOD_DEFINITIONS[songMoodKey];

            return `
                <div class="ytm-drawer-song-item" data-video-id="${song.videoId || ''}" data-url="${targetUrl}">
                    <div class="ytm-song-thumb-wrap">
                        <img class="ytm-song-thumb" src="${thumb}" alt="${title}" loading="lazy" />
                        <div class="ytm-song-play-overlay">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="#fff"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                    </div>
                    <div class="ytm-song-info">
                        <div class="ytm-song-title" title="${title}">${title}</div>
                        <div class="ytm-song-artist" title="${artist}">${artist}</div>
                    </div>
                    <div class="ytm-song-meta">
                        <div style="display: flex; align-items: center; gap: 4px;">
                            ${playCount > 1 ? `<span class="ytm-badge-count">🔥 ${playCount}x</span>` : ''}
                        </div>
                        ${songMoodDef ? `<span class="ytm-badge-mood" style="color: ${songMoodDef.color};">${songMoodDef.shortName}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        listEl.querySelectorAll('.ytm-drawer-song-item').forEach(el => {
            el.addEventListener('click', () => {
                const videoId = el.getAttribute('data-video-id');
                const url = el.getAttribute('data-url');
                playTrackInPage(videoId, url);
            });
        });
    }

    // Check and apply enableFloatingDrawer setting live
    function applyFloatingSettings() {
        if (!chrome.storage || !chrome.storage.local) return;
        chrome.storage.local.get([STORAGE_KEY_SETTINGS], (res) => {
            const settings = res[STORAGE_KEY_SETTINGS] || {};
            const isEnabled = settings.enableFloatingDrawer !== false;

            const triggerBtn = document.getElementById('ytm-floating-trigger-btn');
            const drawer = document.getElementById('ytm-floating-drawer');

            if (triggerBtn) {
                triggerBtn.style.display = isEnabled ? 'flex' : 'none';
            }
            if (drawer && !isEnabled && isOpen) {
                closeDrawer();
            }
        });
    }

    // Listen for live storage updates & in-page tracker events
    window.addEventListener('ytm-tracker-song-updated', () => {
        if (isOpen) loadDataAndRender();
    });

    if (chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local') {
                if (changes[STORAGE_KEY_HISTORY] || changes[STORAGE_KEY_STATS]) {
                    if (isOpen) loadDataAndRender();
                }
                if (changes[STORAGE_KEY_SETTINGS]) {
                    applyFloatingSettings();
                }
            }
        });
    }

    // Auto init on page ready
    function start() {
        initFloatingUI();
        applyFloatingSettings();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

    console.log('[YTM Tracker] Floating in-page sidebar drawer ready.');
})();
