/**
 * YouTube Music SPA Navigation & Playback Bridge (Runs in MAIN World)
 * Direct access to Polymer Router, Movie Player, & ytmusic-app instance
 */

(function () {
    if (window.__ytm_tracker_bridge_installed) return;
    window.__ytm_tracker_bridge_installed = true;

    // 1. Generic SPA Navigate Request (Instant Playback & Smooth Route Navigation)
    window.addEventListener('ytm-navigate-request', function (e) {
        const detail = e.detail || {};
        const { path, videoId, browseId } = detail;
        const app = document.querySelector('ytmusic-app');

        // A. Watch Navigation (Direct Song Playback without reload)
        let targetVideoId = videoId;
        if (!targetVideoId && path && (path.includes('watch') || path.includes('v='))) {
            const m = path.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
            if (m) targetVideoId = m[1];
        }

        if (targetVideoId) {
            const moviePlayer = document.getElementById('movie_player') || document.querySelector('ytmusic-player #movie_player');
            if (moviePlayer && typeof moviePlayer.loadVideoById === 'function') {
                try {
                    moviePlayer.loadVideoById(targetVideoId);
                    if (typeof moviePlayer.playVideo === 'function') moviePlayer.playVideo();
                } catch (_) {}
            }

            const watchDetail = {
                endpoint: {
                    watchEndpoint: {
                        videoId: targetVideoId
                    }
                }
            };

            if (app) {
                try {
                    app.dispatchEvent(new CustomEvent('yt-navigate', {
                        bubbles: true,
                        composed: true,
                        detail: watchDetail
                    }));
                } catch (_) {}

                if (typeof app.navigate_ === 'function') {
                    try {
                        app.navigate_(`/watch?v=${targetVideoId}`);
                        return;
                    } catch (_) {}
                }
            }

            try {
                window.dispatchEvent(new CustomEvent('yt-navigate', {
                    bubbles: true,
                    composed: true,
                    detail: watchDetail
                }));
            } catch (_) {}

            try {
                window.history.pushState({}, '', `/watch?v=${targetVideoId}`);
                window.dispatchEvent(new CustomEvent('yt-navigate-finish'));
            } catch (_) {}
            return;
        }

        // B. Browse / History Navigation (Smooth SPA)
        const targetBrowseId = browseId || (path && path.includes('history') ? 'FEmusic_history' : null);
        const targetPath = path || (targetBrowseId === 'FEmusic_history' ? '/browse/FEmusic_history' : '/history');

        if (app) {
            if (targetBrowseId) {
                try {
                    app.dispatchEvent(new CustomEvent('yt-navigate', {
                        bubbles: true,
                        composed: true,
                        detail: {
                            endpoint: {
                                browseEndpoint: {
                                    browseId: targetBrowseId
                                }
                            }
                        }
                    }));
                } catch (_) {}
            }

            if (typeof app.navigate_ === 'function') {
                try {
                    app.navigate_(targetPath);
                    return;
                } catch (_) {}
            }
        }

        // C. Fallback smooth history push
        try {
            window.history.pushState({}, '', targetPath);
            window.dispatchEvent(new CustomEvent('yt-navigate-finish'));
            window.dispatchEvent(new CustomEvent('yt-page-data-updated'));
        } catch (_) {}
    });

    // Helper: get cookie value
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    // Helper: SHA-1 hex
    async function sha1Hex(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hash = await crypto.subtle.digest('SHA-1', data);
        return Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    // Helper: build authenticated InnerTube headers
    async function buildAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'X-YouTube-Client-Name': (window.ytcfg && window.ytcfg.get('INNERTUBE_CLIENT_NAME')) || '67',
            'X-YouTube-Client-Version': (window.ytcfg && window.ytcfg.get('INNERTUBE_CLIENT_VERSION')) || '1.20240101.01.00',
            'X-Origin': 'https://music.youtube.com'
        };

        const sapisid = getCookie('SAPISID') || getCookie('__Secure-3PAPISID') || getCookie('__Secure-1PAPISID') || getCookie('PAPISID');
        if (sapisid) {
            const timestamp = Math.floor(Date.now() / 1000);
            const origin = 'https://music.youtube.com';
            const hash = await sha1Hex(`${timestamp} ${sapisid} ${origin}`);
            headers['Authorization'] = `SAPISIDHASH ${timestamp}_${hash}`;
        }

        if (window.ytcfg) {
            const pageId = window.ytcfg.get('DELEGATED_SESSION_ID') || window.ytcfg.get('DATASYNC_ID');
            if (pageId) headers['X-Goog-PageId'] = pageId;

            const sessionIndex = window.ytcfg.get('SESSION_INDEX');
            if (sessionIndex !== undefined && sessionIndex !== null) {
                headers['X-Goog-AuthUser'] = String(sessionIndex);
            }

            const visitorData = window.ytcfg.get('VISITOR_DATA');
            if (visitorData) headers['X-Goog-Visitor-Id'] = visitorData;
        }

        return headers;
    }

    // Cached mood playlist map to avoid duplicate creations
    const moodPlaylistCache = {};

    // Core Helper: Create or fetch playlist via InnerTube
    async function createInnerTubePlaylist(title, description, videoIds) {
        if (typeof window.ytcfg === 'undefined') {
            throw new Error('Konfigurasi YouTube Music (ytcfg) tidak ditemukan. Pastikan halaman YouTube Music terbuka.');
        }

        const apiKey = window.ytcfg.get('INNERTUBE_API_KEY') || '';
        const context = window.ytcfg.get('INNERTUBE_CONTEXT') || {};
        const headers = await buildAuthHeaders();

        // Step A: Call /youtubei/v1/playlist/create
        const createPayload = {
            context: context,
            title: title || 'Mood Playlist - YT Tracker',
            description: description || 'Dibuat otomatis oleh YT Music Tracker',
            privacyStatus: 'PRIVATE',
            videoIds: videoIds || []
        };

        const createRes = await fetch(`/youtubei/v1/playlist/create?key=${apiKey}&prettyPrint=false`, {
            method: 'POST',
            credentials: 'include',
            headers: headers,
            body: JSON.stringify(createPayload)
        });

        const createData = await createRes.json();
        const playlistId = createData.playlistId;

        if (!playlistId) {
            const errMsg = createData.error ? (createData.error.message || JSON.stringify(createData.error)) : 'Gagal membuat playlist';
            throw new Error(errMsg);
        }

        // Step B: Ensure all videoIds are added into the playlist
        if (videoIds && videoIds.length > 0) {
            try {
                await fetch(`/youtubei/v1/browse/edit_playlist?key=${apiKey}&prettyPrint=false`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: headers,
                    body: JSON.stringify({
                        context: context,
                        playlistId: playlistId,
                        actions: videoIds.map(vId => ({
                            addedVideoId: vId,
                            action: 'ACTION_ADD_VIDEO'
                        }))
                    })
                });
            } catch (editErr) {
                console.warn('[YTM Bridge] edit_playlist warning:', editErr);
            }
        }

        if (title) {
            moodPlaylistCache[title] = playlistId;
        }

        return playlistId;
    }

    // 2. Play Mix Request (Creates/Gets Mood Playlist and loads the entire queue into Up Next)
    window.addEventListener('ytm-play-mix-request', async function (e) {
        const detail = e.detail || {};
        const videoIds = detail.videoIds || [];
        const title = detail.title || 'Mood Mix - YT Tracker';
        const description = detail.description || 'Antrean Mood Mix dibuat oleh YT Music Tracker';

        if (!videoIds || videoIds.length === 0) return;
        const firstId = videoIds[0];

        try {
            let playlistId = moodPlaylistCache[title] || null;

            if (!playlistId) {
                playlistId = await createInnerTubePlaylist(title, description, videoIds);
            }

            const targetUrl = playlistId ? `/watch?v=${firstId}&list=${playlistId}` : `/watch?v=${firstId}`;

            // Trigger YouTube Music native SPA watchEndpoint with full playlist queue
            const watchDetail = {
                endpoint: {
                    watchEndpoint: {
                        videoId: firstId,
                        playlistId: playlistId || undefined
                    }
                }
            };

            const app = document.querySelector('ytmusic-app');
            if (app) {
                try {
                    app.dispatchEvent(new CustomEvent('yt-navigate', {
                        bubbles: true,
                        composed: true,
                        detail: watchDetail
                    }));
                } catch (err) {}

                if (typeof app.navigate_ === 'function') {
                    try {
                        app.navigate_(targetUrl);
                    } catch (err) {}
                }
            }

            try {
                window.dispatchEvent(new CustomEvent('yt-navigate', {
                    bubbles: true,
                    composed: true,
                    detail: watchDetail
                }));
            } catch (err) {}

            try {
                window.history.pushState({}, '', targetUrl);
            } catch (err) {}

        } catch (err) {
            console.error('[YTM Bridge] Play mix error, falling back to direct video:', err);
            // Fallback to direct video playback
            const moviePlayer = document.getElementById('movie_player') || document.querySelector('ytmusic-player #movie_player');
            if (moviePlayer && typeof moviePlayer.loadVideoById === 'function') {
                try {
                    moviePlayer.loadVideoById(firstId);
                    if (typeof moviePlayer.playVideo === 'function') moviePlayer.playVideo();
                } catch (_) {}
            }
        }
    });

    // 3. Create Real Private Playlist in User's YouTube Music Account (InnerTube API)
    window.addEventListener('ytm-create-playlist-request', async function (e) {
        const detail = e.detail || {};
        const { title, description, videoIds } = detail;

        try {
            const playlistId = await createInnerTubePlaylist(title, description, videoIds);

            // Smoothly navigate user to the newly created playlist page
            const app = document.querySelector('ytmusic-app');
            const targetUrl = `/playlist?list=${playlistId}`;
            if (app && typeof app.navigate_ === 'function') {
                try {
                    app.navigate_(targetUrl);
                } catch (navErr) {}
            } else {
                try {
                    window.location.href = targetUrl;
                } catch (navErr) {}
            }

            window.dispatchEvent(new CustomEvent('ytm-create-playlist-response', {
                detail: {
                    success: true,
                    playlistId: playlistId,
                    url: `https://music.youtube.com/playlist?list=${playlistId}`
                }
            }));

        } catch (err) {
            console.error('[YTM Bridge] Playlist creation error:', err);
            window.dispatchEvent(new CustomEvent('ytm-create-playlist-response', {
                detail: {
                    success: false,
                    error: err.message || 'Terjadi kesalahan saat membuat playlist'
                }
            }));
        }
    });

    console.log('[YTM Tracker] Bulletproof SPA Bridge & Authenticated InnerTube Playlist Creator ready in MAIN world.');
})();

