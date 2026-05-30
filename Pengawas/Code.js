// ============================================================
// PENGAWAS KBC - Google Apps Script Backend
// ============================================================

const APP_DB_ID = '1sIIdTzW_vBQJZoizefj_6tWBrHib1OOo2TbUPPZsDYw';
const MASTER_MADRASAH_DB_ID = '119pUNbQxQLaLtqcuHebrbwbzXkXUU3h7n5I1OxyMu4w';
const SK_TEMPLATE_DOC_ID = '1iROegKV9VGGpLWDedovrwaXuDvbX4jEzM4TwsSfeZIc';

// Max login attempts per 5 minutes per NIP
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_SECONDS = 300;

const APP_VERSION = 'v2.1.12';

// ============================================================
// ENTRY POINT
// ============================================================

function doGet(e) {
  let template = HtmlService.createTemplateFromFile('index');
  // Pass query parameters to template safely (bypasses iframe parameter loss)
  template.kamad_setup_token = (e && e.parameter && e.parameter.kamad_setup_token) ? e.parameter.kamad_setup_token : '';
  template.app_version = APP_VERSION;
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
        return apiSuccess(getProfile(nipStr), 'Password berhasil disetel.');
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
    if (!sheet) {
      sheet = ss.insertSheet('Users');
      sheet.appendRow(['NIP', 'Password', 'Status']);
    }
    sheet.appendRow([nipStr, hashPassword(newPassword), 'aktif']);
    return apiSuccess(getProfile(nipStr), 'Password berhasil disetel.');
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
          let val = dataProfil[i][j];
          if (val instanceof Date) {
              // Convert to local date string instead of ISO to prevent timezone shift issues
              val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
          }
          profile[headersProfil[j]] = val;
        }
        
        // Auto-heal WA number
        if (profile['WA']) {
          let strVal = String(profile['WA']).trim();
          if (strVal && !strVal.startsWith('0') && !strVal.startsWith('+') && !strVal.startsWith('62')) {
            if (/^[1-9]\d{8,12}$/.test(strVal)) {
              profile['WA'] = '0' + strVal;
            }
          }
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
          let h = String(headersP[j]).toUpperCase().trim();
          let val = dataP[i][j];
          if (h.includes('NAMA')) profile['Nama'] = val;
          else if (h.includes('GOLONGAN') || h.includes('PANGKAT')) {
            if (typeof val === 'string') {
              let match = val.match(/(III|IV)\/[a-d]/i);
              if (match) val = match[0].replace('A','a').replace('B','b').replace('C','c').replace('D','d');
            }
            profile['Golongan'] = val;
          }
          // Kelamin: cocokkan kolom "Kelamin", "Jenis Kelamin", "L/P", "Gender", dst.
          else if (h.includes('KELAMIN') || h.includes('GENDER') || h === 'L/P' || h === 'JK') {
            let v = String(val).trim();
            // Normalisasi nilai ke "Pria" / "Wanita"
            if (v.toUpperCase() === 'L' || v.toUpperCase() === 'LAKI' || v.toUpperCase().includes('LAKI') || v.toUpperCase() === 'PRIA' || v.toUpperCase() === 'MALE') {
              v = 'Pria';
            } else if (v.toUpperCase() === 'P' || v.toUpperCase() === 'PEREMPUAN' || v.toUpperCase().includes('WANITA') || v.toUpperCase().includes('PEREMPUAN') || v.toUpperCase() === 'FEMALE') {
              v = 'Wanita';
            }
            if (v) profile['Kelamin'] = v;
          }
          else if (h.includes('PROVINSI')) profile['Provinsi'] = val;
          else if (h.includes('KABUPATEN') || h.includes('KOTA')) profile['Kabupaten'] = val;
          else if (h === 'RA' || h === 'MI' || h === 'MTS' || h === 'MA') {
            if (String(val).trim() !== '') {
              if (!profile['Jenjang']) profile['Jenjang'] = [];
              profile['Jenjang'].push(h);
            }
          }
          else if (h.includes('JENJANG')) {
             if (typeof val === 'string' && val.trim() !== '') profile['Jenjang'] = val;
          }
          else if (h.includes('WA') || h.includes('HP') || h.includes('TELP')) {
            let strVal = String(val).trim();
            if (strVal && !strVal.startsWith('0') && !strVal.startsWith('+') && !strVal.startsWith('62')) {
              if (/^[1-9]\d{8,12}$/.test(strVal)) {
                strVal = '0' + strVal;
              }
            }
            profile['WA'] = strVal;
          }
          else if (h.includes('EMAIL')) profile['Email'] = val;
          else if (h.includes('ALAMAT')) profile['Alamat'] = val;
          // Urutan penting: cek TANGGAL LAHIR lebih dulu agar tidak tertangkap oleh TEMPAT LAHIR
          else if (h.includes('TANGGAL LAHIR') || h.includes('TGL LAHIR') || h === 'TGL. LAHIR') profile['Tanggal Lahir'] = val;
          else if (h.includes('TEMPAT LAHIR') || (h.includes('TEMPAT') && h.includes('LAHIR'))) profile['Tempat Lahir'] = val;
        }
        
        if (Array.isArray(profile['Jenjang'])) {
          profile['Jenjang'] = profile['Jenjang'].join(', ');
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
  } else {
    // Append a blank row first to get the row index
    sheet.appendRow(headers.map(() => ''));
    rowIdx = sheet.getLastRow();
  }

  // Set number formats of the row to plain text to preserve leading zeros (like WA starting with 0)
  const range = sheet.getRange(rowIdx, 1, 1, rowData.length);
  const formats = rowData.map(() => '@'); // Plain Text format in Google Sheets
  range.setNumberFormats([formats]);
  range.setValues([rowData]);

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
    // Gunakan format URL thumbnail lh3 agar bisa ditampilkan langsung di browser (uc?export=view sering diblokir)
    let fileId = file.getId();
    let fileUrl = 'https://lh3.googleusercontent.com/d/' + fileId;

    return apiSuccess({ url: fileUrl }, 'Foto berhasil diupload.');
  } catch (e) {
    return apiError(e.toString(), 'UPLOAD_ERROR');
  }
}

// ============================================================
// MADRASAH SASARAN
// ============================================================

