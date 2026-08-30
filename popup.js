/**
 * YouTube Music Tracker - Popup Script with Pagination & Vector SVGs
 */

const STORAGE_KEY_HISTORY = 'ytm_tracker_history';
const STORAGE_KEY_STATS = 'ytm_tracker_stats';
const STORAGE_KEY_SETTINGS = 'ytm_tracker_settings';

const ITEMS_PER_PAGE = 10;
let currentPage = 1;
let currentTab = 'recent'; // 'recent' | 'top' | 'mood' | 'settings'
let selectedMood = 'all'; // 'all' | 'galau' | 'energic' | 'chill' | 'jpop' | 'indie' | 'fokus' | 'pop'
let historyData = [];
let statsData = {};
let searchQuery = '';

// Helper: relative time
function formatRelativeTime(timestamp) {
    if (!timestamp) return '';
    const now = Date.now();
    const diffSec = Math.floor((now - timestamp) / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Baru saja';
    if (diffMin < 60) return `${diffMin}m lalu`;
    if (diffHour < 24) return `${diffHour}j lalu`;
    if (diffDay === 1) return 'Kemarin';
    return `${diffDay}h lalu`;
}

// SPA Play Song Helper (No hard page reloads, prevents 'Leave site?' dialogs)
function playSongSPA(url, videoId) {
    const path = videoId ? `/watch?v=${videoId}` : (url ? url.replace(/^https?:\/\/music\.youtube\.com/, '') : '/');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab && activeTab.url && activeTab.url.includes('music.youtube.com')) {
            chrome.tabs.sendMessage(activeTab.id, {
                action: 'NAVIGATE',
                path: path
            }, (res) => {
                if (chrome.runtime.lastError || !res) {
                    chrome.tabs.update(activeTab.id, { url: url || `https://music.youtube.com${path}` });
                }
            });
        } else {
            chrome.tabs.query({ url: "*://music.youtube.com/*" }, (ytTabs) => {
                if (ytTabs && ytTabs.length > 0) {
                    const ytTab = ytTabs[0];
                    chrome.tabs.sendMessage(ytTab.id, {
                        action: 'NAVIGATE',
                        path: path
                    }, (res) => {
                        chrome.tabs.update(ytTab.id, { active: true });
                        if (chrome.runtime.lastError || !res) {
                            chrome.tabs.update(ytTab.id, { url: url || `https://music.youtube.com${path}` });
                        }
                    });
                } else {
                    chrome.tabs.create({ url: url || `https://music.youtube.com${path}` });
                }
            });
        }
    });
}

// Load data from chrome.storage.local
async function loadData() {
    return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEY_HISTORY, STORAGE_KEY_STATS, STORAGE_KEY_SETTINGS], (res) => {
            historyData = res[STORAGE_KEY_HISTORY] || [];
            statsData = res[STORAGE_KEY_STATS] || {};
            const settings = res[STORAGE_KEY_SETTINGS] || {
                minScrobbleSeconds: 20,
                enableHomeShelf: true,
                enableSidebarHistory: true
            };

            // Update stats counter
            const uniqueCount = Object.keys(statsData).length;
            const totalScrobbles = Object.values(statsData).reduce((acc, curr) => acc + (curr.playCount || 0), 0);

            const uniqueCountEl = document.getElementById('stat-unique-count');
            const totalScrobblesEl = document.getElementById('stat-total-scrobbles');
            if (uniqueCountEl) uniqueCountEl.innerText = uniqueCount;
            if (totalScrobblesEl) totalScrobblesEl.innerText = totalScrobbles;

            // Update settings inputs
            const shelfToggle = document.getElementById('setting-shelf-toggle');
            const sidebarToggle = document.getElementById('setting-sidebar-toggle');
            const minSecInput = document.getElementById('setting-min-sec');
            const minSecVal = document.getElementById('min-sec-val');

            if (shelfToggle) shelfToggle.checked = settings.enableHomeShelf !== false;
            if (sidebarToggle) sidebarToggle.checked = settings.enableSidebarHistory !== false;
            if (minSecInput) minSecInput.value = settings.minScrobbleSeconds || 20;
            if (minSecVal) minSecVal.innerText = settings.minScrobbleSeconds || 20;

            renderList();
            resolve();
        });
    });
}

