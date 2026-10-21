# 黎明教會整合平台 專案說明（News repo）

## 專案架構

| 角色 | 位置 | 說明 |
|------|------|------|
| **後端 API** | Google Apps Script | 讀取 Google Drive 圖片、回傳資料 |
| **前端頁面** | GitHub Pages | 外殼 + 內容頁 + 靜態資源 |

網站名稱：**黎明教會整合平台**（2026-10-13 前叫「黎明教會活動快報」，已不只是活動快報）。
主畫面圖示名稱「黎明教會」（`manifest.json` 的 `short_name`、`apple-mobile-web-app-title`）；
`manifest.json` 的 `id` 維持 `liming-news`，**不要改**（改了已安裝的 APP 會被當成另一個）。

網址：https://liming-tjc.org
（`CNAME` 檔在 News repo 內，DNS 在 **Cloudflare** 管理；`www.liming-tjc.org` 會 301 轉到不帶 www 的網址）

> ⚠️ **News repo 不能改名、`CNAME` 不能拿掉、GitHub Pages 不能關。**
> 有人把 `tjcliming.github.io/News/` 存在書籤或記事本裡，這個網址是 GitHub 依照 `CNAME` 自動 301 轉到 `liming-tjc.org`，
> 它沒有到期日，但只要 repo 改名或拿掉 `CNAME`，這些舊連結就全部失效。

### 舊網域 `li-ming-tjc.org`（2026-10-13 起停用）

- DNS 仍在 **wix.com**，指向 GitHub Pages，由另一個 repo **`TJCLiMing/li-ming-redirect`** 接手：
  - `index.html` 與 `404.html` 內容相同，都是轉址頁：顯示新網址、提醒更新書籤／主畫面／記事本／LINE，倒數 **8 秒**後跳轉
  - `sw.js`：把舊網域以前裝在手機上的 Service Worker 與快取清掉並自我移除
  - 本機有一份在桌面 `C:\Users\c3012\Desktop\li-ming-redirect`（不是 git repo，使用者手動上傳到 GitHub）
  - 已裝 **Cloudflare Web Analytics**（JS 程式碼，2026-10-13），後台看 `li-ming-tjc.org` 就知道還有多少人從舊網址進來。
    擋廣告外掛會擋掉統計，數字只會偏少
  - 新網域 `liming-tjc.org` 在後台雖然是「Automatic setup」，但網域是「只做 DNS」（灰色雲朵、直連 GitHub），
    流量不經過 Cloudflare，**實際上沒在統計**；要統計得在 News 頁面加 JS 程式碼（使用者目前決定不加）
- Wix 已關閉自動續約，**2027-07-09 到期停用**（見 `05.Invite` 規格第 7 節）。
  到期後舊連結、舊 QR Code 全部失效，之前要把外部連結都換掉；到期前看流量統計，人多就多續一年
- 帶著原本的路徑、參數、`#` 轉到新網域：`li-ming-tjc.org/reports.html` → `liming-tjc.org/reports.html`
- `frame-nav.js`、`index.html` 的 `EMBEDDABLE_HOSTS` 暫時保留舊網域，等外部連結都換完再移除
- 新網域是不同的「網站來源」：舊網域加到主畫面的 APP 圖示要刪掉重加；
  `localStorage` 裡的設定（科技版風格 `uiStyle` 等）不會帶過來，使用者要重新選一次
- **瀏覽器會記住舊的 301 轉址**：換網域前開過 `tjcliming.github.io/News/` 的瀏覽器，
  會一直被帶到舊網域（多看一次轉址頁），不會自己過期；清掉瀏覽器的「快取圖片和檔案」就好。
  舊網域到期後這些人會打不開，所以轉址頁要提醒大家改書籤

---

## 前端檔案結構（外殼架構）

> ⚠️ **要改首頁內容，是改 `home.html`，不是 `index.html`**

```
liming-tjc.org/        → index.html（外殼，全螢幕 iframe）
      └── iframe        → home.html（首頁內容）
```

