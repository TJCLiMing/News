// 報告事項即時 PDF（測試版）
//
// GET /pdf?n=1|2|4      回傳 PDF（1＝原始一張一頁；2＝A4 直式上下兩張；4＝A4 橫式 2x2）
// GET /pdf?n=4&debug=1  回傳 JSON：各階段耗時，不回 PDF
//
// 流程：雲端無頭瀏覽器打開 OneDrive 唯讀內嵌播放器 → 用鍵盤操作「功能表 → 列印為 PDF」
// → 微軟在伺服器產生 PDF → 讀出「開啟 PDF」那個 form（欄位 Pid）與 Cookie，由 Worker 自己 POST pdfhandler.ashx 拿 PDF
// 注意：無頭瀏覽器裡滑鼠點擊送不進播放器，鍵盤可以（要先讓播放器取得焦點）；
//       從瀏覽器裡 fetch pdfhandler 在雲端會失敗，所以改由 Worker 送
import puppeteer from '@cloudflare/puppeteer';
import { PDFDocument, rgb } from 'pdf-lib';

const EMBED_URL = 'https://1drv.ms/p/c/69de94ef84c9ee8c/IQS4Kv2bDtgfRIvwXjeLcmZNAURBt9mo7LGuj8eTAIRsFAw?em=2&wdAr=1.7777777777777777';
// 剛產生的 PDF 在這段時間內直接重用：幾個人同時按、或連按兩種版面，只開一次雲端瀏覽器
const REUSE_MS = 2 * 60 * 1000;
// LINE、Facebook 等連結預覽機器人：不啟動瀏覽器（LINE 傳連結時會先偷打開一次）
const PREVIEW_BOT = /facebookexternalhit|line-poker|bot|crawl|spider|slack|twitter|whatsapp|discord|telegram|preview/i;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 同一個 Worker 執行個體內的暫存（盡力而為，不保證跨請求都在）
let memo = { bytes: null, at: 0, slides: 0 };
let inflight = null;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = { 'Access-Control-Allow-Origin': '*' };
    // 報告事項頁的按鈕連到 /print：先顯示「產生中」，再換成 /pdf（產生 PDF 的十幾秒內畫面不會一片空白）
    if (url.pathname === '/print') return waitingPage(url.searchParams.get('n') === '2' ? 2 : 4, cors);
    if (url.pathname !== '/pdf') return new Response('liming-reports-pdf：請用 /print?n=4 或 /pdf?n=4', { headers: cors });
    if (request.method === 'HEAD') return new Response(null, { headers: cors });
    if (PREVIEW_BOT.test(request.headers.get('User-Agent') || '')) {
      return new Response('<!doctype html><meta charset="utf-8"><title>黎明教會報告事項 PDF</title><p>黎明教會報告事項（列印用 PDF）</p>',
        { headers: { ...cors, 'Content-Type': 'text/html; charset=utf-8' } });
    }

    const n = [1, 2, 4].includes(+url.searchParams.get('n')) ? +url.searchParams.get('n') : 4;
    const debug = url.searchParams.has('debug');
    const t0 = Date.now();
    const log = [];
    const mark = s => log.push(`${((Date.now() - t0) / 1000).toFixed(1)}s ${s}`);

    try {
      let src, slides;
      if (memo.bytes && Date.now() - memo.at < REUSE_MS) {
        ({ bytes: src, slides } = memo);
        mark(`重用 ${Math.round((Date.now() - memo.at) / 1000)} 秒前產生的 PDF`);
      } else {
        if (!inflight) inflight = generate(env, mark).finally(() => { inflight = null; });
        else mark('有人正在產生，等同一份');
        ({ bytes: src, slides } = await inflight);
      }
      const out = n === 1 ? src : await nup(src, n);
      mark(`排版完成（${n} 張一頁）`);

      if (debug) return Response.json({ ok: true, slides, bytes: out.length, log }, { headers: cors });
      const name = encodeURIComponent(`黎明報告事項-${n}張一頁.pdf`);
      return new Response(out, { headers: { ...cors, 'Content-Type': 'application/pdf', 'Cache-Control': 'no-store',
        'Content-Disposition': `inline; filename="reports-${n}up.pdf"; filename*=UTF-8''${name}` } });
    } catch (e) {
      mark('錯誤：' + e.message);
      if (debug) return Response.json({ ok: false, error: e.message, log }, { status: 502, headers: cors });
      return errorPage(e.message, cors);
    }
  },
};