/// === SMART MOOD & DUAL-DIMENSION GENRE CLASSIFIER ENGINE ===
const MOOD_DEFINITIONS = {
    top: {
        id: 'top',
        name: '🔥 Paling Sering Diputar',
        shortName: '🔥 Top Hits',
        color: '#ff4e45',
        keywords: []
    },
    indie_galau: {
        id: 'indie_galau',
        name: '🌧️ Indie Senja & Galau',
        shortName: '🌧️ Indie Galau',
        color: '#a29bfe',
        keywords: ['enau', 'eñau', 'perunggu', 'hindia', 'bernadya', 'nadin', 'feby putri', 'sal priadi', 'fourtwnty', 'danilla', 'kunto aji', 'fiersa besari', 'pamungkas', 'arash buana', 'raissa', 'idgitaf', 'morad', 'soegi', 'iksanskuter', 'jason ranti', '33x', 'abadi', 'sesi', 'potret', 'terbuang']
    },
    indie_senang: {
        id: 'indie_senang',
        name: '☀️ Indie Semangat & Ceria',
        shortName: '☀️ Indie Ceria',
        color: '#fdcb6e',
        keywords: ['barasuara', 'feast', '.feast', 'the changcuters', 'reality club', 'efek rumah kaca', 'sheila on 7', 'maliq', 'ran', 'diskoria', 'tarung', 'bebas', 'nyala', 'api', 'bakar']
    },
    jpop_mellow: {
        id: 'jpop_mellow',
        name: '🌸 J-Pop / Anime Melow & Galau',
        shortName: '🌸 J-Pop Melow',
        color: '#fd79a8',
        keywords: ['harucha', 'kotoha', 'kaf', 'aimer', 'zutomayo', 'yorushika', 'radwimps', 'suzume', 'nandemonaiya', 'daisy crown', 'empty old city', 'fallen petals', 'cover', 'utaite', 'acoustic', 'piano', '1991']
    },
    jpop_hype: {
        id: 'jpop_hype',
        name: '⚡ J-Pop & Anime Energik / Rock',
        shortName: '⚡ J-Pop Hype',
        color: '#e84393',
        keywords: ['yoasobi', 'ado', 'lisa', 'eve', 'kenshi yonezu', 'kick back', 'vocaloid', 'miku', 'hololive', 'suisei', 'opening', 'op', 'rock', 'metal', 'hype', 'speed']
    },
    galau: {
        id: 'galau',
        name: '🌧️ Pop Galau & Patah Hati',
        shortName: '🌧️ Pop Galau',
        color: '#6c5ce7',
        keywords: ['galau', 'sedih', 'sad', 'lara', 'ballad', 'acoustic', 'akustik', 'heartbreak', 'crying', 'rindu', 'slow', 'slowed', 'reverb', 'kemarin', 'kenangan', 'sendiri', 'lonely', 'nangis', 'patah', 'duka', 'pilu', 'terluka', 'hampa', 'kehilangan', 'berpisah', 'usai', 'pamit', 'takut', 'trauma', 'sakit', 'tears', 'hurt', 'pain', 'broken', 'sorrow', 'alone']
    },
    chill: {
        id: 'chill',
        name: '☕ Santai, Chill & Lo-Fi',
        shortName: '☕ Chill & Lo-Fi',
        color: '#00cec9',
        keywords: ['chill', 'lofi', 'lo-fi', 'relax', 'santai', 'jazz', 'r&b', 'soul', 'coffee', 'kopi', 'senja', 'sore', 'sunset', 'beach', 'vibe', 'calm', 'calming', 'cozy', 'malam', 'night', 'smooth', 'groove', 'rest', 'rehat', 'pantai']
    },
    energic: {
        id: 'energic',
        name: '⚡ Rock, EDM & High Energy',
        shortName: '⚡ Rock & EDM',
        color: '#ff4757',
        keywords: ['rock', 'metal', 'edm', 'remix', 'phonk', 'workout', 'gym', 'beat', 'power', 'hype', 'run', 'running', 'hardcore', 'party', 'dance', 'fast', 'speed', 'nightcore', 'dubstep', 'electro', 'semangat', 'bakar', 'membara', 'energi', 'dj', 'bass', 'distorsi', 'guitar']
    },
    fokus: {
        id: 'fokus',
        name: '🎯 Fokus & Instrumental',
        shortName: '🎯 Fokus',
        color: '#0984e3',
        keywords: ['instrumental', 'piano', 'study', 'focus', 'belajar', 'ambient', 'concentration', 'coding', 'reading', 'meditation', 'sleep', 'tidur', 'rain', 'hujan', 'cello', 'violin', 'orchestra', 'bgm', 'peaceful', 'klasik', 'classical']
    },
    pop: {
        id: 'pop',
        name: '✨ Pop & Hits Ceria',
        shortName: '✨ Pop Hits',
        color: '#00b894',
        keywords: ['pop', 'hits', 'love', 'cinta', 'lagu', 'music', 'single', 'feat', 'ft.', 'happy', 'senang', 'bahagia', 'indah', 'bersama', 'dance']
    }
};

