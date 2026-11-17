# 產生整合平台資料流程圖 docs/data-flow.svg
# 用法：python docs/data-flow.py　（改圖請改這支，不要手改 SVG；畫法見 ~/.claude/rules/diagram-dataflow.md）
import os
import sys
from xml.sax.saxutils import escape

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data-flow.svg')
W, H = 1510, 1276
FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif"
BLUE, GREEN, GOLD, GRAY, DARK = '#7c9cc4', '#7fa87f', '#c9a15c', '#8b93a6', '#4a5164'
LINE_H, PAD_TOP, PAD_BOT, HEAD = 19, 14, 10, 30

parts = []
boxes = {}      # 名稱 → (欄, x, y, w, h)，給最後的檢查用
problems = []

def add(s): parts.append(s)

def text_w(s, size):
    # 中文、全形字約等於字級寬；英數約 0.6 倍
    return sum(size if ord(c) > 0x2E7F else size * 0.6 for c in s)

def box_h(n):
    return HEAD + PAD_TOP + n * LINE_H + PAD_BOT

def box(key, col, x, y, w, title, lines, color):
    h = box_h(len(lines))
    boxes[key] = (col, x, y, w, h)
    if text_w(title, 14.5) > w - 28:
        problems.append(f'{key} 標題太長')
    for t in lines:
        if text_w(t, 12.5) > w - 28:
            problems.append(f'{key} 這行太長：{t}')
    add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#ffffff" stroke="{color}" stroke-width="1.6" rx="7"/>')
    add(f'<rect x="{x}" y="{y}" width="{w}" height="{HEAD}" fill="{color}" rx="7"/>')
    add(f'<rect x="{x}" y="{y + HEAD - 8}" width="{w}" height="8" fill="{color}"/>')
    add(f'<text x="{x + 14}" y="{y + 20}" font-size="14.5" font-weight="700" fill="#ffffff">{escape(title)}</text>')
    for i, t in enumerate(lines):
        ty = y + HEAD + PAD_TOP + 4 + i * LINE_H
        add(f'<text x="{x + 14}" y="{ty}" font-size="12.5" fill="#4a5164">{escape(t)}</text>')
    return h

MARK = {BLUE: 'ab', GREEN: 'ag', GOLD: 'ao', GRAY: 'ay'}

def link(src, dst, y, color, label, dashed=False):
    """src 右邊 → dst 左邊的水平箭頭，y 要同時落在兩個方塊裡"""
    _, sx, sy, sw, sh = boxes[src]
    _, dx, dy, dw, dh = boxes[dst]
    for k, top, h in [(src, sy, sh), (dst, dy, dh)]:
        if not (top + HEAD + 4 <= y <= top + h - 6):
            problems.append(f'{src}→{dst} 的 y={y} 不在 {k} 的內文範圍')
    x1, x2 = sx + sw, dx
    dash = ' stroke-dasharray="5 4"' if dashed else ''
    add(f'<path d="M{x1} {y} L{x2} {y}" fill="none" stroke="{color}" stroke-width="1.8"{dash} marker-end="url(#{MARK[color]})"/>')
    lx = (x1 + x2) // 2
    if text_w(label, 11.5) > (x2 - x1) - 8:
        problems.append(f'{src}→{dst} 標籤太長：{label}')
    add(f'<text x="{lx}" y="{y - 6}" font-size="11.5" fill="{color}" font-weight="700" text-anchor="middle">{escape(label)}</text>')

