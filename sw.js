/**
 * sw.js — 黎明教會活動快報 Service Worker
 *
 * 策略：
 *   HTML / JSON  → 網路優先，失敗才用快取（確保內容永遠是最新的，離線時仍可看）
 *   圖片 / JS    → 快取優先，同時背景更新（開啟速度快）
 *   跨網域請求   → 完全不攔截（GAS API、Google Fonts、tjc-km 等一律直接走網路）
 *
 * ⚠️ 改版時記得把 VERSION 加一，舊快取才會被清掉。
 */

var VERSION = 'v1';
var CACHE = 'liming-news-' + VERSION;

// 安裝時先抓下來的核心檔案（單檔失敗不影響整體安裝）
var PRECACHE = [
    'app.html',
    'index.html',
    'index-tech.html',
    'photos.html',
    'frame-nav.js',
    'manifest.json',
    'logo_10th.png',
    'logo_20th.png',
    'icon-192.png',
    'icon-512.png',
    'icon-maskable-192.png',
    'icon-maskable-512.png',
    '官方LineQR.png',
    '小幫手QRCode.png',
    '人.png'
];

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE).then(function (cache) {
            // 逐檔加入並吞掉個別錯誤，避免一個 404 就讓整個 SW 裝不起來
            return Promise.all(PRECACHE.map(function (url) {
                return cache.add(url).catch(function () { /* 忽略單檔失敗 */ });
            }));
        }).then(function () {
            return self.skipWaiting();
        })
    );
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(keys.map(function (k) {
                if (k !== CACHE) return caches.delete(k);
            }));
        }).then(function () {
            return self.clients.claim();
        })
    );
});

function isNetworkFirst(url) {
    return /\.(html|json)$/i.test(url.pathname) || url.pathname.endsWith('/');
}

self.addEventListener('fetch', function (event) {
    var req = event.request;

    if (req.method !== 'GET') return;

    var url;
    try { url = new URL(req.url); } catch (e) { return; }

    // 只處理自家網域，其餘（GAS API、Google Fonts、tjc-km…）一律不碰
    if (url.origin !== self.location.origin) return;

    if (isNetworkFirst(url)) {
        // 網路優先：拿到新的就順手更新快取，失敗才回快取
        event.respondWith(
            fetch(req).then(function (res) {
                if (res && res.ok) {
                    var copy = res.clone();
                    caches.open(CACHE).then(function (c) { c.put(req, copy); });
                }
                return res;
            }).catch(function () {
                return caches.match(req).then(function (hit) {
                    return hit || caches.match('app.html');
                });
            })
        );
        return;
    }

    // 靜態資源：快取優先，背景默默更新
    event.respondWith(
        caches.match(req).then(function (hit) {
            var network = fetch(req).then(function (res) {
                if (res && res.ok) {
                    var copy = res.clone();
                    caches.open(CACHE).then(function (c) { c.put(req, copy); });
                }
                return res;
            }).catch(function () { return hit; });
            return hit || network;
        })
    );
});