| 檔案 | 角色 | 什麼時候要動 |
|------|------|-------------|
| `home.html` | **首頁內容頁** | 改快捷功能區、好友連結、海報區 → **改這個** |
| `index.html` | 外殼 | 只在調整回首頁鈕、hash 路由時才動 |
| `index-tech.html` | 科技版內容頁 | 對應 `home.html` 的另一種風格 |
| `photos.html` | 相簿頁 | **LINE 官方帳號圖文選單 F 直接連到它**，不要改檔名或刪除 |
| `schedule.html` | 安排表**單頁版**（獨立呼叫 API 讀安排表圖檔）| 網站內沒有頁面連到它，但 **LINE 官方帳號圖文選單 E 直接連到它**，不要改檔名或刪除；`home.html` 內也有同樣的安排表區塊 |
| `app.html` | 轉址頁 | 保留舊 `/app.html` 連結用，**不要刪** |
| `reports.html` | 報告事項入口頁，兩區：**報告簡報**（打開簡報、列印用 PDF）、**代禱事項**（編輯、列印）| 換簡報檔見下方「報告事項」 |
| `prayer.html` | 代禱事項維護（讀寫「02.代禱事項」試算表）| 首頁沒有直接連結；**報告事項頁的「🙏 代禱事項 → 開啟編輯」、禱告記錄板的「維護 ↗」（連 `/prayer`）都連到這裡**，不要改檔名；可被其他網頁嵌入，見下方「代禱事項維護」 |
| `frame-nav.js` | iframe 內的連結導向控制 | 新增可嵌入網域時要改（`index.html` 也要同步改）|
| `sw.js` | Service Worker（離線快取）| 見下方版本規則 |
| `manifest.json` | PWA 設定 | |
| `worker/reports-pdf/` | 報告事項「列印用 PDF」的 **Cloudflare Worker 原始碼**（不是網頁）| 改完要另外部署，見下方「列印用 PDF」；`node_modules` 不進 git |

### 外部從哪裡連進網站（改檔名、換網址前先看這裡）

| 來源 | 連到 |
|------|------|
| LINE 官方帳號圖文選單 A | `https://tjc-km.github.io/prayer-roster/`（禱告記錄板） |
| 圖文選單 B | Google 雲端資料夾 |
| 圖文選單 C | `https://liming-tjc.org/?openExternalBrowser=1`（首頁，強制用 Safari／Chrome 開） |
| 圖文選單 D | 中區網站 `central.tjc.org.tw` |
| 圖文選單 E | `https://liming-tjc.org/schedule.html`（安排表單頁版） |
| 圖文選單 F | `https://liming-tjc.org/photos.html`（相簿） |
| 禱告記錄板「維護 ↗」（`TJC-KM/prayer-roster`） | `https://liming-tjc.org/prayer` |
| 舊網址 | `tjcliming.github.io/News/…`（GitHub 自動轉址）、`li-ming-tjc.org/…`（轉址頁，見上方） |

> 圖文選單：使用者 2026-10-14 貼的設定，E、F 原本是 `tjcliming.github.io/News/...`，2026-10-21 使用者確認已改成新網域。
> 實際網址以 LINE Official Account Manager 後台為準

### 外殼在解決什麼問題

使用者瀏覽器會開一大堆分頁。外殼讓：

- **可嵌入**的連結（`liming-tjc.org`、`tjc-km.github.io`）→ 留在 iframe 內，不開新分頁
- **不可嵌入**的（Google Meet / Forms / Sites、LINE、Canva、OneDrive（報告事項「打開簡報」），都有 `X-Frame-Options`；
  以及不在白名單的網域，例如列印用 PDF 的 `*.workers.dev`）
  → 共用同一個 `liming-ext` 分頁，不管點幾個最多只佔 1 個

分頁數從 8+ 降到最多 2 個。

外殼有**防疊套保護**：被自己的 iframe 載入時會 `location.replace('home.html')`，
所以任何頁面連到 `index.html` 都不會變成外殼裡再包一層外殼。

> ⚠️ **寫自家頁面時的兩個坑**（都踩過）
> - **自家連結在外殼裡一律在框內開**：`frame-nav.js` 點擊時會把 `target` 改成 `_self`，寫 `target="_blank"` 沒用。
>   真的要開新分頁（例如列印頁），要自己 `e.preventDefault()` 再 `window.open(href, '_blank')`——見 `reports.html` 的代禱事項「列印」
> - **在外殼裡 `window.self !== window.top` 也會成立**：用它判斷「被別人嵌入」時要排除同網域的外殼
>   （`try { window.top.location.origin === location.origin } catch {}`，跨網域會丟錯）——見 `prayer.html` 的標題列

