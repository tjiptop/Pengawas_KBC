// ============================================================
// DYNAMIC FORMS PENGAWAS HANDLER MODULE
// ============================================================

/**
 * Kembalikan daftar form yang tersedia (id + metadata) untuk Pengawas
 * @returns {object} Response standard dengan list form
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
    return apiError('Gagal mengambil daftar formulir: ' + e.toString(), 'FORMS_ERROR');
  }
}

/**
 * Kembalikan definisi YAML satu form Pengawas
 * @param {string} formId
 * @returns {object} Response standard dengan definisi YAML
 */
function apiGetFormDefinition(formId) {
  if (!formId) return apiError('Form ID tidak valid.', 'VALIDATION');
  try {
    const forms = getPengawasForms();
    if (!forms[formId]) return apiError('Form tidak ditemukan: ' + formId, 'NOT_FOUND');
    return apiSuccess({ id: formId, yaml: forms[formId] });
  } catch (e) {
    return apiError('Gagal mengambil definisi formulir: ' + e.toString(), 'FORM_DEF_ERROR');
  }
}

/**
 * Simpan submission form pengawas ke target sheet spesifik (jika ada di YAML)
 * dan simpan log rekap ke Form_Responses.
 * payload: { nip, formId, nsmMadrasah, data: {...} }
 * @param {object} payload
 * @returns {object} Response standard dengan submission ID
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

    const ss = getAppDb_();
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
    return apiError('Gagal menyimpan formulir: ' + e.toString(), 'SUBMIT_ERROR');
  }
}

/**
 * Memproses dan mengupload file base64 yang dikirim lewat form ke Drive
 * @param {string|number} nip
 * @param {object} data
 * @returns {object} Data ter-update dengan link Drive
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
            val[i] = url; // Ganti dengan Drive URL
          }
        } else if (typeof item === 'string' && item.startsWith('data:')) {
          let url = saveBase64FileToDrive(nip, item, 'attach_' + Date.now());
          if (url) {
            val[i] = url; // Ganti dengan Drive URL
          }
        }
      }
    }
    // 2. Handle single file/image objects with metadata
    else if (typeof val === 'object' && val.data && typeof val.data === 'string' && val.data.startsWith('data:')) {
      let url = saveBase64FileToDrive(nip, val.data, val.name);
      if (url) {
        data[key] = url; // Ganti dengan Drive URL
      }
    }
    // 3. Handle single raw base64 string
    else if (typeof val === 'string' && val.startsWith('data:')) {
      let url = saveBase64FileToDrive(nip, val, 'attach_' + Date.now());
      if (url) {
        data[key] = url; // Ganti dengan Drive URL
      }
    }
  }
  return data;
}

/**
 * Menyimpan data Base64 lampiran ke Drive di upload/<NIP>/attach/
 * @param {string|number} nip
 * @param {string} base64Data
 * @param {string} filename
 * @returns {string|null} URL file Drive ter-upload
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
    
    // Return direct thumbnail link for images or standard download link for other files
    let fileUrl = '';
    if (contentType.startsWith('image/')) {
      fileUrl = 'https://lh3.googleusercontent.com/d/' + fileId;
    } else {
      fileUrl = 'https://drive.google.com/uc?export=view&id=' + fileId;
    }
    
    return fileUrl;
  } catch (e) {
    console.error('Gagal menyimpan file ke Drive:', e);
    return null;
  }
}

/**
 * HELPER: Extract table field definitions dari YAML
 * @param {string} yaml
 * @returns {Array<object>} List tabel field definitions
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
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} targetSheetName
 * @param {Array<object>} tableFields
 * @param {object} processedData
 * @param {string} msgId
 * @param {string} madrasah_id
 * @param {Date} timestamp
 * @returns {Array<string>} Affected sheet names
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
 * Riwayat pengisian form untuk satu NIP pengawas (opsional filter per formId)
 * @param {string|number} nip
 * @param {string} formId
 * @returns {object} Response standard dengan list history
 */
function apiGetSubmissionHistory(nip, formId) {
  if (!nip) return apiError('NIP tidak valid.', 'VALIDATION');
  try {
    const ss = getAppDb_();
    
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
    return apiError('Gagal memuat riwayat pengisian: ' + e.toString(), 'HISTORY_ERROR');
  }
}
