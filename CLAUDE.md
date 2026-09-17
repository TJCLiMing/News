# 黎明教會 活動快報 專案說明

## 專案架構

| 角色 | 位置 | 說明 |
|------|------|------|
| **後端 API** | Google Apps Script | 讀取 Google Drive 圖片、回傳資料 |
| **前端頁面** | GitHub Pages | 外殼 + 內容頁 + 靜態資源 |

網址：https://li-ming-tjc.org
（`CNAME` 檔在 News repo 內，DNS 在 **wix.com** 管理）

---

## 前端檔案結構（外殼架構）

> ⚠️ **要改活動快報的內容，是改 `home.html`，不是 `index.html`**

```
li-ming-tjc.org/        → index.html（外殼，全螢幕 iframe）
      └── iframe        → home.html（活動快報內容）
```

| 檔案 | 角色 | 什麼時候要動 |
|------|------|-------------|
| `home.html` | **活動快報內容頁** | 改快捷功能區、好友連結、海報區 → **改這個** |
| `index.html` | 外殼 | 只在調整回首頁鈕、hash 路由時才動 |
| `index-tech.html` | 科技版內容頁 | 對應 `home.html` 的另一種風格 |
| `photos.html` | 相簿頁 | |
| `schedule.html` | 安排表**單頁版**（獨立呼叫 API 讀安排表圖檔）| 沒有頁面連到它，靠直接輸入網址進入；`home.html` 內也有同樣的安排表區塊 |
| `app.html` | 轉址頁 | 保留舊 `/app.html` 連結用，**不要刪** |
| `frame-nav.js` | iframe 內的連結導向控制 | 新增可嵌入網域時要改 |
| `sw.js` | Service Worker（離線快取）| 見下方版本規則 |
| `manifest.json` | PWA 設定 | |

### 外殼在解決什麼問題

使用者瀏覽器會開一大堆分頁。外殼讓：

- **可嵌入**的連結（`li-ming-tjc.org`、`tjc-km.github.io`）→ 留在 iframe 內，不開新分頁
- **不可嵌入**的（Google Meet / Forms / Sites、LINE、Canva，都有 `X-Frame-Options`）
  → 共用同一個 `liming-ext` 分頁，不管點幾個最多只佔 1 個

分頁數從 8+ 降到最多 2 個。

外殼有**防疊套保護**：被自己的 iframe 載入時會 `location.replace('home.html')`，
所以任何頁面連到 `index.html` 都不會變成外殼裡再包一層外殼。

### 深層連結

```
li-ming-tjc.org/#schedule   → home.html#schedule（月份安排表）
li-ming-tjc.org/#photos     → photos.html（相簿）
```

### 改 sw.js 的規則

**改完靜態檔案要把 `sw.js` 的 `VERSION` 加一**（`v2` → `v3`），舊快取才會被清掉。

| 資源 | 策略 |
|------|------|
| HTML / JSON | 網路優先（不會卡舊版）|
| 圖片 / JS | 快取優先 → **所以改了要升版本** |
| 跨網域（GAS API、Google Fonts、tjc-km）| 完全不攔截 |

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

#### LimingNews2026（活動快報）
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
| 帳號 | Repo |
|------|------|
| `TJCLiMing` | https://github.com/TJCLiMing/News.git |

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
