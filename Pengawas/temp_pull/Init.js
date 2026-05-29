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
    'NIP', 'Nama', 'Golongan', 'Provinsi', 'Kabupaten', 
    'Jenjang', 'WA', 'Email', 'Alamat', 
    'Tempat Lahir', 'Tanggal Lahir', 'Foto URL'
  ]);
  
  // 3. Setup Sheet Sasaran
  setupSheet(ss, 'Sasaran', ['NIP', 'NSM/NPSN', 'Nama_Madrasah', 'Timestamp']);
  
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
