// ============================================================
// PENGAWAS KBC - Google Apps Script Backend
// ============================================================

const APP_DB_ID = '1sIIdTzW_vBQJZoizefj_6tWBrHib1OOo2TbUPPZsDYw';
const MASTER_MADRASAH_DB_ID = '119pUNbQxQLaLtqcuHebrbwbzXkXUU3h7n5I1OxyMu4w';
const SK_TEMPLATE_DOC_ID = '1iROegKV9VGGpLWDedovrwaXuDvbX4jEzM4TwsSfeZIc';

// Max login attempts per 5 minutes per NIP
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_SECONDS = 300;

// ============================================================
// ENTRY POINT
// ============================================================

function doGet(e) {
  let template = HtmlService.createTemplateFromFile('index');
  return template.evaluate()
      .setTitle('Aplikasi Pengawas KBC')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ============================================================
// STANDARD API RESPONSE HELPERS
// ============================================================

function apiSuccess(data, message) {
  return { success: true, data: data || null, message: message || '' };
}

function apiError(message, code) {
  return { success: false, error: message || 'Terjadi kesalahan.', code: code || 'UNKNOWN' };
}

// ============================================================
// SECURITY UTILITIES
// ============================================================

/**
 * Hash password menggunakan SHA-256 via Utilities.computeDigest
 */
function hashPassword(password) {
  if (!password) return '';
  const rawHash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password,
    Utilities.Charset.UTF_8
  );
  return rawHash.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

/**
 * Sanitasi HTML entities untuk mencegah XSS
 */
function sanitizeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Mencegah formula injection di Google Sheets
 * (string yang diawali =, +, -, @, tab, CR)
 */
function sanitizeFormulaInjection(value) {
  if (typeof value !== 'string') return value;
  const dangerous = ['=', '+', '-', '@', '\t', '\r'];
  if (dangerous.some(c => value.startsWith(c))) {
    return "'" + value;
  }
  return value;
}

/**
 * Sanitasi rekursif objek/array dari formula injection
 */
function sanitizeObject(obj) {
  if (typeof obj === 'string') return sanitizeFormulaInjection(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const key in obj) {
      result[key] = sanitizeObject(obj[key]);
    }
    return result;
  }
  return obj;
}

/**
 * Rate limiting: max N attempts per window (pakai CacheService)
 * Return true jika DIBLOKIR
 */
function isRateLimited(identifier) {
  const cache = CacheService.getScriptCache();
  const key = 'ratelimit_' + identifier;
  const attempts = parseInt(cache.get(key) || '0');
  if (attempts >= MAX_LOGIN_ATTEMPTS) return true;
  cache.put(key, String(attempts + 1), LOGIN_LOCKOUT_SECONDS);
  return false;
}

/**
 * Reset rate limit setelah login berhasil
 */
function resetRateLimit(identifier) {
  const cache = CacheService.getScriptCache();
  cache.remove('ratelimit_' + identifier);
}

// ============================================================
// AUTHENTICATION
// ============================================================

function login(nip, password) {
  if (!nip) return apiError('NIP harus diisi.', 'VALIDATION');

  const rateLimitKey = 'login_' + String(nip).trim();
  if (isRateLimited(rateLimitKey)) {
    return apiError('Terlalu banyak percobaan login. Coba lagi dalam 5 menit.', 'RATE_LIMITED');
  }

  const ss = SpreadsheetApp.openById(APP_DB_ID);
  const nipStr = String(nip).trim();

  const sheet = ss.getSheetByName('Users');
  if (sheet) {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() == nipStr) {
        const storedPassword = String(data[i][1]);
        const status = String(data[i][2] || '').toLowerCase();

        if (status === 'nonaktif') return apiError('Akun ini dinonaktifkan. Hubungi admin.', 'ACCOUNT_DISABLED');

        if (storedPassword === '') return { success: true, require_setup: true, nip: nipStr };

        const isHashed = storedPassword.length === 64 && /^[0-9a-f]+$/i.test(storedPassword);
        const inputHash = hashPassword(password);
        const passwordMatch = isHashed ? (storedPassword === inputHash) : (storedPassword === password);

        if (passwordMatch) {
          if (!isHashed) sheet.getRange(i + 1, 2).setValue(inputHash);
          resetRateLimit(rateLimitKey);
          return { success: true, require_setup: false, nip: nipStr, user: getProfile(nipStr) };
        } else {
          return apiError('Password salah.', 'WRONG_PASSWORD');
        }
      }
    }
  }

  let sheetPengawas = getMasterSheet(ss);
  if (sheetPengawas) {
    const dataP = sheetPengawas.getDataRange().getValues();
    const headersP = dataP[0] || [];
    let nipIdx = headersP.findIndex(h => String(h).toUpperCase().includes('NIP'));
    if (nipIdx === -1) nipIdx = 0;

    for (let i = 1; i < dataP.length; i++) {
      if (String(dataP[i][nipIdx]).trim() == nipStr) {
        return { success: true, require_setup: true, nip: nipStr };
      }
    }
  }

  return apiError('NIP tidak ditemukan di database manapun.', 'NIP_NOT_FOUND');
}

