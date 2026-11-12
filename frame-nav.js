/**
 * frame-nav.js — 外殼（index.html）內的連結導向控制
 *
 * 只有在被外殼的 iframe 載入時才會作用；
 * 直接開啟頁面（不在 iframe 內）時完全不做任何事，行為與現在一模一樣。
 *
 * 規則：
 *   1. 自家 / tjc-km 的 GitHub Pages → target="_self"，留在 iframe 內（不開新分頁）
 *   2. 其他外部網站（Google、LINE、Canva…）→ 共用同一個具名分頁，
 *      所以不管點幾個，最多只會佔用 1 個額外分頁
 *   2a. 例外：會進到 Google Meet 的連結（NEW_TAB_HOSTS）→ 每次開新分頁，
 *      不然開會中再點其他外部按鈕，共用分頁裡的 Meet 會被換掉
 *   3. 點進可嵌入的「跨網域」網站（tjc-km…）時通知外殼網址，
 *      因為瀏覽器不讓外殼讀跨網域 iframe 的位置，重新整理時才能回到同一個網站
 */
(function () {
    'use strict';

    // 不在 iframe 內就直接結束，維持原本行為
    if (window.self === window.top) return;

    // 可以嵌在 iframe 內的網域（實測無 X-Frame-Options 限制）
    var EMBEDDABLE_HOSTS = [
        'liming-tjc.org',
        'www.liming-tjc.org',
        // 舊網域：轉址期間仍可能有人從舊連結進來，等完全淘汰後再移除
        'li-ming-tjc.org',
        'www.li-ming-tjc.org',
        'tjcliming.github.io',
        'tjc-km.github.io'
    ];

    // 無法嵌入的外部連結共用這個分頁名稱
    var EXTERNAL_TARGET = 'liming-ext';

    // 會進到 Google Meet 的網站：每次開新分頁，不用共用分頁（使用者決定，2026-11-12）。
    // 2026-11-11 使用者在電腦上點查經團契 → 頁面裡「加入 Google Meet」在同一個分頁開 →
    // 回平台再點一次查經團契，共用分頁裡的 Meet 被換掉。開會中點文字記錄、認識黎明…也一樣會離開會議。
    // study.liming-tjc.org 是查經邀請頁（裡面的 Meet 按鈕不開新分頁，那是聚會紀錄系統的程式）
    var NEW_TAB_HOSTS = [
        'meet.google.com',
        'study.liming-tjc.org'
    ];

    // 頁面殘留的 <base target="_top"> 是 Google Apps Script 時期的設定，
    // 在 iframe 內會讓連結衝出外殼，改回 _self（只在 iframe 內生效）
    var baseEl = document.querySelector('base');
    if (baseEl && baseEl.target === '_top') baseEl.target = '_self';

    function canEmbed(absoluteUrl) {
        try {
            var u = new URL(absoluteUrl, location.href);
            if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
            // 同網域一律可嵌入（也涵蓋本機測試用的 localhost）
            if (u.origin === location.origin) return true;
            return EMBEDDABLE_HOSTS.indexOf(u.hostname) !== -1;
        } catch (e) {
            return false;
        }
    }

    function needsNewTab(absoluteUrl) {
        try {
            return NEW_TAB_HOSTS.indexOf(new URL(absoluteUrl, location.href).hostname) !== -1;
        } catch (e) {
            return false;
        }
    }

    // 用捕獲階段的委派監聽，動態產生的連結（海報、相簿…）也一併涵蓋
    document.addEventListener('click', function (e) {
        var el = e.target;
        if (!el || typeof el.closest !== 'function') return;

        var a = el.closest('a[href]');
        if (!a) return;

        var href = a.getAttribute('href') || '';
        // 純錨點與 javascript: 不處理
        if (href.charAt(0) === '#' || href.toLowerCase().indexOf('javascript:') === 0) return;

        var embed = canEmbed(a.href);
        a.target = embed ? '_self' : (needsNewTab(a.href) ? '_blank' : EXTERNAL_TARGET);

        if (embed) {
            try {
                if (new URL(a.href).origin !== location.origin) {
                    // targetOrigin 限定同網域：只有自家外殼收得到
                    window.parent.postMessage({ type: 'liming-frame-nav', url: a.href }, location.origin);
                }
            } catch (err) { /* 通知失敗不影響點擊 */ }
        }
    }, true);
})();
