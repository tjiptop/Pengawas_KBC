/**
 * SETUP AWAL DATABASE PENGAWAS
 * Run function ini sekali saja untuk menyiapkan struktur Sheet dan Folder
 */

function onOpen(e) {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🛠️ Menu Pengawas')
    .addItem('▶️ Jalankan Setup Awal', 'SetupAwal')
    .addItem('🔄 Reset Cache Madrasah', 'resetMasterCache')
    .addToUi();
}

function SetupAwal() {
  cleanDummyData_();
  const ss = getAppDb_();
  
  // 1. Setup Sheet Users
  setupSheet(ss, 'Users', ['NIP', 'Password', 'Status', 'Pelatih']);
  
  // 1b. Setup Pelatihan Sheets
  setupSheet(ss, 'Pelatihan', [
    'pelatihan_id', 'judul', 'deskripsi', 'nip_pelatih', 'provinsi', 
    'tanggal_mulai', 'tanggal_selesai', 'status', 'created_at', 'updated_at',
    'invite_code', 'invite_status', 'sertifikat_doc_id', 'kategori'
  ]);
  setupSheet(ss, 'PelatihanPeserta', [
    'pelatihan_id', 'nip_peserta', 'nama_peserta', 'kabupaten', 'status'
  ]);
  setupSheet(ss, 'PelatihanMateri', [
    'pelatihan_id', 'materi_id', 'urutan', 'judul_materi'
  ]);
  setupSheet(ss, 'PrePostSoal', [
    'soal_id', 'pelatihan_id', 'yaml_definition', 'status_pre', 'status_post', 
    'pre_dibuka_pada', 'pre_ditutup_pada', 'post_dibuka_pada', 'post_ditutup_pada'
  ]);
  setupSheet(ss, 'PrePostResponses', [
    'response_id', 'soal_id', 'pelatihan_id', 'nip_peserta', 'tipe', 
    'jawaban_json', 'skor_total', 'skor_kategori_json', 'seed', 'timestamp'
  ]);
  
  // 1c. Setup Sheets Survey, Feedback, Sertifikat
  setupSheet(ss, 'SurveyAwal', [
    'response_id', 'pelatihan_id', 'nip_peserta', 'jawaban_json', 'timestamp'
  ]);
  setupSheet(ss, 'FeedbackPelatihan', [
    'response_id', 'pelatihan_id', 'nip_peserta', 'rating_overall', 'jawaban_json', 'timestamp'
  ]);
  setupSheet(ss, 'SertifikatLog', [
    'sertifikat_id', 'pelatihan_id', 'nip_peserta', 'nama_peserta',
    'nomor_sertifikat', 'google_doc_id', 'pdf_url', 'generated_at'
  ]);

  const sheetMateriPel = setupSheet(ss, 'Materi_Pelatihan', [
    'materi_id', 'judul_materi', 'deskripsi', 'konfigurasi_template', 'konfigurasi_soal'
  ]);
  if (sheetMateriPel.getLastRow() <= 1) {

    sheetMateriPel.appendRow(['MAT-001', 'Kurikulum KBC', 'Materi tentang Kriteria Baseline Cepat untuk madrasah']);
    sheetMateriPel.appendRow(['MAT-002', 'Proses Pembelajaran KBC', 'Standar proses pembelajaran KBC di madrasah']);
    sheetMateriPel.appendRow(['MAT-003', 'Penilaian KBC', 'Standar penilaian dan evaluasi capaian belajar KBC']);
    sheetMateriPel.appendRow(['MAT-004', 'Supervisi Akademik', 'Teknik dan instrumen supervisi akademik untuk pengawas']);
  }
  
  const sheetMateri = setupSheet(ss, 'Materi', [
    'Kelompok', 'Sub Kelompok', 'Judul Materi', 'Link', 'Status'
  ]);
  if (sheetMateri.getLastRow() <= 1) {
    sheetMateri.appendRow(['KBC', 'Modul Dasar', 'Pengantar KBC', 'https://example.com/kbc1', 'Aktif']);
    sheetMateri.appendRow(['KBC', 'Modul Lanjutan', 'Strategi KBC', 'https://example.com/kbc2', 'Aktif']);
    sheetMateri.appendRow(['MAGIS', 'Materi Inti', 'Konsep MAGIS', 'https://example.com/magis1', 'Aktif']);
  }
  
  // 2. Setup Sheet Profil
  setupSheet(ss, 'Profil', [
    'NIP', 'Nama', 'Kelamin', 'Golongan', 'Provinsi', 'Kabupaten', 
    'Jenjang', 'WA', 'Email', 'Alamat', 
    'Tempat Lahir', 'Tanggal Lahir', 'Foto URL'
  ]);
  
  // 3. Setup Sheet Sasaran
  try {
    const ssMaster = getMasterDb_();
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
  }
  let hasPhotoFolder = dataSettings.some(row => row[0] === 'PHOTO_FOLDER_ID');
  if (!hasPhotoFolder) {
    sheetSettings.appendRow(['PHOTO_FOLDER_ID', '']);
  }
  // Hapus KATEGORI_PELATIHAN dari Settings jika ada
  let kategoriRowIdx = dataSettings.findIndex(row => row[0] === 'KATEGORI_PELATIHAN');
  if (kategoriRowIdx !== -1) {
    sheetSettings.deleteRow(kategoriRowIdx + 1);
  }
  
  // Buat folder templates default: KBC, MAGIS, Umum
  try {
    ['KBC', 'MAGIS', 'Umum'].forEach(kategori => {
      createKategoriTemplate_(kategori);
    });
    Logger.log('Folder templates default berhasil diinisialisasi.');
  } catch(e) {
    Logger.log('Gagal inisialisasi folder templates: ' + e.toString());
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

  // 7. Sinkronisasi otomatis seluruh target sheet YAML forms Pengawas & Kamad
  try {
    syncPengawasFormSheets(ss);
    Logger.log('Sinkronisasi target sheet YAML forms Pengawas berhasil!');
  } catch(e) {
    Logger.log('Error sinkronisasi target sheet YAML Pengawas: ' + e.toString());
  }

  try {
    syncMadrasahFormSheets(ss);
    Logger.log('Sinkronisasi target sheet YAML forms Madrasah (Kamad) berhasil!');
  } catch(e) {
    Logger.log('Error sinkronisasi target sheet YAML Madrasah: ' + e.toString());
  }
  
  Logger.log('Setup Selesai!');
}

function cleanDummyData_() {
  const ss = getAppDb_();
  
  // 1. Clear data rows from sheets (keep header row 1)
  const sheetsToClear = [
    'Pelatihan',
    'PelatihanPeserta',
    'PelatihanMateri',
    'PrePostSoal',
    'PrePostResponses',
    'SurveyAwal',
    'FeedbackPelatihan',
    'SertifikatLog'
  ];
  
  sheetsToClear.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet && sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }
  });
  
  // 2. Remove obsolete columns from sheet Pelatihan: survey_yaml, feedback_yaml, template_yaml
  const sheetPelatihan = ss.getSheetByName('Pelatihan');
  if (sheetPelatihan && sheetPelatihan.getLastRow() > 0) {
    const headers = sheetPelatihan.getRange(1, 1, 1, sheetPelatihan.getLastColumn()).getValues()[0];
    const colsToDelete = ['survey_yaml', 'feedback_yaml', 'template_yaml'];
    
    // Delete columns from right to left to avoid index shifting
    for (let i = headers.length - 1; i >= 0; i--) {
      if (colsToDelete.indexOf(headers[i]) !== -1) {
        sheetPelatihan.deleteColumn(i + 1);
      }
    }
  }
  
  // 3. Remove row KATEGORI_PELATIHAN from Settings sheet
  const sheetSettings = ss.getSheetByName('Settings');
  if (sheetSettings && sheetSettings.getLastRow() > 1) {
    const dataSettings = sheetSettings.getDataRange().getValues();
    for (let i = dataSettings.length - 1; i >= 1; i--) {
      if (String(dataSettings[i][0]).trim() === 'KATEGORI_PELATIHAN') {
        sheetSettings.deleteRow(i + 1);
      }
    }
  }
  
  // 4. Delete dummy training folders from Drive
  try {
    const parentIterator = DriveApp.getFileById(APP_DB_ID).getParents();
    const appDbFolder = parentIterator.hasNext() ? parentIterator.next() : DriveApp.getRootFolder();
    
    const pFolders = appDbFolder.getFoldersByName('pelatihan');
    if (pFolders.hasNext()) {
      const pelatihanFolder = pFolders.next();
      const subfolders = pelatihanFolder.getFolders();
      while (subfolders.hasNext()) {
        const sub = subfolders.next();
        sub.setTrashed(true); // Move to trash (safe delete)
      }
    }
  } catch(e) {
    Logger.log('Gagal membersihkan folder pelatihan di Drive: ' + e.toString());
  }
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

/**
 * Sinkronisasi otomatis target sheet dan sub-tabel YAML forms dari getMadrasahFormDefinitions
 */
function syncMadrasahFormSheets(ss) {
  const forms = getMadrasahFormDefinitions();
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
      
      const desiredFields = ['timestamp', 'nsm', 'madrasah_nama', 'form_id', 'role'];
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
  const ss = getAppDb_();
  const sheet = ss.getSheetByName('Settings');
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) return data[i][1];
  }
  return null;
}

function updateSetting(key, value) {
  const ss = getAppDb_();
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
