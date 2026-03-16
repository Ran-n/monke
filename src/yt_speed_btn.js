// -*- coding: utf-8 -*-
// ------------------------------------------------------------------------
//+ Authors: 	Ran#
//+ Created:	2026/02/28 16:42:15.000000
//+ Revised:	2026/03/16 10:07:01.565107
// ------------------------------------------------------------------------

// ==UserScript==
// @name         YouTube Custom Speed Button (Full Sync Per Channel)
// @namespace    Violentmonkey Scripts
// @version      3.0.0
// @description  Remembers speed per channel, syncs with YT, styled, auto-selects, always updates input
// @author       Ran# <ran.hash@proton.me>
// @match        https://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        none
// @license      GPLv3
// @homepageURL  https://github.com/Ran-n/monke/blob/main/src/yt_speed_btn.js
// @downloadURL  https://raw.githubusercontent.com/Ran-n/monke/main/src/yt_speed_btn.js
// @updateURL    https://raw.githubusercontent.com/Ran-n/monke/main/src/yt_speed_btn.js
// ==/UserScript==

(function () {
    'use strict';

    const BTN_ID   = 'yt-speed-btn';
    const STOR_KEY = 'yt_speed_';

    let syncTimer   = null;
    let retryTimer  = null;

    // -------------------------------------------------------------------------

    function isWatchPage() {
        return location.pathname === '/watch';
    }

    function getChannelId() {
        const meta = document.querySelector('meta[itemprop="channelId"]');
        if (meta?.content) return meta.content;
        const link = document.querySelector('ytd-video-owner-renderer a[href^="/channel/"]')
                  || document.querySelector('a[href^="/channel/"]');
        if (link) return link.href.split('/channel/')[1]?.split(/[/?#]/)[0] ?? null;
        return null;
    }

    function loadSpeed(channelId) {
        const val = parseFloat(localStorage.getItem(STOR_KEY + channelId));
        return isNaN(val) ? null : val;
    }

    function saveSpeed(channelId, speed) {
        localStorage.setItem(STOR_KEY + channelId, speed);
    }

    // -------------------------------------------------------------------------

    function removeButton() {
        clearInterval(syncTimer);
        clearTimeout(retryTimer);
        syncTimer  = null;
        retryTimer = null;
        document.getElementById(BTN_ID)?.remove();
    }

    // Returns true when done (inserted or not a watch page), false when the
    // action bar isn't in the DOM yet and we should retry.
    function tryInsert() {
        if (!isWatchPage()) return true;
        if (document.getElementById(BTN_ID)) return true;

        const actionBar = document.querySelector('#top-level-buttons-computed, #top-level-buttons');
        if (!actionBar) return false;

        // --- Build button ---
        const btn = document.createElement('button');
        btn.id = BTN_ID;
        Object.assign(btn.style, {
            display:      'flex',
            alignItems:   'center',
            height:       '36px',
            marginLeft:   '24px',
            background:   'var(--yt-spec-badge-chip-background, #222)',
            color:        'var(--yt-spec-text-primary, #fff)',
            border:       'none',
            borderRadius: '18px',
            cursor:       'pointer',
            padding:      '0 14px 0 10px',
            fontSize:     '15px',
            gap:          '12px',
        });
        btn.innerHTML = `
            <span>Speed</span>
            <input type="number" min="0.1" max="16" step="0.05"
                style="width:60px;background:#f3f3f3;color:#111;border-radius:6px;
                       border:1px solid #ccc;outline:none;font-size:15px;
                       text-align:center;padding:6px 0;margin-left:10px;">
        `;
        actionBar.appendChild(btn);

        // --- Wire up input ---
        const input = btn.querySelector('input');
        let lastRate   = null;
        let channelId  = null;

        input.addEventListener('focus', e => e.target.select());

        input.addEventListener('input', () => {
            const val = parseFloat(input.value);
            if (isNaN(val) || val < 0.1 || val > 16) return;
            const video = document.querySelector('video');
            if (video) video.playbackRate = val;
            if (channelId) saveSpeed(channelId, val);
        });

        // --- Apply saved speed (retries until channelId resolves) ---
        let applyAttempts = 0;

        function applyChannelSpeed() {
            channelId = getChannelId();
            const video = document.querySelector('video');
            if (!video) {
                if (applyAttempts++ < 20) setTimeout(applyChannelSpeed, 500);
                return;
            }

            if (channelId) {
                const saved = loadSpeed(channelId);
                if (saved !== null) {
                    video.playbackRate = saved;
                    input.value = saved;
                    lastRate = saved;
                    return;
                }
            }

            input.value = video.playbackRate;
            lastRate = video.playbackRate;

            // channelId not yet in DOM — keep retrying
            if (!channelId && applyAttempts++ < 20) setTimeout(applyChannelSpeed, 500);
        }

        applyChannelSpeed();

        // --- Sync input when speed is changed via YouTube's own menu ---
        clearInterval(syncTimer);
        syncTimer = setInterval(() => {
            const video = document.querySelector('video');
            if (!video) return;
            const rate = video.playbackRate;
            if (rate === lastRate) return;
            input.value = rate;
            lastRate = rate;
            if (channelId) saveSpeed(channelId, rate);
        }, 500);

        return true;
    }

    // Schedules an insert attempt, retrying every 400 ms until the bar is ready.
    function scheduleInsert(delay = 0) {
        clearTimeout(retryTimer);
        retryTimer = setTimeout(function retry() {
            if (!tryInsert()) retryTimer = setTimeout(retry, 400);
        }, delay);
    }

    // -------------------------------------------------------------------------

    // SPA navigation events fired by YouTube's own router
    document.addEventListener('yt-navigate-start',  removeButton);
    document.addEventListener('yt-navigate-finish', () => scheduleInsert(300));

    // Hard page load / direct URL visit (yt-navigate-finish may not fire)
    if (isWatchPage()) scheduleInsert();
})();
