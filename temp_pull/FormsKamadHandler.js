// ============================================================
// DYNAMIC FORMS KAMAD HANDLER MODULE
// ============================================================

/**
 * Mengambil rekap dashboard Madrasah (Kamad) dalam satu panggilan composite
 * @param {string|number} nsm
 * @param {string} viewerRole
 * @returns {object} Response standard dashboard data
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
      history,
      stats: { total: forms.length, filled: forms.filter(f => filledIds.has(f.id)).length }
    });
  } catch (e) {
    return apiError('Gagal memuat dashboard Kamad: ' + e.toString());
  }
}

/**
 * Daftar form tersedia untuk Kamad dengan status canFill
 * @param {string|number} nsm
 * @param {string} viewerRole
 * @returns {object} Response standard dengan list form
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
    return apiError('Gagal memuat daftar form Madrasah: ' + e.toString());
  }
}

/**
 * Mengambil detail form definition dan data prefill ter-update milik madrasah
 * @param {string} formId
 * @param {string|number} nsm
 * @returns {object} Response standard dengan formId, yaml, dan data prefill
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
      
      const ss = getAppDb_();
      const sheet = ss.getSheetByName(targetSheet);
      if (sheet && sheet.getLastRow() > 0) {
        const data = sheet.getDataRange().getValues();
        const headers = data[0].map(h => String(h).trim());
        const nsmIdx = headers.indexOf('nsm');
        if (nsmIdx !== -1) {
          // Scan dari bawah ke atas untuk mendapatkan data terbaru
          for (let i = data.length - 1; i >= 1; i--) {
            if (String(data[i][nsmIdx]).trim() === nsmStr) {
              const standardCols = ['timestamp', 'nsm', 'madrasah_nama', 'form_id', 'role'];
              for (let j = 0; j < headers.length; j++) {
                const header = headers[j];
                if (standardCols.includes(header.toLowerCase())) continue;
                let val = data[i][j];
                // Jika berbentuk string JSON (array / objek), di-parse kembali
                if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
                  try { val = JSON.parse(val); } catch(e) {}
                }
                prefill[header] = val;
              }
              break; // Hentikan scan jika sudah dapat yang terbaru
            }
          }
        }
      }
    }

    return apiSuccess({ formId, yaml, prefill });
  } catch (e) {
    return apiError('Gagal memuat definisi form Kamad: ' + e.toString());
  }
}

/**
 * Helper: Menyimpan salinan baris lama ke sheet Log yang didekasikan sebelum di-overwrite/hapus
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} targetSheetName
 * @param {Array<string>} activeHeaders
 * @param {Array<any>} rowValues
 */
