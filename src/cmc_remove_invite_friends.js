// ==UserScript==
// @name        No invite friends
// @namespace   Violentmonkey Scripts
// @match       https://coinmarketcap.com/account/my-diamonds/
// @grant       none
// @version     1.0
// @author      Ran# <ran-n@tutanota.com>
// @description 10/2/2022, 10:17:36 PM
// @homepageURL https://github.com/Ran-n/monke/blob/main/src/cmc_remove_invite_friends.js
// @downloadURL https://raw.githubusercontent.com/Ran-n/monke/main/src/cmc_remove_invite_friends.js
// ==/UserScript==

elto=document.getElementsByClassName("sc-1snuar3-11 cIdfQu")[0];
elto.parentNode.removeChild(elto);
