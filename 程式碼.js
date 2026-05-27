/**
 * 網頁進入點
 * ?mode=api                        → 活動快報 JSON
 * ?mode=photos                     → 相簿完整結構 JSON（供 GitHub Actions 產生靜態 JSON 用）
 * ?mode=getTodayModified           → 今日新建或有更新的資料夾（含檔案）
 * ?mode=getFolders                 → 相簿資料夾清單（含今日偵測）
 * ?mode=getFolderFiles&folderId=xx → 指定資料夾的檔案列表
 * ?mode=getComments&folderId=xxx   → 取得指定相簿心得
 * ?mode=addComment&folderId=xxx&name=xxx&text=xxx → 新增心得
 */
function doGet(e) {
  if (e && e.parameter && e.parameter.mode === 'getTodayModified') {
    const data = getTodayModified();
    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (e && e.parameter && e.parameter.mode === 'getFolders') {
    const data = getFoldersList();
    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (e && e.parameter && e.parameter.mode === 'getFolderFiles') {
    const folderId = e.parameter.folderId || '';
    const data = getFolderFilesList(folderId);
    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (e && e.parameter && e.parameter.mode === 'photos') {
    const data = getPhotosData();
    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (e && e.parameter && e.parameter.mode === 'getTodayFolders') {
    const data = getTodayFolders();
    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (e && e.parameter && e.parameter.mode === 'getComments') {
    const folderId = e.parameter.folderId || '';
    const comments = getComments(folderId);
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', comments }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (e && e.parameter && e.parameter.mode === 'addComment') {
    const folderId   = e.parameter.folderId   || '';
    const folderName = e.parameter.folderName || '';
    const name       = e.parameter.name       || '';
    const text       = e.parameter.text       || '';
    if (!text) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'error', message: '內容不得為空' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const result = addComment(folderId, folderName, name, text);
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (e && e.parameter && e.parameter.mode === 'api') {
    const props = PropertiesService.getScriptProperties();
    const cached = props.getProperty('CACHED_DATA');
    if (cached) {
      Logger.log('[快取] 命中，直接回傳快取資料');
      return ContentService
        .createTextOutput(cached)
        .setMimeType(ContentService.MimeType.JSON);
    }
    Logger.log('[快取] 未命中，重新查詢 Drive');
    const data = getDashboardData();
    props.setProperty('CACHED_DATA', JSON.stringify(data));
    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('精彩活動快報')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * 核心抓取邏輯
 */
function getDashboardData() {
  try {
    const t0 = Date.now();
    const props = PropertiesService.getScriptProperties();
    const posterFolderId = props.getProperty('POSTER_FOLDER_ID') || '1kkkt_UT-ZYT36ti_nlXnChKjKVm6Hu00';
    const scheduleFolderId = props.getProperty('SCHEDULE_FOLDER_ID');
    const qrCodeId = props.getProperty('QRCODE_FILE_ID');
    const helperQrCodeId = props.getProperty('HELPER_QRCODE_FILE_ID');

    if (!posterFolderId) throw new Error("尚未設定海報資料夾 ID");

    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const formatMonth = (d) => `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    const targetMonths = [formatMonth(now), formatMonth(nextMonth)];

    const t1 = Date.now();
    const posters = fetchFiles(posterFolderId, 'poster');
    const t2 = Date.now();
    const schedules = fetchFiles(scheduleFolderId, 'schedule', targetMonths);
    const t3 = Date.now();

    Logger.log(`[效能] 讀取屬性: ${t1 - t0}ms`);
    Logger.log(`[效能] 抓海報: ${t2 - t1}ms（${posters.length} 筆）`);
    Logger.log(`[效能] 抓安排表: ${t3 - t2}ms（${schedules.length} 筆）`);
    Logger.log(`[效能] 總計: ${t3 - t0}ms`);

    return {
      posters,
      schedules,
      qrCodeId,
      helperQrCodeId,
      updateTime: props.getProperty('DEPLOY_TIME') || Utilities.formatDate(new Date(), "GMT+8", "yyyy-MM-dd HH:mm:ss"),
      status: "success"
    };
  } catch (e) {
    return { status: "error", message: e.toString() };
  }
}

// 每 5 分鐘預先抓資料並存進快取，讓使用者來時可以瞬間回傳
function keepWarm() {
  const data = getDashboardData();
  PropertiesService.getScriptProperties()
    .setProperty('CACHED_DATA', JSON.stringify(data));
  Logger.log('[keepWarm] 快取已更新');
}

// 執行一次即可安裝定時觸發器
function installKeepWarmTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'keepWarm')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('keepWarm').timeBased().everyMinutes(5).create();
  Logger.log('keepWarm 觸發器已安裝');
}

// 執行這個函數來觸發授權（只需跑一次）
function authorizeAll() {
  const props = PropertiesService.getScriptProperties();
  const sheetId = props.getProperty('FEEDBACK_SHEET_ID');
  if (sheetId) {
    const sheet = SpreadsheetApp.openById(sheetId);
    Logger.log('授權成功，Sheet 名稱：' + sheet.getName());
  } else {
    Logger.log('FEEDBACK_SHEET_ID 尚未設定');
  }
  DriveApp.getRootFolder(); // 同時確保 Drive 權限
}

function setDeployTime() {
  const props = PropertiesService.getScriptProperties();
  const t = Utilities.formatDate(new Date(), "GMT+8", "yyyy-MM-dd HH:mm");
  props.setProperty('DEPLOY_TIME', t);
  Logger.log('部署時間已設定：' + t);
}

function fetchFiles(folderId, type, targetMonths = []) {
  if (!folderId) return [];
  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFiles();
  const nowTime = new Date().setHours(0,0,0,0);
  const limitTime = new Date();
  limitTime.setMonth(limitTime.getMonth() + 3);
  
  let results = [];
  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName();
    
    if (type === 'poster') {
      const match = name.match(/^\d{4}-?\d{2}-?\d{2}/) || name.match(/^\d{8}/);
      if (match) {
        const dStr = match[0].replace(/-/g, '');
        const fDate = new Date(dStr.substring(0,4), parseInt(dStr.substring(4,6))-1, dStr.substring(6,8));
        if (fDate >= nowTime && fDate <= limitTime) {
          results.push({ name, id: file.getId(), date: fDate.getTime() });
        }
      }
    } else {
      if (targetMonths.some(m => name.includes(m))) {
        results.push({ name, id: file.getId(), date: 0 });
      }
    }
  }
  return type === 'poster' ? results.sort((a, b) => a.date - b.date) : results.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * 即時查詢今天日期的資料夾（用檔名比對）
 * 支援格式：2026.05.17 / 2026-05-17 / 20260517
 */
function getTodayFolders() {
  try {
    const props  = PropertiesService.getScriptProperties();
    const rootId = props.getProperty('PHOTO_FOLDER_ID') || '12xTW7EdkKu4mPQead-0C7NTJT54gzZD3';
    const root   = DriveApp.getFolderById(rootId);

    const now    = new Date();
    const yyyy   = now.getFullYear();
    const mm     = String(now.getMonth() + 1).padStart(2, '0');
    const dd     = String(now.getDate()).padStart(2, '0');
    const patterns = [
      `${yyyy}.${mm}.${dd}`,
      `${yyyy}-${mm}-${dd}`,
      `${yyyy}${mm}${dd}`
    ];

    const folders = [];
    const folderIter = root.getFolders();
    while (folderIter.hasNext()) {
      const folder = folderIter.next();
      const name   = folder.getName();
      if (patterns.some(p => name.includes(p))) {
        const files = [];
        const fileIter = folder.getFiles();
        while (fileIter.hasNext()) {
          const file = fileIter.next();
          const mime = file.getMimeType();
          if (mime.startsWith('image/') || mime.startsWith('video/')) {
            files.push({ id: file.getId(), name: file.getName(), mimeType: mime });
          }
        }
        files.sort((a, b) => b.name.localeCompare(a.name));
        folders.push({ id: folder.getId(), name, files, isToday: true });
      }
    }

    return { status: 'success', folders };
  } catch(e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * 取得指定相簿的心得留言（有快取）
 */
function getComments(folderId) {
  try {
    const props   = PropertiesService.getScriptProperties();
    const sheetId = props.getProperty('FEEDBACK_SHEET_ID');
    if (!sheetId) return [];

    const sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
    const data  = sheet.getDataRange().getValues();
    const comments = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (String(row[6]) === String(folderId) && row[4]) {
        comments.push({
          name: row[3] || '匿名',
          date: Utilities.formatDate(new Date(row[0]), 'GMT+8', 'yyyy-MM-dd HH:mm'),
          text: String(row[4])
        });
      }
    }
    comments.reverse();
    Logger.log('[getComments] 查詢完成，共 ' + comments.length + ' 則');
    return comments;
  } catch(e) {
    Logger.log('[getComments] 錯誤：' + e);
    return [];
  }
}

/**
 * 新增一則心得留言
 */
function addComment(folderId, folderName, name, text) {
  try {
    const props   = PropertiesService.getScriptProperties();
    const sheetId = props.getProperty('FEEDBACK_SHEET_ID');
    if (!sheetId) throw new Error('未設定 FEEDBACK_SHEET_ID');

    const sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
    sheet.appendRow([
      new Date(),              // A 時間戳記
      folderName || '活動相簿', // B 類別（相簿名稱）
      '',                      // C 日期
      name || '匿名',           // D 姓名
      text,                    // E 內容
      '',                      // F 有檔案也可以傳
      folderId                 // G 相簿ID
    ]);

    Logger.log('[addComment] 成功 folderId=' + folderId);
    return { status: 'success' };
  } catch(e) {
    Logger.log('[addComment] 錯誤：' + e);
    return { status: 'error', message: e.toString() };
  }
}

/**
 * 相簿完整結構（資料夾 + 檔案），供 GitHub Actions 產生靜態 JSON
 */
function getPhotosData() {
  try {
    const props = PropertiesService.getScriptProperties();
    const rootId = props.getProperty('PHOTO_FOLDER_ID') || '12xTW7EdkKu4mPQead-0C7NTJT54gzZD3';
    const root = DriveApp.getFolderById(rootId);

    const folders = [];
    const folderIter = root.getFolders();
    while (folderIter.hasNext()) {
      const folder = folderIter.next();
      const files = [];
      const fileIter = folder.getFiles();
      while (fileIter.hasNext()) {
        const file = fileIter.next();
        const mime = file.getMimeType();
        if (mime.startsWith('image/') || mime.startsWith('video/')) {
          files.push({ id: file.getId(), name: file.getName(), mimeType: mime });
        }
      }
      files.sort((a, b) => b.name.localeCompare(a.name));
      folders.push({ id: folder.getId(), name: folder.getName(), files });
    }
    folders.sort((a, b) => b.name.localeCompare(a.name));

    return {
      folders,
      updatedAt: Utilities.formatDate(new Date(), 'GMT+8', 'yyyy-MM-dd HH:mm'),
      status: 'success'
    };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * 取得相簿資料夾清單（含今日偵測），不含檔案
 */
function getFoldersList() {
  try {
    const props  = PropertiesService.getScriptProperties();
    const rootId = props.getProperty('PHOTO_FOLDER_ID') || '12xTW7EdkKu4mPQead-0C7NTJT54gzZD3';
    const root   = DriveApp.getFolderById(rootId);

    const now  = new Date();
    const yyyy = now.getFullYear();
    const mm   = String(now.getMonth() + 1).padStart(2, '0');
    const dd   = String(now.getDate()).padStart(2, '0');
    const todayPatterns = [
      `${yyyy}.${mm}.${dd}`,
      `${yyyy}-${mm}-${dd}`,
      `${yyyy}${mm}${dd}`
    ];

    const folders = [];
    const folderIter = root.getFolders();
    while (folderIter.hasNext()) {
      const folder  = folderIter.next();
      const name    = folder.getName();
      const isToday = todayPatterns.some(p => name.includes(p));
      folders.push({ id: folder.getId(), name, isToday });
    }
    folders.sort((a, b) => b.name.localeCompare(a.name));

    return {
      folders,
      updatedAt: Utilities.formatDate(new Date(), 'GMT+8', 'yyyy-MM-dd HH:mm'),
      status: 'success'
    };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * 取得指定資料夾的圖片／影片檔案列表
 */
function getFolderFilesList(folderId) {
  try {
    if (!folderId) throw new Error('未提供 folderId');
    const folder   = DriveApp.getFolderById(folderId);
    const files    = [];
    const fileIter = folder.getFiles();
    while (fileIter.hasNext()) {
      const file = fileIter.next();
      const mime = file.getMimeType();
      if (mime.startsWith('image/') || mime.startsWith('video/')) {
        files.push({ id: file.getId(), name: file.getName(), mimeType: mime });
      }
    }
    files.sort((a, b) => b.name.localeCompare(a.name));
    return { files, status: 'success' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * 取得今日新建或有更新的資料夾（含最新檔案），用於覆蓋靜態 JSON
 * 判斷依據：資料夾名稱含今日日期 OR 資料夾 lastUpdated >= 今日台灣時間 00:00
 */
function getTodayModified() {
  try {
    const props  = PropertiesService.getScriptProperties();
    const rootId = props.getProperty('PHOTO_FOLDER_ID') || '12xTW7EdkKu4mPQead-0C7NTJT54gzZD3';
    const root   = DriveApp.getFolderById(rootId);

    // 今日台灣時間（UTC+8）00:00 對應的 UTC 時間
    const todayStr = Utilities.formatDate(new Date(), 'GMT+8', 'yyyy-MM-dd');
    const parts    = todayStr.split('-').map(Number);
    // 台灣 00:00 = UTC 前一天 16:00，用 Date.UTC 負小時數自動進位
    const todayStart = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], -8, 0, 0));

    const todayPatterns = [
      todayStr.replace(/-/g, '.'),  // yyyy.MM.dd
      todayStr,                     // yyyy-MM-dd
      todayStr.replace(/-/g, '')    // yyyyMMdd
    ];

    const folders = [];
    const folderIter = root.getFolders();
    while (folderIter.hasNext()) {
      const folder  = folderIter.next();
      const name    = folder.getName();
      const isToday = todayPatterns.some(p => name.includes(p));
      const isModifiedToday = folder.getLastUpdated() >= todayStart;

      if (!isToday && !isModifiedToday) continue;

      const files    = [];
      const fileIter = folder.getFiles();
      while (fileIter.hasNext()) {
        const file = fileIter.next();
        const mime = file.getMimeType();
        if (mime.startsWith('image/') || mime.startsWith('video/')) {
          files.push({ id: file.getId(), name: file.getName(), mimeType: mime });
        }
      }
      files.sort((a, b) => b.name.localeCompare(a.name));
      folders.push({ id: folder.getId(), name, files, isToday: true });
    }
    folders.sort((a, b) => b.name.localeCompare(a.name));

    return { folders, status: 'success' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}