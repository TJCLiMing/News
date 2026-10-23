/**
 * track.js — 按鈕點擊統計（網站上不顯示）
 *
 * 點到有 data-track 的元素時，在背景送一筆 { action: 'track', key, page } 給 GAS，
 * 寫進試算表「各功能點擊次頻率」的「點擊紀錄」分頁（「每月統計」分頁自動彙整）。
 * 用 navigator.sendBeacon：不等回應、離開頁面也送得出去，不會拖慢按鈕開啟。
 * 只送按鈕名稱和頁面，不送任何個人資料。
 *
 * 用法：
 *   <script src="track.js?v=1" data-page="home" defer></script>   data-page：home / tech / reports
 *   <a href="..." data-track="快捷：查經團契">                        名稱前綴：快捷／卡片／友站／報告
 *
 * 只在正式網域（liming-tjc.org）送出；本機或其他網址測試時只印在主控台，避免測試資料混進統計。
 */
(function () {
    'use strict';

    var API_URL = 'https://script.google.com/macros/s/AKfycbzWzh7mEl9wt7ehw7SWLQpwpJlbRB6AoDhSiFSex7YC2sp92ceICPct4AO64LiyN8lbPg/exec';
    var me = document.currentScript;
    var page = (me && me.getAttribute('data-page')) || 'other';
    var LIVE = /(^|\.)liming-tjc\.org$/.test(location.hostname);

    function send(key) {
        if (!LIVE) { console.log('[track] 測試環境不送出：', key, page); return; }
        var body = JSON.stringify({ action: 'track', key: key, page: page });
        try {
            // text/plain：GAS 不支援 CORS 預檢
            if (navigator.sendBeacon && navigator.sendBeacon(API_URL, new Blob([body], { type: 'text/plain;charset=utf-8' }))) return;
        } catch (e) { /* 改用 fetch */ }
        try {
            fetch(API_URL, { method: 'POST', body: body, mode: 'no-cors', keepalive: true,
                headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
        } catch (e) { /* 統計失敗不影響使用 */ }
    }

    // 捕獲階段：連結開新分頁或換頁前就先記下來
    document.addEventListener('click', function (e) {
        var el = e.target && typeof e.target.closest === 'function' ? e.target.closest('[data-track]') : null;
        if (el) send(el.getAttribute('data-track'));
    }, true);
})();