function archiveRowToLog(ss, targetSheetName, activeHeaders, rowValues) {
  const logSheetName = targetSheetName + '_Log';
  let logSheet = ss.getSheetByName(logSheetName);
  if (!logSheet) {
    logSheet = ss.insertSheet(logSheetName);
    logSheet.appendRow(activeHeaders);
    logSheet.getRange(1, 1, 1, activeHeaders.length).setFontWeight('bold').setBackground('#f4cccc');
    logSheet.setFrozenRows(1);
  }
  
  // Sinkronisasi kolom log secara dinamis jika struktur berubah
  let logHeaders = logSheet.getRange(1, 1, 1, logSheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
  const missing = activeHeaders.filter(h => !logHeaders.includes(h));
  if (missing.length > 0) {
    const startCol = logHeaders.length + 1;
    logSheet.getRange(1, startCol, 1, missing.length).setValues([missing]);
    logSheet.getRange(1, startCol, 1, missing.length).setFontWeight('bold').setBackground('#f4cccc');
    logHeaders = [...logHeaders, ...missing];
  }
  
  // Petakan baris data sesuai urutan kolom log
  const logRow = logHeaders.map(h => {
    const idx = activeHeaders.indexOf(h);
    return idx !== -1 ? rowValues[idx] : '';
  });
  
  logSheet.appendRow(logRow);
}

/**
 * Mengirim dan memproses submission form Madrasah (Kamad)
 * Mendukung submission limit (0 = 1 aktif, sisanya masuk logs)
 * @param {object} payload
 * @returns {object} Response standard
 */
function kamadSubmitForm(payload) {
  try {
    const nsm    = sanitizeHtml(String(payload.nsm    || '').trim());
    const formId = sanitizeHtml(String(payload.formId || '').trim());
    let data     = payload.data || {};
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

    // Process attachments for kamad files
    data = processFormAttachments(nsm, data);

    const sM = yaml.match(/^target_sheet:\s*(.+)$/m);
    const targetSheet = sM ? sM[1].trim() : formId;
    const sL = yaml.match(/^submission_limit:\s*(.+)$/m);
    const limit = sL ? parseInt(sL[1].trim()) : -1;

    const ss = getAppDb_();
    let sheet = ss.getSheetByName(targetSheet);
    if (!sheet) sheet = ss.insertSheet(targetSheet);
    const timestamp = new Date().toISOString();
    const flat = sanitizeObject(data);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['timestamp', 'nsm', 'madrasah_nama', 'form_id', 'role', ...Object.keys(flat)]);
      sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight('bold').setBackground('#d9ead3');
      sheet.setFrozenRows(1);
    }
    const hdrs = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
    
    // Auto-Column Add (Safe) for dynamic drift
    const payloadKeys = Object.keys(flat);
    const missing = payloadKeys.filter(k => !hdrs.includes(k));
    if (missing.length > 0) {
      sheet.getRange(1, hdrs.length + 1, 1, missing.length).setValues([missing]);
      sheet.getRange(1, hdrs.length + 1, 1, missing.length).setFontWeight('bold').setBackground('#d9ead3');
      hdrs.push(...missing);
    }

    const row = hdrs.map(h => {
      if (h === 'timestamp')     return timestamp;
      if (h === 'nsm')           return nsm;
      if (h === 'madrasah_nama') return madrasah.nama || '';
      if (h === 'form_id')       return formId;
      if (h === 'role')          return submitterRole;
      const v = flat[h];
      return typeof v === 'object' && v !== null ? JSON.stringify(v) : (v !== undefined ? v : '');
    });

    // Respect submission limit (0, 1, or higher) and automatically archive older rows
    if (limit >= 0) {
      const activeLimit = limit === 0 ? 1 : limit;
      const nsmIdx = hdrs.indexOf('nsm');
      const formIdIdx = hdrs.indexOf('form_id');

      if (nsmIdx !== -1 && sheet.getLastRow() > 1) {
        const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
        const matchingRows = [];
        for (let i = 0; i < dataRange.length; i++) {
          const rowValues = dataRange[i];
          const rowNsm = String(rowValues[nsmIdx]).trim();
          const rowFormId = formIdIdx !== -1 ? String(rowValues[formIdIdx]).trim() : '';

          const nsmMatch = rowNsm === String(nsm).trim();
          const formIdMatch = formIdIdx !== -1 ? rowFormId === String(formId).trim() : true;

          if (nsmMatch && formIdMatch) {
            matchingRows.push({
              rowNum: i + 2,
              values: rowValues
            });
          }
        }

        if (matchingRows.length + 1 > activeLimit) {
          const numToArchive = (matchingRows.length + 1) - activeLimit;
          const rowsToArchive = matchingRows.slice(0, numToArchive);

          // Archive detail rows
          rowsToArchive.forEach(r => {
            archiveRowToLog(ss, targetSheet, hdrs, r.values);
          });

          // Delete detail rows from active sheet in descending order of row index
          const rowsToDelete = [...rowsToArchive].sort((a, b) => b.rowNum - a.rowNum);
          rowsToDelete.forEach(r => {
            sheet.deleteRow(r.rowNum);
          });

          // Move transaction records in KamadSubmissions to KamadSubmissions_Log
          const log = getKamadSheet(ss, 'KamadSubmissions');
          if (log.getLastRow() > 1) {
            const logData = log.getRange(2, 1, log.getLastRow() - 1, log.getLastColumn()).getValues();
            const logMatchingRows = [];
            for (let i = 0; i < logData.length; i++) {
              const rNsm = String(logData[i][1]).trim();
              const rFormId = String(logData[i][2]).trim();
              if (rNsm === String(nsm).trim() && rFormId === String(formId).trim()) {
                logMatchingRows.push({
                  rowNum: i + 2,
                  values: logData[i]
                });
              }
            }

            if (logMatchingRows.length + 1 > activeLimit) {
              const logNumToArchive = (logMatchingRows.length + 1) - activeLimit;
              const logRowsToArchive = logMatchingRows.slice(0, logNumToArchive);

              const subLogSheet = getKamadSheet(ss, 'KamadSubmissions_Log');
              logRowsToArchive.forEach(r => {
                subLogSheet.appendRow(r.values);
              });

              const logRowsToDelete = [...logRowsToArchive].sort((a, b) => b.rowNum - a.rowNum);
              logRowsToDelete.forEach(r => {
                log.deleteRow(r.rowNum);
              });
            }
          }
        }
      }
    }

    // Selalu tambahkan submission baru ke sheet yang aktif
    sheet.appendRow(row);

    const log = getKamadSheet(ss, 'KamadSubmissions');
    log.appendRow([timestamp, nsm, formId, targetSheet, 'final']);

    return apiSuccess({ timestamp }, 'Formulir berhasil disimpan.');
  } catch (e) {
    return apiError('Gagal submit form Kamad: ' + e.toString());
  }
}

/**
 * Riwayat pengisian form oleh kamad
 * @param {string|number} nsm
 * @returns {object} Response standard
 */
function kamadGetSubmissionHistory(nsm) {
  try {
    const nsmStr = String(nsm).trim();
    const ss = getAppDb_();
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
    return apiSuccess(history);
  } catch (e) {
    return apiError('Gagal mengambil riwayat Kamad: ' + e.toString());
  }
}
