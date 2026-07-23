/**
 * frame-nav.js — 外殼（app.html）內的連結導向控制
 *
 * 只有在被 app.html 的 iframe 載入時才會作用；
 * 直接開啟頁面（不在 iframe 內）時完全不做任何事，行為與現在一模一樣。
 *
 * 規則：
 *   1. 自家 / tjc-km 的 GitHub Pages → target="_self"，留在 iframe 內（不開新分頁）
 *   2. 其他外部網站（Google、LINE、Canva…）→ 共用同一個具名分頁，
 *      所以不管點幾個，最多只會佔用 1 個額外分頁
 */
(function () {
    'use strict';

    // 不在 iframe 內就直接結束，維持原本行為
    if (window.self === window.top) return;

    // 可以嵌在 iframe 內的網域（實測無 X-Frame-Options 限制）
    var EMBEDDABLE_HOSTS = [
        'li-ming-tjc.org',
        'www.li-ming-tjc.org',
        'tjcliming.github.io',
        'tjc-km.github.io'
    ];

    // 無法嵌入的外部連結共用這個分頁名稱
    var EXTERNAL_TARGET = 'liming-ext';

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

    // 用捕獲階段的委派監聽，動態產生的連結（海報、相簿…）也一併涵蓋
    document.addEventListener('click', function (e) {
        var el = e.target;
        if (!el || typeof el.closest !== 'function') return;

        var a = el.closest('a[href]');
        if (!a) return;

        var href = a.getAttribute('href') || '';
        // 純錨點與 javascript: 不處理
        if (href.charAt(0) === '#' || href.toLowerCase().indexOf('javascript:') === 0) return;

        a.target = canEmbed(a.href) ? '_self' : EXTERNAL_TARGET;
    }, true);
})();
