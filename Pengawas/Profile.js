// ============================================================
// PROFILE & MEDIA MANAGEMENT MODULE
// ============================================================

/**
 * Mengambil profil pengawas berdasarkan NIP dari sheet Profil atau database master
 * @param {string|number} nip
 * @returns {object|null} Object profil pengawas
 */
function getProfile(nip) {
  try {
    const ss = getAppDb_();
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
  } catch (e) {
    console.error('getProfile error: ' + e.toString());
    return null;
  }
}

/**
 * Menyimpan data profil pengawas ke sheet Profil
 * @param {object} data
 * @returns {object} Response standard
 */
function saveProfile(data) {
  try {
    if (!data || !data['NIP']) return apiError('Data profil tidak valid.', 'VALIDATION');

    // Sanitasi semua field dari formula injection
    data = sanitizeObject(data);

    const ss = getAppDb_();
    const sheet = ss.getSheetByName('Profil');
    if (!sheet) return apiError('Sheet Profil tidak ditemukan.', 'SYS_ERROR');
    
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
  } catch (e) {
    return apiError('Kesalahan sistem saat menyimpan profil: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Helper untuk mendapatkan atau membuat folder
 * @param {GoogleAppsScript.Drive.Folder} parent
 * @param {string} name
 * @returns {GoogleAppsScript.Drive.Folder}
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
 * @param {string|number} nip
 * @param {string} type
 * @returns {GoogleAppsScript.Drive.Folder}
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

/**
 * Mengupload foto profil pengawas ke Drive dan mengembalikan URL publik
 * @param {string|number} nip
 * @param {string} base64Data
 * @param {string} filename
 * @returns {object} Response standard
 */
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
    // Gunakan format URL thumbnail lh3 agar bisa ditampilkan langsung di browser
    let fileId = file.getId();
    let fileUrl = 'https://lh3.googleusercontent.com/d/' + fileId;

    return apiSuccess({ url: fileUrl }, 'Foto berhasil diupload.');
  } catch (e) {
    return apiError('Gagal mengupload foto: ' + e.toString(), 'UPLOAD_ERROR');
  }
}

/**
 * Memeriksa apakah data profil pengawas sudah ada di sheet Profil
 * @param {string|number} nip
 * @returns {boolean}
 */
function isProfileSavedInSheet(nip) {
  try {
    const ss = getAppDb_();
    const sheet = ss.getSheetByName('Profil');
    if (!sheet) return false;
    
    const data = sheet.getDataRange().getValues();
    const nipStr = String(nip).trim();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() == nipStr) {
        return true;
      }
    }
    return false;
  } catch (e) {
    console.error('isProfileSavedInSheet error: ' + e.toString());
    return false;
  }
}