### 重新整理與位置記憶

網址列一直停在 `liming-tjc.org/`，所以外殼自己記住 iframe 目前在哪一頁：

- **記在 `sessionStorage` 的 `shellFrameUrl`**：同一個分頁重新整理會回到原本那頁；關掉分頁或 APP 重開則從首頁開始
- **自家頁面**（相簿、海報…）：精確回到原本位置，包括相簿的 `#相簿ID`
- **跨網域網站**（`tjc-km.github.io`）：瀏覽器不讓外殼讀它的位置，只能回到**當初點進去的入口網址**。
  入口網址由 `frame-nav.js` 在點擊時用 `postMessage` 通知外殼
- **右下角 ↻ 按鈕**（離開首頁才出現，疊在 🏠 上方）：只重新整理 iframe。同網域原地重載；跨網域重新載入入口網址
- 深層連結 `#schedule` / `#photos` 套用後會清掉外殼網址的 hash，之後重新整理才不會一直被拉回去

> `frame-nav.js` 與 `index.html` 各有一份 `EMBEDDABLE_HOSTS`，新增可嵌入網域時**兩邊都要改**。

### 深層連結

```
liming-tjc.org/#schedule   → home.html#schedule（月份安排表）
liming-tjc.org/#photos     → photos.html（相簿）
```

### 改 sw.js 的規則

**改完靜態檔案要把 `sw.js` 的 `VERSION` 加一**（`v2` → `v3`），舊快取才會被清掉。

| 資源 | 策略 |
|------|------|
| HTML / JSON / JS | 網路優先（不會卡舊版）|
| 圖片 | 快取優先 → **所以改了要升版本** |
| 跨網域（GAS API、Google Fonts、tjc-km、OneDrive、Worker）| 完全不攔截 |

> **改 `frame-nav.js` 時，同時把頁面引用的 `frame-nav.js?v=N` 版本號加一**（`home.html`、`index-tech.html`、`photos.html`、`posters.html`、`reports.html`、`schedule.html` 共 6 處）。
> 還在用舊版 Service Worker 的使用者會先拿快取裡的舊 JS，換網址才能讓他們第一次開啟就拿到新版。
> 曾經發生過：外殼已經是新版，但 `frame-nav.js` 還是舊的，結果外部網站重新整理會跳回首頁。

### PWA icon

| 檔案 | 尺寸 | 用途 |
|------|------|------|
| `icon-192.png` / `icon-512.png` | 192, 512 | 一般圖示 |
| `icon-maskable-192.png` / `icon-maskable-512.png` | 192, 512 | Android 自適應（有留安全邊距）|
| `apple-touch-icon.png` | 180 | iOS 主畫面 |

> icon 實際尺寸必須跟 `manifest.json` 宣告一致，否則 Android 不會跳安裝提示。

---

## 工作目錄

| 類型 | 本機路徑 |
|------|---------|
| **統一工作目錄** | `C:\Users\c3012\GoogleAppsScript\News` |

> `LimingNews2026` 已廢棄，可刪除。`News` 同時管理 GAS（clasp）與 GitHub（git）。
> 這份文件放在 repo 內，會跟著 git 同步到另一台電腦。

---

## 登入帳號

### Google Apps Script（clasp）

> ⚠️ **部署前務必確認帳號！不同專案對應不同帳號，搞錯會沒有部署權限**
> 切換指令：`clasp logout` → `clasp login`

#### LimingNews2026（整合平台的 GAS 後端）
| 帳號 | 權限 | 可執行操作 |
|------|------|-----------|
| `lmf@tjcedu.org` | **擁有者** | push、建立版本、**部署** |
| `c3012312@gmail.com` | 編輯者 | push（不能部署） |

#### LineBotHelper（Line 小幫手）
| 帳號 | 權限 | 可執行操作 |
|------|------|-----------|
| `c3012312@gmail.com` | **擁有者** | push、建立版本、**部署** |

路徑：`C:\Users\c3012\GoogleAppsScript\LineBotHelper`
部署 ID：`AKfycbw4peRpwBaI5-i1eTGR54Uo9HNSaPw3hj-tDW9g07fB8XcYvEfA6RSResxfy4RuFQ`

