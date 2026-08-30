/**
 * YouTube Music Tracker - Popup Script with Pagination & Vector SVGs
 */

const STORAGE_KEY_HISTORY = 'ytm_tracker_history';
const STORAGE_KEY_STATS = 'ytm_tracker_stats';
const STORAGE_KEY_SETTINGS = 'ytm_tracker_settings';

const ITEMS_PER_PAGE = 10;
let currentPage = 1;
let currentTab = 'recent'; // 'recent' | 'top' | 'settings'
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

// Render list of songs based on active tab, search query, and pagination
function renderList() {
    const listContainer = document.getElementById('list-container');
    const settingsContainer = document.getElementById('settings-container');
    const searchWrapper = document.getElementById('search-box-wrapper');
    const paginationControls = document.getElementById('pagination-controls');

    if (currentTab === 'settings') {
        listContainer.style.display = 'none';
        settingsContainer.style.display = 'block';
        searchWrapper.style.display = 'none';
        paginationControls.style.display = 'none';
        return;
    }

    listContainer.style.display = 'block';
    settingsContainer.style.display = 'none';
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
                <div class="song-meta">
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
            </div>
        `;
    }).join('');

    // Scroll to top of list container when page changes
    listContainer.scrollTop = 0;

    // Attach click to play
    listContainer.querySelectorAll('.song-item').forEach(el => {
        el.addEventListener('click', () => {
            const url = el.getAttribute('data-url');
            if (url) {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    const activeTab = tabs[0];
                    if (activeTab && activeTab.url && activeTab.url.includes('music.youtube.com')) {
                        chrome.tabs.update(activeTab.id, { url });
                    } else {
                        chrome.tabs.create({ url });
                    }
                });
            }
        });
    });
}

function updateTabButtons() {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (currentTab === 'recent') document.getElementById('tab-recent').classList.add('active');
    if (currentTab === 'top') document.getElementById('tab-top').classList.add('active');
    if (currentTab === 'settings') document.getElementById('tab-settings').classList.add('active');
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
