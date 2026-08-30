/**
 * YouTube Music Homepage Enhancer & Sidebar History Injector
 * 100% Reliable Standard HTML with 1:1 Native Visual Fidelity
 */

(function () {
    const STORAGE_KEY_HISTORY = 'ytm_tracker_history';
    const STORAGE_KEY_STATS = 'ytm_tracker_stats';
    const STORAGE_KEY_SETTINGS = 'ytm_tracker_settings';

    let currentTabMode = 'recent'; // 'recent' | 'top'
    let isInjectingShelf = false;
    let isInjectingSidebar = false;

    function isExtensionAlive() {
        return typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;
    }

    // Helper: format relative time
    function formatRelativeTime(timestamp) {
        if (!timestamp) return '';
        const now = Date.now();
        const diffMs = now - timestamp;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffSec < 60) return 'Baru saja';
        if (diffMin < 60) return `${diffMin} mnt lalu`;
        if (diffHour < 24) return `${diffHour} jam lalu`;
        if (diffDay === 1) return 'Kemarin';
        if (diffDay < 7) return `${diffDay} hr lalu`;
        return new Date(timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    }

    // Helper: smooth internal SPA navigation (communicates with MAIN world bridge)
    function navigateSPA(urlOrPath, browseId = null, videoId = null) {
        window.dispatchEvent(new CustomEvent('ytm-navigate-request', {
            detail: {
                path: urlOrPath,
                browseId: browseId,
                videoId: videoId
            }
        }));
    }

    // Helper: get current user avatar or name
    function getUserProfileInfo() {
        let avatarSrc = '';
        let userName = 'YAN GUSTIAN';

        const avatarImg = document.querySelector('ytmusic-app-header img#img, ytmusic-settings-button img, #avatar-btn img, button#avatar-btn img, ytmusic-carousel-shelf-renderer .avatar img, ytmusic-carousel-shelf-basic-header-renderer img#img');
        if (avatarImg && avatarImg.src && avatarImg.src.startsWith('http')) {
            avatarSrc = avatarImg.src;
        }

        const nativeStrapline = document.querySelector('ytmusic-carousel-shelf-renderer .strapline, ytmusic-carousel-shelf-basic-header-renderer .strapline, ytmusic-custom-index-column .strapline');
        if (nativeStrapline && nativeStrapline.innerText) {
            userName = nativeStrapline.innerText.trim();
        }

        return { avatarSrc, userName };
    }

    // Play song directly
    function playTrack(track) {
        if (!track) return;
        let videoId = track.videoId;

        if (!videoId && track.watchUrl && track.watchUrl.includes('watch?v=')) {
            const m = track.watchUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
            if (m) videoId = m[1];
        }

        if (videoId) {
            navigateSPA(`/watch?v=${videoId}`, null, videoId);
        } else {
            const query = encodeURIComponent(`${track.title || ''} ${track.artist || ''}`.trim());
            navigateSPA(`/search?q=${query}`, 'FEmusic_search');
        }
    }

    // === 1. SIDEBAR HISTORY BUTTON INJECTION ===
    function injectSidebarHistoryButton() {
        if (isInjectingSidebar) return;
        isInjectingSidebar = true;

        try {
            const guideSection = document.querySelector('ytmusic-guide-section-renderer #items');
            if (!guideSection) {
                isInjectingSidebar = false;
                return;
            }

            const existingBtn = document.getElementById('ytm-custom-history-menu-item');
            const isHistPage = window.location.pathname.includes('/history') || window.location.pathname.includes('FEmusic_history');

            if (existingBtn) {
                if (!existingBtn.querySelector('.ytm-custom-sidebar-title')) {
                    existingBtn.innerHTML = `
                        <a class="yt-simple-endpoint style-scope ytmusic-guide-entry-renderer ytm-custom-sidebar-link" href="/browse/FEmusic_history">
                            <div class="ytm-custom-sidebar-icon">
                                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                    <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.896 8.896 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
                                </svg>
                            </div>
                            <span class="title style-scope ytmusic-guide-entry-renderer ytm-custom-sidebar-title">Histori</span>
                        </a>
                    `;
                }
                if (isHistPage) {
                    existingBtn.setAttribute('active', '');
                    existingBtn.classList.add('is-active-tab');
                } else {
                    existingBtn.removeAttribute('active');
                    existingBtn.classList.remove('is-active-tab');
                }
                isInjectingSidebar = false;
                return;
            }

            const templateEntry = guideSection.querySelector('ytmusic-guide-entry-renderer');
            if (!templateEntry) {
                isInjectingSidebar = false;
                return;
            }

            const newEntry = templateEntry.cloneNode(true);
            newEntry.id = 'ytm-custom-history-menu-item';
            newEntry.className = templateEntry.className + ' ytm-custom-sidebar-item';
            if (isHistPage) {
                newEntry.setAttribute('active', '');
                newEntry.classList.add('is-active-tab');
            } else {
                newEntry.removeAttribute('active');
                newEntry.classList.remove('is-active-tab');
            }

            newEntry.innerHTML = `
                <a class="yt-simple-endpoint style-scope ytmusic-guide-entry-renderer ytm-custom-sidebar-link" href="/browse/FEmusic_history">
                    <div class="ytm-custom-sidebar-icon">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                            <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.896 8.896 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
                        </svg>
                    </div>
                    <span class="title style-scope ytmusic-guide-entry-renderer ytm-custom-sidebar-title">Histori</span>
                </a>
            `;

            newEntry.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                navigateSPA('/browse/FEmusic_history', 'FEmusic_history');
            });

            guideSection.appendChild(newEntry);
        } catch (e) {
            console.error('[YTM Tracker] Failed to inject sidebar:', e);
        } finally {
            isInjectingSidebar = false;
        }
    }

    // === 2. HOMEPAGE SHELF INJECTION ===
    function isHomePage() {
        const path = window.location.pathname;
        return path === '/' || path === '' || path.includes('/browse/FEmusic_home') || 
               (path.startsWith('/browse') && !path.includes('FEmusic_library') && !path.includes('FEmusic_explore') && !path.includes('history'));
    }

    async function getShelfData() {
        if (!isExtensionAlive()) return { recent: [], top: [] };

        return new Promise((resolve) => {
            try {
                chrome.storage.local.get([STORAGE_KEY_HISTORY, STORAGE_KEY_STATS], (data) => {
                    if (!isExtensionAlive() || chrome.runtime.lastError) {
                        resolve({ recent: [], top: [] });
                        return;
                    }
                    const history = data[STORAGE_KEY_HISTORY] || [];
                    const stats = data[STORAGE_KEY_STATS] || {};

                    const cleanHistory = [];
                    const seenKeys = new Set();
                    const seenVideoIds = new Set();

                    for (const item of history) {
                        if (!item || !item.title) continue;
                        const vId = item.videoId && item.videoId.length === 11 ? item.videoId : null;
                        const normTitle = (item.title || '').trim().toLowerCase();
                        const normArtist = (item.artist || '').trim().toLowerCase();
                        const key = `${normTitle}___${normArtist}`;

                        if (vId && seenVideoIds.has(vId)) {
                            continue;
                        }
                        if (seenKeys.has(key)) {
                            continue;
                        }

                        if (vId) seenVideoIds.add(vId);
                        seenKeys.add(key);

                        const statMatch = stats[item.id] || (vId && stats[vId]) || Object.values(stats).find(s => 
                            (vId && s.videoId === vId) ||
                            (s.title && s.title.trim().toLowerCase() === normTitle && s.artist && s.artist.trim().toLowerCase() === normArtist)
                        );
                        if (statMatch) {
                            item.playCount = statMatch.playCount || item.playCount || 1;
                            if (!item.videoId && statMatch.videoId) item.videoId = statMatch.videoId;
                        }
                        cleanHistory.push(item);
                    }

                    const topPlayed = Object.values(stats)
                        .filter(item => item && item.title)
                        .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
                        .slice(0, 30);

                    resolve({
                        recent: cleanHistory.slice(0, 30),
                        top: topPlayed
                    });
                });
            } catch (err) {
                resolve({ recent: [], top: [] });
            }
        });
    }

    function createSongCardHtml(song, index) {
        const thumb = song.thumbnailUrl || 'https://music.youtube.com/img/on_platform_logo_dark.svg';
        const title = song.title || 'Lagu';
        const artist = song.artist || 'Artis';
        const playCount = song.playCount || 1;
        const relativeTime = song.playedAt ? formatRelativeTime(song.playedAt) : '';

        let subtitleParts = [artist];
        if (playCount > 1) {
            subtitleParts.push(`${playCount}x diputar`);
        }
        if (relativeTime) {
            subtitleParts.push(relativeTime);
        }
        const subtitleStr = subtitleParts.join(' • ');
        const watchHref = song.videoId ? `/watch?v=${song.videoId}` : (song.watchUrl || '#');

        return `
            <div class="ytm-tracker-card" data-video-id="${song.videoId || ''}" data-index="${index}">
                <div class="ytm-tracker-card-link" title="${title}">
                    <div class="ytm-tracker-thumb-wrapper">
                        <img class="ytm-tracker-thumb" src="${thumb}" alt="${title}" loading="lazy" />
                        <div class="ytm-tracker-center-play">
                            <svg viewBox="0 0 24 24" width="44" height="44" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                        </div>
                        <div class="ytm-tracker-play-overlay">
                            <div class="ytm-tracker-play-circle">
                                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                                    <path d="M8 5v14l11-7z"/>
                                </svg>
                            </div>
                        </div>
                        ${playCount > 1 ? `
                            <div class="ytm-tracker-counter-tag">
                                <svg class="ytm-tracker-flame-icon" viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                                    <path d="M19.48 12.35c-1.57-4.08-7.16-4.3-5.81-10.23.1-.44-.37-.78-.7-.52-2.37 1.87-4.53 4.64-4.6 7.61-.06 2.53 1.26 4.47 1.26 4.47s-1.87-.5-2.83-2.07c-.17-.28-.59-.26-.73.04-.98 2.06-.7 4.54.76 6.38 1.83 2.3 4.87 3.24 7.69 2.27 3.32-1.15 5.5-4.49 4.96-7.95zm-6.66 7.4c-.21.05-.42.08-.64.08-1.54 0-2.85-1-3.23-2.4-.16-.62-.1-1.28.17-1.84.18-.38.71-.34.82.07.35 1.34 1.54 2.34 2.97 2.39.26.01.44.25.35.5-.1.28-.24.55-.44.7z"/>
                                </svg>
                                <span>${playCount}x</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="ytm-tracker-card-info">
                        <div class="ytm-tracker-card-title" title="${title}">${title}</div>
                        <div class="ytm-tracker-card-subtitle" title="${subtitleStr}">${subtitleStr}</div>
                    </div>
                </div>
            </div>
        `;
    }

    let hasPendingRender = false;

    async function renderHomeShelf() {
        if (!isHomePage()) {
            const existingShelf = document.getElementById('ytm-tracker-home-shelf');
            if (existingShelf) existingShelf.remove();
            return;
        }

        if (isInjectingShelf) {
            hasPendingRender = true;
            return;
        }
        isInjectingShelf = true;

        try {
            const { recent, top } = await getShelfData();
            const displayList = currentTabMode === 'recent' ? recent : top;
            const firstNativeShelf = document.querySelector('ytmusic-carousel-shelf-renderer:not(.ytm-tracker-native-shelf)');
            let targetContainer = null;

            if (firstNativeShelf && firstNativeShelf.parentElement) {
                targetContainer = firstNativeShelf.parentElement;
            } else {
                targetContainer = document.querySelector('ytmusic-section-list-renderer #contents') ||
                                  document.querySelector('ytmusic-browse-response[page-type="MUSIC_PAGE_TYPE_HOMEPAGE"] ytmusic-section-list-renderer #contents') ||
                                  document.querySelector('ytmusic-browse-response #contents');
            }

            if (!targetContainer) {
                isInjectingShelf = false;
                return;
            }

            const { avatarSrc, userName } = getUserProfileInfo();

            let shelfEl = document.getElementById('ytm-tracker-home-shelf');
            if (!shelfEl) {
                shelfEl = document.createElement('div');
                shelfEl.id = 'ytm-tracker-home-shelf';
                shelfEl.className = 'ytm-tracker-native-shelf';
            }

            // Ensure shelf is placed right before the first native shelf in the same centered parent container
            if (firstNativeShelf && firstNativeShelf.parentElement === targetContainer) {
                if (shelfEl.nextElementSibling !== firstNativeShelf || shelfEl.parentElement !== targetContainer) {
                    targetContainer.insertBefore(shelfEl, firstNativeShelf);
                }
            } else if (shelfEl.parentElement !== targetContainer) {
                if (targetContainer.firstChild) {
                    targetContainer.insertBefore(shelfEl, targetContainer.firstChild);
                } else {
                    targetContainer.appendChild(shelfEl);
                }
            }

            // Dynamically match exact responsive side spacing (e.g. 98.5px margin) of native header-group
            const nativeHeaderGroup = document.querySelector('ytmusic-carousel-shelf-renderer:not(.ytm-tracker-native-shelf) #header-group, ytmusic-carousel-shelf-renderer:not(.ytm-tracker-native-shelf) ytmusic-carousel-shelf-basic-header-renderer');
            if (nativeHeaderGroup) {
                const comp = window.getComputedStyle(nativeHeaderGroup);
                const sideSpacing = parseFloat(comp.marginLeft) > 0 ? comp.marginLeft : (parseFloat(comp.paddingLeft) > 0 ? comp.paddingLeft : null);
                if (sideSpacing) {
                    shelfEl.style.setProperty('padding-left', sideSpacing, 'important');
                    shelfEl.style.setProperty('padding-right', sideSpacing, 'important');
                }
            }

            // 1:1 Native Header & Carousel Layout
            const mainTitleText = currentTabMode === 'recent' ? 'Terakhir diputar' : 'Paling sering diputar';

            const cardsContainer = shelfEl.querySelector('#ytm-tracker-cards-container');
            const existingSlider = shelfEl.querySelector('#ytm-shelf-slider-container');
            if (cardsContainer && existingSlider) {
                // In-place live update: update cards instantly without re-creating outer DOM
                cardsContainer.innerHTML = displayList.length > 0 ? displayList.map((song, idx) => createSongCardHtml(song, idx)).join('') : `
                    <div class="ytm-native-empty-box">
                        <p>🎵 Belum ada lagu tercatat. Putar lagu apa saja di YouTube Music untuk melihat riwayat nyatamu di sini!</p>
                    </div>
                `;
            } else {
                shelfEl.innerHTML = `
                    <div class="ytm-native-header-row">
                        <div class="ytm-native-title-group-horizontal">
                            ${avatarSrc ? `
                                <img class="ytm-native-header-avatar" src="${avatarSrc}" alt="Avatar" />
                            ` : `
                                <div class="ytm-native-header-avatar-placeholder">
                                    <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                                    </svg>
                                </div>
                            `}
                            <div class="ytm-native-title-texts">
                                <div class="ytm-native-strapline">${userName}</div>
                                <h2 class="ytm-native-main-title">${mainTitleText}</h2>
                            </div>
                        </div>
                        <div class="ytm-native-actions-group">
                            <button class="ytm-native-more-btn" id="ytm-go-history-btn">
                                Selengkapnya
                            </button>
                            <div class="ytm-native-arrow-controls">
                                <button class="ytm-native-nav-btn" id="ytm-shelf-prev" title="Sebelumnya">
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                                    </svg>
                                </button>
                                <button class="ytm-native-nav-btn" id="ytm-shelf-next" title="Berikutnya">
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="ytm-native-carousel-items" id="ytm-tracker-cards-container">
                        ${displayList.length > 0 ? displayList.map((song, idx) => createSongCardHtml(song, idx)).join('') : `
                            <div class="ytm-native-empty-box">
                                <p>🎵 Belum ada lagu tercatat. Putar lagu apa saja di YouTube Music untuk melihat riwayat nyatamu di sini!</p>
                            </div>
                        `}
                    </div>

                    <div class="ytm-native-slider-container" id="ytm-shelf-slider-container">
                        <button class="ytm-native-slider-arrow ytm-native-slider-prev" id="ytm-slider-prev" title="Sebelumnya">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                            </svg>
                        </button>
                        <div class="ytm-native-slider-track" id="ytm-slider-track">
                            <div class="ytm-native-slider-thumb" id="ytm-slider-thumb"></div>
                        </div>
                        <button class="ytm-native-slider-arrow ytm-native-slider-next" id="ytm-slider-next" title="Berikutnya">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                            </svg>
                        </button>
                    </div>
                `;
            }

            // More / Selengkapnya button click -> opens History smoothly
            const moreBtn = shelfEl.querySelector('#ytm-go-history-btn');
            if (moreBtn) {
                moreBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigateSPA('/browse/FEmusic_history', 'FEmusic_history');
                });
            }

            // Carousel, Header Buttons & Bottom Slider Controls Synchronization
            const carousel = shelfEl.querySelector('#ytm-tracker-cards-container');
            const prevBtn = shelfEl.querySelector('#ytm-shelf-prev');
            const nextBtn = shelfEl.querySelector('#ytm-shelf-next');
            const sliderContainer = shelfEl.querySelector('#ytm-shelf-slider-container');
            const sliderTrack = shelfEl.querySelector('#ytm-slider-track');
            const sliderThumb = shelfEl.querySelector('#ytm-slider-thumb');
            const sliderPrev = shelfEl.querySelector('#ytm-slider-prev');
            const sliderNext = shelfEl.querySelector('#ytm-slider-next');

            if (carousel && sliderContainer && sliderTrack && sliderThumb) {
                let isDragging = false;
                let dragStartX = 0;
                let dragStartScrollLeft = 0;

                const updateSliderAndButtons = () => {
                    const scrollWidth = carousel.scrollWidth;
                    const clientWidth = carousel.clientWidth;
                    const maxScrollLeft = scrollWidth - clientWidth;

                    // If items don't overflow, hide bottom slider
                    if (maxScrollLeft <= 5) {
                        sliderContainer.style.display = 'none';
                        if (prevBtn) prevBtn.setAttribute('disabled', 'true');
                        if (nextBtn) nextBtn.setAttribute('disabled', 'true');
                        return;
                    }

                    sliderContainer.style.display = 'flex';

                    // Update Top and Bottom Navigation Button states
                    const isAtStart = carousel.scrollLeft <= 5;
                    const isAtEnd = carousel.scrollLeft >= maxScrollLeft - 5;

                    if (prevBtn) {
                        if (isAtStart) prevBtn.setAttribute('disabled', 'true');
                        else prevBtn.removeAttribute('disabled');
                    }
                    if (sliderPrev) {
                        if (isAtStart) sliderPrev.setAttribute('disabled', 'true');
                        else sliderPrev.removeAttribute('disabled');
                    }

                    if (nextBtn) {
                        if (isAtEnd) nextBtn.setAttribute('disabled', 'true');
                        else nextBtn.removeAttribute('disabled');
                    }
                    if (sliderNext) {
                        if (isAtEnd) sliderNext.setAttribute('disabled', 'true');
                        else sliderNext.removeAttribute('disabled');
                    }

                    // Update Slider Thumb position and size
                    if (!isDragging) {
                        const trackWidth = sliderTrack.clientWidth;
                        if (trackWidth <= 0) return;

                        const visibleRatio = clientWidth / scrollWidth;
                        const thumbWidth = Math.max(36, Math.min(trackWidth, trackWidth * visibleRatio));
                        const maxThumbLeft = trackWidth - thumbWidth;
                        const scrollRatio = maxScrollLeft > 0 ? (carousel.scrollLeft / maxScrollLeft) : 0;
                        const thumbLeft = Math.max(0, Math.min(maxThumbLeft, scrollRatio * maxThumbLeft));

                        sliderThumb.style.width = `${thumbWidth}px`;
                        sliderThumb.style.transform = `translateX(${thumbLeft}px)`;
                    }
                };

                // Scroll Left / Right Helper
                const scrollStep = (direction) => {
                    const scrollAmount = Math.max(340, carousel.clientWidth * 0.75);
                    carousel.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
                };

                if (prevBtn) prevBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); scrollStep(-1); };
                if (nextBtn) nextBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); scrollStep(1); };
                if (sliderPrev) sliderPrev.onclick = (e) => { e.preventDefault(); e.stopPropagation(); scrollStep(-1); };
                if (sliderNext) sliderNext.onclick = (e) => { e.preventDefault(); e.stopPropagation(); scrollStep(1); };

                // Track click to jump
                sliderTrack.onpointerdown = (e) => {
                    if (e.target === sliderThumb) return;
                    e.preventDefault();
                    e.stopPropagation();

                    const rect = sliderTrack.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const trackWidth = rect.width;
                    const clickRatio = Math.max(0, Math.min(1, clickX / trackWidth));

                    const maxScrollLeft = carousel.scrollWidth - carousel.clientWidth;
                    carousel.scrollTo({
                        left: clickRatio * maxScrollLeft,
                        behavior: 'smooth'
                    });
                };

                // Thumb Drag handling (Pointer Events)
                sliderThumb.onpointerdown = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    isDragging = true;
                    sliderThumb.classList.add('is-dragging');
                    dragStartX = e.clientX;
                    dragStartScrollLeft = carousel.scrollLeft;

                    try {
                        sliderThumb.setPointerCapture(e.pointerId);
                    } catch (_) {}

                    const onPointerMove = (moveEvent) => {
                        if (!isDragging) return;
                        const deltaX = moveEvent.clientX - dragStartX;
                        const trackWidth = sliderTrack.clientWidth;
                        const thumbWidth = sliderThumb.clientWidth;
                        const maxThumbLeft = trackWidth - thumbWidth;
                        const maxScrollLeft = carousel.scrollWidth - carousel.clientWidth;

                        if (maxThumbLeft > 0 && maxScrollLeft > 0) {
                            const startThumbLeft = (dragStartScrollLeft / maxScrollLeft) * maxThumbLeft;
                            const targetThumbLeft = Math.max(0, Math.min(maxThumbLeft, startThumbLeft + deltaX));
                            const targetScrollLeft = Math.max(0, Math.min(maxScrollLeft, (targetThumbLeft / maxThumbLeft) * maxScrollLeft));

                            sliderThumb.style.transform = `translateX(${targetThumbLeft}px)`;
                            carousel.scrollLeft = targetScrollLeft;
                        }
                    };

                    const onPointerUp = (upEvent) => {
                        isDragging = false;
                        sliderThumb.classList.remove('is-dragging');
                        try {
                            sliderThumb.releasePointerCapture(upEvent.pointerId);
                        } catch (_) {}
                        window.removeEventListener('pointermove', onPointerMove);
                        window.removeEventListener('pointerup', onPointerUp);
                        window.removeEventListener('pointercancel', onPointerUp);
                        updateSliderAndButtons();
                    };

                    window.addEventListener('pointermove', onPointerMove);
                    window.addEventListener('pointerup', onPointerUp);
                    window.addEventListener('pointercancel', onPointerUp);
                };

                carousel.addEventListener('scroll', updateSliderAndButtons, { passive: true });
                window.addEventListener('resize', updateSliderAndButtons, { passive: true });
                setTimeout(updateSliderAndButtons, 100);
            }

            // Card click to play listeners (Direct Playback)
            const cards = shelfEl.querySelectorAll('.ytm-tracker-card');
            cards.forEach(card => {
                const idx = parseInt(card.getAttribute('data-index'), 10);
                const song = displayList[idx];

                card.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    playTrack(song);
                });
            });

        } catch (err) {
            console.error('[YTM Tracker] Render shelf error:', err);
        } finally {
            isInjectingShelf = false;
            if (hasPendingRender) {
                hasPendingRender = false;
                renderHomeShelf();
            }
        }
    }

    // === 3. LIFECYCLE & EVENT LISTENERS ===
    function onDomOrRouteUpdate() {
        injectSidebarHistoryButton();
        if (isHomePage()) {
            renderHomeShelf();
        } else {
            const existingShelf = document.getElementById('ytm-tracker-home-shelf');
            if (existingShelf) existingShelf.remove();
        }
    }

    // Real-time live update when song changes or count increases
    window.addEventListener('ytm-tracker-song-updated', () => {
        if (isHomePage()) {
            renderHomeShelf();
        }
    });

    if (isExtensionAlive() && chrome.storage && chrome.storage.onChanged) {
        try {
            chrome.storage.onChanged.addListener((changes, areaName) => {
                if (areaName === 'local' && (changes[STORAGE_KEY_HISTORY] || changes[STORAGE_KEY_STATS])) {
                    if (isHomePage()) {
                        renderHomeShelf();
                    }
                }
            });
        } catch (e) {}
    }

    window.addEventListener('yt-navigate-finish', onDomOrRouteUpdate);
    window.addEventListener('yt-page-data-updated', onDomOrRouteUpdate);
    window.addEventListener('popstate', onDomOrRouteUpdate);
    window.addEventListener('resize', onDomOrRouteUpdate, { passive: true });

    const observer = new MutationObserver(() => {
        if (!isExtensionAlive()) return;
        injectSidebarHistoryButton();
        if (isHomePage() && !document.getElementById('ytm-tracker-home-shelf')) {
            renderHomeShelf();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    const intervalId = setInterval(() => {
        if (!isExtensionAlive()) {
            clearInterval(intervalId);
            return;
        }
        injectSidebarHistoryButton();
        if (isHomePage() && !document.getElementById('ytm-tracker-home-shelf')) {
            renderHomeShelf();
        }
    }, 2500);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onDomOrRouteUpdate);
    } else {
        setTimeout(onDomOrRouteUpdate, 300);
    }

    console.log('[YTM Tracker] Clean 1:1 Native Home Injector ready.');
})();