### GitHub
| 項目 | 內容 |
|------|------|
| Repo | https://github.com/TJCLiMing/News.git（擁有者 `TJCLiMing`）|
| 推送帳號 | **`TJC-KM`**（有寫入權）|
| commit 作者 | `TJCLiMing <lmf@tjcedu.org>`（repo 的 `user.name` / `user.email`）|

這台電腦的認證管理員存了 `TJCLiMing` 與 `TJC-KM` 兩個帳號，沒指定時每次推送都會跳出
「Select an account」視窗等人選，自動化的推送會卡住。已在此 repo 指定推送帳號：

```bash
git config credential.https://github.com.username TJC-KM
```

> 這是本機的 `.git/config`，**不會跟著 git 同步**——另一台電腦要再設一次。
> 推送帳號與 commit 作者是分開的，改推送帳號不會改變 commit 上顯示的作者。

### Cloudflare（wrangler）
| 項目 | 內容 |
|------|------|
| 帳號 | `c3012312@gmail.com`（Cloudflare 帳號「C3012312@gmail.com's Account」）|
| 管的東西 | `liming-tjc.org` 的 DNS、列印用 PDF 的 Worker `liming-reports-pdf`、邀請卡（`05.Invite`）的 Worker、舊網域的流量統計 |
| 確認登入 | `npx wrangler whoami`（在 `worker/reports-pdf` 裡執行）|

---

## 常用指令

### 前端（HTML、圖片）→ GitHub，在 `News` 目錄
```bash
git pull
git add .
git commit -m "說明"
git push
```

### 後端（程式碼.js）→ GAS

> 🛑 **不要在 `News` 目錄直接 `clasp push`**
>
> GAS 專案裡有 5 個檔：`程式碼.js`、`appsscript.json`，以及改版前的
> `index.html`、`photos.html`、`schedule.html`。
> 這三個舊 HTML **還在用**——`doGet()` 沒帶 `mode` 參數時會回傳 GAS 的 `index.html`，
> 舊的 GAS 網址與書籤靠它運作。
>
> 但 `News` 裡同名的 HTML 已經是 GitHub Pages 版本（`index.html` 甚至是 APP 外殼），
> 內容完全不同，所以 `.claspignore` 把它們排除，只推 `程式碼.js` 與 `appsscript.json`。
> **`clasp push` 會把遠端換成本機的檔案集合**，從 `News` 推就會**刪掉那三個舊 HTML**。
>
> 另外 `News` 的 `appsscript.json` 是 CRLF、遠端是 LF，clasp 會誤判 manifest 有改動，
> 非互動環境下直接顯示 `Skipping push` 而不推。

**正確做法：從遠端副本推**

```bash
# 1. 把遠端完整拉到暫存資料夾（不要在 News 裡做）
mkdir C:\temp\gas-push && cd C:\temp\gas-push
clasp clone 17krkepdEYq5nr0idnFi2zbqn8bYowJZDbWF5RZUhaFoI2ERUvp4NlXq5

# 2. 只換掉程式碼（轉成 LF，跟遠端一致）
tr -d '\r' < C:/Users/c3012/GoogleAppsScript/News/程式碼.js > 程式碼.js

# 3. 確認 5 個檔都在，再推
clasp status
clasp push

# 4. 部署（必須是 lmf@tjcedu.org，見下方）
clasp version "說明"
clasp deploy --versionNumber X --deploymentId <主要部署 ID> --description "說明"
```

> ⚠️ **`.claspignore` 仍然不要刪**
> 少了它，`frame-nav.js` 和 `sw.js` 也會被推上 GAS——這兩個檔案最外層直接用了
> `window` / `self` / `document`，GAS 載入時會 ReferenceError，**整個後端 API 會掛掉**。
> 它是最後一道防線，萬一有人在 `News` 誤下 `clasp push`，至少不會推壞 API。

> ⚠️ **不要用 `clasp pull`**——會用 GAS 上的版本覆蓋本機的 `程式碼.js`。

> ⚠️ **觸發器跑的是最新推送的程式碼（HEAD），不是部署版本**
> `keepWarm()` 每 5 分鐘執行一次，`clasp push` 後立刻就會用新程式碼。
> 推之前務必確認語法正確：`node --check 程式碼.js`

### 本機預覽前端