// Sentiment & Energy Dictionaries
const SAD_SENTIMENT_WORDS = [
    '33x', 'terbuang', 'potret', 'abadi', 'sesi', 'rindu', 'sedih', 'sad', 'lara', 'duka', 'pilu', 
    'tangis', 'nangis', 'air mata', 'hampa', 'hilang', 'kehilangan', 'kelam', 'patah', 'sendiri', 
    'lonely', 'usai', 'pamit', 'kemarin', 'luka', 'terluka', 'mati', 'kecewa', 'sunyi', 'sepi', 
    'takut', 'trauma', 'sakit', 'fall', 'tears', 'hurt', 'pain', 'broken', 'sorrow', 'farewell', 
    'goodbye', 'alone', 'cry', 'dark', 'empty', 'slow', 'slowed', 'reverb', 'acoustic', 'akustik', 
    'piano', 'melow', 'mellow', 'ballad', 'sesaat', 'daisy crown', 'empty old city', 'fallen petals'
];

const HAPPY_HYPE_WORDS = [
    'tarung', 'bebas', 'nyala', 'api', 'semangat', 'senang', 'bahagia', 'gembira', 'menari', 
    'cinta', 'indah', 'bersama', 'tertawa', 'senyum', 'terang', 'cahaya', 'pesta', 'dansa', 
    'jalan', 'rock', 'metal', 'hype', 'fast', 'speed', 'jump', 'power', 'beat', 'party', 
    'dance', 'run', 'happy', 'joy', 'smile', 'bright', 'sun', 'shine', 'love', 'sweet', 
    'fly', 'sparkle', 'up', 'kick back', 'anthem', 'hero', 'fight', 'bakar', 'membara'
];

function classifySongMood(song) {
    if (!song) return 'pop';
    const text = `${song.title || ''} ${song.artist || ''} ${song.album || ''}`.toLowerCase();

    // 1. Japanese / Korean Detection (Kanji/Kana/Hangul or J-Pop/K-Pop artist keywords)
    const isJapaneseOrKorean = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/.test(text) ||
        ['harucha', 'kotoha', 'kaf', 'yoasobi', 'ado', 'eve', 'aimer', 'lisa', 'radwimps', 'zutomayo', 'yorushika', 'vocaloid', 'anime', 'jpop', 'j-pop', 'utaite', 'miku'].some(k => text.includes(k));

    if (isJapaneseOrKorean) {
        const isMellow = SAD_SENTIMENT_WORDS.some(w => text.includes(w)) || 
            ['cover', 'acoustic', 'ballad', 'slow', 'harucha', 'kotoha', 'kaf', 'aimer'].some(w => text.includes(w));
        const isHype = HAPPY_HYPE_WORDS.some(w => text.includes(w)) || 
            ['yoasobi', 'ado', 'lisa', 'kick back', 'op', 'opening', 'rock', 'metal'].some(w => text.includes(w));

        if (isMellow && !isHype) return 'jpop_mellow';
        if (isHype && !isMellow) return 'jpop_hype';
        return isMellow ? 'jpop_mellow' : 'jpop_hype';
    }

    // 2. Indonesian Indie Detection
    const isIndie = MOOD_DEFINITIONS.indie_galau.keywords.some(k => text.includes(k)) ||
        MOOD_DEFINITIONS.indie_senang.keywords.some(k => text.includes(k));

    if (isIndie) {
        const isHappy = MOOD_DEFINITIONS.indie_senang.keywords.some(k => text.includes(k)) || HAPPY_HYPE_WORDS.some(w => text.includes(w));
        const isSad = SAD_SENTIMENT_WORDS.some(w => text.includes(w)) || MOOD_DEFINITIONS.indie_galau.keywords.some(k => text.includes(k));

        if (isHappy && !isSad) return 'indie_senang';
        return 'indie_galau';
    }

    // 3. Instrumental & Focus Detection
    if (MOOD_DEFINITIONS.fokus.keywords.some(kw => text.includes(kw))) {
        return 'fokus';
    }

    // 4. Rock / Metal / EDM Detection
    if (MOOD_DEFINITIONS.energic.keywords.some(kw => text.includes(kw))) {
        return 'energic';
    }

    // 5. Chill & Lo-Fi Detection
    if (MOOD_DEFINITIONS.chill.keywords.some(kw => text.includes(kw))) {
        return 'chill';
    }

    // 6. Galau Pop Detection
    if (SAD_SENTIMENT_WORDS.some(w => text.includes(w)) || MOOD_DEFINITIONS.galau.keywords.some(kw => text.includes(kw))) {
        return 'galau';
    }

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

    // Populate Top Tracks (songs played >= 2 times)
    const topTracks = Object.values(statsData || {}).filter(s => (s.playCount || 0) >= 2).sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
    if (topTracks.length > 0) {
        moodGroups.top = topTracks.slice(0, 50);
        moodPlayCounts.top = topTracks.reduce((acc, s) => acc + (s.playCount || 1), 0);
    }

    // Sort songs inside each mood by playCount descending
    Object.keys(moodGroups).forEach(k => {
        if (k !== 'top') {
            moodGroups[k].sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
        }
    });

    // Find dominant mood (excluding top from dominant banner calculation)
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
        dominantKey: dominantKey,
        dominantDef: dominantDef,
        dominantPct: dominantPct,
        totalPlays: totalPlays
    };
}