// Helper to find the master sheet dynamically
function getMasterSheet(ss) {
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    const name = sheets[i].getName().toLowerCase();
    // Cari sheet yang mengandung kata pengawas, dan bukan sheet sistem
    if (name.includes('pengawas') && !name.includes('profil') && !name.includes('sasaran') && !name.includes('users') && !name.includes('form') && !name.includes('settings')) {
      return sheets[i];
    }
  }
  // Fallback to exactly 'Pengawas' if the above logic missed it somehow
  return ss.getSheetByName('Pengawas') || ss.getSheetByName('pengawas');
}

function setPassword(nip, newPassword) {
  if (!nip || !newPassword) return apiError('NIP dan password baru harus diisi.', 'VALIDATION');
  if (String(newPassword).length < 6) return apiError('Password minimal 6 karakter.', 'VALIDATION');

  const ss = SpreadsheetApp.openById(APP_DB_ID);
  const nipStr = String(nip).trim();
  const sheet = ss.getSheetByName('Users');
  if (!sheet) return apiError('Sheet Users tidak ada.', 'SYS_ERROR');
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() == nipStr) {
      if (data[i][1] === '') {
        sheet.getRange(i + 1, 2).setValue(hashPassword(newPassword));
        return apiSuccess(null, 'Password berhasil disetel. Silakan login kembali.');
      } else {
        return apiError('Password sudah disetel sebelumnya.', 'ALREADY_SET');
      }
    }
  }

  let valid = false;
  let sheetP = getMasterSheet(ss);
  if (sheetP) {
    const dataP = sheetP.getDataRange().getValues();
    const headersP = dataP[0] || [];
    let nipIdx = headersP.findIndex(h => String(h).toUpperCase().includes('NIP'));
    if (nipIdx === -1) nipIdx = 0;
    for (let i = 1; i < dataP.length; i++) {
      if (String(dataP[i][nipIdx]).trim() == nipStr) {
        valid = true;
        break;
      }
    }
  }
  
  if (valid) {
    sheet.appendRow([nipStr, hashPassword(newPassword), 'Aktif']);
    return apiSuccess(null, 'Password berhasil disetel. Silakan login kembali.');
  }

  return apiError('NIP tidak valid.', 'NIP_NOT_FOUND');
}

// ============================================================
// PROFILE
// ============================================================

