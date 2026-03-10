// ==UserScript==
// @name         Cardmarket show thumbnails
// @namespace    Violentmonkey Scripts
// @version      1.4.0
// @description  2025-04-29
// @description  Open all thumbnails at once so you don't have to hover over each item.
// @author       Ran# <ran-n@tutanota.com>
// @match        https://www.cardmarket.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=cardmarket.com
// @grant        none
// @license      GPLv3
// @homepageURL  https://github.com/Ran-n/monke/blob/main/src/cardmarket/cm_show_thumbnails.js
// @downloadURL  https://raw.githubusercontent.com/Ran-n/monke/main/src/cardmarket/cm_show_thumbnails.js
// @updateURL    https://raw.githubusercontent.com/Ran-n/monke/main/src/cardmarket/cm_show_thumbnails.js
// ==/UserScript==

(function () {
    'use strict';

    if (document.getElementById('show-thumbnails')) return;

    const icons = [...document.querySelectorAll('.thumbnail-icon')];
    if (icons.length === 0) return;

    const BTN_OPEN_ICON = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width:100%; height:100%; color:white;">
        <rect x="4" y="6" width="16" height="12" rx="2" ry="2"
              stroke="currentColor" fill="none" stroke-width="1.5" stroke-linecap="butt" stroke-linejoin="round"/>
        <circle cx="8" cy="9" r="2" fill="currentColor"/>
        <path d="M20 18 L14 12 L10 18 L6 13 L4 18"
              stroke="currentColor" fill="none" stroke-width="1.5" stroke-linecap="butt" stroke-linejoin="round"/>
      </svg>
    `;

    const BTN_CLOSE_ICON = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width:100%; height:100%; color:white;">
        <rect x="4" y="6" width="16" height="12" rx="2" ry="2"
              stroke="currentColor" fill="none" stroke-width="1.5" stroke-linecap="butt" stroke-linejoin="round"/>
        <circle cx="8" cy="9" r="2" fill="currentColor"/>
        <path d="M20 18 L14 12 L10 18 L6 13 L4 18"
              stroke="currentColor" fill="none" stroke-width="1.5" stroke-linecap="butt" stroke-linejoin="round"/>
        <line x1="2" y1="4" x2="22" y2="20"
              stroke="currentColor" stroke-width="1.5" stroke-linecap="butt" stroke-linejoin="round"/>
      </svg>
    `;

    const BTN_OPEN_COLOR = '#dc3545'; // red
    const BTN_CLOSE_COLOR = '#0d6efd'; // blue
    const BTN_OPEN_BORDER_COLOR = '#dc3545';
    const BTN_CLOSE_BORDER_COLOR = '#0d6efd';
    const BTN_STYLE_COLOR = '#fff';

    // Button
    const button = document.createElement('button');
    button.id = 'show-thumbnails';
    button.classList.add('btn');
    Object.assign(button.style, {
        position: 'fixed',
        bottom: '0.5rem',
        left: '0.5rem',
        zIndex: '9999',
        width: '40px',
        height: '40px',
        padding: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px solid',
        borderRadius: '6px',
        cursor: 'pointer',
        boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
        backgroundClip: 'padding-box'
    });

    // Storage keys and normalization
    const GLOBAL_KEY = 'thumbnails-open:global';

    // Normalize any /Users/{username} segment to /Users/_USER_ so different usernames map to same key.
    const getNormalizedUserPath = () => {
        try {
            const path = location.pathname || '';
            const re = /\/users\/[^\/]+/i;
            if (re.test(path)) return path.replace(re, '/Users/_USER_');
        } catch (e) { /* ignore */ }
        return null;
    };

    const normalizedUserPath = getNormalizedUserPath();
    const USER_PAGE_KEY = normalizedUserPath ? `thumbnails-open:userpage:${normalizedUserPath}` : null;

    // This tab's active key (the one we'll prefer when receiving broadcasts)
    const ACTIVE_KEY = USER_PAGE_KEY || GLOBAL_KEY;

    // Read preference: prefer normalized user-page key if it exists, otherwise global.
    const readSavedState = () => {
        if (USER_PAGE_KEY && localStorage.getItem(USER_PAGE_KEY) !== null) {
            return localStorage.getItem(USER_PAGE_KEY) === 'true';
        }
        return localStorage.getItem(GLOBAL_KEY) === 'true';
    };

    // Write preference: save to global always; if on a normalized user page also save to the user-page key.
    const writeSavedState = (val) => {
        try { localStorage.setItem(GLOBAL_KEY, String(val)); } catch (e) { /* ignore */ }
        if (USER_PAGE_KEY) {
            try { localStorage.setItem(USER_PAGE_KEY, String(val)); } catch (e) { /* ignore */ }
        }
    };

    // BroadcastChannel + storage fallback for cross-tab sync
    const CHANNEL_NAME = 'cardmarket-thumbnails';
    let bc = null;
    try { bc = new BroadcastChannel(CHANNEL_NAME); } catch (e) { bc = null; }
    const SYNC_KEY = 'thumbnails-sync';

    // apply incoming state only when the incoming key exactly matches this tab's ACTIVE_KEY
    const applyRemoteState = (payload) => {
        if (!payload || typeof payload !== 'object') return;
        const { key, value } = payload;
        if (key !== ACTIVE_KEY) return; // ignore messages not targeted to this key
        const show = !!value;
        if (show) button.classList.add('active'); else button.classList.remove('active');
        setButtonIcon(show);
        toggleThumbnails(show);
        // persist according to local logic (keeps storage consistent)
        writeSavedState(show);
    };

    const broadcastState = (key, val) => {
        const payload = { type: 'thumbnails-toggle', key, value: !!val, ts: Date.now() };
        if (bc) {
            try { bc.postMessage(payload); } catch (e) { /* ignore */ }
        }
        try { localStorage.setItem(SYNC_KEY, JSON.stringify(payload)); } catch (e) { /* ignore */ }
    };

    // Listen BroadcastChannel
    if (bc) {
        bc.addEventListener('message', (ev) => {
            const msg = ev?.data;
            if (!msg || msg.type !== 'thumbnails-toggle') return;
            applyRemoteState(msg);
        });
    }

    // Listen storage event fallback (fires in other tabs)
    window.addEventListener('storage', (ev) => {
        if (!ev.key) return;
        if (ev.key === SYNC_KEY && ev.newValue) {
            try {
                const msg = JSON.parse(ev.newValue);
                if (msg && msg.type === 'thumbnails-toggle') applyRemoteState(msg);
            } catch (e) { /* ignore */ }
        }
    });

    // Minimal accessible label
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', 'Toggle thumbnails');

    const savedState = readSavedState();
    if (savedState) button.classList.add('active');

    const setButtonIcon = (show) => {
        if (show) {
            button.innerHTML = BTN_CLOSE_ICON;
            button.style.backgroundColor = BTN_OPEN_COLOR;
            button.style.color = BTN_STYLE_COLOR;
            button.style.borderColor = BTN_OPEN_BORDER_COLOR;
        } else {
            button.innerHTML = BTN_OPEN_ICON;
            button.style.backgroundColor = BTN_CLOSE_COLOR;
            button.style.color = BTN_STYLE_COLOR;
            button.style.borderColor = BTN_CLOSE_BORDER_COLOR;
        }
    };

    // Bind thumbnails and generated images to behave like clicking the product name
    function bindThumbnailClicks() {
        const targets = [
            ...document.querySelectorAll('.thumbnail-icon'),
            ...document.querySelectorAll('.thumbnail-tmp-image img')
        ];

        targets.forEach(target => {
            if (target.dataset._thumbBound === '1') return;

            const row = target.closest('tr, .row, .item, .product-row, .listing-row');
            const link = row?.querySelector('a[href*="Products"], a.card-name, a.name, a[href*="/Product/"], a[href*="/products/"], a[href*="/product/"]');
            if (!link) return;

            target.style.cursor = 'pointer';
            target.setAttribute('role', 'link');
            if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '0');

            const markHandled = () => {
                target.dataset._midHandled = '1';
                setTimeout(() => { delete target.dataset._midHandled; }, 250);
            };

            const onClick = (ev) => {
                if (ev instanceof MouseEvent && ev.button !== 0) return;
                if (ev.button === 2) return;
                const href = link.href;
                if (!href) return;
                if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) {
                    window.open(href, '_blank', 'noopener');
                    ev.preventDefault();
                    ev.stopPropagation();
                    return;
                }
                ev.preventDefault();
                ev.stopPropagation();
                link.click();
            };

            const onAuxClick = (ev) => {
                if (!(ev instanceof MouseEvent) || ev.button !== 1) return;
                if (target.dataset._midHandled === '1') return;
                const href = link.href;
                if (!href) return;
                markHandled();
                window.open(href, '_blank', 'noopener');
                ev.preventDefault();
                ev.stopPropagation();
            };

            const onMouseDownFallback = (ev) => {
                if (!(ev instanceof MouseEvent) || ev.button !== 1) return;
                if (target.dataset._midHandled === '1') return;
                markHandled();
                const href = link.href;
                if (!href) return;
                window.open(href, '_blank', 'noopener');
                ev.preventDefault();
            };

            const onKey = (ev) => {
                const href = link.href;
                if (!href) return;
                if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    ev.stopPropagation();
                    if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) {
                        window.open(href, '_blank', 'noopener');
                    } else {
                        link.click();
                    }
                }
            };

            target.addEventListener('click', onClick);
            target.addEventListener('auxclick', onAuxClick);
            target.addEventListener('mousedown', onMouseDownFallback);
            target.addEventListener('keydown', onKey);

            target.dataset._thumbBound = '1';
        });
    }

    const toggleThumbnails = (show) => {
        if (show) {
            document.querySelectorAll('.thumbnail-icon').forEach(icon => {
                const tr = icon.closest('tr,.row');
                const anchor = tr?.querySelector('a[href*="Products"],.card-name,.name');
                if (anchor && !anchor.parentElement.querySelector('.thumbnail-tmp-image')) {
                    const titleHtml = icon.dataset.bsTitle || icon.getAttribute('data-bs-title') || icon.getAttribute('title') || '';
                    if (!titleHtml) return;
                    const wrapper = document.createElement('div');
                    wrapper.classList.add('thumbnail-tmp-image');
                    wrapper.innerHTML = titleHtml;
                    const img = wrapper.querySelector('img');
                    if (img) {
                        img.style.maxHeight = '300px';
                        img.style.objectFit = 'cover';
                        img.style.objectPosition = 'top';
                        img.style.display = 'block';
                    }
                    wrapper.style.flexBasis = '100%';
                    wrapper.style.overflowY = 'hidden';
                    wrapper.style.opacity = '0';
                    wrapper.style.transition = 'opacity 0.3s ease';
                    anchor.parentElement.style.flexWrap = 'wrap';
                    anchor.insertAdjacentElement('afterend', wrapper);
                    requestAnimationFrame(() => {
                        wrapper.style.opacity = '1';
                        bindThumbnailClicks();
                    });
                }
            });
            bindThumbnailClicks();
        } else {
            document.querySelectorAll('.thumbnail-tmp-image').forEach(item => item.remove());
        }
    };

    // Initial render
    setButtonIcon(readSavedState());
    toggleThumbnails(readSavedState());

    // Click handler: toggle, persist, broadcast only to matching key
    button.addEventListener('click', () => {
        button.classList.toggle('active');
        const show = button.classList.contains('active');
        writeSavedState(show);
        toggleThumbnails(show);
        setButtonIcon(show);
        // broadcast to tabs that share the same ACTIVE_KEY (either normalized userpage key or global)
        const broadcastKey = USER_PAGE_KEY || GLOBAL_KEY;
        broadcastState(broadcastKey, show);
    });

    document.body.appendChild(button);

    // Re-bind as DOM changes (lightweight)
    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            if (m.addedNodes && m.addedNodes.length) {
                bindThumbnailClicks();
                break;
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // initial binding
    bindThumbnailClicks();
})();