```bash
python -m http.server 8765
# 然後開 http://localhost:8765/
```

必須用 http 伺服器，不能直接開檔案（`file://` 下 Service Worker 與 iframe 跨源判斷都不會正常）。

### 前端上線時間

`git push` 後 GitHub Pages 大約要 **30 秒～1 分鐘**才會生效，不是即時的。

---

## 主要部署 ID
```
AKfycbzWzh7mEl9wt7ehw7SWLQpwpJlbRB6AoDhSiFSex7YC2sp92ceICPct4AO64LiyN8lbPg
```

---

## Script Properties（GAS 後端設定）
| 屬性名稱 | 說明 |
|---------|------|
| `POSTER_FOLDER_ID` | 活動海報 Google Drive 資料夾 ID |
| `SCHEDULE_FOLDER_ID` | 月份安排表 Google Drive 資料夾 ID |
| `QRCODE_FILE_ID` | 黎明官方帳號 QRCode 圖片 Drive ID |
| `HELPER_QRCODE_FILE_ID` | 小幫手 QRCode 圖片 Drive ID |
| `DEPLOY_TIME` | 最後部署時間（執行 `setDeployTime()` 更新） |
| `CACHED_DATA` | 海報與安排表的快取（JSON），程式自動寫入，**不要手動改** |
| `CACHED_AT` | 快取建立時間（毫秒），程式自動寫入，用來判斷重新整理的冷卻時間 |
| `PRAYER_SHEET_ID` | （選填）代禱事項試算表 ID；沒設定時用程式內預設的「02.代禱事項」 |

---

## 代禱事項維護（`prayer.html`）

網址：<https://liming-tjc.org/prayer.html>，試玩假資料：`prayer.html?demo=1`（不會寫入試算表）

- 讀寫試算表「02.代禱事項」，後端是 `程式碼.js` 的 `doPost`（`action: prayerGet / prayerSave`）
- **不需要登入，任何人都能改**，也**不記錄修改者**（使用者決定）
- 只動「近期代禱」「長期關懷代禱」「近期事工」三個分頁的 A、B 欄資料列，以及「規範說明」分頁「經文」那一列的 B、C 欄。
  **分頁名稱不能改**——試算表另有投影程式靠分頁名稱讀資料
- 字數上限（前後端都檢查）：近期代禱 15、長期關懷 5、近期事工 30。改規範時 `程式碼.js` 的 `PRAYER_TABS` 與 `prayer.html` 的 `CATS` 要一起改
- 近期代禱的 A 欄格式是「姓名稱謂（備註）」，畫面上拆成「姓名稱謂」＋「備註」兩格（備註有快選：住院、開刀、身體欠安、心靈欠安，也可自行輸入），
  儲存時用全形括號組回去，**試算表格式不變**。快選項目在 `prayer.html` 的 `statusOptions`
- 兩人同時改：儲存時比對讀取當下的版本，被別人改過就**拒絕儲存**並請使用者重新載入，不會互相覆蓋
- 後端以部署者 `lmf@tjcedu.org` 身分寫入，所以這個帳號必須對試算表有編輯權
- **列印版 `?print=1`**：畫面上只顯示列印版面＋「列印／關閉」工具列（不顯示編輯畫面），讀完資料自動跳出列印；
  印的是試算表上已儲存的內容。報告事項頁的「🖨️ 列印」就是開新分頁到這裡。
  要開**獨立分頁**列印：手機列印的是整個頁面，在平台外殼的框裡列印，iPhone 可能把整個平台畫面印出來
- 編輯畫面下方的「列印代禱事項（含備註說明）」印的是畫面上目前的內容（含還沒儲存的修改）。
  在平台外殼的框裡按時，iPhone 會不會把整個平台畫面一起印出來，**尚未實機確認**

### 嵌入其他網頁

```html
<iframe src="https://liming-tjc.org/prayer.html" style="width:100%;height:720px;border:0"></iframe>
```

- 被**其他網站**用 iframe 嵌入時**自動隱藏綠色標題列**（宿主網頁通常有自己的標題）；
  被自家平台外殼（同網域）包住時照樣顯示。`?header=1` 強制顯示、`?header=0` 強制隱藏
- **請給固定高度**（建議 600～800px），讓頁面在框內自己捲動。
  底部的「儲存」列和編輯彈窗都是貼齊框的可視範圍，若把 iframe 撐成跟內容一樣高，這兩個會跑到宿主畫面外面看不到

