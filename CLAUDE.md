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
| `schedule.html` | 安排表頁 | |
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

### 所有操作都在 `News` 目錄
```bash
# 後端（程式碼.js）→ GAS
clasp push
clasp version "說明"
clasp deploy --versionNumber X --deploymentId <ID> --description "說明"
clasp deployments                 # 查看所有部署

# 前端（HTML、圖片）→ GitHub
git pull
git add .
git commit -m "說明"
git push

# ⚠️ 不要用 clasp pull（會覆蓋 HTML，GAS 的 HTML 是過時版本）
```

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

1. **確認 clasp 帳號**：`clasp login` 確認為 `lmf@tjcedu.org`
2. **GAS 推送**：`clasp push`
3. **建立版本**：`clasp version "說明"`
4. **部署**：`clasp deploy --versionNumber X ...`
5. **更新部署時間**：在 GAS 編輯器執行 `setDeployTime()`
6. **GitHub 推送**：`git add . && git commit -m "說明" && git push`
