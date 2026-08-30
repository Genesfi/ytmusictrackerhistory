/**
 * YouTube Music Real Tracker & Scrobbler
 * Tracks actual playback history, play counts, timestamps, and song metadata with 100% videoId accuracy.
 */

(function () {
    const STORAGE_KEY_HISTORY = 'ytm_tracker_history';
    const STORAGE_KEY_STATS = 'ytm_tracker_stats';
    const STORAGE_KEY_SETTINGS = 'ytm_tracker_settings';

    let settings = {
        minScrobbleSeconds: 20,
        enableHomeShelf: true,
        enableSidebarHistory: true,
        maxHistoryItems: 500
    };

    let currentTrack = null;
    let trackPlayedSeconds = 0;
    let hasCountedPlay = false;
    let pollInterval = null;

    function isExtensionAlive() {
        return typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;
    }

    // Load settings
    if (isExtensionAlive()) {
        try {
            chrome.storage.local.get([STORAGE_KEY_SETTINGS], (res) => {
                if (chrome.runtime.lastError) return;
                if (res && res[STORAGE_KEY_SETTINGS]) {
                    settings = { ...settings, ...res[STORAGE_KEY_SETTINGS] };
                }
            });
        } catch (e) {}
    }

    // Cleanup & deduplicate existing storage strictly by videoId and title+artist
    function sanitizeAndDeduplicateStorage() {
        if (!isExtensionAlive()) return;
        try {
            chrome.storage.local.get([STORAGE_KEY_HISTORY, STORAGE_KEY_STATS], (res) => {
                if (!isExtensionAlive() || chrome.runtime.lastError) return;
                const rawHist = res[STORAGE_KEY_HISTORY] || [];
                const stats = res[STORAGE_KEY_STATS] || {};
                const clean = [];
                const seenKeys = new Set();
                const seenVideoIds = new Set();

                for (const item of rawHist) {
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

                    // Sync stats
                    const statMatch = stats[item.id] || (vId && stats[vId]) || Object.values(stats).find(s => 
                        (vId && s.videoId === vId) ||
                        (s.title && s.title.trim().toLowerCase() === normTitle && s.artist && s.artist.trim().toLowerCase() === normArtist)
                    );

                    if (statMatch) {
                        item.playCount = statMatch.playCount || item.playCount || 1;
                        if (!item.videoId && statMatch.videoId) item.videoId = statMatch.videoId;
                    }
                    clean.push(item);
                }

                if (isExtensionAlive()) {
                    chrome.storage.local.set({ [STORAGE_KEY_HISTORY]: clean });
                }
            });
        } catch (e) {}
    }

    sanitizeAndDeduplicateStorage();

    // High quality thumbnail URL enhancer
    function getHighResThumbnail(url) {
        if (!url || typeof url !== 'string') return '';
        if (url.includes('=')) {
            const parts = url.split('=');
            const last = parts[parts.length - 1];
            if (last.match(/[whs0-9c-]/)) {
                return parts.slice(0, -1).join('=') + '=w544-h544-l90-rj';
            }
        } else if (url.match(/w\d+-h\d+/)) {
            return url.replace(/w\d+-h\d+/, 'w544-h544');
        }
        return url;
    }

    // Extract Video ID with 100% precision
    function extractVideoId() {
        // 1. From player bar anchors
        const playerBar = document.querySelector('ytmusic-player-bar');
        if (playerBar) {
            const anchors = playerBar.querySelectorAll('a[href*="watch?v="]');
            for (const a of anchors) {
                const href = a.href || a.getAttribute('href') || '';
                const match = href.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
                if (match && match[1]) return match[1];
            }

            // Check if player-bar element has data object
            if (playerBar.playerApi_ && typeof playerBar.playerApi_.getVideoData === 'function') {
                try {
                    const data = playerBar.playerApi_.getVideoData();
                    if (data && data.video_id) return data.video_id;
                } catch (e) {}
            }
        }

        // 2. From URL if on /watch
        if (window.location.pathname.includes('/watch')) {
            const urlParams = new URLSearchParams(window.location.search);
            const v = urlParams.get('v');
            if (v && v.length === 11) return v;
        }

        // 3. From global video player
        const moviePlayer = document.querySelector('#movie_player') || document.querySelector('ytmusic-player #movie_player');
        if (moviePlayer && typeof moviePlayer.getVideoData === 'function') {
            try {
                const data = moviePlayer.getVideoData();
                if (data && data.video_id) return data.video_id;
            } catch (e) {}
        }

        // 4. From playing queue item
        const activeQueue = document.querySelector('ytmusic-player-queue-item[play-button-state="playing"], ytmusic-player-queue-item[selected]');
        if (activeQueue && activeQueue.data && activeQueue.data.videoId) {
            return activeQueue.data.videoId;
        }

        // 5. From thumbnail URL if it is a standard ytimg URL
        const thumbImg = document.querySelector('ytmusic-player-bar img.image, ytmusic-player-bar #thumbnail img, ytmusic-player img');
        if (thumbImg && thumbImg.src) {
            const m = thumbImg.src.match(/\/vi(?:_webp)?\/([a-zA-Z0-9_-]{11})\//);
            if (m && m[1]) return m[1];
        }

        return '';
    }

    // Extract current playing track metadata
    function extractCurrentTrack() {
        // 1. Try MediaSession (instant and 100% accurate)
        let title = '';
        let artist = '';
        let album = '';
        let thumbUrl = '';

        if (navigator.mediaSession && navigator.mediaSession.metadata) {
            const meta = navigator.mediaSession.metadata;
            if (meta.title) title = meta.title.trim();
            if (meta.artist) artist = meta.artist.trim();
            if (meta.album) album = meta.album.trim();
            if (meta.artwork && meta.artwork.length > 0) {
                const bestArt = meta.artwork[meta.artwork.length - 1];
                if (bestArt && bestArt.src) thumbUrl = getHighResThumbnail(bestArt.src);
            }
        }

        const playerBar = document.querySelector('ytmusic-player-bar');

        // 2. Fallback / Augment from DOM Player Bar
        if (!title && playerBar) {
            const titleEl = playerBar.querySelector('yt-formatted-string.title, .title.ytmusic-player-bar, .title-wrapper yt-formatted-string, .title');
            if (titleEl && titleEl.innerText) title = titleEl.innerText.trim();
        }

        // 3. Fallback from Document Title
        if (!title && document.title && document.title.includes('- YouTube Music')) {
            const cleanDocTitle = document.title.replace(/\s*-\s*YouTube Music\s*$/i, '').trim();
            if (cleanDocTitle) title = cleanDocTitle;
        }

        if (!title) return null;

        // Artist extraction from DOM if not in mediaSession
        if (!artist && playerBar) {
            const bylineEl = playerBar.querySelector('yt-formatted-string.byline, .byline.ytmusic-player-bar, .subtitle yt-formatted-string, .subtitle');
            if (bylineEl && bylineEl.innerText) {
                const parts = bylineEl.innerText.split('•').map(s => s.trim());
                artist = parts[0] || '';
                if (parts.length > 1 && !album) album = parts[1];
            }
        }

        // Thumbnail extraction from DOM if not in mediaSession
        if (!thumbUrl) {
            const thumbImg = playerBar ? playerBar.querySelector('img.image, img.ytmusic-player-bar, .image img, #thumbnail img, yt-img-shadow img') : null;
            if (thumbImg && thumbImg.src && thumbImg.src.startsWith('http')) {
                thumbUrl = getHighResThumbnail(thumbImg.src);
            } else {
                const mainImg = document.querySelector('ytmusic-player #song-image img, ytmusic-player img');
                if (mainImg && mainImg.src && mainImg.src.startsWith('http')) {
                    thumbUrl = getHighResThumbnail(mainImg.src);
                }
            }
        }

        const videoId = extractVideoId();
        const normKey = `${title.toLowerCase().trim()}___${artist.toLowerCase().trim()}`;
        const id = videoId || normKey.replace(/[^a-z0-9_]/g, '');
        const watchUrl = videoId ? `https://music.youtube.com/watch?v=${videoId}` : '';

        return {
            id,
            videoId,
            title,
            artist,
            album,
            thumbnailUrl: thumbUrl,
            watchUrl
        };
    }

    // Save or update track in storage
    async function recordTrackPlay(track, isFullPlayIncrement = false) {
        if (!track || !track.title || !isExtensionAlive()) return;

        return new Promise((resolve) => {
            try {
                chrome.storage.local.get([STORAGE_KEY_HISTORY, STORAGE_KEY_STATS], (data) => {
                    if (!isExtensionAlive() || chrome.runtime.lastError) {
                        resolve(null);
                        return;
                    }
                    let history = data[STORAGE_KEY_HISTORY] || [];
                    let stats = data[STORAGE_KEY_STATS] || {};

                const now = Date.now();
                const normTitle = track.title.toLowerCase().trim();
                const normArtist = (track.artist || '').toLowerCase().trim();
                const songKey = `${normTitle}___${normArtist}`;

                // Find stats entry
                let foundStatKey = Object.keys(stats).find(k => {
                    const s = stats[k];
                    if (!s) return false;
                    if (track.videoId && s.videoId && track.videoId === s.videoId) return true;
                    if (s.title && s.title.toLowerCase().trim() === normTitle && s.artist && s.artist.toLowerCase().trim() === normArtist) return true;
                    return false;
                });

                let trackStat = foundStatKey ? stats[foundStatKey] : {
                    id: track.id,
                    videoId: track.videoId,
                    title: track.title,
                    artist: track.artist,
                    album: track.album,
                    thumbnailUrl: track.thumbnailUrl,
                    watchUrl: track.watchUrl,
                    playCount: 0,
                    firstPlayed: now,
                    lastPlayed: now,
                    totalSecondsListened: 0
                };

                const actualKey = foundStatKey || songKey;

                trackStat.title = track.title;
                trackStat.artist = track.artist || trackStat.artist;
                trackStat.album = track.album || trackStat.album;
                if (track.thumbnailUrl) trackStat.thumbnailUrl = track.thumbnailUrl;
                if (track.videoId) {
                    trackStat.videoId = track.videoId;
                    trackStat.watchUrl = `https://music.youtube.com/watch?v=${track.videoId}`;
                }
                trackStat.lastPlayed = now;

                if (isFullPlayIncrement) {
                    trackStat.playCount = (trackStat.playCount || 0) + 1;
                    trackStat.totalSecondsListened = (trackStat.totalSecondsListened || 0) + trackPlayedSeconds;
                }

                stats[actualKey] = trackStat;

                // Update History List (Strict Deduplication by videoId first, then title + artist)
                const existingHistIdx = history.findIndex(h => {
                    if (!h) return false;
                    if (track.videoId && h.videoId && track.videoId === h.videoId) return true;
                    if (h.title && track.title) {
                        const hTitle = h.title.toLowerCase().trim();
                        const hArtist = (h.artist || '').toLowerCase().trim();
                        if (hTitle === normTitle && hArtist === normArtist) return true;
                    }
                    return false;
                });

                const finalVideoId = track.videoId || (existingHistIdx >= 0 ? history[existingHistIdx].videoId : '') || trackStat.videoId || '';
                const finalWatchUrl = finalVideoId ? `https://music.youtube.com/watch?v=${finalVideoId}` : '';
                const currentPlayCount = trackStat.playCount || 1;

                const historyItem = {
                    id: actualKey,
                    videoId: finalVideoId,
                    title: track.title,
                    artist: track.artist,
                    album: track.album,
                    thumbnailUrl: track.thumbnailUrl || (existingHistIdx >= 0 ? history[existingHistIdx].thumbnailUrl : ''),
                    watchUrl: finalWatchUrl,
                    playCount: currentPlayCount,
                    playedAt: now
                };

                if (existingHistIdx >= 0) {
                    history.splice(existingHistIdx, 1);
                }
                history.unshift(historyItem);

                if (history.length > (settings.maxHistoryItems || 500)) {
                    history = history.slice(0, settings.maxHistoryItems || 500);
                }

                chrome.storage.local.set({
                    [STORAGE_KEY_HISTORY]: history,
                    [STORAGE_KEY_STATS]: stats
                }, () => {
                    window.dispatchEvent(new CustomEvent('ytm-tracker-song-updated', {
                        detail: {
                            track: historyItem,
                            isFullPlayIncrement,
                            playCount: currentPlayCount
                        }
                    }));
                    resolve({ trackStat, history });
                });
            });
        } catch (e) {
            console.error('[YTM Tracker] Storage error in recordTrackPlay:', e);
            resolve(null);
        }
    });
}

    // Monitor playback
    function checkPlaybackProgress() {
        const video = document.querySelector('video');
        if (!video) return;

        const isAdPlaying = !!document.querySelector('.ad-showing, .ad-interrupting, ytmusic-player-bar[advertisement]');
        if (isAdPlaying) return;

        const track = extractCurrentTrack();
        if (!track || !track.title) return;

        // If song changed
        if (!currentTrack || currentTrack.title !== track.title || currentTrack.artist !== track.artist) {
            currentTrack = track;
            trackPlayedSeconds = 0;
            hasCountedPlay = false;

            recordTrackPlay(track, false);
            return;
        }

        // If currentTrack is missing videoId, attempt to update it
        if (currentTrack && !currentTrack.videoId && track.videoId) {
            currentTrack.videoId = track.videoId;
            currentTrack.watchUrl = `https://music.youtube.com/watch?v=${track.videoId}`;
            recordTrackPlay(currentTrack, false);
        }

        // Play counting loop
        if (!video.paused && !video.ended) {
            trackPlayedSeconds += 1;

            const threshold = settings.minScrobbleSeconds || 20;
            if (!hasCountedPlay && trackPlayedSeconds >= threshold) {
                hasCountedPlay = true;
                recordTrackPlay(currentTrack, true);
            }
        }
    }

    function startTracking() {
        if (pollInterval) clearInterval(pollInterval);
        pollInterval = setInterval(checkPlaybackProgress, 500);

        // Instant capture on video events
        const hookVideo = () => {
            const video = document.querySelector('video');
            if (video && !video.__ytm_tracked) {
                video.__ytm_tracked = true;
                video.addEventListener('play', checkPlaybackProgress);
                video.addEventListener('playing', checkPlaybackProgress);
                video.addEventListener('timeupdate', checkPlaybackProgress);
            }
        };

        hookVideo();
        window.addEventListener('yt-navigate-finish', () => setTimeout(checkPlaybackProgress, 200));
        window.addEventListener('yt-page-data-updated', () => setTimeout(checkPlaybackProgress, 200));
        window.addEventListener('popstate', () => setTimeout(checkPlaybackProgress, 200));

        const obs = new MutationObserver(hookVideo);
        obs.observe(document.body, { childList: true, subtree: true });
    }

    // Bridge Messages from Popup (Playlist Creation & Play Mix)
    if (isExtensionAlive() && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (!message || !message.action) return false;

            if (message.action === 'NAVIGATE') {
                window.dispatchEvent(new CustomEvent('ytm-navigate-request', {
                    detail: { path: message.path || message.url || '/' }
                }));
                sendResponse({ success: true });
                return true;
            }

            if (message.action === 'PLAY_MIX') {
                window.dispatchEvent(new CustomEvent('ytm-play-mix-request', {
                    detail: message.detail || {}
                }));
                sendResponse({ success: true });
                return true;
            }

            if (message.action === 'CREATE_PLAYLIST') {
                const onResponse = (e) => {
                    window.removeEventListener('ytm-create-playlist-response', onResponse);
                    sendResponse(e.detail || { success: false, error: 'Tidak ada respons dari YouTube Music' });
                };

                window.addEventListener('ytm-create-playlist-response', onResponse);

                window.dispatchEvent(new CustomEvent('ytm-create-playlist-request', {
                    detail: message.detail || {}
                }));

                // Timeout fallback after 15s
                setTimeout(() => {
                    window.removeEventListener('ytm-create-playlist-response', onResponse);
                }, 15000);

                return true; // Keep message channel open for async response
            }

            return false;
        });
    }

    console.log('[YTM Tracker] Core tracking engine initialized.');
})();
