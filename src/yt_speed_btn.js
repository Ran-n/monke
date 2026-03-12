// -*- coding: utf-8 -*-
// ------------------------------------------------------------------------
//+ Authors: 	Ran#
//+ Created:	2025/04/29 00:00:00.000000
//+ Revised:	2026/03/12 09:05:36.431228
// ------------------------------------------------------------------------

// ==UserScript==
// @name         YouTube Custom Speed Button (Full Sync Per Channel)
// @namespace    Violentmonkey Scripts
// @version      2.2.0
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

    function getChannelId() {
        const meta = document.querySelector('meta[itemprop="channelId"]');
        if (meta && meta.content) return meta.content;
        const link = document.querySelector('ytd-video-owner-renderer a[href^="/channel/"]');
        if (link) return link.href.split('/channel/')[1].split(/[/?#]/)[0];
        const anyLink = document.querySelector('a[href^="/channel/"]');
        if (anyLink) return anyLink.href.split('/channel/')[1].split(/[/?#]/)[0];
        return null;
    }

    function getSavedSpeed(channelId) {
        return localStorage.getItem('yt_speed_' + channelId);
    }

    function saveSpeed(channelId, speed) {
        localStorage.setItem('yt_speed_' + channelId, speed);
    }

    function insertSpeedButton() {
        const actionBar = document.querySelector('#top-level-buttons-computed, #top-level-buttons');
        if (!actionBar || document.getElementById('yt-speed-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'yt-speed-btn';
        btn.className = actionBar.firstElementChild?.className || '';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.height = '36px';
        btn.style.marginLeft = '24px';
        btn.style.background = 'var(--yt-spec-badge-chip-background, #222)';
        btn.style.color = 'var(--yt-spec-text-primary, #fff)';
        btn.style.border = 'none';
        btn.style.borderRadius = '18px';
        btn.style.cursor = 'pointer';
        btn.style.padding = '0 14px 0 10px';
        btn.style.fontSize = '15px';
        btn.style.gap = '12px';

        btn.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:center; width:100%;">
                <span style="flex:1; text-align:center;">Speed</span>
                <input type="number" min="0.1" max="16" step="0.05"
                    style="width:60px; background:#f3f3f3; color:#111; border-radius:6px; border:1px solid #ccc; outline:none; font-size:15px; text-align:center; padding:6px 0 6px 0; margin-bottom:2px; margin-left:10px;">
            </div>
        `;

        actionBar.appendChild(btn);

        const input = btn.querySelector('input');
        let lastSpeed = null;
        let channelId = getChannelId();

        // Auto-select all contents on click
        input.addEventListener('focus', function (e) {
            e.target.select();
        });

        // Set input to saved speed or current video speed
        function syncInputToVideo(forceSave) {
            const video = document.querySelector('video');
            if (video) {
                let speed = video.playbackRate;
                if (channelId) {
                    const saved = getSavedSpeed(channelId);
                    if (saved && !input._synced) {
                        speed = parseFloat(saved);
                        video.playbackRate = speed;
                        input._synced = true;
                    }
                }
                // Always update input, even if focused
                input.value = speed;
                lastSpeed = speed;
                // If speed changed via YT menu, save it
                if (channelId && forceSave) saveSpeed(channelId, speed);
            }
        }

        // Set video speed from input and save per channel
        function setSpeed(val) {
            if (typeof val !== 'number' || isNaN(val) || val < 0.1 || val > 16) return;
            const video = document.querySelector('video');
            if (video) video.playbackRate = val;
            if (channelId) saveSpeed(channelId, val);
        }

        // When input changes, update video speed and save
        input.addEventListener('input', function (e) {
            setSpeed(parseFloat(e.target.value));
        });

        // On load, set input to saved speed or current video speed
        setTimeout(() => syncInputToVideo(false), 1000);

        // Keep input in sync with video speed (if changed via YT menu)
        setInterval(() => {
            const video = document.querySelector('video');
            if (video && video.playbackRate != lastSpeed) {
                syncInputToVideo(true); // Save if changed via YT menu
            }
        }, 500);
    }

    let lastUrl = '';
    setInterval(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            setTimeout(insertSpeedButton, 1000);
        }
        insertSpeedButton();
    }, 1500);
})();