function getMadrasahForSasaran(kabupaten, jenjangStr, currentNip) {
  const ssApp = SpreadsheetApp.openById(APP_DB_ID);
  const sheetSasaran = ssApp.getSheetByName('Sasaran');
  let takenNSM = {};
  
  if (sheetSasaran && sheetSasaran.getLastRow() > 1) {
      const dataSasaran = sheetSasaran.getDataRange().getValues();
      const headersSasaran = dataSasaran[0] || [];
      let idxNsmSasaran = headersSasaran.findIndex(h => h.toString().toUpperCase() === 'NSM' || h.toString().toUpperCase().includes('NSM'));
      if (idxNsmSasaran === -1) idxNsmSasaran = 2; // Default fallback
      
      for (let i = 1; i < dataSasaran.length; i++) {
         let nsm = String(dataSasaran[i][idxNsmSasaran]).trim();
         let ownerNip = String(dataSasaran[i][0]).trim();
         if (nsm) takenNSM[nsm] = ownerNip;
      }
  }

  kabupaten = sanitizeHtml(String(kabupaten || '').toLowerCase().trim());
  let normProfileKab = kabupaten.replace(/^kab\.\s+/i, 'kabupaten ').trim();
  if (normProfileKab && !normProfileKab.startsWith('kota ') && !normProfileKab.startsWith('kabupaten ')) {
      normProfileKab = 'kabupaten ' + normProfileKab;
  }
  let allowedJenjangs = String(jenjangStr || '').split(',').map(j => j.trim().toLowerCase()).filter(j => j !== '');
  let safeCacheKey = 'kab_madrasah_' + normProfileKab.replace(/[^a-zA-Z0-9]/g, '').substring(0, 50);
  let cachedDataStr = getCacheChunked(safeCacheKey);
  let allKabMadrasahs = null;

  if (cachedDataStr) {
    try {
      allKabMadrasahs = JSON.parse(cachedDataStr);
    } catch (e) {}
  }

  if (!allKabMadrasahs) {
    const ss = SpreadsheetApp.openById(MASTER_MADRASAH_DB_ID);
    const sheet = ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    let idxNSM = headers.findIndex(h => h.toString().toUpperCase() === 'NSM' || h.toString().toUpperCase().includes('NSM'));
    let idxNPSN = headers.findIndex(h => h.toString().toUpperCase().includes('NPSN'));
    let idxNama = headers.findIndex(h => h.toString().toUpperCase().includes('NAMA') || h.toString().toUpperCase() === 'NAME');
    let idxKab = headers.findIndex(h => h.toString().toUpperCase().includes('KAB') || h.toString().toUpperCase().includes('KOTA') || h.toString().toUpperCase() === 'DISTRICT');
    let idxKec = headers.findIndex(h => h.toString().toUpperCase().includes('SUB_DISTRICT') || h.toString().toUpperCase().includes('KECAMATAN') || h.toString().toUpperCase().includes('KEC'));
    let idxJenjang = headers.findIndex(h => h.toString().toUpperCase().includes('JENJANG') || h.toString().toUpperCase().includes('BENTUK') || h.toString().toUpperCase() === 'LEVEL');

    if (idxNSM === -1) idxNSM = 0;
    if (idxNama === -1) idxNama = 1;
    if (idxKab === -1) idxKab = 2;
    if (idxJenjang === -1) idxJenjang = 3;

    allKabMadrasahs = [];
    for (let i = 1; i < data.length; i++) {
      let kab = String(data[i][idxKab]).toLowerCase().trim();
      let normDbKab = kab.replace(/^kab\.\s+/i, 'kabupaten ').trim();
      if (normDbKab && !normDbKab.startsWith('kota ') && !normDbKab.startsWith('kabupaten ')) {
          normDbKab = 'kabupaten ' + normDbKab;
      }

      if (!normProfileKab || normDbKab === normProfileKab) {
        allKabMadrasahs.push({
          nsm: data[i][idxNSM],
          npsn: idxNPSN !== -1 ? data[i][idxNPSN] : '',
          nama: data[i][idxNama],
          kecamatan: idxKec !== -1 ? String(data[i][idxKec]).trim() : 'Tanpa Kecamatan',
          kabupaten: data[i][idxKab],
          jenjang: data[i][idxJenjang]
        });
      }
    }
    
    try {
      putCacheChunked(safeCacheKey, JSON.stringify(allKabMadrasahs), 21600);
    } catch (e) {
      console.log("Cache save error: " + e.toString());
    }
  }

  let results = [];
  for (let i = 0; i < allKabMadrasahs.length; i++) {
    let m = allKabMadrasahs[i];
    let nsmVal = String(m.nsm).trim();
    let owner = takenNSM[nsmVal];
    if (owner && owner !== String(currentNip || '').trim()) {
       continue; // DIBLOKIR: Sudah diambil pengawas lain
    }
    
    let jenjang = String(m.jenjang).toLowerCase();
    let matchJenjang = allowedJenjangs.length === 0 || allowedJenjangs.some(j => jenjang === j || jenjang.includes(j) || j.includes(jenjang));
    if (matchJenjang) {
       results.push(m);
    }
  }

  // Sort by Kecamatan, then Nama
  results.sort((a, b) => {
    let kecA = (a.kecamatan || '').toLowerCase();
    let kecB = (b.kecamatan || '').toLowerCase();
    if (kecA < kecB) return -1;
    if (kecA > kecB) return 1;
    let namaA = (a.nama || '').toLowerCase();
    let namaB = (b.nama || '').toLowerCase();
    if (namaA < namaB) return -1;
    if (namaA > namaB) return 1;
    return 0;
  });

  return results;
}