function getProfile(nip) {
  const ss = SpreadsheetApp.openById(APP_DB_ID);
  const nipStr = String(nip).trim();
  
  const sheetProfil = ss.getSheetByName('Profil');
  if (sheetProfil) {
    const dataProfil = sheetProfil.getDataRange().getValues();
    const headersProfil = dataProfil[0] || [];
    for (let i = 1; i < dataProfil.length; i++) {
      if (String(dataProfil[i][0]).trim() == nipStr) {
        let profile = {};
        for (let j = 0; j < headersProfil.length; j++) {
          profile[headersProfil[j]] = dataProfil[i][j];
        }
        return profile;
      }
    }
  }

  let sheetPengawas = getMasterSheet(ss);
  if (sheetPengawas) {
    const dataP = sheetPengawas.getDataRange().getValues();
    const headersP = dataP[0] || [];
    let nipIdx = headersP.findIndex(h => String(h).toUpperCase().includes('NIP'));
    if (nipIdx === -1) nipIdx = 0;

    for (let i = 1; i < dataP.length; i++) {
      if (String(dataP[i][nipIdx]).trim() == nipStr) {
        let profile = {};
        for (let j = 0; j < headersP.length; j++) {
          let h = String(headersP[j]).toUpperCase();
          let val = dataP[i][j];
          if (h.includes('NAMA')) profile['Nama'] = val;
          else if (h.includes('GOLONGAN') || h.includes('PANGKAT')) profile['Golongan'] = val;
          else if (h.includes('PROVINSI')) profile['Provinsi'] = val;
          else if (h.includes('KABUPATEN') || h.includes('KOTA')) profile['Kabupaten'] = val;
          else if (h.includes('JENJANG')) profile['Jenjang'] = val;
          else if (h.includes('WA') || h.includes('HP') || h.includes('TELP')) profile['WA'] = val;
          else if (h.includes('EMAIL')) profile['Email'] = val;
          else if (h.includes('ALAMAT')) profile['Alamat'] = val;
          else if (h.includes('TEMPAT LAHIR')) profile['Tempat Lahir'] = val;
          else if (h.includes('TANGGAL LAHIR')) profile['Tanggal Lahir'] = val;
        }
        profile['NIP'] = nipStr;
        return profile;
      }
    }
  }
  return null;
}

