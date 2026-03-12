// -*- coding: utf-8 -*-
// ------------------------------------------------------------------------
//+ Authors: 	Ran#
//+ Created:	2022/02/10 22:17:36.000000
//+ Revised:	2026/03/12 09:05:36.431228
// ------------------------------------------------------------------------

// ==UserScript==
// @name         CMC: No friend inviting
// @namespace    Violentmonkey Scripts
// @version      1.0
// @description  Removes the invite friends section from CoinMarketCap
// @author       Ran# <ran.hash@proton.me>
// @match        https://coinmarketcap.com/account/my-diamonds/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=coinmarketcap.com
// @grant        none
// @license      GPLv3
// @homepageURL  https://github.com/Ran-n/monke/blob/main/src/cmc_remove_invite_friends.js
// @downloadURL  https://raw.githubusercontent.com/Ran-n/monke/main/src/cmc_remove_invite_friends.js
// @updateURL    https://raw.githubusercontent.com/Ran-n/monke/main/src/cmc_remove_invite_friends.js
// ==/UserScript==

elto=document.getElementsByClassName("sc-1snuar3-11 cIdfQu")[0];
elto.parentNode.removeChild(elto);
