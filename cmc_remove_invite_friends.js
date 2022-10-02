// ==UserScript==
// @name        No invite friends
// @namespace   Violentmonkey Scripts
// @match       https://coinmarketcap.com/account/my-diamonds/
// @grant       none
// @version     1.0
// @author      Ran#
// @description 10/2/2022, 10:17:36 PM
// ==/UserScript==

elto=document.getElementsByClassName("sc-1snuar3-11 cIdfQu")[0];
elto.parentNode.removeChild(elto);
