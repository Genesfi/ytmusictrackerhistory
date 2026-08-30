/**
 * YouTube Music SPA Navigation & Playback Bridge (Runs in MAIN World)
 * Direct access to Polymer Router, Movie Player, & ytmusic-app instance
 */

(function () {
    if (window.__ytm_tracker_bridge_installed) return;
    window.__ytm_tracker_bridge_installed = true;

    window.addEventListener('ytm-navigate-request', function (e) {
        const detail = e.detail || {};
        const { path, videoId, browseId } = detail;

        // 1. Play Track Directly (Instant playback without page reload)
        let targetVideoId = videoId;
        if (!targetVideoId && path && path.includes('watch?v=')) {
            const m = path.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
            if (m) targetVideoId = m[1];
        }

        if (targetVideoId) {
            // A. Trigger movie player API directly
            const moviePlayer = document.getElementById('movie_player') || document.querySelector('ytmusic-player #movie_player');
            if (moviePlayer && typeof moviePlayer.loadVideoById === 'function') {
                try {
                    moviePlayer.loadVideoById(targetVideoId);
                    if (typeof moviePlayer.playVideo === 'function') {
                        moviePlayer.playVideo();
                    }
                } catch (err) {
                    console.warn('[YTM Bridge] moviePlayer load error:', err);
                }
            }

            // B. Dispatch watchEndpoint on ytmusic-app and window
            const watchDetail = {
                endpoint: {
                    watchEndpoint: {
                        videoId: targetVideoId
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
                        app.navigate_(`/watch?v=${targetVideoId}`);
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
                window.history.pushState({}, '', `/watch?v=${targetVideoId}`);
            } catch (err) {}
            return;
        }

        // 2. Browse / History Navigation (Smooth SPA)
        const targetBrowseId = browseId || (path && path.includes('history') ? 'FEmusic_history' : null);
        const targetPath = path || (targetBrowseId === 'FEmusic_history' ? '/browse/FEmusic_history' : '/history');

        const app = document.querySelector('ytmusic-app');
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
                } catch (err) {}
            }

            if (typeof app.navigate_ === 'function') {
                try {
                    app.navigate_(targetPath);
                    return;
                } catch (err) {}
            }
        }

        if (targetBrowseId) {
            try {
                window.dispatchEvent(new CustomEvent('yt-navigate', {
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
                return;
            } catch (err) {}
        }

        // 3. Fallback smooth history push
        try {
            window.history.pushState({}, '', targetPath);
            window.dispatchEvent(new CustomEvent('yt-navigate-finish'));
            window.dispatchEvent(new CustomEvent('yt-page-data-updated'));
        } catch (err) {}
    });

    console.log('[YTM Tracker] Bulletproof SPA Bridge active in MAIN world.');
})();
