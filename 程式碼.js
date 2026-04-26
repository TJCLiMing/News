/**
 * 網頁進入點
 * ?mode=api → 回傳 JSON（供 GitHub Pages 跨域呼叫）
 */
function doGet(e) {
  if (e && e.parameter && e.parameter.mode === 'api') {
    const data = getDashboardData();
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
    const props = PropertiesService.getScriptProperties();
    // 優先從屬性讀取，若無則使用預設值（請務必確認這兩個 ID 是否正確）
    const posterFolderId = props.getProperty('POSTER_FOLDER_ID') || '1kkkt_UT-ZYT36ti_nlXnChKjKVm6Hu00';
    const scheduleFolderId = props.getProperty('SCHEDULE_FOLDER_ID');
    const qrCodeId = props.getProperty('QRCODE_FILE_ID');
    const helperQrCodeId = props.getProperty('HELPER_QRCODE_FILE_ID');
    
    if (!posterFolderId) throw new Error("尚未設定海報資料夾 ID");

    const now = new Date();
    const next15Days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
    
    const formatMonth = (d) => `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    const targetMonths = [...new Set([formatMonth(now), formatMonth(next15Days)])];
    
    return {
      posters: fetchFiles(posterFolderId, 'poster'),
      schedules: fetchFiles(scheduleFolderId, 'schedule', targetMonths),
      qrCodeId: qrCodeId,
      helperQrCodeId: helperQrCodeId,
      updateTime: props.getProperty('DEPLOY_TIME') || Utilities.formatDate(new Date(), "GMT+8", "yyyy-MM-dd HH:mm:ss"),
      status: "success"
    };
  } catch (e) {
    return { status: "error", message: e.toString() };
  }
}

// 每 5 分鐘被觸發一次，讓 GAS 保持熱機狀態，避免冷啟動延遲
function keepWarm() {}

// 執行一次即可安裝定時觸發器
function installKeepWarmTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'keepWarm')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('keepWarm').timeBased().everyMinutes(5).create();
  Logger.log('keepWarm 觸發器已安裝');
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
  limitTime.setMonth(limitTime.getMonth() + 1);
  
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