function saveProfile(data) {
  if (!data || !data['NIP']) return apiError('Data profil tidak valid.', 'VALIDATION');

  // Sanitasi semua field dari formula injection
  data = sanitizeObject(data);

  const ss = SpreadsheetApp.openById(APP_DB_ID);
  const sheet = ss.getSheetByName('Profil');
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];

  // Auto-extract DOB dari NIP jika belum ada
  if (!data['Tanggal Lahir'] && data['NIP'] && String(data['NIP']).length >= 8) {
    let n = String(data['NIP']);
    data['Tanggal Lahir'] = `${n.substring(0,4)}-${n.substring(4,6)}-${n.substring(6,8)}`;
  }

  const nipStr = String(data['NIP']).trim();
  let rowIdx = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() == nipStr) {
      rowIdx = i + 1;
      break;
    }
  }

  let rowData = headers.map(h => data[h] !== undefined ? data[h] : '');

  if (rowIdx > -1) {
    // Preserve photo URL jika tidak di-overwrite
    let existingPhoto = rows[rowIdx - 1][headers.indexOf('Foto URL')];
    if (!data['Foto URL'] && existingPhoto) {
      rowData[headers.indexOf('Foto URL')] = existingPhoto;
    }
    sheet.getRange(rowIdx, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  return apiSuccess(getProfile(nipStr), 'Profil berhasil disimpan.');
}

/**
 * Helper untuk mendapatkan atau membuat folder
 */
function getOrCreateFolder(parent, name) {
  const folders = parent.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parent.createFolder(name);
}

/**
 * Helper untuk mendapatkan folder user (upload/nip/type)
 */
function getUserFolder(nip, type) {
  // Dapatkan folder parent dari spreadsheet database
  const ssFile = DriveApp.getFileById(APP_DB_ID);
  const parents = ssFile.getParents();
  let parentFolder = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  
  const uploadFolder = getOrCreateFolder(parentFolder, 'upload');
  const nipFolder = getOrCreateFolder(uploadFolder, String(nip).trim());
  const targetFolder = getOrCreateFolder(nipFolder, type);
  
  return targetFolder;
}

function uploadPhoto(nip, base64Data, filename) {
  if (!nip || !base64Data) return apiError('Data tidak lengkap.', 'VALIDATION');
  try {
    let folder = getUserFolder(nip, 'foto');

    let contentType = base64Data.substring(5, base64Data.indexOf(';'));
    let bytes = Utilities.base64Decode(base64Data.split(',')[1]);
    let safeFilename = String(nip).replace(/[^a-zA-Z0-9_-]/g, '') + '_' + Date.now() + '.jpg';
    let blob = Utilities.newBlob(bytes, contentType, safeFilename);

    let file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    let fileUrl = 'https://drive.google.com/uc?export=view&id=' + file.getId();

    return apiSuccess({ url: fileUrl }, 'Foto berhasil diupload.');
  } catch (e) {
    return apiError(e.toString(), 'UPLOAD_ERROR');
  }
}

// ============================================================
// MADRASAH SASARAN
// ============================================================

function searchMadrasah(kabupaten, keyword) {
  const ss = SpreadsheetApp.openById(MASTER_MADRASAH_DB_ID);
  const sheet = ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  let idxNSM = headers.findIndex(h => h.toString().toUpperCase().includes('NSM'));
  let idxNama = headers.findIndex(h => h.toString().toUpperCase().includes('NAMA'));
  let idxKab = headers.findIndex(h => h.toString().toUpperCase().includes('KAB') || h.toString().toUpperCase().includes('KOTA'));
  let idxJenjang = headers.findIndex(h => h.toString().toUpperCase().includes('JENJANG') || h.toString().toUpperCase().includes('BENTUK'));

  if (idxNSM === -1) idxNSM = 0;
  if (idxNama === -1) idxNama = 1;
  if (idxKab === -1) idxKab = 2;
  if (idxJenjang === -1) idxJenjang = 3;

  // Sanitasi input pencarian
  keyword = sanitizeHtml(String(keyword || '').toLowerCase().trim());
  kabupaten = sanitizeHtml(String(kabupaten || '').toLowerCase().trim());
  let cleanKabupaten = kabupaten.replace(/^(kab\.|kabupaten)\s+/i, '').trim();

  let results = [];
  for (let i = 1; i < data.length; i++) {
    let nsm = String(data[i][idxNSM]).toLowerCase();
    let nama = String(data[i][idxNama]).toLowerCase();
    let kab = String(data[i][idxKab]).toLowerCase();
    let jenjang = String(data[i][idxJenjang]).toLowerCase();

    let escapedKabupaten = cleanKabupaten.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let matchKab = !cleanKabupaten || new RegExp('\\b' + escapedKabupaten + '\\b', 'i').test(kab);
    let matchKey = !keyword || nsm.includes(keyword) || nama.includes(keyword);

    if (matchKab && matchKey) {
      results.push({
        nsm: data[i][idxNSM],
        nama: data[i][idxNama],
        kabupaten: data[i][idxKab],
        jenjang: jenjang
      });
    }
  }
  return results.slice(0, 50);
}

function getSasaran(nip) {
  const ss = SpreadsheetApp.openById(APP_DB_ID);
  const sheet = ss.getSheetByName('Sasaran');
  const data = sheet.getDataRange().getValues();
  const nipStr = String(nip).trim();

  let sasaran = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() == nipStr) {
      sasaran.push({ nsm: data[i][1], nama: data[i][2] });
    }
  }
  return sasaran;
}

function saveSasaranList(nip, nsmListArray) {
  if (!nip) return apiError('NIP tidak valid.', 'VALIDATION');

  // Sanitasi
  if (Array.isArray(nsmListArray)) {
    nsmListArray = nsmListArray.map(item => sanitizeObject(item));
  }

  const ss = SpreadsheetApp.openById(APP_DB_ID);
  const sheet = ss.getSheetByName('Sasaran');
  const data = sheet.getDataRange().getValues();
  const nipStr = String(nip).trim();

  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]).trim() == nipStr) {
      sheet.deleteRow(i + 1);
    }
  }

  if (nsmListArray && nsmListArray.length > 0) {
    let timestamp = new Date();
    let rowsToInsert = nsmListArray.map(item => [nipStr, item.nsm, item.nama, timestamp]);
    sheet.getRange(sheet.getLastRow() + 1, 1, rowsToInsert.length, rowsToInsert[0].length).setValues(rowsToInsert);
  }

  return apiSuccess(null, 'Daftar sasaran berhasil diupdate.');
}