// 開雲端瀏覽器拿 OneDrive「列印為 PDF」的結果，回傳 { bytes, slides }
async function generate(env, mark) {
  const browser = await launchWithRetry(env, mark);
  try {
    mark('瀏覽器啟動');
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 744 });
    // 雲端瀏覽器預設英文；指定繁體中文（下面的文字比對也同時接受英文）
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-TW,zh;q=0.9' });
    const cdp = await page.createCDPSession();
    await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true });
    await page.goto(EMBED_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    mark('OneDrive 頁面載入');

    // 等播放器 iframe 與頁碼文字（「第 1 張投影片，共 38 張」或 "Slide 1 of 38"）
    const counterJs = () => { const t = document.body ? document.body.innerText : ''; const m = t.match(/第 *([0-9]+) *張投影片[^0-9]*([0-9]+)/) || t.match(/Slide *([0-9]+) *of *([0-9]+)/i); return m ? m[2] : ''; };
    let frame, total = '';
    for (let i = 0; i < 120 && !total; i++) {
      frame = page.frames().find(f => f.url().includes('PowerPointFrame'));
      if (frame) total = await frame.evaluate(counterJs).catch(() => '');
      if (!total) await sleep(500);
    }
    if (!total) throw new Error('OneDrive 播放器沒有出現');
    mark(`播放器就緒，共 ${total} 張`);

    // 讓播放器開始接收鍵盤：先對按鈕呼叫 click()（不會翻頁），再 focus
    await frame.evaluate(() => { const b = document.getElementById('ButtonFastFwd-Small14'); if (b) b.click(); });
    await sleep(800);
    await frame.evaluate(() => window.focus());

    // 找出畫面上文字剛好是 texts 其中之一的元素；有找到就把焦點移過去（focus=true 時）
    const findInFrame = (texts, focus) => frame.evaluate((t, doFocus) => {
      const el = [...document.querySelectorAll('a,button,[role=menuitem],[role=button],span,div')]
        .filter(e => e.children.length <= 2 && e.getClientRects().length && t.includes((e.innerText || '').trim())).pop();
      if (el && doFocus) (el.closest('a,button,[role=menuitem],[tabindex]') || el).focus();
      return !!el;
    }, texts, !!focus);
    const waitText = async (texts, ms) => {
      for (let i = 0; i < ms / 300; i++) { if (await findInFrame(texts)) return true; await sleep(300); }
      return false;
    };
    // 對某段文字的元素按 Enter
    const pressEnterOn = async texts => { if (await findInFrame(texts, true)) await page.keyboard.press('Enter'); };

    // 功能表 → 列印為 PDF → 等「開啟 PDF」出現（代表微軟已產生好）
    const PRINT = ['列印為 PDF', 'Print to PDF'], OPEN = ['開啟 PDF', 'Open PDF'];
    await frame.evaluate(() => document.getElementById('ChromelessStatusBar.Options-Small14').focus());
    await page.keyboard.press('Enter');
    if (!await waitText(PRINT, 6000)) throw new Error('OneDrive 播放器的功能表沒打開');
    await pressEnterOn(PRINT);
    if (!await waitText(OPEN, 60000)) throw new Error('微軟沒有產生 PDF');
    mark('微軟 PDF 產生完成');

    // 讀出「開啟 PDF」的 form 與 Cookie，關掉瀏覽器，由 Worker 自己 POST
    const form = JSON.parse(await frame.evaluate(() => {
      const f = [...document.querySelectorAll('form')].find(x => /pdfhandler/i.test(x.action));
      return JSON.stringify(f ? { action: f.action, body: new URLSearchParams(new FormData(f)).toString() } : null);
    }));
    if (!form) throw new Error('找不到 PDF 下載表單');
    const { cookies } = await cdp.send('Network.getAllCookies');
    const cookieHeader = cookies.filter(c => c.domain.replace(/^\./, '').endsWith('live.com')).map(c => c.name + '=' + c.value).join('; ');
    const ua = await browser.userAgent();
    await browser.close();

    for (let i = 0; i < 5; i++) {
      const res = await fetch(form.action, { method: 'POST', redirect: 'follow', body: form.body, headers: {
        'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': ua, 'Cookie': cookieHeader,
        'Origin': 'https://powerpoint.officeapps.live.com', 'Referer': 'https://powerpoint.officeapps.live.com/' } });
      if (res.ok && /pdf/i.test(res.headers.get('content-type') || '')) {
        const bytes = new Uint8Array(await res.arrayBuffer());
        mark(`PDF 下載完成 ${(bytes.length / 1048576).toFixed(1)} MB`);
        memo = { bytes, at: Date.now(), slides: +total };
        return memo;
      }
      mark(`第 ${i + 1} 次抓 PDF：${res.status}`);
      await sleep(2000);
    }
    throw new Error('從微軟下載 PDF 失敗');
  } finally {
    await browser.close().catch(() => {});
  }
}

