// ============================================================
// DATABASE LAYER & SINGLETONS
// ============================================================

/**
 * Mendapatkan spreadsheet utama Pengawas (APP_DB_ID) dengan pattern singleton
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getAppDb_() {
  if (!globalThis._appDb) {
    globalThis._appDb = SpreadsheetApp.openById(APP_DB_ID);
  }
  return globalThis._appDb;
}

/**
 * Mendapatkan spreadsheet master Madrasah (MASTER_MADRASAH_DB_ID) dengan pattern singleton
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getMasterDb_() {
  if (!globalThis._masterDb) {
    globalThis._masterDb = SpreadsheetApp.openById(MASTER_MADRASAH_DB_ID);
  }
  return globalThis._masterDb;
}

/**
 * Helper: Mendapatkan atau membuat sheet Kamad di database utama
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} sheetName
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getKamadSheet(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (sheetName === 'KamadUsers') {
      sheet.appendRow(['nsm', 'password', 'status', 'created_at', 'updated_at']);
    } else if (sheetName === 'KamadTokens') {
      sheet.appendRow(['token', 'nsm', 'created_at', 'expires_at', 'used']);
    } else if (sheetName === 'KamadSubmissions') {
      sheet.appendRow(['timestamp', 'nsm', 'form_id', 'target_sheet', 'status']);
    }
  }
  return sheet;
}

/**
 * Log event terstruktur ke sheet AppLogs
 * @param {string} level 'INFO' | 'WARN' | 'ERROR'
 * @param {string} source Nama fungsi / modul asal
 * @param {string} message Pesan log singkat
 * @param {object} details Objek data detail tambahan
 */
function logEvent_(level, source, message, details) {
  try {
    const ss = getAppDb_();
    let logSheet = ss.getSheetByName('AppLogs');
    if (!logSheet) {
      logSheet = ss.insertSheet('AppLogs');
      logSheet.appendRow(['Timestamp', 'Level', 'Source', 'Message', 'Details', 'User']);
      logSheet.setFrozenRows(1);
      logSheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#f4cccc');
    }
    
    let activeUserEmail = 'anonymous';
    try {
      activeUserEmail = Session.getActiveUser().getEmail() || 'anonymous';
    } catch (e) {}

    logSheet.appendRow([
      new Date().toISOString(),
      level,
      source,
      message,
      JSON.stringify(details || {}),
      activeUserEmail
    ]);
  } catch(e) {
    // Silent fail agar kegagalan logging tidak mematikan fungsionalitas utama aplikasi
    console.error('Logging failed: ' + e.toString());
  }
}