// Toast notification helper
function showToast(message) {
    const toast = document.getElementById('toast-msg');
    if (!toast) return;
    toast.innerText = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2200);
}

// Render Mood View
function renderMoodView() {
    const moodContainer = document.getElementById('mood-container');
    const dominantBanner = document.getElementById('mood-dominant-banner');
    const dominantLabel = document.getElementById('dominant-mood-label');
    const dominantPct = document.getElementById('dominant-mood-pct');
    const dominantBar = document.getElementById('dominant-mood-bar');
    const chipsList = document.getElementById('mood-chips-list');
    const songListEl = document.getElementById('mood-song-list');
    const selectedTitle = document.getElementById('mood-selected-title');
    const songCountEl = document.getElementById('mood-song-count');

    const analysis = getMoodAnalysis();
    const dominantDef = MOOD_DEFINITIONS[analysis.dominantKey] || MOOD_DEFINITIONS.galau;

    if (dominantLabel) dominantLabel.innerText = dominantDef.name;
    if (dominantPct) dominantPct.innerText = `${analysis.dominantPct}%`;
    if (dominantBar) dominantBar.style.width = `${Math.max(5, analysis.dominantPct)}%`;

    // Render Mood Chips
    const activeMoods = Object.keys(MOOD_DEFINITIONS).filter(k => (analysis.groups[k] && analysis.groups[k].length > 0) || k === analysis.dominantKey);
    
    // Auto-select dominant if selectedMood not set
    if (selectedMood === 'all' || !analysis.groups[selectedMood] || analysis.groups[selectedMood].length === 0) {
        selectedMood = analysis.dominantKey;
    }

    chipsList.innerHTML = activeMoods.map(k => {
        const def = MOOD_DEFINITIONS[k];
        const count = analysis.groups[k] ? analysis.groups[k].length : 0;
        const isActive = selectedMood === k;
        return `
            <button class="mood-chip ${isActive ? 'active' : ''}" data-mood="${k}">
                <span>${def.shortName}</span>
                <span style="opacity: 0.65; font-size: 9.5px;">(${count})</span>
            </button>
        `;
    }).join('');

    chipsList.querySelectorAll('.mood-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            selectedMood = chip.getAttribute('data-mood');
            renderMoodView();
        });
    });

    // Enable mousewheel & drag horizontal scrolling on chips
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

        window.addEventListener('mouseup', () => {
            isDown = false;
        });

        chipsList.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - chipsList.offsetLeft;
            const walk = (x - startX) * 1.2;
            chipsList.scrollLeft = initialScroll - walk;
        });
    }

    // Render songs in currently selected mood
    const currentSongs = analysis.groups[selectedMood] || [];
    const currentDef = MOOD_DEFINITIONS[selectedMood] || MOOD_DEFINITIONS.pop;

    if (selectedTitle) selectedTitle.innerText = `${currentDef.name}`;
    if (songCountEl) songCountEl.innerText = `${currentSongs.length} lagu`;

    if (currentSongs.length === 0) {
        songListEl.innerHTML = `
            <div class="empty-state" style="padding: 24px 0;">
                <p>Belum ada lagu yang tergolong dalam mood ini.</p>
            </div>
        `;
    } else {
        songListEl.innerHTML = currentSongs.map(song => {
            const thumb = song.thumbnailUrl || 'https://music.youtube.com/img/on_platform_logo_dark.svg';
            const title = song.title || 'Lagu';
            const artist = song.artist || 'Artis';
            const playCount = song.playCount || 1;
            const targetUrl = song.watchUrl || (song.videoId ? `https://music.youtube.com/watch?v=${song.videoId}` : '');

            const songMoodKey = classifySongMood(song);
            const songMoodDef = MOOD_DEFINITIONS[songMoodKey];

            return `
                <div class="song-item" data-url="${targetUrl}" data-video-id="${song.videoId || ''}">
                    <div class="song-thumb-wrapper">
                        <img class="song-thumb" src="${thumb}" alt="${title}" loading="lazy" />
                        <div class="song-play-icon">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                        </div>
                    </div>
                    <div class="song-info">
                        <div class="song-title" title="${title}">${title}</div>
                        <div class="song-artist" title="${artist}">${artist}</div>
                    </div>
                    <div class="song-meta" style="display: flex; flex-direction: column; align-items: flex-end; gap: 3px;">
                        ${playCount > 1 ? `
                            <span class="badge-count">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19.48 12.35c-1.57-4.08-7.16-4.3-5.81-10.23.1-.44-.37-.78-.7-.52-2.37 1.87-4.53 4.64-4.6 7.61-.06 2.53 1.26 4.47 1.26 4.47s-1.87-.5-2.83-2.07c-.17-.28-.59-.26-.73.04-.98 2.06-.7 4.54.76 6.38 1.83 2.3 4.87 3.24 7.69 2.27 3.32-1.15 5.5-4.49 4.96-7.95zm-6.66 7.4c-.21.05-.42.08-.64.08-1.54 0-2.85-1-3.23-2.4-.16-.62-.1-1.28.17-1.84.18-.38.71-.34.82.07.35 1.34 1.54 2.34 2.97 2.39.26.01.44.25.35.5-.1.28-.24.55-.44.7z"/>
                                </svg>
                                ${playCount}x
                            </span>
                        ` : ''}
                        ${songMoodDef ? `<span style="font-size: 9.5px; color: ${songMoodDef.color}; background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 4px; font-weight: 600;">${songMoodDef.shortName}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        songListEl.querySelectorAll('.song-item').forEach(el => {
            el.addEventListener('click', () => {
                const url = el.getAttribute('data-url');
                const videoId = el.getAttribute('data-video-id');
                playSongSPA(url, videoId);
            });
        });
    }

    // Bind Mood Playlist Action Buttons
    const btnPlayMix = document.getElementById('btn-play-mood-mix');
    const btnCreate = document.getElementById('btn-create-playlist');
    const btnCreateText = document.getElementById('create-playlist-btn-text');
    const btnCopyMix = document.getElementById('btn-copy-mood-mix');

    if (btnPlayMix) {
        btnPlayMix.onclick = () => {
            const videoIds = currentSongs.map(s => s.videoId).filter(v => v && v.length === 11);
            if (videoIds.length === 0) {
                showToast('⚠️ Tidak ada lagu dengan ID valid');
                return;
            }

            chrome.tabs.query({ url: "*://music.youtube.com/*" }, (tabs) => {
                if (tabs && tabs.length > 0) {
                    const targetTab = tabs.find(t => t.active) || tabs[0];
                    chrome.tabs.sendMessage(targetTab.id, {
                        action: 'PLAY_MIX',
                        detail: {
                            title: `Mood Mix: ${currentDef.name}`,
                            description: `Antrean ${currentSongs.length} lagu mood dibuat otomatis oleh YT Music Tracker`,
                            videoIds: videoIds
                        }
                    }, () => {
                        if (chrome.runtime.lastError) {
                            chrome.tabs.update(targetTab.id, { active: true, url: `https://music.youtube.com/watch?v=${videoIds[0]}` });
                        } else {
                            chrome.tabs.update(targetTab.id, { active: true });
                        }
                        showToast('▶️ Memuat antrean mood mix!');
                    });
                } else {
                    chrome.tabs.create({ url: `https://music.youtube.com/watch?v=${videoIds[0]}` });
                }
            });
        };
    }

    if (btnCreate) {
        btnCreate.onclick = () => {
            const videoIds = currentSongs.map(s => s.videoId).filter(v => v && v.length === 11);
            if (videoIds.length === 0) {
                showToast('⚠️ Tidak ada lagu untuk dibuat playlist');
                return;
            }

            const playlistTitle = `Mood: ${currentDef.name} - YT Tracker`;
            const playlistDesc = `Dibuat otomatis oleh YT Music Tracker. Berisi ${currentSongs.length} lagu pilihan berdasarkan statistik putar Anda.`;

            btnCreate.disabled = true;
            if (btnCreateText) btnCreateText.innerText = '⏳ Membuat...';

            chrome.tabs.query({ url: "*://music.youtube.com/*" }, (tabs) => {
                if (tabs && tabs.length > 0) {
                    const targetTab = tabs.find(t => t.active) || tabs[0];
                    chrome.tabs.sendMessage(targetTab.id, {
                        action: 'CREATE_PLAYLIST',
                        detail: {
                            title: playlistTitle,
                            description: playlistDesc,
                            videoIds: videoIds
                        }
                    }, (response) => {
                        btnCreate.disabled = false;
                        if (btnCreateText) btnCreateText.innerText = 'Buat Playlist';

                        if (chrome.runtime.lastError || !response) {
                            showToast('⚠️ Silakan refresh halaman YouTube Music dulu!');
                            return;
                        }

                        if (response.success) {
                            chrome.tabs.update(targetTab.id, { active: true });
                            showToast('✅ Playlist pribadi berhasil dibuat!');
                        } else {
                            const err = response.error || 'Gagal membuat playlist';
                            showToast(`❌ ${err}`);
                        }
                    });
                } else {
                    btnCreate.disabled = false;
                    if (btnCreateText) btnCreateText.innerText = 'Buat Playlist';
                    showToast('⚠️ Buka tab YouTube Music terlebih dahulu!');
                    chrome.tabs.create({ url: 'https://music.youtube.com' });
                }
            });
        };
    }
}

// Render list of songs based on active tab, search query, and pagination
function renderList() {
    const listContainer = document.getElementById('list-container');
    const settingsContainer = document.getElementById('settings-container');
    const moodContainer = document.getElementById('mood-container');
    const searchWrapper = document.getElementById('search-box-wrapper');
    const paginationControls = document.getElementById('pagination-controls');

    if (currentTab === 'settings') {
        listContainer.style.display = 'none';
        settingsContainer.style.display = 'block';
        if (moodContainer) moodContainer.style.display = 'none';
        searchWrapper.style.display = 'none';
        paginationControls.style.display = 'none';
        return;
    }

    if (currentTab === 'mood') {
        listContainer.style.display = 'none';
        settingsContainer.style.display = 'none';
        if (moodContainer) moodContainer.style.display = 'block';
        searchWrapper.style.display = 'none';
        paginationControls.style.display = 'none';
        renderMoodView();
        return;
    }

    listContainer.style.display = 'block';
    settingsContainer.style.display = 'none';
    if (moodContainer) moodContainer.style.display = 'none';
    searchWrapper.style.display = 'block';
    paginationControls.style.display = 'flex';

    let items = [];

    if (currentTab === 'recent') {
        items = [...historyData];
    } else if (currentTab === 'top') {
        items = Object.values(statsData).sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
    }

    // Apply search filter if query is typed
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        items = items.filter(it => 
            (it.title && it.title.toLowerCase().includes(q)) || 
            (it.artist && it.artist.toLowerCase().includes(q)) ||
            (it.album && it.album.toLowerCase().includes(q))
        );
    }

    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

    // Ensure currentPage is in valid range
    if (currentPage > totalPages) {
        currentPage = totalPages;
    }
    if (currentPage < 1) {
        currentPage = 1;
    }

    // Update pagination labels and buttons
    document.getElementById('current-page-num').innerText = currentPage;
    document.getElementById('total-pages-num').innerText = totalPages;
    document.getElementById('total-items-num').innerText = totalItems;

    const btnFirst = document.getElementById('btn-first-page');
    const btnPrev = document.getElementById('btn-prev-page');
    const btnNext = document.getElementById('btn-next-page');
    const btnLast = document.getElementById('btn-last-page');

    btnFirst.disabled = currentPage <= 1;
    btnPrev.disabled = currentPage <= 1;
    btnNext.disabled = currentPage >= totalPages;
    btnLast.disabled = currentPage >= totalPages;

    if (totalItems === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
                <p>Tidak ada riwayat lagu yang cocok.</p>
            </div>
        `;
        return;
    }

    // Get paginated slice
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
    const paginatedItems = items.slice(startIndex, endIndex);

    listContainer.innerHTML = paginatedItems.map((song) => {
        const thumb = song.thumbnailUrl || 'https://music.youtube.com/img/on_platform_logo_dark.svg';
        const title = song.title || 'Lagu';
        const artist = song.artist || 'Artis';
        const playCount = song.playCount || (statsData[song.id] ? statsData[song.id].playCount : 0) || 1;
        const timeAgo = song.playedAt ? formatRelativeTime(song.playedAt) : (song.lastPlayed ? formatRelativeTime(song.lastPlayed) : '');
        const targetUrl = song.watchUrl || (song.videoId ? `https://music.youtube.com/watch?v=${song.videoId}` : '');

        const songMoodKey = classifySongMood(song);
        const songMoodDef = MOOD_DEFINITIONS[songMoodKey];

        return `
            <div class="song-item" data-url="${targetUrl}" data-video-id="${song.videoId || ''}">
                <div class="song-thumb-wrapper">
                    <img class="song-thumb" src="${thumb}" alt="${title}" loading="lazy" />
                    <div class="song-play-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </div>
                </div>
                <div class="song-info">
                    <div class="song-title" title="${title}">${title}</div>
                    <div class="song-artist" title="${artist}">${artist}</div>
                </div>
                <div class="song-meta" style="display: flex; flex-direction: column; align-items: flex-end; gap: 3px;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        ${playCount > 1 ? `
                            <span class="badge-count">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19.48 12.35c-1.57-4.08-7.16-4.3-5.81-10.23.1-.44-.37-.78-.7-.52-2.37 1.87-4.53 4.64-4.6 7.61-.06 2.53 1.26 4.47 1.26 4.47s-1.87-.5-2.83-2.07c-.17-.28-.59-.26-.73.04-.98 2.06-.7 4.54.76 6.38 1.83 2.3 4.87 3.24 7.69 2.27 3.32-1.15 5.5-4.49 4.96-7.95zm-6.66 7.4c-.21.05-.42.08-.64.08-1.54 0-2.85-1-3.23-2.4-.16-.62-.1-1.28.17-1.84.18-.38.71-.34.82.07.35 1.34 1.54 2.34 2.97 2.39.26.01.44.25.35.5-.1.28-.24.55-.44.7z"/>
                                </svg>
                                ${playCount}x
                            </span>
                        ` : ''}
                        ${timeAgo ? `<span class="badge-time">${timeAgo}</span>` : ''}
                    </div>
                    ${songMoodDef ? `<span style="font-size: 9px; color: ${songMoodDef.color}; background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 4px; font-weight: 600;">${songMoodDef.shortName}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');

    // Scroll to top of list container when page changes
    listContainer.scrollTop = 0;

    // Attach click to play via smooth SPA navigation
    listContainer.querySelectorAll('.song-item').forEach(el => {
        el.addEventListener('click', () => {
            const url = el.getAttribute('data-url');
            const videoId = el.getAttribute('data-video-id');
            playSongSPA(url, videoId);
        });
    });
}

function updateTabButtons() {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (currentTab === 'recent') document.getElementById('tab-recent').classList.add('active');
    if (currentTab === 'top') document.getElementById('tab-top').classList.add('active');
    if (currentTab === 'mood') document.getElementById('tab-mood').classList.add('active');
    if (currentTab === 'settings') document.getElementById('tab-settings').classList.add('active');

    const topActionsBar = document.getElementById('top-actions-bar');
    if (topActionsBar) {
        topActionsBar.style.display = (currentTab === 'top') ? 'block' : 'none';
    }
}

// Bind Top Tab Action Buttons (Putar Top Mix & Buat Playlist Top)
const btnPlayTopMix = document.getElementById('btn-play-top-mix');
const btnCreateTop = document.getElementById('btn-create-top-playlist');
const btnCreateTopText = document.getElementById('create-top-btn-text');

if (btnPlayTopMix) {
    btnPlayTopMix.onclick = () => {
        const topList = Object.values(statsData || {}).sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
        const videoIds = topList.map(s => s.videoId).filter(v => v && v.length === 11).slice(0, 50);

        if (videoIds.length === 0) {
            showToast('⚠️ Belum ada lagu teratas untuk diputar');
            return;
        }

        chrome.tabs.query({ url: "*://music.youtube.com/*" }, (tabs) => {
            if (tabs && tabs.length > 0) {
                const targetTab = tabs.find(t => t.active) || tabs[0];
                chrome.tabs.sendMessage(targetTab.id, {
                    action: 'PLAY_MIX',
                    detail: {
                        title: 'Top Hits: Paling Sering Diputar - YT Tracker',
                        description: `Antrean 50 lagu paling sering diputar dibuat otomatis oleh YT Music Tracker`,
                        videoIds: videoIds
                    }
                }, () => {
                    chrome.tabs.update(targetTab.id, { active: true });
                    showToast('▶️ Memuat antrean Top Hits!');
                });
            } else {
                chrome.tabs.create({ url: `https://music.youtube.com/watch?v=${videoIds[0]}` });
            }
        });
    };
}

if (btnCreateTop) {
    btnCreateTop.onclick = () => {
        const topList = Object.values(statsData || {}).sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
        const videoIds = topList.map(s => s.videoId).filter(v => v && v.length === 11).slice(0, 50);

        if (videoIds.length === 0) {
            showToast('⚠️ Belum ada lagu teratas untuk dibuat playlist');
            return;
        }

        btnCreateTop.disabled = true;
        if (btnCreateTopText) btnCreateTopText.innerText = '⏳ Membuat...';

        chrome.tabs.query({ url: "*://music.youtube.com/*" }, (tabs) => {
            if (tabs && tabs.length > 0) {
                const targetTab = tabs.find(t => t.active) || tabs[0];
                chrome.tabs.sendMessage(targetTab.id, {
                    action: 'CREATE_PLAYLIST',
                    detail: {
                        title: 'Top Hits: Paling Sering Diputar - YT Tracker',
                        description: `Daftar lagu paling sering diputar dibuat otomatis oleh YT Music Tracker.`,
                        videoIds: videoIds
                    }
                }, (response) => {
                    btnCreateTop.disabled = false;
                    if (btnCreateTopText) btnCreateTopText.innerText = 'Buat Playlist Top';

                    if (chrome.runtime.lastError || !response) {
                        showToast('⚠️ Silakan refresh tab YouTube Music dulu!');
                        return;
                    }

                    if (response.success) {
                        chrome.tabs.update(targetTab.id, { active: true });
                        showToast('✅ Playlist Top Hits berhasil dibuat!');
                    } else {
                        const err = response.error || 'Gagal membuat playlist';
                        showToast(`❌ ${err}`);
                    }
                });
            } else {
                btnCreateTop.disabled = false;
                if (btnCreateTopText) btnCreateTopText.innerText = 'Buat Playlist Top';
                showToast('⚠️ Buka tab YouTube Music terlebih dahulu!');
                chrome.tabs.create({ url: 'https://music.youtube.com' });
            }
        });
    };
}

// Tab navigation handlers
document.getElementById('tab-recent').addEventListener('click', () => {
    currentTab = 'recent';
    currentPage = 1;
    updateTabButtons();
    renderList();
});

document.getElementById('tab-top').addEventListener('click', () => {
    currentTab = 'top';
    currentPage = 1;
    updateTabButtons();
    renderList();
});

document.getElementById('tab-mood').addEventListener('click', () => {
    currentTab = 'mood';
    updateTabButtons();
    renderList();
});

document.getElementById('tab-settings').addEventListener('click', () => {
    currentTab = 'settings';
    updateTabButtons();
    renderList();
});

// Search handler with debounce
let searchDebounce = null;
document.getElementById('search-input').addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
        searchQuery = e.target.value;
        currentPage = 1;
        renderList();
    }, 150);
});