function getSasaran(nip) {
  const ss = SpreadsheetApp.openById(APP_DB_ID);
  const sheet = ss.getSheetByName('Sasaran');
  if (!sheet) return [];
  // Use getDisplayValues to prevent scientific notation for large numbers like NSM
  const data = sheet.getDataRange().getDisplayValues();
  if (data.length < 2) return [];

  const headers = data[0];
  let idxNsm = headers.findIndex(h => h.toString().toUpperCase() === 'NSM' || h.toString().toUpperCase().includes('NSM'));
  let idxNama = headers.findIndex(h => h.toString().toUpperCase().includes('NAMA') || h.toString().toUpperCase() === 'NAME');
  
  if (idxNsm === -1) idxNsm = 2;
  if (idxNama === -1) idxNama = 3;

  const nipStr = String(nip).trim();
  let sasaran = [];

  // Ambil data NSM Kamad yang sudah aktif
  const activeKamadNsms = new Set();
  try {
    const kSheet = ss.getSheetByName('KamadUsers');
    if (kSheet) {
      const kData = kSheet.getDataRange().getValues();
      if (kData.length > 1) {
        const kHeaders = kData[0].map(h => String(h).toLowerCase().trim());
        const nsmIdx = kHeaders.indexOf('nsm');
        const statusIdx = kHeaders.indexOf('status');
        if (nsmIdx !== -1) {
          for (let i = 1; i < kData.length; i++) {
            const statusVal = statusIdx !== -1 ? String(kData[i][statusIdx]).toLowerCase().trim() : '';
            if (statusVal === 'aktif' || statusVal === 'active') {
              activeKamadNsms.add(String(kData[i][nsmIdx]).trim());
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('Error reading KamadUsers status:', e);
  }

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() == nipStr) {
      const nsmVal = String(data[i][idxNsm]).trim();
      sasaran.push({ 
        nsm: nsmVal, 
        nama: data[i][idxNama],
        kamad_aktif: activeKamadNsms.has(nsmVal)
      });
    }
  }
  return sasaran;
}

function saveSasaranList(nip, nsmListArray) {
  if (!nip) return apiError('NIP tidak valid.', 'VALIDATION');

  const ssApp = SpreadsheetApp.openById(APP_DB_ID);
  let sheet = ssApp.getSheetByName('Sasaran');
  if (!sheet) {
    sheet = ssApp.insertSheet('Sasaran');
  }

  const ssMaster = SpreadsheetApp.openById(MASTER_MADRASAH_DB_ID);
  const sheetMaster = ssMaster.getSheets()[0];
  const dataMaster = sheetMaster.getDataRange().getValues();
  const headersMaster = dataMaster[0] || [];

  // Set headers if empty
  if (sheet.getLastRow() === 0) {
     sheet.appendRow(['NIP Pengawas', 'Waktu Simpan', ...headersMaster]);
  }

  let idxNSMMaster = headersMaster.findIndex(h => h.toString().toUpperCase() === 'NSM' || h.toString().toUpperCase().includes('NSM'));
  if (idxNSMMaster === -1) idxNSMMaster = 0;

  let masterMap = {};
  for (let i = 1; i < dataMaster.length; i++) {
     let nsm = String(dataMaster[i][idxNSMMaster]).trim();
     if (nsm) masterMap[nsm] = dataMaster[i];
  }

  const data = sheet.getDataRange().getValues();
  const nipStr = String(nip).trim();

  // Delete old rows
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]).trim() == nipStr) {
      sheet.deleteRow(i + 1);
    }
  }

  // Insert new rows with full data
  if (nsmListArray && nsmListArray.length > 0) {
    let timestamp = new Date();
    let rowsToInsert = [];
    for (let item of nsmListArray) {
       let nsm = String(item.nsm).trim();
       let masterRow = masterMap[nsm] || new Array(headersMaster.length).fill('');
       rowsToInsert.push([nipStr, timestamp, ...masterRow]);
    }
    if (rowsToInsert.length > 0) {
       sheet.getRange(sheet.getLastRow() + 1, 1, rowsToInsert.length, rowsToInsert[0].length).setValues(rowsToInsert);
    }
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
      tableData.push([String(i + 1), String(sasaran[i].nsm), String(sasaran[i].nama)]);
    }
    let table = body.appendTable(tableData);
    table.getRow(0).editAsText().setBold(true);

    // Set column widths to make No tighter, NSM snug, and Nama takes the rest
    table.setColumnWidth(0, 35);
    table.setColumnWidth(1, 120);

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
      const groupMatch = yamlStr.match(/^group:\s*["']?(.+?)["']?\s*$/m);
      const reqMadrasahMatch = yamlStr.match(/^requires_madrasah:\s*(\w+)/m);
      const requiresMadrasah = reqMadrasahMatch ? reqMadrasahMatch[1] === 'true' : true; // Default ke true jika tidak dispesifikasi

      return {
        id: formId,
        title: titleMatch ? titleMatch[1] : formId,
        description: descMatch ? descMatch[1] : '',
        icon: iconMatch ? iconMatch[1] : '📋',
        group: groupMatch ? groupMatch[1] : 'Lainnya',
        requiresMadrasah: requiresMadrasah
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
 * Simpan submission form ke target sheet spesifik (jika ada di YAML)
 * dan simpan log rekap ke Form_Responses.
 * payload: { nip, formId, nsmMadrasah, data: {...} }
 */
function apiSubmitForm(payload) {
  if (!payload || !payload.nip || !payload.formId) {
    return apiError('Payload tidak lengkap.', 'VALIDATION');
  }
  try {
    payload = sanitizeObject(payload);

    // Process and upload base64 attachments to Google Drive in upload/<NIP>/attach/
    if (payload.data) {
      payload.data = processFormAttachments(payload.nip, payload.data);
    }

    const ss = SpreadsheetApp.openById(APP_DB_ID);
    const submissionId = 'SUB-' + Utilities.getUuid().substring(0, 8).toUpperCase();
    const timestamp = new Date();
    const dataJson = JSON.stringify(payload.data || {});
    const nsmMadrasah = payload.nsmMadrasah || 'N/A';
    const status = 'final';

    // 1. Tentukan target sheet dari YAML form
    let target = 'Form_Responses';
    const forms = getPengawasForms();
    const yaml = forms[payload.formId] || '';
    const match = yaml.match(/target_sheet:\s*(['"]?)([^'"\n\r]+)\1/);
    if (match) {
      target = match[2].trim();
    }

    // 2. Tulis ke target sheet spesifik jika berbeda dari Form_Responses
    if (target !== 'Form_Responses') {
      let sheet = ss.getSheetByName(target);
      const keys = Object.keys(payload.data || {});
      const standardHeaders = ['submission_id', 'madrasah_id', 'timestamp', 'username'];

      if (!sheet) {
        sheet = ss.insertSheet(target);
        const headers = [...standardHeaders, ...keys];
        sheet.appendRow(headers);
        sheet.getRange(1, 1, 1, headers.length)
             .setFontWeight('bold')
             .setBackground('#d9ead3');
        sheet.setFrozenRows(1);
      } else {
        // Auto-Column Add (Safe)
        let headers = sheet.getLastRow() > 0 ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim()) : [];
        if (headers.length === 0) {
          headers = [...standardHeaders, ...keys];
          sheet.appendRow(headers);
          sheet.getRange(1, 1, 1, headers.length)
               .setFontWeight('bold')
               .setBackground('#d9ead3');
          sheet.setFrozenRows(1);
        } else {
          const missing = keys.filter(k => !headers.includes(k));
          if (missing.length > 0) {
            sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
            sheet.getRange(1, headers.length + 1, 1, missing.length)
                 .setFontWeight('bold')
                 .setBackground('#d9ead3');
            headers = [...headers, ...missing];
          }
        }
      }

      // Ambil headers ter-update untuk memetakan row
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
      const row = headers.map(h => {
        if (h === 'submission_id') return submissionId;
        if (h === 'madrasah_id') return nsmMadrasah;
        if (h === 'timestamp') return timestamp;
        if (h === 'username') return String(payload.nip).trim();
        let val = (payload.data || {})[h];
        if (val === undefined || val === null) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return val;
      });
      sheet.appendRow(row);

      // 3. Tulis data table / table_col_fix ke sheet terpisah (target_sheet|field_name) jika ada
      const tableFields = extractTableFieldsFromYAML(yaml);
      writeTableDataToSheets(ss, target, tableFields, payload.data || {}, submissionId, nsmMadrasah, timestamp);
    }

    // 4. Selalu catat rekap pusat ke sheet Form_Responses (untuk history & backup)
    let logSheet = ss.getSheetByName('Form_Responses');
    if (!logSheet) {
      logSheet = ss.insertSheet('Form_Responses');
      const headers = ['Submission_ID', 'Timestamp', 'NIP', 'Form_ID', 'NSM_Madrasah', 'Status', 'Data_JSON'];
      logSheet.appendRow(headers);
      logSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#d9ead3');
      logSheet.setFrozenRows(1);
    }
    
    logSheet.appendRow([
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
 * Helper to process and upload base64 file attachments in payload.data to Google Drive
 */
function processFormAttachments(nip, data) {
  if (!data || typeof data !== 'object') return data;

  for (let key in data) {
    let val = data[key];
    if (val === undefined || val === null) continue;

    // 1. Handle arrays of files/images (e.g. multi_file, multi_image)
    if (Array.isArray(val)) {
      for (let i = 0; i < val.length; i++) {
        let item = val[i];
        if (item && typeof item === 'object' && item.data && typeof item.data === 'string' && item.data.startsWith('data:')) {
          let url = saveBase64FileToDrive(nip, item.data, item.name);
          if (url) {
            val[i] = url; // Replace with public Drive URL
          }
        } else if (typeof item === 'string' && item.startsWith('data:')) {
          let url = saveBase64FileToDrive(nip, item, 'attach_' + Date.now());
          if (url) {
            val[i] = url; // Replace with public Drive URL
          }
        }
      }
    }
    // 2. Handle single file/image objects with metadata
    else if (typeof val === 'object' && val.data && typeof val.data === 'string' && val.data.startsWith('data:')) {
      let url = saveBase64FileToDrive(nip, val.data, val.name);
      if (url) {
        data[key] = url; // Replace with public Drive URL
      }
    }
    // 3. Handle single raw base64 string
    else if (typeof val === 'string' && val.startsWith('data:')) {
      let url = saveBase64FileToDrive(nip, val, 'attach_' + Date.now());
      if (url) {
        data[key] = url; // Replace with public Drive URL
      }
    }
  }
  return data;
}

/**
 * Save a single Base64 file attachment directly to Drive in upload/<NIP>/attach/
 */
function saveBase64FileToDrive(nip, base64Data, filename) {
  if (!nip || !base64Data) return null;
  try {
    let folder = getUserFolder(nip, 'attach');

    // Parse mime type and clean base64 data
    let contentType = 'application/octet-stream';
    if (base64Data.indexOf(';') !== -1) {
      contentType = base64Data.substring(5, base64Data.indexOf(';'));
    }
    
    let bytes = Utilities.base64Decode(base64Data.split(',')[1]);
    let safeFilename = filename || ('attach_' + Date.now());
    let blob = Utilities.newBlob(bytes, contentType, safeFilename);

    let file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    let fileId = file.getId();
    
    // Return direct thumbnail link for images or standard direct download link for documents
    let fileUrl = '';
    if (contentType.startsWith('image/')) {
      fileUrl = 'https://lh3.googleusercontent.com/d/' + fileId;
    } else {
      fileUrl = 'https://drive.google.com/uc?export=view&id=' + fileId;
    }
    
    return fileUrl;
  } catch (e) {
    console.error('Failed to save file to Drive:', e);
    return null;
  }
}

/**
 * HELPER: Extract table field definitions dari YAML
 */
function extractTableFieldsFromYAML(yaml) {
  const tableFields = [];
  const lines = yaml.split('\n');

  let currentField = null;
  let inColumns = false;
  let indent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.match(/^-\s*type:\s*(table_col_fix|table)/)) {
      const typeMatch = trimmed.match(/^-\s*type:\s*(table_col_fix|table)/);
      if (currentField) {
        tableFields.push(currentField);
      }
      currentField = {
        name: '',
        type: typeMatch[1],
        columns: [],
        firstColLabel: null
      };
      inColumns = false;
    }

    if (currentField && !currentField.name && trimmed.match(/^name:\s*(['"]?)([^'"\n\r]+)\1/)) {
      const nameMatch = trimmed.match(/^name:\s*(['"]?)([^'"\n\r]+)\1/);
      currentField.name = nameMatch[2].trim();
    }

    if (currentField && currentField.type === 'table_col_fix' && !currentField.firstColLabel && trimmed.match(/^first_col_label:\s*(.+)/)) {
      const labelMatch = trimmed.match(/^first_col_label:\s*(.+)/);
      currentField.firstColLabel = labelMatch[1].trim();
    }

    if (currentField && trimmed === 'columns:') {
      inColumns = true;
      indent = line.search(/\S/);
    }

    if (currentField && inColumns) {
      const colMatch = trimmed.match(/^-\s*name:\s*(['"]?)([^'"\n\r]+)\1/);
      if (colMatch) {
        const columnIndent = line.search(/\S/);
        if (columnIndent > indent) {
          currentField.columns.push(colMatch[2].trim());
        }
      }

      if (trimmed.startsWith('- type:') || trimmed.startsWith('- name:')) {
        const lineIndent = line.search(/\S/);
        if (lineIndent <= indent) {
          inColumns = false;
        }
      }
    }
  }

  if (currentField && currentField.name) {
    tableFields.push(currentField);
  }

  return tableFields;
}

/**
 * HELPER: Tulis data table / table_col_fix ke sheet terpisah di Pengawas DB
 */
function writeTableDataToSheets(ss, targetSheetName, tableFields, processedData, msgId, madrasah_id, timestamp) {
  const affectedSheets = [];

  tableFields.forEach(tableField => {
    const fieldName = tableField.name;
    const fieldValue = processedData[fieldName];

    if (!fieldValue) return;

    let tableData;
    if (typeof fieldValue === 'string') {
      try {
        tableData = JSON.parse(fieldValue);
      } catch (e) {
        return;
      }
    } else {
      tableData = fieldValue;
    }

    if (!Array.isArray(tableData) || tableData.length === 0) return;

    const tableSheetName = `${targetSheetName}|${fieldName}`;
    let tableSheet = ss.getSheetByName(tableSheetName);

    if (!tableSheet) {
      tableSheet = ss.insertSheet(tableSheetName);
      const tableHeaders = ['submission_id', 'madrasah_id', 'timestamp'];
      if (tableField.type === 'table_col_fix') {
        const firstColName = tableField.firstColLabel || 'row_label';
        tableHeaders.push(firstColName);
      }
      tableHeaders.push(...tableField.columns);

      tableSheet.appendRow(tableHeaders);
      tableSheet.getRange(1, 1, 1, tableHeaders.length)
                .setFontWeight('bold')
                .setBackground('#d9ead3');
      tableSheet.setFrozenRows(1);
    }

    const headers = tableSheet.getLastRow() > 0
      ? tableSheet.getRange(1, 1, 1, tableSheet.getLastColumn()).getValues()[0].map(h => String(h).trim())
      : [];

    tableData.forEach(rowData => {
      const row = headers.map(h => {
        if (h === 'submission_id') return msgId;
        if (h === 'madrasah_id') return madrasah_id;
        if (h === 'timestamp') return timestamp;

        if (tableField.type === 'table_col_fix') {
          const firstColName = tableField.firstColLabel || 'row_label';
          if (h === firstColName) {
            return rowData.row_label || '';
          }
        }

        const val = rowData[h];
        if (val === undefined || val === null) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return val;
      });

      tableSheet.appendRow(row);
    });

    affectedSheets.push(tableSheetName);
  });

  return affectedSheets;
}


/**
 * Riwayat pengisian form untuk satu NIP (opsional filter per formId)
 */
function apiGetSubmissionHistory(nip, formId) {
  if (!nip) return apiError('NIP tidak valid.', 'VALIDATION');
  try {
    const ss = SpreadsheetApp.openById(APP_DB_ID);
    
    // 1. Get supervisor's targeted NSMs list
    const sasaranList = getSasaran(nip) || [];
    const targetNsms = new Set(sasaranList.map(s => String(s.nsm).trim()));
    
    let history = [];

    // 2. Fetch supervisor's own submissions from Form_Responses
    const sheet = ss.getSheetByName('Form_Responses');
    if (sheet) {
      const data = sheet.getDataRange().getValues();
      const nipStr = String(nip).trim();
      for (let i = 1; i < data.length; i++) {
        const rowNip = String(data[i][2]).trim();
        const rowFormId = String(data[i][3]).trim();
        if (rowNip !== nipStr) continue;
        if (formId && rowFormId !== String(formId).trim()) continue;

        history.push({
          submissionId: data[i][0],
          timestamp: data[i][1] instanceof Date ? data[i][1].toISOString() : String(data[i][1]),
          formId: rowFormId,
          nsmMadrasah: data[i][4],
          status: data[i][5]
        });
      }
    }

    // 3. Fetch Kamad submissions for targeted schools from KamadSubmissions
    const kSheet = ss.getSheetByName('KamadSubmissions');
    if (kSheet && kSheet.getLastRow() > 1) {
      const kData = kSheet.getDataRange().getValues();
      const kHeaders = kData[0].map(h => String(h).toLowerCase().trim());
      const idxNsm = kHeaders.indexOf('nsm');
      const idxForm = kHeaders.indexOf('form_id');
      const idxTime = kHeaders.indexOf('timestamp');
      const idxStatus = kHeaders.indexOf('status');

      if (idxNsm !== -1 && idxForm !== -1 && idxTime !== -1) {
        for (let i = 1; i < kData.length; i++) {
          const rowNsm = String(kData[i][idxNsm]).trim();
          const rowFormId = String(kData[i][idxForm]).trim();
          
          if (!targetNsms.has(rowNsm)) continue;
          if (formId && rowFormId !== String(formId).trim()) continue;

          history.push({
            submissionId: 'KM-' + i,
            timestamp: kData[i][idxTime] instanceof Date ? kData[i][idxTime].toISOString() : String(kData[i][idxTime]),
            formId: rowFormId,
            nsmMadrasah: rowNsm,
            status: idxStatus !== -1 ? kData[i][idxStatus] || 'final' : 'final'
          });
        }
      }
    }

    // Sort newest first
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
          timestamp: data[i][1] instanceof Date ? data[i][1].toISOString() : String(data[i][1]),
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

// ============================================================
// CACHE UTILITIES FOR LARGE DATA
// ============================================================

function putCacheChunked(key, str, expirationInSeconds) {
  const cache = CacheService.getScriptCache();
  const CHUNK_SIZE = 90000;
  const chunks = Math.ceil(str.length / CHUNK_SIZE);
  let payload = {};
  for (let i = 0; i < chunks; i++) {
    payload[key + '_' + i] = str.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
  }
  payload[key + '_chunks'] = String(chunks);
  cache.putAll(payload, expirationInSeconds);
}

function getCacheChunked(key) {
  const cache = CacheService.getScriptCache();
  const chunkCountStr = cache.get(key + '_chunks');
  if (!chunkCountStr) return null;
  const chunks = parseInt(chunkCountStr);
  let keys = [];
  for (let i = 0; i < chunks; i++) {
    keys.push(key + '_' + i);
  }
  const chunkData = cache.getAll(keys);
  let str = '';
  for (let i = 0; i < chunks; i++) {
    let chunk = chunkData[key + '_' + i];
    if (!chunk) return null; // Incomplete cache
    str += chunk;
  }
  return str;
}


// ============================================================
// ============================================================
// KAMAD (KEPALA MADRASAH) API
// Semua fungsi backend untuk role Kamad.
// DB: APP_DB_ID (Pengawas DB) untuk KamadUsers, KamadTokens, KamadSubmissions
//     MASTER_MADRASAH_DB_ID untuk lookup data madrasah (nama, kecamatan, dll.)
// ============================================================
// ============================================================

/**
 * Helper: Mendapatkan atau membuat sheet Kamad di APP_DB_ID
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
 * Helper: Mencari data madrasah berdasarkan NSM dari master DB
 */
function getMadrasahByNsm(nsm) {
  try {
    const ss = SpreadsheetApp.openById(MASTER_MADRASAH_DB_ID);
    const sheet = ss.getSheets()[0];
    const data = sheet.getDataRange().getDisplayValues();
    const headers = data[0].map(h => String(h).trim());
    const idx = name => {
      const i = headers.findIndex(h => h.toUpperCase().includes(name));
      return i;
    };
    const idxNsm  = idx('NSM');
    const idxNama = headers.findIndex(h => { const u = h.toUpperCase(); return u.includes('NAMA') || u === 'NAME'; });
    const idxKec  = idx('KEC');
    const idxKab  = headers.findIndex(h => { const u = h.toUpperCase(); return u.includes('KAB') || u.includes('KOTA') || u === 'DISTRICT'; });
    const idxProv = idx('PROV');
    const idxJenjang = headers.findIndex(h => { const u = h.toUpperCase(); return u.includes('JENJANG') || u === 'LEVEL'; });
    const nsmStr = String(nsm).trim();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idxNsm]).trim() === nsmStr) {
        return {
          nsm:       nsmStr,
          nama:      idxNama    !== -1 ? data[i][idxNama]    : '',
          kecamatan: idxKec     !== -1 ? data[i][idxKec]     : '',
          kabupaten: idxKab     !== -1 ? data[i][idxKab]     : '',
          provinsi:  idxProv    !== -1 ? data[i][idxProv]    : '',
          jenjang:   idxJenjang !== -1 ? data[i][idxJenjang] : '',
        };
      }
    }
    return null;
  } catch (e) {
    console.log('getMadrasahByNsm error: ' + e.toString());
    return null;
  }
}

// ============================================================
// KAMAD AUTHENTICATION
// ============================================================

/**
 * Login Kamad menggunakan NSM dan password
 */
function kamadLogin(nsm, password) {
  if (!nsm || !password) return apiError('NSM dan password harus diisi.', 'VALIDATION');
  const rateLimitKey = 'kamad_login_' + String(nsm).trim();
  if (isRateLimited(rateLimitKey)) return apiError('Terlalu banyak percobaan. Coba lagi dalam 5 menit.', 'RATE_LIMITED');

  const nsmStr = String(nsm).trim();
  const ss = SpreadsheetApp.openById(APP_DB_ID);
  const sheet = getKamadSheet(ss, 'KamadUsers');
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase().trim());
  const iNsm  = headers.indexOf('nsm');
  const iPwd  = headers.indexOf('password');
  const iStat = headers.indexOf('status');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][iNsm]).trim() === nsmStr) {
      if (String(data[i][iStat] || '').toLowerCase() === 'nonaktif')
        return apiError('Akun dinonaktifkan. Hubungi pengawas.', 'ACCOUNT_DISABLED');
      const stored = String(data[i][iPwd] || '');
      if (!stored) return apiError('Password belum disetel. Gunakan link dari pengawas.', 'NO_PASSWORD');
      const isHashed = stored.length === 64 && /^[0-9a-f]+$/i.test(stored);
      const inputHash = hashPassword(password);
      const match = isHashed ? stored === inputHash : stored === password;
      if (match) {
        resetRateLimit(rateLimitKey);
        if (!isHashed) sheet.getRange(i + 1, iPwd + 1).setValue(inputHash);
        const madrasahInfo = getMadrasahByNsm(nsmStr);
        return apiSuccess({ nsm: nsmStr, madrasah_name: madrasahInfo?.nama || nsmStr, madrasahInfo }, 'Login berhasil.');
      }
      return apiError('Password salah.', 'WRONG_PASSWORD');
    }
  }
  return apiError('NSM tidak ditemukan. Hubungi pengawas Anda.', 'NSM_NOT_FOUND');
}

/**
 * Setup password pertama Kamad menggunakan token dari link WA
 */
function kamadSetPassword(nsm, newPassword, token) {
  if (!nsm || !newPassword || !token) return apiError('Data tidak lengkap.', 'VALIDATION');
  if (String(newPassword).length < 6) return apiError('Password minimal 6 karakter.', 'VALIDATION');
  const nsmStr = String(nsm).trim();
  const ss = SpreadsheetApp.openById(APP_DB_ID);

  // Validasi token
  const tokenSheet = getKamadSheet(ss, 'KamadTokens');
  const tData = tokenSheet.getDataRange().getValues();
  const tH = tData[0].map(h => String(h).toLowerCase().trim());
  const tiT = tH.indexOf('token'); const tiN = tH.indexOf('nsm');
  const tiE = tH.indexOf('expires_at'); const tiU = tH.indexOf('used');

  let tokenRow = -1;
  for (let i = 1; i < tData.length; i++) {
    if (String(tData[i][tiT]) === String(token) && String(tData[i][tiN]).trim() === nsmStr) {
      if (String(tData[i][tiU]).toLowerCase() === 'true') return apiError('Token sudah digunakan.', 'TOKEN_USED');
      if (new Date() > new Date(tData[i][tiE]))           return apiError('Token sudah kadaluarsa. Minta link baru dari pengawas.', 'TOKEN_EXPIRED');
      tokenRow = i; break;
    }
  }
  if (tokenRow === -1) return apiError('Token tidak valid.', 'INVALID_TOKEN');

  // Simpan/update password
  const uSheet = getKamadSheet(ss, 'KamadUsers');
  const uData  = uSheet.getDataRange().getValues();
  const uH = uData[0].map(h => String(h).toLowerCase().trim());
  const uiN = uH.indexOf('nsm'); const uiP = uH.indexOf('password');
  const uiS = uH.indexOf('status'); const uiU = uH.indexOf('updated_at');
  const now = new Date().toISOString();
  const hashed = hashPassword(newPassword);
  let found = false;
  for (let i = 1; i < uData.length; i++) {
    if (String(uData[i][uiN]).trim() === nsmStr) {
      uSheet.getRange(i + 1, uiP + 1).setValue(hashed);
      uSheet.getRange(i + 1, uiS + 1).setValue('aktif');
      if (uiU !== -1) uSheet.getRange(i + 1, uiU + 1).setValue(now);
      found = true; break;
    }
  }
  if (!found) uSheet.appendRow([nsmStr, hashed, 'aktif', now, now]);

  // Tandai token terpakai
  tokenSheet.getRange(tokenRow + 1, tiU + 1).setValue('true');

  const madrasahInfo = getMadrasahByNsm(nsmStr);
  return apiSuccess({ nsm: nsmStr, madrasah_name: madrasahInfo?.nama || nsmStr, madrasahInfo }, 'Password berhasil disetel.');
}

/**
 * Validasi token setup password (dipanggil saat kamad buka link WA)
 */
function kamadValidateSetupToken(token) {
  try {
    const ss = SpreadsheetApp.openById(APP_DB_ID);
    const sheet = getKamadSheet(ss, 'KamadTokens');
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { valid: false, reason: 'Belum ada data link Kamad di sistem.' };

    const H = data[0].map(h => String(h).toLowerCase().trim());
    let iT = H.indexOf('token'); if (iT === -1) iT = 0;
    let iN = H.indexOf('nsm'); if (iN === -1) iN = 1;
    let iE = H.indexOf('expires_at'); if (iE === -1) iE = 3;
    let iU = H.indexOf('used'); if (iU === -1) iU = 4;
    
    const searchToken = String(token).trim();

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][iT]).trim() === searchToken) {
        if (String(data[i][iU]).toLowerCase().trim() === 'true')
          return { valid: false, reason: 'Link sudah digunakan. Minta link baru dari pengawas.' };
        if (new Date() > new Date(data[i][iE]))
          return { valid: false, reason: 'Link sudah kadaluarsa. Minta link baru dari pengawas.' };
        const nsmStr = String(data[i][iN]).trim();
        const m = getMadrasahByNsm(nsmStr);
        return { valid: true, nsm: nsmStr, madrasah_name: m?.nama || nsmStr };
      }
    }
    return { valid: false, reason: 'Link tidak dikenali. Pastikan link lengkap dan tidak terpotong. (Kode: ' + searchToken.substring(0,8) + '...)' };
  } catch (e) {
    return { valid: false, reason: 'Terjadi kesalahan: ' + e.toString() };
  }
}

// ============================================================
// KAMAD DATA & FORMS
// ============================================================

/**
 * Ambil semua data dashboard kamad dalam 1 panggilan
 */
function kamadGetDashboard(nsm, viewerRole) {
  try {
    const nsmStr = String(nsm).trim();
    const madrasahInfo = getMadrasahByNsm(nsmStr);
    if (!madrasahInfo) return apiError('Data madrasah tidak ditemukan: ' + nsmStr, 'NOT_FOUND');
    const formsResult = kamadGetAvailableForms(nsmStr, viewerRole);
    const forms = formsResult.success ? (formsResult.data || []) : [];
    const histResult = kamadGetSubmissionHistory(nsmStr);
    const history = histResult.success ? (histResult.data || []) : [];
    const filledIds = new Set(history.map(h => h.form_id));
    return apiSuccess({
      madrasahInfo,
      forms,
      history, // Include history array
      stats: { total: forms.length, filled: forms.filter(f => filledIds.has(f.id)).length }
    });
  } catch (e) {
    return apiError(e.toString());
  }
}

/**
 * Daftar form tersedia untuk kamad (dengan flag canFill)
 */
function kamadGetAvailableForms(nsm, viewerRole) {
  try {
    const definitions = getMadrasahFormDefinitions();
    const ICONS = { '0': '📊', '1': '🔍', '2': '📝', '3': '🎙️', '4': '👤' };
    const forms = Object.entries(definitions).map(([id, yaml]) => {
      const tM = yaml.match(/^title:\s*(.+)$/m);
      const gM = yaml.match(/^group:\s*(.+)$/m);
      const aM = yaml.match(/^allowed_roles:\s*\[([^\]]*)\]/m);
      const sL = yaml.match(/^submission_limit:\s*(.+)$/m);
      const title = tM ? tM[1].trim() : id;
      const group = gM ? gM[1].trim() : 'Lainnya';
      const allowed = aM ? aM[1].split(',').map(r => r.trim().toLowerCase()) : [];
      
      let canFill = false;
      if (viewerRole === 'district') {
        canFill = allowed.includes('district');
      } else {
        canFill = allowed.length === 0 || allowed.includes('kamad');
      }
      
      const submissionLimit = sL ? parseInt(sL[1].trim()) : -1;
      return { id, title, group, canFill, icon: ICONS[group.charAt(0)] || '📋', submission_limit: submissionLimit };
    });
    forms.sort((a, b) => a.canFill !== b.canFill ? (a.canFill ? -1 : 1) : a.title.localeCompare(b.title));
    return apiSuccess(forms);
  } catch (e) {
    return apiError(e.toString());
  }
}

/**
 * Definisi YAML satu form
 */
function kamadGetFormDefinition(formId, nsm) {
  try {
    const yaml = getMadrasahFormDefinitions()[formId];
    if (!yaml) return apiError('Form tidak ditemukan: ' + formId, 'NOT_FOUND');
    
    let prefill = {};
    if (nsm) {
      const nsmStr = String(nsm).trim();
      const match = yaml.match(/target_sheet:\s*(['"]?)([^'"\n\r]+)\1/);
      const targetSheet = match ? match[2].trim() : formId;
      
      const ss = SpreadsheetApp.openById(APP_DB_ID);
      const sheet = ss.getSheetByName(targetSheet);
      if (sheet && sheet.getLastRow() > 0) {
        const data = sheet.getDataRange().getValues();
        const headers = data[0].map(h => String(h).trim());
        const nsmIdx = headers.indexOf('nsm');
        if (nsmIdx !== -1) {
          // Scan from bottom to top to get the latest submission
          for (let i = data.length - 1; i >= 1; i--) {
            if (String(data[i][nsmIdx]).trim() === nsmStr) {
              // Construct the prefill object
              const standardCols = ['timestamp', 'nsm', 'madrasah_nama', 'form_id', 'role'];
              for (let j = 0; j < headers.length; j++) {
                const header = headers[j];
                if (standardCols.includes(header.toLowerCase())) continue;
                let val = data[i][j];
                // If it is a JSON string (e.g. arrays or tables), parse it
                if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
                  try { val = JSON.parse(val); } catch(e) {}
                }
                prefill[header] = val;
              }
              break; // Found the latest one
            }
          }
        }
      }
    }

    return apiSuccess({ formId, yaml, prefill });
  } catch (e) {
    return apiError(e.toString());
  }
}

/**
 * Submit form oleh kamad
 */
function kamadSubmitForm(payload) {
  try {
    const nsm    = sanitizeHtml(String(payload.nsm    || '').trim());
    const formId = sanitizeHtml(String(payload.formId || '').trim());
    const data   = payload.data || {};
    if (!nsm || !formId) return apiError('NSM dan formId wajib diisi.', 'VALIDATION');
    const madrasah = getMadrasahByNsm(nsm);
    if (!madrasah) return apiError('NSM tidak valid.', 'NOT_FOUND');
    const definitions = getMadrasahFormDefinitions();
    const yaml = definitions[formId];
    if (!yaml) return apiError('Form tidak ditemukan.', 'NOT_FOUND');
    const aM = yaml.match(/^allowed_roles:\s*\[([^\]]*)\]/m);
    const allowed = aM ? aM[1].split(',').map(r => r.trim().toLowerCase()) : [];
    
    const submitterRole = payload.role === 'district' ? 'district' : 'kamad';
    if (submitterRole === 'district') {
      if (!allowed.includes('district')) return apiError('Anda tidak berhak mengisi form ini.', 'FORBIDDEN');
    } else {
      if (allowed.length > 0 && !allowed.includes('kamad')) return apiError('Anda tidak berhak mengisi form ini.', 'FORBIDDEN');
    }

    const sM = yaml.match(/^target_sheet:\s*(.+)$/m);
    const targetSheet = sM ? sM[1].trim() : formId;
    const sL = yaml.match(/^submission_limit:\s*(.+)$/m);
    const limit = sL ? parseInt(sL[1].trim()) : -1;

    const ss = SpreadsheetApp.openById(APP_DB_ID);
    let sheet = ss.getSheetByName(targetSheet);
    if (!sheet) sheet = ss.insertSheet(targetSheet);
    const timestamp = new Date().toISOString();
    const flat = sanitizeObject(data);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['timestamp', 'nsm', 'madrasah_nama', 'form_id', 'role', ...Object.keys(flat)]);
    }
    const hdrs = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const row = hdrs.map(h => {
      if (h === 'timestamp')     return timestamp;
      if (h === 'nsm')           return nsm;
      if (h === 'madrasah_nama') return madrasah.nama || '';
      if (h === 'form_id')       return formId;
      if (h === 'role')          return submitterRole;
      const v = flat[h];
      return typeof v === 'object' && v !== null ? JSON.stringify(v) : (v !== undefined ? v : '');
    });

    // 🌟 Respect submission limit (0 or 1) by overwriting existing row
    let overwritten = false;
    if (limit === 0 || limit === 1) {
      const nsmIdx = hdrs.indexOf('nsm');
      if (nsmIdx !== -1 && sheet.getLastRow() > 1) {
        const nsmValues = sheet.getRange(2, nsmIdx + 1, sheet.getLastRow() - 1, 1).getValues().flat();
        const formIdIdx = hdrs.indexOf('form_id');
        let existingRowIdx = -1;
        if (formIdIdx !== -1) {
          const formIdValues = sheet.getRange(2, formIdIdx + 1, sheet.getLastRow() - 1, 1).getValues().flat();
          for (let i = 0; i < nsmValues.length; i++) {
            if (String(nsmValues[i]).trim() === String(nsm).trim() && String(formIdValues[i]).trim() === String(formId).trim()) {
              existingRowIdx = i;
              break;
            }
          }
        } else {
          existingRowIdx = nsmValues.findIndex(v => String(v).trim() === String(nsm).trim());
        }

        if (existingRowIdx !== -1) {
          const rowNum = existingRowIdx + 2;
          sheet.getRange(rowNum, 1, 1, hdrs.length).setValues([row]);
          overwritten = true;
        }
      }
    }

    if (!overwritten) {
      sheet.appendRow(row);
    }

    const log = getKamadSheet(ss, 'KamadSubmissions');
    let logRowIdx = -1;
    if ((limit === 0 || limit === 1) && log.getLastRow() > 1) {
      const logValues = log.getRange(2, 1, log.getLastRow() - 1, 3).getValues();
      logRowIdx = logValues.findIndex(r => String(r[1]).trim() === String(nsm).trim() && String(r[2]).trim() === String(formId).trim());
    }

    if (logRowIdx !== -1) {
      log.getRange(logRowIdx + 2, 1).setValue(timestamp);
      log.getRange(logRowIdx + 2, 5).setValue('final');
    } else {
      log.appendRow([timestamp, nsm, formId, targetSheet, 'final']);
    }

    return apiSuccess({ timestamp }, 'Formulir berhasil disimpan.');
  } catch (e) {
    return apiError(e.toString());
  }
}

/**
 * Riwayat pengisian form oleh kamad
 */
function kamadGetSubmissionHistory(nsm) {
  try {
    const nsmStr = String(nsm).trim();
    const ss = SpreadsheetApp.openById(APP_DB_ID);
    const sheet = ss.getSheetByName('KamadSubmissions');
    if (!sheet || sheet.getLastRow() < 2) return apiSuccess([]);
    const data = sheet.getDataRange().getValues();
    const H = data[0].map(h => String(h).toLowerCase().trim());
    const iN = H.indexOf('nsm'); const iF = H.indexOf('form_id');
    const iT = H.indexOf('timestamp'); const iS = H.indexOf('status');
    const history = [];
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][iN]).trim() === nsmStr) {
        history.push({ form_id: data[i][iF], timestamp: data[i][iT], status: data[i][iS] || 'final' });
      }
    }
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return apiSuccess(history);
  } catch (e) {
    return apiError(e.toString());
  }
}