---

## 報告事項（`reports.html`）

入口：`home.html` 的快捷功能區與「報告事項」卡片、`index-tech.html` 的報告事項模組。

簡報**只有一份**：OneDrive 上的「2026代禱及事項宣佈.pptx」，改完按鈕打開的就是最新版。

**2026-10-21 起這頁不再內嵌播放器**（每次要等 10～20 秒、一次只能看一張），改成入口頁，分兩區：

- **第一區「📖 報告簡報」**（OneDrive 上的 pptx）
  - 「打開簡報」→ `VIEW_URL`，開新分頁（外殼裡開到共用的 `liming-ext` 分頁）。
    OneDrive 分享頁禁止被嵌入（`X-Frame-Options: SAMEORIGIN`），只能開新分頁，所以說明文字和列印按鈕留在這頁
  - 「🖨️ 列印用 PDF：4 張一頁／2 張一頁」→ Cloudflare Worker，見下方
  - **不另設編輯按鈕**：「打開簡報」在平板、電腦上本來就是編輯模式，註明「📱 手機僅供瀏覽、列印／✏️ 編輯請用平板或電腦」（使用者決定，2026-10-21）
- **第二區「🙏 代禱事項」**（見上方「代禱事項維護」）
  - 「✏️ 編輯」→ `prayer.html`，自家頁面，在外殼裡留在框內開
  - 「🖨️ 列印」→ `prayer.html?print=1` 列印版，**用 `window.open` 開新分頁**（外殼會蓋掉 `target="_blank"`，見上方「寫自家頁面時的兩個坑」）

| 檔內常數 | 內容 |
|---------|------|
| `EDIT_URL` | OneDrive 分享連結（可以編輯） |
| `VIEW_URL` | 「打開簡報」用。**目前就是 `EDIT_URL`**：使用者決定（2026-10-21）大部分人用手機，手機瀏覽器本來就不能編輯 |
| `PDF_WORKER` | 列印用 PDF 的 Worker 網址 |

### 各裝置打開分享連結的樣子（2026-10-21 用模擬裝置身分實測）

| 裝置 | 結果 |
|------|------|
| 手機（含 LINE 內建瀏覽器） | 檢視：投影片上下排開，可以捲動看完。點 ✏️ 會要求改用 PowerPoint APP；切「桌面版網站」才能在瀏覽器裡編輯 |
| iPad（Safari 預設自稱 Mac） | 完整 PowerPoint 網頁版，**一打開就是編輯模式** |
| Android 平板、電腦 | 同上，一打開就是編輯模式 |

都不用登入（連結是「知道連結的人都能編輯」）。微軟依瀏覽器回報的裝置身分決定給哪種畫面，手機不能在瀏覽器編輯是微軟的政策。
> ⚠️ 電腦／iPad 上有人誤改，會直接存進正式簡報。要避免的話，在 OneDrive「共用」產生「可以檢視」的分享連結，填進 `VIEW_URL`

### 換簡報檔

1. OneDrive「共用」→ 複製連結 → 貼到 `reports.html` 的 `EDIT_URL`（有「可以檢視」連結的話也換 `VIEW_URL`）
2. 列印用 PDF 的 Worker 用的是**唯讀內嵌網址**：OneDrive 網頁版對新檔案選「內嵌」→ 產生 → 複製 iframe 程式碼裡的 `src`，
   貼到 `worker/reports-pdf/src/index.js` 的 `EMBED_URL`，再 `npm run deploy`
3. `sw.js` 版本加一，推上 GitHub

> ⚠️ 內嵌網址**一定要用「內嵌」功能產生**。試過不能用的做法：
> - 分享連結頁面本身禁止嵌入（`X-Frame-Options: SAMEORIGIN`）
> - 用分享連結自己組 `action=embedview` → 出現「請登入以檢視此檔案」
> - Office Online viewer（`view.officeapps.live.com`）→ 找不到檔案（下載要登入 Cookie）

### 列印用 PDF（Cloudflare Worker `liming-reports-pdf`）

