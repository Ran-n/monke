// ==UserScript==
// @name        Remove Adblock Warning on OnePieceTopDecks
// @namespace   Violentmonkey Scripts
// @version     1.3
// @description Remove adblock banner, clean decklist page, add working copy buttons on onepiecetopdecks.com deck list pages.
// @description 10/2/2025, 10:17:36 PM
// @grant       none
// @author      Ran# <ran-n@tutanota.com>
// @match       https://onepiecetopdecks.com/deck-list/*
// @homepageURL https://github.com/Ran-n/monke/blob/main/src/quick_topdecks_copy.js
// @downloadURL https://raw.githubusercontent.com/Ran-n/monke/main/src/quick_topdecks_copy.js
// ==/UserScript==

(function () {
    'use strict';

    function removeBanner() {
        let found = false;

        document.querySelectorAll('div').forEach(el => {
            if (
                el.textContent.includes('ad or script blocking software is interfering') ||
                el.textContent.includes('Disable any ad or script blocking software')
            ) {
                el.remove();
                found = true;
            }
        });

        if (found) console.log('Removed adblock banner element.');
    }

    // Function to create a copy button
    function createCopyButton() {
        const btn = document.createElement('button');
        btn.textContent = 'Copy Decklist';
        btn.style.padding = '6px 12px';
        btn.style.fontSize = '14px';
        btn.style.margin = '8px 0';
        btn.style.backgroundColor = '#007BFF';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';

        btn.addEventListener('click', () => {
            // Use Clipboard API if available
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(textBelow).then(() => {
                    const originalText = btn.textContent;
                    btn.textContent = 'Copied!';
                    setTimeout(() => {
                        btn.textContent = originalText;
                    }, 1200);
                }).catch(err => {
                    console.error('Clipboard API error:', err);
                    fallbackCopyText(btn);
                });
            } else {
                fallbackCopyText(btn);
            }
        });

        // Fallback method using textarea and execCommand
        function fallbackCopyText(button) {
            const textarea = document.createElement('textarea');
            textarea.value = textBelow;
            textarea.style.position = 'fixed'; // avoid scrolling to bottom
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();

            try {
                const success = document.execCommand('copy');
                if (success) {
                    const originalText = button.textContent;
                    button.textContent = 'Copied!';
                    setTimeout(() => {
                        button.textContent = originalText;
                    }, 1200);
                } else {
                    throw new Error('Copy failed');
                }
            } catch (err) {
                console.error('Fallback copy failed:', err);
                alert('Copy failed, please copy manually.');
            }
            document.body.removeChild(textarea);
        }

        return btn;
    }

    removeBanner();
    new MutationObserver(removeBanner).observe(document.body, { childList: true, subtree: true });

    // Remove bloat texts and consecutive br tags


    // remove class to element
    const page = document.getElementById('page');
    if (page && page.classList.contains('site')) page.classList.remove('site');

    const masthead = document.getElementById('masthead');
    if (masthead && masthead.classList.contains('site-header')) masthead.classList.remove('site-header');

    const postThumb = document.querySelector('.post-thumbnail');
    if (postThumb) postThumb.remove();

    const pageTitle = document.querySelector('.entry-header');
    if (pageTitle) pageTitle.remove();

    const blockCode = document.querySelector('.wp-block-code');
    if (blockCode) blockCode.remove();

    const solidClass = document.querySelector('.solid');
    if (solidClass) solidClass.remove();

    document.querySelectorAll('.innerblocks-wrap').forEach(container => {
        container.innerHTML = container.innerHTML.replace(/Deck Name:.*?<br>/, '');
        container.innerHTML = container.innerHTML.replace(/The first card is the Leader.*?<b><br>/, '');
        container.innerHTML = container.innerHTML.replace(/(<br>\s*){2,}/g, '<br>');
    });

    const gallery = document.getElementById('media-gallery');
    if (!gallery) return;

    const html = gallery.innerHTML;

    const splitIndex = html.indexOf('Decklist in text:');
    let imagesHtml, textBelow;

    if (splitIndex !== -1) {
        imagesHtml = html.slice(0, splitIndex);
        textBelow = html.slice(splitIndex + 'Decklist in text:'.length).trim();
    } else {
        imagesHtml = html;
        textBelow = '';
    }

    // Replace <br> with newlines, remove HTML tags, decode &nbsp;, then clean empty lines
    textBelow = textBelow
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/&nbsp;/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== '')
        .join('\n');

    // Remove multiple consecutive newlines to single newline
    textBelow = textBelow.replace(/\n{2,}/g, '\n');

    // Process images container
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = imagesHtml;
    const columns = Array.from(tempDiv.querySelectorAll('.column'));

    gallery.innerHTML = '';

    // Container for images, styled as flexbox
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexWrap = 'wrap';
    container.style.gap = '8px';

    columns.forEach(col => {
        col.style.flex = '0 1 150px';
        col.style.margin = '0';
        container.appendChild(col);
    });

    // Add the copy button before the images container
    gallery.appendChild(createCopyButton());
    gallery.appendChild(container);
    // Add copy button below the container
    gallery.appendChild(createCopyButton());

    // Visible plain text
    const textNode = document.createElement('div');
    textNode.textContent = textBelow;
    textNode.style.marginTop = '8px';
    textNode.style.whiteSpace = 'pre-wrap';
    gallery.appendChild(textNode);

    gallery.appendChild(textDiv);

})();