// ============================================================
// SK GENERATION
// ============================================================

function generateSK(nip) {
  try {
    let profile = getProfile(nip);
    if (!profile) return apiError('Profil tidak ditemukan.', 'NOT_FOUND');

    let sasaran = getSasaran(nip);
    if (sasaran.length === 0) return apiError('Tidak ada madrasah sasaran untuk dibuatkan SK.', 'EMPTY');

    let tempDoc = DriveApp.getFileById(SK_TEMPLATE_DOC_ID).makeCopy('SK_' + profile['Nama'] + '_' + nip);
    let doc = DocumentApp.openById(tempDoc.getId());
    let body = doc.getBody();

    body.replaceText('<<NAMA>>', profile['Nama'] || '-');
    body.replaceText('<<NIP>>', profile['NIP'] || '-');
    body.replaceText('<<PANGKAT>>', profile['Golongan'] || '-');
    body.replaceText('<<KABUPATEN>>', profile['Kabupaten'] || '-');

    let skNum = incrementSKCounter();
    let dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd MMMM yyyy');
    body.replaceText('<<NOMOR_SK>>', 'B-' + String(skNum).padStart(4, '0') + '/Kk.13/Kp.01.2/' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM/yyyy'));
    body.replaceText('<<TANGGAL>>', dateStr);

    body.appendPageBreak();
    body.appendParagraph('LAMPIRAN SURAT KEPUTUSAN');
    body.appendParagraph('DAFTAR MADRASAH SASARAN BINAAN PENGAWAS');
    body.appendParagraph('Nama: ' + profile['Nama']);
    body.appendParagraph('NIP: ' + profile['NIP']);
    body.appendParagraph('');

    let tableData = [['No', 'NSM/NPSN', 'Nama Madrasah']];
    for (let i = 0; i < sasaran.length; i++) {
      tableData.push([String(i + 1), sasaran[i].nsm, sasaran[i].nama]);
    }
    let table = body.appendTable(tableData);
    table.getRow(0).editAsText().setBold(true);

    doc.saveAndClose();

    let pdfBlob = tempDoc.getAs('application/pdf');
    let folder = getUserFolder(nip, 'sk');
    let pdfFile = folder.createFile(pdfBlob);
    tempDoc.setTrashed(true);
    pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return apiSuccess({ url: pdfFile.getUrl() }, 'SK berhasil dibuat.');
  } catch (e) {
    return apiError(e.toString(), 'SK_ERROR');
  }
}

// ============================================================
// FORM DINAMIS
// ============================================================

/**
 * Kembalikan daftar form yang tersedia (id + metadata)
 */
function apiGetAvailableForms() {
  try {
    const forms = getPengawasForms();
    const list = Object.keys(forms).map(formId => {
      // Parse YAML minimal untuk ambil title dan deskripsi
      const yamlStr = forms[formId] || '';
      const titleMatch = yamlStr.match(/^title:\s*["']?(.+?)["']?\s*$/m);
      const descMatch = yamlStr.match(/^description:\s*["']?(.+?)["']?\s*$/m);
      const iconMatch = yamlStr.match(/^icon:\s*["']?(.+?)["']?\s*$/m);
      return {
        id: formId,
        title: titleMatch ? titleMatch[1] : formId,
        description: descMatch ? descMatch[1] : '',
        icon: iconMatch ? iconMatch[1] : '📋'
      };
    });
    return apiSuccess(list);
  } catch (e) {
    return apiError(e.toString(), 'FORMS_ERROR');
  }
}

/**
 * Kembalikan definisi YAML satu form
 */
function apiGetFormDefinition(formId) {
  if (!formId) return apiError('Form ID tidak valid.', 'VALIDATION');
  try {
    const forms = getPengawasForms();
    if (!forms[formId]) return apiError('Form tidak ditemukan: ' + formId, 'NOT_FOUND');
    return apiSuccess({ id: formId, yaml: forms[formId] });
  } catch (e) {
    return apiError(e.toString(), 'FORM_DEF_ERROR');
  }
}

/**
 * Simpan submission form ke sheet Form_Responses
 * payload: { nip, formId, nsmMadrasah, data: {...} }
 */
function apiSubmitForm(payload) {
  if (!payload || !payload.nip || !payload.formId) {
    return apiError('Payload tidak lengkap.', 'VALIDATION');
  }
  try {
    payload = sanitizeObject(payload);

    const ss = SpreadsheetApp.openById(APP_DB_ID);
    const sheet = ss.getSheetByName('Form_Responses');

    const submissionId = 'SUB-' + Utilities.getUuid().substring(0, 8).toUpperCase();
    const timestamp = new Date();
    const dataJson = JSON.stringify(payload.data || {});
    const nsmMadrasah = payload.nsmMadrasah || '';
    const status = 'final';

    sheet.appendRow([
      submissionId,
      timestamp,
      String(payload.nip).trim(),
      String(payload.formId).trim(),
      nsmMadrasah,
      status,
      dataJson
    ]);

    return apiSuccess({ submissionId: submissionId }, 'Form berhasil disimpan.');
  } catch (e) {
    return apiError(e.toString(), 'SUBMIT_ERROR');
  }
}

/**
 * Riwayat pengisian form untuk satu NIP (opsional filter per formId)
 */
function apiGetSubmissionHistory(nip, formId) {
  if (!nip) return apiError('NIP tidak valid.', 'VALIDATION');
  try {
    const ss = SpreadsheetApp.openById(APP_DB_ID);
    const sheet = ss.getSheetByName('Form_Responses');
    const data = sheet.getDataRange().getValues();
    const nipStr = String(nip).trim();

    // Header: Submission_ID, Timestamp, NIP, Form_ID, NSM_Madrasah, Status, Data_JSON
    let history = [];
    for (let i = 1; i < data.length; i++) {
      const rowNip = String(data[i][2]).trim();
      const rowFormId = String(data[i][3]).trim();
      if (rowNip !== nipStr) continue;
      if (formId && rowFormId !== String(formId).trim()) continue;

      history.push({
        submissionId: data[i][0],
        timestamp: data[i][1],
        formId: rowFormId,
        nsmMadrasah: data[i][4],
        status: data[i][5]
      });
    }

    // Urutkan terbaru dulu
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return apiSuccess(history);
  } catch (e) {
    return apiError(e.toString(), 'HISTORY_ERROR');
  }
}

/**
 * Detail satu submission (termasuk Data_JSON)
 */
function apiGetSubmissionDetail(submissionId) {
  if (!submissionId) return apiError('Submission ID tidak valid.', 'VALIDATION');
  try {
    const ss = SpreadsheetApp.openById(APP_DB_ID);
    const sheet = ss.getSheetByName('Form_Responses');
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(submissionId).trim()) {
        let parsedData = {};
        try { parsedData = JSON.parse(data[i][6]); } catch(e) {}
        return apiSuccess({
          submissionId: data[i][0],
          timestamp: data[i][1],
          nip: data[i][2],
          formId: data[i][3],
          nsmMadrasah: data[i][4],
          status: data[i][5],
          data: parsedData
        });
      }
    }
    return apiError('Submission tidak ditemukan.', 'NOT_FOUND');
  } catch (e) {
    return apiError(e.toString(), 'DETAIL_ERROR');
  }
}

// ============================================================
// SETTINGS UTILITIES
// ============================================================

function getSetting(key) {
  const ss = SpreadsheetApp.openById(APP_DB_ID);
  const sheet = ss.getSheetByName('Settings');
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) return data[i][1];
  }
  return null;
}

function updateSetting(key, value) {
  const ss = SpreadsheetApp.openById(APP_DB_ID);
  const sheet = ss.getSheetByName('Settings');
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

function incrementSKCounter() {
  const ss = SpreadsheetApp.openById(APP_DB_ID);
  const sheet = ss.getSheetByName('Settings');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'SK_COUNTER') {
      let currentVal = parseInt(data[i][1]) || 0;
      let newVal = currentVal + 1;
      sheet.getRange(i + 1, 2).setValue(newVal);
      return newVal;
    }
  }
  return 1;
}
