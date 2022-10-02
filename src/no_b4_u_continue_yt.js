// ==UserScript==
// @name        No "Before you continue to Youtube"
// @namespace   Violentmonkey Scripts
// @match       https://www.youtube.com/
// @grant       none
// @version     1.0
// @author      Ran#
// @description 10/2/2022, 10:25:22 PM
// @downloadURL 
// @homepageURL 
// ==/UserScript==

elto=document.getElementById("dialog");
elto.parentNode.removeChild(elto);