報告事項頁的「4 張一頁」「2 張一頁」按鈕 → `https://liming-reports-pdf.c3012312.workers.dev/print?n=4|2`
（`reports.html` 的 `PDF_WORKER`）。**按下當下才產生，一定是 OneDrive 上的最新版**，約 10～15 秒；要等雲端瀏覽器時會到 30 秒左右（頁面寫「約 15～30 秒」）。

- 流程：Cloudflare 雲端無頭瀏覽器（Browser Run）打開唯讀內嵌播放器 → 用**鍵盤**操作「功能表 → 列印為 PDF」
  → 微軟產生向量 PDF → 讀出「開啟 PDF」那個 form（欄位 `Pid`）和 Cookie，**由 Worker 自己 POST** `pdfhandler.ashx` 拿 PDF
  → 用 pdf-lib 排版：4＝A4 橫式 2×2、2＝A4 直式上下兩張（向量，文字清晰）
- `/print` 先顯示「正在產生…」再換成 `/pdf`，等待期間不會一片空白；`/pdf?n=4&debug=1` 回各階段耗時（除錯用）
- 試過不行的：無頭瀏覽器裡**滑鼠點擊、觸控都送不進播放器**（鍵盤可以，但要先讓播放器取得焦點）；
  在瀏覽器裡 fetch `pdfhandler.ashx` 雲端會失敗（本機可以）；Graph API `?format=pdf` 檔案上限 2 MB 且要擁有者登入
- 雲端瀏覽器預設英文介面，程式同時比對中英文（「第 1 張投影片」/ "Slide 1 of 38"、「列印為 PDF」/ "Print to PDF"）
- 額度：Cloudflare 免費方案每天 10 分鐘瀏覽器時間（每次約 12 秒，約 45 次）、**每 20 秒才能開一個新瀏覽器**，
  被拒絕時 Worker 會自動等一下重試；LINE／Facebook 連結預覽機器人不啟動瀏覽器
- 剛產生的 PDF 2 分鐘內會重用，但 workers.dev 網址上只在同一個執行個體內有效（不保證）
- **微軟改了播放器畫面（按鈕 id、選單文字、`pdfhandler` 表單）就會壞**：使用者會看到「PDF 暫時產生不出來」的中文說明頁，
  說明頁附有微軟播放器的連結，可以改用播放器右下 ▤ 功能表 →「列印為 PDF」（不用登入，一樣是最新版；一張一頁）
- 部署帳號：wrangler 登入的 `c3012312@gmail.com`（Cloudflare 帳號「C3012312@gmail.com's Account」）
- **原始碼在 `worker/reports-pdf/`**（`src/index.js`、`wrangler.jsonc`）。改完不會跟著 GitHub Pages 上線，要另外部署：
  ```bash
  cd worker/reports-pdf
  npm install        # 第一次或換電腦時
  npm run check      # 只打包檢查，不部署
  npm run deploy     # 部署到 Cloudflare（wrangler 要登入上面那個帳號）
  ```
  部署後用 `/pdf?n=4&debug=1` 看各步驟耗時確認正常。GitHub Pages 也會公開這個資料夾的檔案（裡面沒有密碼或金鑰）

### 過去的做法

- **2026-10-12 以前**：嵌入 Google 雲端硬碟的 `/preview`（載入快、可往下滑逐頁看）。
  但雲端那份靠一台電腦同時跑 OneDrive 與 Google 雲端硬碟程式同步，**那台電腦不會一直開著**，常和 OneDrive 那份不一致。
  使用者決定「永遠是最新版比較重要」。雲端硬碟上的那份 pptx 網站已經不再使用
- **2026-10-12～10-21**：嵌入 OneDrive 官方內嵌播放器。每次要等 10～20 秒（時間花在微軟那邊：`1drv.ms` → `onedrive.live.com`
  → `powerpoint.officeapps.live.com` 開檔繪製，跟 GAS 無關），一次只能看一張 → 拿掉，改成現在的入口頁

---

## 海報與安排表的快取

海報**不是即時讀雲端硬碟**，共三層：

| 層 | 位置 | 更新時機 |
|----|------|---------|
| 瀏覽器 | `localStorage` 的 `homeDataCacheV1` | 開頁面先顯示上次的資料，背景抓新的後更新 |
| GAS | Script Property `CACHED_DATA` | `?mode=api` 一律回這份，不碰雲端硬碟 |
| 觸發器 | `keepWarm()` | 每 5 分鐘重掃資料夾、覆蓋 `CACHED_DATA` |

