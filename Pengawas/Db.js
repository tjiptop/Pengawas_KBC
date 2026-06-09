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

/**
 * Memvalidasi token sesi dan mengembalikan NIP pengguna yang valid.
 * Mengembalikan null jika token tidak valid atau kedaluwarsa.
 * @param {string} sessionToken
 * @returns {string|null}
 */
function validateSession_(sessionToken) {
  if (!sessionToken) return null;
  try {
    const cache = CacheService.getScriptCache();
    const nip = cache.get('session_' + sessionToken);
    return nip || null;
  } catch(e) {
    console.error('validateSession_ error: ' + e.toString());
    return null;
  }
}

/**
 * Memastikan pengguna aktif berdasarkan sessionToken adalah pelatih pemilik pelatihanId
 * @param {string} pelatihanId
 * @param {string} sessionToken
 * @returns {boolean}
 */
function checkPelatihanOwnership_(pelatihanId, sessionToken) {
  try {
    const nip = validateSession_(sessionToken);
    if (!nip) return false;
    
    const ss = getAppDb_();
    const sheet = ss.getSheetByName('Pelatihan');
    if (!sheet) return false;
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idxId = headers.indexOf('pelatihan_id');
    const idxPelatih = headers.indexOf('nip_pelatih');
    if (idxId === -1 || idxPelatih === -1) return false;
    
    const row = findRowIndex_(sheet, idxId, pelatihanId);
    if (row === -1) return false;
    
    const nipPelatih = String(data[row - 1][idxPelatih]).trim();
    return nipPelatih === String(nip).trim();
  } catch(e) {
    console.error('checkPelatihanOwnership_ error: ' + e.toString());
    return false;
  }
}

/**
 * Memastikan pengguna aktif berdasarkan sessionToken adalah pelatih pemilik soalId
 * @param {string} soalId
 * @param {string} sessionToken
 * @returns {boolean}
 */
function checkSoalOwnership_(soalId, sessionToken) {
  try {
    const ss = getAppDb_();
    const sheet = ss.getSheetByName('PrePostSoal');
    if (!sheet) return false;
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idxId = headers.indexOf('soal_id');
    const idxPelId = headers.indexOf('pelatihan_id');
    if (idxId === -1 || idxPelId === -1) return false;
    
    const row = findRowIndex_(sheet, idxId, soalId);
    if (row === -1) return false;
    
    const pelatihanId = String(data[row - 1][idxPelId]).trim();
    return checkPelatihanOwnership_(pelatihanId, sessionToken);
  } catch(e) {
    console.error('checkSoalOwnership_ error: ' + e.toString());
    return false;
  }
}

/**
 * Mencari indeks baris (1-indexed) berdasarkan nilai pencarian pada kolom tertentu
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {number} colIndex Indeks kolom (0-indexed)
 * @param {string} searchValue Nilai yang dicari
 * @returns {number} 1-indexed row index, atau -1 jika tidak ditemukan
 */
function findRowIndex_(sheet, colIndex, searchValue) {
  if (!sheet) return -1;
  const data = sheet.getDataRange().getValues();
  const valStr = String(searchValue).trim();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colIndex]).trim() === valStr) {
      return i + 1; // 1-indexed row number
    }
  }
  return -1;
}

/**
 * Memperbarui nilai pada kolom tertentu berdasarkan kolom kunci pencarian
 * @param {string} sheetName Nama sheet
 * @param {string} keyColName Nama kolom kunci
 * @param {string} keyValue Nilai kunci yang dicari
 * @param {string} targetColName Nama kolom yang ingin diupdate
 * @param {any} newValue Nilai baru yang akan dimasukkan
 * @returns {boolean} Apakah berhasil
 */
function updateField_(sheetName, keyColName, keyValue, targetColName, newValue) {
  try {
    const ss = getAppDb_();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return false;
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0] || [];
    const keyColIdx = headers.indexOf(keyColName);
    const targetColIdx = headers.indexOf(targetColName);
    
    if (keyColIdx === -1 || targetColIdx === -1) return false;
    
    const row = findRowIndex_(sheet, keyColIdx, keyValue);
    if (row === -1) return false;
    
    sheet.getRange(row, targetColIdx + 1).setValue(newValue);
    return true;
  } catch(e) {
    console.error('updateField_ error: ' + e.toString());
    return false;
  }
}