// ============================================================
// WA LINK GENERATOR (dipanggil dari Pengawas App)
// ============================================================

/**
 * Generate link setup password kamad.
 * Token berlaku 7 hari. Pengawas mendapat URL wa.me untuk diforward.
 */
function generateKamadSetupLink(nsm, requesterNip) {
  try {
    if (!nsm || !requesterNip) return apiError('NSM dan NIP pengawas wajib diisi.', 'VALIDATION');
    const nsmStr = String(nsm).trim();
    const madrasah = getMadrasahByNsm(nsmStr);
    if (!madrasah) return apiError('NSM ' + nsmStr + ' tidak ditemukan di data master.', 'NOT_FOUND');

    const token = Utilities.getUuid();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const ss = SpreadsheetApp.openById(APP_DB_ID);
    getKamadSheet(ss, 'KamadTokens').appendRow([token, nsmStr, now.toISOString(), expiresAt.toISOString(), 'false']);

    const props = PropertiesService.getScriptProperties();
    const base = props.getProperty('PENGAWAS_DEPLOYMENT_URL') || ScriptApp.getService().getUrl();
    const setupUrl = `${base}?kamad_setup_token=${token}`;
    const expStr = Utilities.formatDate(expiresAt, 'GMT+7', 'dd/MM/yyyy');
    const msg = encodeURIComponent(
      `Assalamualaikum wr. wb.\n\n` +
      `Kepada Yth. Bapak/Ibu Kepala Madrasah *${madrasah.nama}* (NSM: ${nsmStr})\n\n` +
      `Berikut link untuk mengakses *Portal Kamad* dan membuat password:\n\n` +
      `🔗 ${setupUrl}\n\n` +
      `_Link berlaku hingga ${expStr}._\n\n` +
      `Setelah klik link, silakan buat password. Login selanjutnya menggunakan NSM sebagai username.\n\nJazakumullahu khairan 🙏`
    );

    return apiSuccess({
      token, nsm: nsmStr, madrasah: madrasah.nama,
      setup_url: setupUrl, expires_at: expiresAt.toISOString(),
      text: msg,
      wa_url: `https://api.whatsapp.com/send?text=${msg}`
    }, 'Link berhasil dibuat.');
  } catch (e) {
    return apiError(e.toString());
  }
}