所以新增海報後**最多約 5 分鐘**才會出現。要立刻看到，按網站頁尾「資料更新於」旁的 **↻ 按鈕**
（呼叫 `?mode=refresh`，立刻重掃）。

- 頁尾的「資料更新於」是快取建立時間；不是今天會顯示日期，舊資料一眼看得出來
- `?mode=refresh` 是公開的，**60 秒內最多重掃一次**，其他人在冷卻中按只拿現有快取，避免被連按用完配額
- 重掃失敗（雲端硬碟暫時出錯）時**保留原本的快取**，不會讓網站變成錯誤訊息
- 加到主畫面的 APP 模式沒有瀏覽器的重新整理鍵，也靠這顆按鈕

> ⚠️ `CACHED_DATA` 沒有有效期限，只靠 `keepWarm` 覆蓋。
> 若觸發器被刪或停擺，網站會**一直顯示舊資料而且不會報錯**——這時頁尾「資料更新於」會停在某個舊時間。
> 檢查方式：GAS 編輯器左側「觸發條件」，看 `keepWarm` 的最近執行時間。

---

## 每次部署流程

1. **推送程式碼**：從遠端副本推，**不要在 News 裡推**（見上方「後端 → GAS」）
   — 編輯者帳號 `c3012312@gmail.com` 就能推，不必切換
2. **部署（建議用網頁編輯器，不用切換 clasp 帳號）**
   - 開 <https://script.google.com/d/17krkepdEYq5nr0idnFi2zbqn8bYowJZDbWF5RZUhaFoI2ERUvp4NlXq5/edit>
   - ⚠️ **先確認右上角頭像是 `lmf@tjcedu.org`**
   - 部署 → 管理部署作業 → 主要部署（ID 開頭 `AKfycbzWzh7m`）→ 鉛筆 → 版本選「新版本」→ 填說明 → 部署
3. **更新部署時間**：同一個編輯器，函式選 `setDeployTime` → 執行
   — 約 5 分鐘後 `keepWarm` 重建快取才會反映在網站頁尾
4. **GitHub 推送**：`git add . && git commit -m "說明" && git push`
5. **驗證**：`?mode=api` 回傳 `status: success` 且有海報資料，代表新版本讀得到雲端硬碟

> 用 clasp 部署也可以（`clasp version` → `clasp deploy --versionNumber X --deploymentId ...`），
> 但必須先把 clasp 切到 `lmf@tjcedu.org`。
> `clasp login` 產生的網址沒有 `prompt=select_account`，瀏覽器只登入一個帳號時會**不跳選擇畫面直接用那個帳號**，
> 很容易以為切換了其實沒有。部署前一定要用 `clasp show-authorized-user` 確認。

> ⚠️ **為什麼部署一定要用 `lmf@tjcedu.org`，不只是權限問題**
> `appsscript.json` 設定 `executeAs: USER_DEPLOYING`——網頁應用程式是**以部署者的身分執行**的，
> 讀海報、安排表、相簿的雲端硬碟資料夾時用的也是部署者的權限。
> 若改用其他帳號部署，而那個帳號沒有這些資料夾的存取權，**API 就讀不到資料，整個網站會空掉**。

---

## 相簿資料同步

`photos-data.json` 由 GitHub Actions（`.github/workflows/update-photos.yml`）更新：

- **每 3 小時**呼叫 GAS `?mode=photos`，存成靜態檔（單次約 60 秒）
- 先驗證是合格 JSON（`status` 為 `success`、`folders` 非空）才覆蓋；失敗重試 3 次
- 三次都失敗 → 保留原檔、job 失敗、GitHub 寄信通知
- 相簿內容沒變就不 commit；但超過 30 天沒更新會強制更新一次，避免 GitHub 停用排程
- 手動觸發：GitHub → Actions → 更新相簿資料 → Run workflow

前端（`photos.html`）先讀靜態檔，再向 GAS `?mode=getTodayModified` 補上**最近 24 小時**有更新的資料夾。

> 過去 GAS 偶爾回 Google 錯誤頁（HTML），舊版 workflow 沒檢查就存進去，相簿頁顯示「資料尚未產生」。
> 若再看到這個訊息，先檢查 `photos-data.json` 是不是 HTML。
