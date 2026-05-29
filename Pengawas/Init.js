/**
 * SETUP AWAL DATABASE PENGAWAS
 * Run function ini sekali saja untuk menyiapkan struktur Sheet dan Folder
 */

const DB_ID = '1sIIdTzW_vBQJZoizefj_6tWBrHib1OOo2TbUPPZsDYw';

function onOpen(e) {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🛠️ Menu Pengawas')
    .addItem('▶️ Jalankan Setup Awal', 'SetupAwal')
    .addToUi();
}

function SetupAwal() {
  const ss = SpreadsheetApp.openById(DB_ID);
  
  // 1. Setup Sheet Users
  setupSheet(ss, 'Users', ['NIP', 'Password', 'Status']);
  
  // 2. Setup Sheet Profil
  setupSheet(ss, 'Profil', [
    'NIP', 'Nama', 'Kelamin', 'Golongan', 'Provinsi', 'Kabupaten', 
    'Jenjang', 'WA', 'Email', 'Alamat', 
    'Tempat Lahir', 'Tanggal Lahir', 'Foto URL'
  ]);
  
  // 3. Setup Sheet Sasaran
  try {
    const ssMaster = SpreadsheetApp.openById(MASTER_MADRASAH_DB_ID);
    const headersMaster = ssMaster.getSheets()[0].getDataRange().getValues()[0] || [];
    setupSheet(ss, 'Sasaran', ['NIP Pengawas', 'Waktu Simpan', ...headersMaster]);
  } catch(e) {
    setupSheet(ss, 'Sasaran', ['NIP Pengawas', 'Waktu Simpan', 'NSM', 'Nama_Madrasah']); // Fallback
  }
  
  // 4. Setup Sheet Form_Responses (untuk form dinamis YAML)
  setupSheet(ss, 'Form_Responses', [
    'Submission_ID', 'Timestamp', 'NIP', 'Form_ID',
    'NSM_Madrasah', 'Status', 'Data_JSON'
  ]);
  
  // 5. Setup Sheet Settings
  const sheetSettings = setupSheet(ss, 'Settings', ['Key', 'Value']);
  // Insert default setting for SK Counter if not exists
  let dataSettings = sheetSettings.getDataRange().getValues();
  let hasCounter = dataSettings.some(row => row[0] === 'SK_COUNTER');
  if (!hasCounter) {
    sheetSettings.appendRow(['SK_COUNTER', 0]);
    sheetSettings.appendRow(['PHOTO_FOLDER_ID', '']); // Will be updated below
  }
  
  // 6. Setup Drive Folder for Photos
  let folderId = getSetting('PHOTO_FOLDER_ID');
  if (!folderId) {
    // Create folder in the root of Drive
    let folder = DriveApp.createFolder('Pengawas_Photos_Uploads');
    // Set permission to anyone with link can view (so it can be displayed in img src)
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Save folder ID to settings
    updateSetting('PHOTO_FOLDER_ID', folder.getId());
    Logger.log('Folder for photos created: ' + folder.getId());
  }

  // Bersihkan sheet 'Sheet1' bawaan jika masih ada
  let sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1) {
    ss.deleteSheet(sheet1);
  }

  // 7. Sinkronisasi otomatis seluruh target sheet YAML forms
  try {
    syncPengawasFormSheets(ss);
    Logger.log('Sinkronisasi target sheet YAML forms berhasil!');
  } catch(e) {
    Logger.log('Error sinkronisasi target sheet YAML: ' + e.toString());
  }
  
  Logger.log('Setup Selesai!');
}

function setupSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  // Set header if empty
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    // Style the header
    sheet.getRange(1, 1, 1, headers.length)
         .setFontWeight('bold')
         .setBackground('#d9ead3');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Sinkronisasi otomatis target sheet dan sub-tabel YAML forms dari getPengawasForms
 */
function syncPengawasFormSheets(ss) {
  const forms = getPengawasForms();
  const formIds = Object.keys(forms);
  
  formIds.forEach(formId => {
    const yaml = forms[formId] || '';
    const match = yaml.match(/target_sheet:\s*(['"]?)([^'"\n\r]+)\1/);
    const targetSheetName = match ? match[2].trim() : null;
    
    if (targetSheetName) {
      // 1. Dapatkan kolom-kolom pertanyaan dari YAML
      const tableFields = extractTableFieldsFromYAML(yaml);
      const nestedColumns = new Set();
      tableFields.forEach(tf => {
        tf.columns.forEach(col => nestedColumns.add(col));
      });
      
      const desiredFields = ['submission_id', 'madrasah_id', 'timestamp', 'username'];
      const fieldRegex = /name:\s*(['"]?)([^'"\n\r]+)\1/g;
      let m;
      while ((m = fieldRegex.exec(yaml)) !== null) {
        const name = m[2].trim();
        if (!desiredFields.includes(name) && !nestedColumns.has(name)) {
          desiredFields.push(name);
        }
      }
      
      // 2. Setup sheet utama
      setupSheet(ss, targetSheetName, desiredFields);
      
      // Jika ada perubahan kolom di YAML, sync target sheet (tambah kolom baru di kanan)
      let tSheet = ss.getSheetByName(targetSheetName);
      if (tSheet && tSheet.getLastRow() > 0) {
        const currentHeaders = tSheet.getRange(1, 1, 1, tSheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
        const missing = desiredFields.filter(f => !currentHeaders.includes(f));
        if (missing.length > 0) {
          tSheet.getRange(1, currentHeaders.length + 1, 1, missing.length).setValues([missing]);
          tSheet.getRange(1, currentHeaders.length + 1, 1, missing.length)
                .setFontWeight('bold')
                .setBackground('#d9ead3');
        }
      }
      
      // 3. Setup sheet sub-tabel terpisah untuk field bertipe tabel
      tableFields.forEach(tableField => {
        const tableSheetName = `${targetSheetName}|${tableField.name}`;
        const tableHeaders = ['submission_id', 'madrasah_id', 'timestamp'];
        if (tableField.type === 'table_col_fix') {
          const firstColName = tableField.firstColLabel || 'row_label';
          tableHeaders.push(firstColName);
        }
        tableHeaders.push(...tableField.columns);
        
        setupSheet(ss, tableSheetName, tableHeaders);
        
        // Sync sub-sheet tabel jika ada kolom baru
        let tblSheet = ss.getSheetByName(tableSheetName);
        if (tblSheet && tblSheet.getLastRow() > 0) {
          const currentHeaders = tblSheet.getRange(1, 1, 1, tblSheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
          const missing = tableHeaders.filter(f => !currentHeaders.includes(f));
          if (missing.length > 0) {
            tblSheet.getRange(1, currentHeaders.length + 1, 1, missing.length).setValues([missing]);
            tblSheet.getRange(1, currentHeaders.length + 1, 1, missing.length)
                  .setFontWeight('bold')
                  .setBackground('#d9ead3');
          }
        }
      });
    }
  });
}

// --- Utility Functions for Settings ---
function getSetting(key) {
  const ss = SpreadsheetApp.openById(DB_ID);
  const sheet = ss.getSheetByName('Settings');
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) return data[i][1];
  }
  return null;
}

function updateSetting(key, value) {
  const ss = SpreadsheetApp.openById(DB_ID);
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