add(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="{FONT}">')
add('  <!-- 黎明教會整合平台（News repo）的資料流程。由 docs/data-flow.py 產生，改圖請改腳本重新執行，不要手改這個檔。'
    '改動資料來源（雲端硬碟資料夾、試算表、OneDrive 簡報）、GAS 的 mode／action、keepWarm 或 GitHub Actions 排程、列印 Worker、各畫面的區塊時要同步更新。 -->')
add('<defs>')
for mid, c in [('ab', BLUE), ('ag', GREEN), ('ao', GOLD), ('ay', GRAY)]:
    add(f'<marker id="{mid}" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0 0 L8 4.5 L0 9 z" fill="{c}"/></marker>')
add('</defs>')
add(f'<rect x="0" y="0" width="{W}" height="{H}" fill="#fbfbfd" stroke="#d7dae0" rx="8"/>')
add('<text x="30" y="40" font-size="20" font-weight="700" fill="#1a1d24">黎明教會整合平台 liming-tjc.org：資料流程</text>')
add('<text x="30" y="63" font-size="13" fill="#5c6270">六個畫面：首頁、安排表單頁、相簿、報告事項、代禱事項維護、海報年度總覽　｜　'
    '藍＝海報與安排表　綠＝相簿　金＝報告事項（簡報、代禱）　灰＝統計、設定、暫存</text>')
add('<text x="30" y="88" font-size="13" font-weight="700" fill="#1a1d24">怎麼看：</text>')
add('<text x="92" y="88" font-size="13" fill="#5c6270"><tspan font-weight="700" fill="#1a1d24">順著箭頭看（左 → 右）：</tspan>'
    '左邊的檔案、設定經過哪些處理，最後出現在哪個畫面</text>')
add('<text x="92" y="108" font-size="13" fill="#5c6270"><tspan font-weight="700" fill="#1a1d24">逆著箭頭看（右 → 左）：</tspan>'
    '畫面上某一項是從哪裡來的，不對時要去哪裡改</text>')

# 「怎麼看」多佔兩行：欄標題以下整塊往下移 SHIFT
SHIFT = 46
add(f'<g transform="translate(0,{SHIFT})">')

AX, AW = 30, 270
BX, BW = 380, 330
CX, CW = 790, 270
DX, DW = 1150, 330
for x, t in [(AX, '來源（人在維護、輸入的）'), (BX, '處理'), (CX, '資料'), (DX, '畫面（網頁）')]:
    add(f'<text x="{x}" y="100" font-size="14" font-weight="700" fill="#1a1d24">{escape(t)}</text>')

# A 欄：來源
box('A設定', 'A', AX, 120, AW, 'GAS 設定（指令碼屬性）', [
    '資料夾、試算表的 ID（不在圖上）',
    'DEPLOY_TIME：頁尾「最後部署時間」',
    '✎ 改完不用重新部署'], GRAY)
box('A海報', 'A', AX, 249, AW, '雲端硬碟：海報、安排表', [
    '精彩活動海報（首頁、年度總覽共用）',
    '　看 GAS 設定 POSTER_FOLDER_ID',
    '月份安排表',
    '　看 GAS 設定 SCHEDULE_FOLDER_ID',
    '✎ 圖檔放進資料夾就會出現'], BLUE)
box('A相簿', 'A', AX, 430, AW, '雲端硬碟：相簿', [
    '一個活動一個資料夾',
    '✎ 可用黎明寶庫上傳照片、影片',
    '只讀每個資料夾的第一層',
    '看 GAS 設定 PHOTO_FOLDER_ID',
    '　沒設定時用程式裡的預設資料夾'], GREEN)
box('A心得', 'A', AX, 620, AW, '相簿頁送出的心得', [
    '「💬 心得」填姓名、內容後送出'], GREEN)
box('A簡報', 'A', AX, 720, AW, 'OneDrive：報告簡報', [
    '2026代禱及事項宣佈.pptx',
    '✎ 在原檔上改，不要刪掉重傳',
    '　換新檔時兩個連結都要換'], GOLD)
box('A代禱', 'A', AX, 905, AW, '代禱事項頁的修改', [
    '✎ 同工在網頁上新增、修改、刪除',
    '按「儲存」才送出；不用登入'], GOLD)
box('A按鈕', 'A', AX, 1030, AW, '各頁的按鈕', [
    '有 data-track 的按鈕被點到時',
    '首頁、科技版、報告事項、選頁列印',
    '只在正式網域 liming-tjc.org 送出'], GRAY)

# B 欄：處理
box('B快取', 'B', BX, 249, BW, 'GAS｜海報、安排表快取', [
    'keepWarm 觸發器每 5 分鐘重掃兩個資料夾',
    '?mode=api 只回快取，不碰雲端硬碟',
    '↻ ?mode=refresh 立刻重掃，60 秒內只算一次',
    '重掃失敗就保留原本的快取',
    '觸發器停了不會報錯，網站停在舊資料'], BLUE)
box('B相簿', 'B', BX, 430, BW, 'GitHub Actions｜更新相簿資料', [
    '每 3 小時呼叫 GAS ?mode=photos（約 60 秒）',
    '合格的資料才覆蓋，沒變就不 commit',
    '失敗重試 3 次；都失敗保留舊檔、寄信',
    '超過 30 天沒更新會強制更新一次',
    '可手動執行：Actions → 更新相簿資料'], GREEN)
box('B心得', 'B', BX, 597, BW, 'GAS｜心得', [
    '?mode=addComment 寫一列',
    '?mode=getComments 依相簿讀出',
    '聚會紀錄系統也用同一個 GAS'], GREEN)
box('B列印', 'B', BX, 726, BW, 'Cloudflare Worker｜列印用 PDF', [
    '雲端瀏覽器打開唯讀內嵌播放器',
    '　請微軟產生 PDF（15～30 秒）',
    '/snapshot 暫存 15 分鐘；/print 挑頁排版',
    '額度：每天 10 分鐘、每 20 秒開一個瀏覽器',
    '改完要另外 npm run deploy'], GOLD)
box('B代禱', 'B', BX, 893, BW, 'GAS｜代禱事項', [
    'prayerGet 讀三個分頁和經文',
    'prayerSave 寫回 A、B 欄',
    '先比對版本，別人剛改過就拒絕儲存',
    '字數上限：近期 15、長期 5、事工 30'], GOLD)
box('B統計', 'B', BX, 1041, BW, 'GAS｜按鈕點擊統計', [
    'POST track 寫一列：時間、月份、按鈕、頁面',
    '名稱限 40 字，去掉開頭的 = + - @'], GRAY)

# C 欄：資料
box('C快取', 'C', CX, 249, CW, 'GAS 快取（指令碼屬性）', [
    'CACHED_DATA：海報、安排表的檔案清單',
    'CACHED_AT：快取建立時間',
    '　＝頁尾「資料更新於」',
    '沒有有效期限，只靠 keepWarm 覆蓋',
    '程式自動寫入，不要手動改',
    '觸發器停了：「資料更新於」停在舊時間'], DARK)
box('C相簿', 'C', CX, 440, CW, '相簿快照 photos-data.json', [
    '每本相簿的 ID、名稱、檔案清單',
    '相簿頁直接讀這個檔，不經 GAS',
    '壞掉時先看檔案是不是變成 HTML'], DARK)
box('C心得', 'C', CX, 569, CW, '試算表：心得', [
    '看 GAS 設定 FEEDBACK_SHEET_ID',
    '第一個分頁，一則心得一列',
    '聚會紀錄系統也讀寫這份'], DARK)
box('CPDF', 'C', CX, 700, CW, 'PDF 暫存（Cloudflare）', [
    '原始 PDF，一張投影片一頁',
    '暫存 15 分鐘，同一個資料中心才有效'], GRAY)
box('C代禱', 'C', CX, 812, CW, '試算表「02.代禱事項」', [
    '近期代禱、長期關懷代禱、近期事工',
    '規範說明 › 經文',
    '✎ 也可以直接在試算表裡改',
    '分頁名稱不能改：二樓投影程式也讀'], DARK)
box('C統計', 'C', CX, 1000, CW, '試算表「各功能點擊次頻率」', [
    '點擊紀錄：每點一次一列',
    '每月統計：QUERY 彙整按鈕 × 月份',
    '網站上不顯示，直接看試算表',
    '✎ 時區要設成台北'], DARK)

# D 欄：畫面
box('D首頁', 'D', DX, 120, DW, '首頁（一般版、科技版）', [
    'home.html・index-tech.html',
    '外殼 index.html 框住，網址停在首頁',
    '先顯示手機裡上次存的資料',
    '精彩活動海報 ← GAS 快取',
    '月份安排表 ← GAS 快取',
    '資料更新於 ← 快取建立時間；↻ 立刻重掃',
    '最後部署時間 ← DEPLOY_TIME、網頁發布時間',
    '快捷功能、好友連結 ← 寫在網頁裡'], BLUE)
box('D安排表', 'D', DX, 344, DW, '安排表單頁', [
    'schedule.html・LINE 圖文選單 E',
    '月份安排表 ← GAS 快取'], BLUE)
box('D相簿', 'D', DX, 454, DW, '相簿', [
    'photos.html・LINE 圖文選單 F',
    '相簿清單、照片 ← photos-data.json',
    '最近 24 小時的變動 ← 相簿資料夾',
    '　GAS 即時讀，補上快照之後的變動',
    '💬 心得 ← 心得試算表',
    '🔗 上傳連結：複製黎明寶庫短網址',
    '🔗 分享相簿：複製本頁連結'], GREEN)
box('D報告', 'D', DX, 659, DW, '報告事項', [
    'reports.html・首頁、科技版',
    '打開簡報 → OneDrive（不經後端）',
    '選頁列印 reports-select.html',
    '　縮圖、PDF ← 列印 Worker',
    '代禱事項「編輯」「列印」→ 代禱事項維護'], GOLD)
box('D代禱', 'D', DX, 852, DW, '代禱事項維護', [
    'prayer.html・禱告記錄板「維護」',
    '四類代禱事項 ← 02.代禱事項',
    '儲存 → GAS 寫回（見左邊來源）',
    '?print=1 列印版'], GOLD)
box('D海報', 'D', DX, 1000, DW, '海報年度總覽', [
    'posters.html・首頁「年度總覽」',
    '全年海報 ← 海報資料夾',
    '　GAS 即時讀，不經快取（沒畫箭頭）',
    '先顯示手機裡上次存的資料',
    '資料夾跟首頁共用 POSTER_FOLDER_ID'], BLUE)

# 箭頭：都是水平直線，每條標傳的是什麼
link('A海報', 'B快取', 320, BLUE, '檔案清單')
link('B快取', 'C快取', 350, BLUE, '海報、安排表')
link('C快取', 'D首頁', 300, BLUE, '海報、安排表')
link('C快取', 'D安排表', 395, BLUE, '安排表')

link('A相簿', 'B相簿', 480, GREEN, '照片清單')
link('B相簿', 'C相簿', 500, GREEN, '相簿清單')
link('C相簿', 'D相簿', 520, GREEN, '相簿清單')
link('A心得', 'B心得', 670, GREEN, '心得', dashed=True)
link('B心得', 'C心得', 645, GREEN, '心得')
link('C心得', 'D相簿', 610, GREEN, '心得')

link('A簡報', 'B列印', 790, GOLD, '投影片')
link('B列印', 'CPDF', 760, GOLD, '原始 PDF')
link('CPDF', 'D報告', 740, GOLD, 'PDF')
link('A代禱', 'B代禱', 965, GOLD, '修改內容', dashed=True)
link('B代禱', 'C代禱', 930, GOLD, '代禱事項')
link('C代禱', 'D代禱', 900, GOLD, '代禱事項')

link('A按鈕', 'B統計', 1110, GRAY, '按鈕名稱', dashed=True)
link('B統計', 'C統計', 1085, GRAY, '一列紀錄')

# 報告事項 → 代禱事項維護（連結）
_, _, ry, _, rh = boxes['D報告']
_, _, py, _, _ = boxes['D代禱']
vx = DX + DW - 40
add(f'<path d="M{vx} {ry + rh} L{vx} {py}" fill="none" stroke="{GOLD}" stroke-width="1.8" stroke-dasharray="5 4" marker-end="url(#ao)"/>')
add(f'<text x="{vx - 8}" y="{(ry + rh + py) // 2 + 4}" font-size="11.5" fill="{GOLD}" font-weight="700" text-anchor="end">編輯、列印</text>')
add('</g>')

# 圖例
add(f'<text x="30" y="{H - 48}" font-size="12" fill="#5c6270">實線＝系統自動流動　虛線＝人按按鈕或連結　✎＝管理同工可以直接改的地方　'
    '機敏值（資料夾／試算表 ID、部署 ID）不在圖上，見 GAS 的指令碼屬性</text>')
add(f'<text x="30" y="{H - 26}" font-size="12" fill="#5c6270">沒畫成方塊的頁：index.html（外殼，框住其他頁）、app.html（舊網址轉址）　'
    '圖片、照片由瀏覽器直接向雲端硬碟載入，沒畫箭頭</text>')
add('</svg>')

# 檢查：同一欄的方塊不能重疊、不能超出圖
for col in 'ABCD':
    items = sorted((v[2], v[2] + v[4], k) for k, v in boxes.items() if v[0] == col)
    for (t1, b1, k1), (t2, b2, k2) in zip(items, items[1:]):
        if t2 < b1 + 12:
            problems.append(f'{k1} 和 {k2} 重疊或太近')
    if items and items[-1][1] + SHIFT > H - 64:
        problems.append(f'{items[-1][2]} 超出圖的底部')

open(OUT, 'w', encoding='utf-8').write('\n'.join(parts) + '\n')
print('wrote', OUT)
for p in problems:
    print('⚠', p)
if not problems:
    print('檢查通過')