// Pagination event listeners
document.getElementById('btn-first-page').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage = 1;
        renderList();
    }
});

document.getElementById('btn-prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderList();
    }
});

document.getElementById('btn-next-page').addEventListener('click', () => {
    currentPage++;
    renderList();
});

document.getElementById('btn-last-page').addEventListener('click', () => {
    let items = currentTab === 'recent' ? historyData : Object.values(statsData);
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        items = items.filter(it => (it.title && it.title.toLowerCase().includes(q)) || (it.artist && it.artist.toLowerCase().includes(q)));
    }
    const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
    if (currentPage !== totalPages) {
        currentPage = totalPages;
        renderList();
    }
});

// Settings handlers
function saveSettings() {
    const settings = {
        enableHomeShelf: document.getElementById('setting-shelf-toggle').checked,
        enableSidebarHistory: document.getElementById('setting-sidebar-toggle').checked,
        minScrobbleSeconds: parseInt(document.getElementById('setting-min-sec').value, 10) || 20
    };
    chrome.storage.local.set({ [STORAGE_KEY_SETTINGS]: settings });
}

document.getElementById('setting-shelf-toggle').addEventListener('change', saveSettings);
document.getElementById('setting-sidebar-toggle').addEventListener('change', saveSettings);
document.getElementById('setting-min-sec').addEventListener('input', (e) => {
    document.getElementById('min-sec-val').innerText = e.target.value;
    saveSettings();
});

// Clear history confirmation
document.getElementById('btn-clear-history').addEventListener('click', () => {
    if (confirm('Apakah Anda yakin ingin menghapus semua riwayat pelacakan dan play count?')) {
        chrome.storage.local.set({
            [STORAGE_KEY_HISTORY]: [],
            [STORAGE_KEY_STATS]: {}
        }, () => {
            historyData = [];
            statsData = {};
            currentPage = 1;
            loadData();
        });
    }
});

// Live update while popup is open
if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && (changes[STORAGE_KEY_HISTORY] || changes[STORAGE_KEY_STATS])) {
            loadData();
        }
    });
}

// Initial Load
document.addEventListener('DOMContentLoaded', loadData);