// 免費方案每 20 秒才能開一個新瀏覽器、最多同時 3 個；Cloudflare 偶爾也會暫時沒有瀏覽器（503 No browser available）：都等一下再試
async function launchWithRetry(env, mark) {
  for (let i = 0; ; i++) {
    try {
      return await puppeteer.launch(env.MYBROWSER);
    } catch (e) {
      if (!/429|503|rate|limit|too many|no browser available/i.test(e.message) || i >= 4) throw new Error('雲端瀏覽器忙碌中（' + e.message.slice(0, 80) + '）');
      let wait = 5000;
      try { const l = await puppeteer.limits(env.MYBROWSER); if (l && l.timeUntilNextAllowedBrowserAcquisition > 0) wait = l.timeUntilNextAllowedBrowserAcquisition + 500; } catch {}
      wait = Math.min(wait, 21000);
      mark(`雲端瀏覽器限流，等 ${(wait / 1000).toFixed(1)} 秒`);
      await sleep(wait);
    }
  }
}

// 多頁合一：2＝A4 直式上下兩張；4＝A4 橫式 2x2；保持向量
async function nup(srcBytes, n) {
  const MM = 72 / 25.4;
  const [cols, rows, land] = n === 2 ? [1, 2, false] : [2, 2, true];
  const [PW, PH] = land ? [297 * MM, 210 * MM] : [210 * MM, 297 * MM];
  const M = 10 * MM, G = 6 * MM;
  const cw = (PW - 2 * M - (cols - 1) * G) / cols;
  const ch = (PH - 2 * M - (rows - 1) * G) / rows;
  const src = await PDFDocument.load(srcBytes);
  const out = await PDFDocument.create();
  const embedded = await out.embedPdf(src, src.getPageIndices());
  for (let p = 0; p < embedded.length; p += n) {
    const page = out.addPage([PW, PH]);
    embedded.slice(p, p + n).forEach((ep, k) => {
      const s = Math.min(cw / ep.width, ch / ep.height);
      const w = ep.width * s, h = ep.height * s;
      const c = k % cols, r = Math.floor(k / cols);
      const x = M + c * (cw + G) + (cw - w) / 2;
      const y = PH - M - r * (ch + G) - (ch + h) / 2;
      page.drawPage(ep, { x, y, width: w, height: h });
      page.drawRectangle({ x, y, width: w, height: h, borderColor: rgb(0.67, 0.67, 0.67), borderWidth: 0.5 });
    });
  }
  return out.save();
}

// 等待頁：馬上顯示說明，再用 location.replace 換成 PDF。
// 瀏覽器在新頁面回應之前會繼續顯示這一頁，所以等待期間看得到說明；按「上一頁」也不會回到這裡
function waitingPage(n, cors) {
  const html = `<!doctype html><html lang="zh-TW"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>報告事項 PDF 產生中</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:56px 16px;line-height:1.8;color:#333;text-align:center;background:#fff}
  .spin{width:44px;height:44px;margin:0 auto 20px;border:4px solid #ffd6e0;border-top-color:#e56a8c;border-radius:50%;animation:s 1s linear infinite}
  @keyframes s{to{transform:rotate(360deg)}}
  h2{margin:0 0 8px;font-size:1.25rem} p{margin:0 0 6px} .muted{color:#888;font-size:.9rem}
  @media (prefers-color-scheme:dark){body{background:#111;color:#ddd}.muted{color:#999}}
</style>
<body><div class="spin"></div>
<h2>正在產生最新的報告事項 PDF</h2>
<p>${n} 張投影片一頁，大約需要 15 秒</p>
<p class="muted">請不要關閉這一頁；PDF 出來後，用「分享 → 列印」</p>
<script>setTimeout(function(){ location.replace('/pdf?n=${n}'); }, 50);</script>
<noscript><p><a href="/pdf?n=${n}">開啟 PDF</a></p></noscript></body></html>`;
  return new Response(html, { headers: { ...cors, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

function errorPage(detail, cors) {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const html = `<!doctype html><html lang="zh-TW"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PDF 產生失敗</title>
<body style="font-family:system-ui,sans-serif;max-width:480px;margin:40px auto;padding:0 16px;line-height:1.7;color:#333">
<h2 style="margin:0 0 12px">PDF 暫時產生不出來</h2>
<p>請等 30 秒後<b>重新整理</b>這一頁再試一次。</p>
<p>如果一直失敗，可以先打開<a href="${esc(EMBED_URL)}">微軟的簡報播放器</a>，點右下角 ▤ 功能表 →「列印為 PDF」（一張一頁）。</p>
<p style="color:#999;font-size:.85em">原因：${esc(detail)}</p></body></html>`;
  return new Response(html, { status: 503, headers: { ...cors, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
