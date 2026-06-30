// ============================================================
// DYNAMIC FORMS KAMAD HANDLER MODULE
// ============================================================

/**
 * Mengambil rekap dashboard Madrasah (Kamad) dalam satu panggilan composite
 * @param {string|number} nsm
 * @param {string} viewerRole
 * @returns {object} Response standard dashboard data
 */
function kamadGetDashboard(nsm, viewerRole, forceRefresh = false) {
  try {
    const nsmStr = String(nsm).trim();
    const cache = CacheService.getScriptCache();
    const cacheVer = cache.get('cache_version') || '1';
    const cacheKey = 'kamad_dash_' + nsmStr + '_' + viewerRole + '_' + cacheVer;

    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) {
        try { return JSON.parse(cached); } catch (e) { }
      }
    }

    const madrasahInfo = getMadrasahByNsm(nsmStr);
    if (!madrasahInfo) return apiError('Data madrasah tidak ditemukan: ' + nsmStr, 'NOT_FOUND');
    const formsResult = kamadGetAvailableForms(nsmStr, viewerRole);
    const forms = formsResult.success ? (formsResult.data || []) : [];
    const histResult = kamadGetSubmissionHistory(nsmStr);
    const history = histResult.success ? (histResult.data || []) : [];
    const filledIds = new Set(history.map(h => h.form_id));

    // Ambil data Kanban untuk notifikasi komentar
    const kanbanRes = kanbanGetBoardData(nsmStr);
    const kanbanData = kanbanRes.success ? (kanbanRes.data || { cards: [], comments: [] }) : { cards: [], comments: [] };

    // Fetch active delegation tokens created by this Kamad (NSM)
    const myTokens = kamadGetTokens(nsmStr);

    const res = apiSuccess({
      madrasahInfo,
      forms,
      history,
      kanbanData,
      my_tokens: myTokens,
      stats: { total: forms.length, filled: forms.filter(f => filledIds.has(f.id)).length }
    });
    try { cache.put(cacheKey, JSON.stringify(res), 1800); } catch (e) { }
    return res;
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
      const dM = yaml.match(/^enable_delegation:\s*(.+)$/m);
      const sV = yaml.match(/^subordinate_visibility:\s*(.+)$/m);
      const title = tM ? tM[1].trim() : id;
      const group = gM ? gM[1].trim() : 'Lainnya';
      const allowed = aM ? aM[1].split(',').map(r => r.trim().toLowerCase()) : [];
      const enableDelegation = dM ? dM[1].trim() === 'true' : false;
      const subordinateVisibility = sV ? sV[1].trim().toLowerCase() : 'hidden';

      let canFill = false;
      let isAllowed = false;
      if (viewerRole === 'district') {
        isAllowed = allowed.includes('district');
        canFill = isAllowed;
      } else {
        isAllowed = allowed.length === 0 || allowed.includes('madrasah') || allowed.includes('kamad');
        canFill = isAllowed;
      }

      const isVisible = isAllowed || subordinateVisibility !== 'hidden';
      const submissionLimit = sL ? parseInt(sL[1].trim()) : -1;
      return {
        id,
        title,
        group,
        canFill,
        isVisible,
        subordinate_visibility: subordinateVisibility,
        icon: ICONS[group.charAt(0)] || '📋',
        submission_limit: submissionLimit,
        enable_delegation: enableDelegation,
        allowed_roles: allowed
      };
    });

    forms.sort((a, b) => a.canFill !== b.canFill ? (a.canFill ? -1 : 1) : a.title.localeCompare(b.title));
    const visibleForms = forms.filter(f => f.isVisible);
    return apiSuccess(visibleForms);
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
function kamadGetFormDefinition(formId, nsm, submissionId = null) {
  try {
    const yaml = getMadrasahFormDefinitions()[formId];
    if (!yaml) return apiError('Form tidak ditemukan: ' + formId, 'NOT_FOUND');

    let prefill = {};
    const sL = yaml.match(/^submission_limit:\s*(.+)$/m);
    const limit = sL ? parseInt(sL[1].trim()) : -1;

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
        const timestampIdx = headers.indexOf('timestamp');
        if (nsmIdx !== -1) {
          // Scan dari bawah ke atas untuk mendapatkan data terbaru
          for (let i = data.length - 1; i >= 1; i--) {
            if (String(data[i][nsmIdx]).trim() === nsmStr) {

              let isMatch = false;
              if (submissionId) {
                // Cocokkan berdasarkan format ISO String dari timestamp
                try {
                  const rowTimestampStr = new Date(data[i][timestampIdx]).toISOString();
                  const searchTimestampStr = new Date(submissionId).toISOString();
                  if (rowTimestampStr === searchTimestampStr) {
                    isMatch = true;
                  }
                } catch (e) {
                  // Fallback string match
                  if (String(data[i][timestampIdx]).trim() === String(submissionId).trim()) {
                    isMatch = true;
                  }
                }
              } else {
                // Mode isi baru (bila limit !== 0, prefill selalu kosong)
                if (limit === 0) {
                  isMatch = true;
                }
              }

              if (isMatch) {
                const standardCols = ['timestamp', 'nsm', 'madrasah_nama', 'form_id', 'role'];
                for (let j = 0; j < headers.length; j++) {
                  const header = headers[j];
                  if (standardCols.includes(header.toLowerCase())) continue;
                  let val = data[i][j];
                  // Jika berbentuk string JSON (array / objek), di-parse kembali
                  if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
                    try { val = JSON.parse(val); } catch (e) { }
                  }
                  prefill[header] = val;
                }
                break; // Hentikan scan jika sudah cocok
              }
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
  return executeWithLock_(() => {
    try {
      const nsm = sanitizeHtml(String(payload.nsm || '').trim());
      const formId = sanitizeHtml(String(payload.formId || '').trim());
      let data = payload.data || {};
      if (!nsm || !formId) return apiError('NSM dan formId wajib diisi.', 'VALIDATION');
      const madrasah = getMadrasahByNsm(nsm);
      if (!madrasah) return apiError('NSM tidak valid.', 'NOT_FOUND');
      const definitions = getMadrasahFormDefinitions();
      const yaml = definitions[formId];
      if (!yaml) return apiError('Form tidak ditemukan.', 'NOT_FOUND');
      const aM = yaml.match(/^allowed_roles:\s*\[([^\]]*)\]/m);
      const allowed = aM ? aM[1].split(',').map(r => r.trim().toLowerCase()) : [];

      const submitterRole = payload.role === 'district' ? 'district' : 'madrasah';
      if (!payload.isTokenSubmission) {
        if (submitterRole === 'district') {
          if (!allowed.includes('district')) return apiError('Anda tidak berhak mengisi form ini.', 'FORBIDDEN');
        } else {
          if (allowed.length > 0 && !allowed.includes('madrasah') && !allowed.includes('kamad')) {
            return apiError('Anda tidak berhak mengisi form ini.', 'FORBIDDEN');
          }
        }
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
        if (h === 'timestamp') return timestamp;
        if (h === 'nsm') return nsm;
        if (h === 'madrasah_nama') return madrasah.nama || '';
        if (h === 'form_id') return formId;
        if (h === 'role') return submitterRole;
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

      // Invalidate dashboard cache
      try {
        const cache = CacheService.getScriptCache();
        const cacheVer = cache.get('cache_version') || '1';
        cache.remove('kamad_dash_' + nsm + '_district_' + cacheVer);
        cache.remove('kamad_dash_' + nsm + '_madrasah_' + cacheVer);
      } catch (e) { }

      return apiSuccess({ timestamp }, 'Formulir berhasil disimpan.');
    } catch (e) {
      return apiError('Gagal submit form Kamad: ' + e.toString());
    }
  });
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

/**
 * Fetch active delegation tokens created by a Kamad (NSM) or Supervisor NIP
 * @param {string} username
 * @returns {Array} List of active tokens
 */
function kamadGetTokens(username) {
  try {
    const ss = getAppDb_();
    const sheet = ss.getSheetByName('Survey_Tokens');
    if (!sheet) return [];

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];

    const headers = data[0].map(h => String(h).toLowerCase().trim());
    const tokenIdx = headers.indexOf('token');
    const typeIdx = headers.indexOf('type');
    const formIdIdx = headers.indexOf('form_id');
    const roleTargetIdx = headers.indexOf('role_target');
    const targetScopeIdx = headers.indexOf('target_scope');
    const startTimeIdx = headers.indexOf('start_time');
    const endTimeIdx = headers.indexOf('end_time');
    const maxUsagesIdx = headers.indexOf('max_usages');
    const currentUsagesIdx = headers.indexOf('current_usages');
    const statusIdx = headers.indexOf('status');
    const createdByIdx = headers.indexOf('created_by');

    const searchUser = String(username).trim();
    const baseUrl = getPengawasDeploymentUrl_(ss);

    const list = [];
    for (let i = 1; i < data.length; i++) {
      const createdBy = String(data[i][createdByIdx]).trim();
      if (createdBy === searchUser && String(data[i][statusIdx]) !== 'CLOSED') {
        const token = String(data[i][tokenIdx]);
        list.push({
          token: token,
          type: String(data[i][typeIdx]),
          form_id: String(data[i][formIdIdx]),
          role_target: String(data[i][roleTargetIdx]),
          target_scope: String(data[i][targetScopeIdx]),
          created_at: String(data[i][startTimeIdx]),
          expires_at: String(data[i][endTimeIdx]),
          max_usages: parseInt(data[i][maxUsagesIdx]) || 0,
          current_usages: parseInt(data[i][currentUsagesIdx]) || 0,
          status: String(data[i][statusIdx]),
          url: baseUrl ? `${baseUrl}?survey_token=${token}` : `[MADRASAH_URL_BELUM_DISET]?survey_token=${token}`
        });
      }
    }
    return list;
  } catch (e) {
    console.error('Error fetching tokens:', e);
    return [];
  }
}

/**
 * API: GENERATE SURVEY TOKEN (For Kamad / Supervisor in Pengawas Portal)
 */
function apiGenerateSurveyToken(formId, type, roleTarget, targetScope, expiryHours, requesterUsername) {
  try {
    const ss = getAppDb_();
    const requesterUsernameStr = String(requesterUsername).trim();

    // 1. Verify requester is authorized (NIP or NSM)
    let isAuthorized = false;

    // Check if requester is a Kamad (NSM)
    const kamadSheet = getKamadSheet(ss, 'KamadUsers');
    if (kamadSheet) {
      const kData = kamadSheet.getDataRange().getValues();
      const kHeaders = kData[0].map(h => String(h).toLowerCase().trim());
      const iNsm = kHeaders.indexOf('nsm');
      for (let i = 1; i < kData.length; i++) {
        if (String(kData[i][iNsm]).trim() === requesterUsernameStr) {
          isAuthorized = true;
          break;
        }
      }
    }

    // Check if requester is a Supervisor (NIP)
    if (!isAuthorized) {
      const userSheet = ss.getSheetByName('Users');
      if (userSheet) {
        const uData = userSheet.getDataRange().getValues();
        for (let i = 1; i < uData.length; i++) {
          if (String(uData[i][0]).trim() === requesterUsernameStr) {
            isAuthorized = true;
            break;
          }
        }
      }
    }

    if (!isAuthorized) {
      return { success: false, message: 'Insufficient permissions' };
    }

    // 2. Add to Survey_Tokens sheet (auto-create if missing)
    let tokenSheet = ss.getSheetByName('Survey_Tokens');
    if (!tokenSheet) {
      tokenSheet = ss.insertSheet('Survey_Tokens');
      tokenSheet.appendRow(['token', 'type', 'form_id', 'role_target', 'target_scope', 'start_time', 'end_time', 'max_usages', 'current_usages', 'status', 'created_by']);
    }

    const token = Utilities.getUuid();
    const now = new Date();
    const expiryTime = new Date(now.getTime() + (expiryHours * 60 * 60 * 1000));
    const maxUsages = 0; // 0 = unlimited

    tokenSheet.appendRow([
      token,
      type || 'INDIVIDUAL',
      formId,
      roleTarget || 'madrasah',
      targetScope,
      now.toISOString(),
      expiryTime.toISOString(),
      maxUsages,
      0, // current_usages
      'ACTIVE',
      requesterUsernameStr
    ]);

    const baseUrl = getPengawasDeploymentUrl_(ss);
    const surveyUrl = baseUrl ? `${baseUrl}?survey_token=${token}` : `[MADRASAH_URL_BELUM_DISET]?survey_token=${token}`;

    try {
      const cache = CacheService.getScriptCache();
      const cacheVer = cache.get('cache_version') || '1';
      cache.remove('kamad_dash_' + requesterUsernameStr + '_district_' + cacheVer);
      cache.remove('kamad_dash_' + requesterUsernameStr + '_madrasah_' + cacheVer);
    } catch (e) { }

    return {
      success: true,
      token: token,
      url: surveyUrl,
      expires_at: expiryTime.toISOString()
    };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * API: FETCH GENERATED TOKENS
 */
function apiFetchGeneratedTokens(username, formId) {
  try {
    const list = kamadGetTokens(username);
    return list.filter(t => t.form_id === formId);
  } catch (e) {
    return [];
  }
}

/**
 * API: CANCEL TOKEN
 */
function apiCancelToken(token, username) {
  try {
    const ss = getAppDb_();
    const sheet = ss.getSheetByName('Survey_Tokens');
    if (!sheet) return { success: false, message: 'Sheet not found' };

    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).toLowerCase().trim());
    const tokenIdx = headers.indexOf('token');
    const statusIdx = headers.indexOf('status');
    const ownerIdx = headers.indexOf('created_by');

    if (tokenIdx === -1) return { success: false, message: 'Invalid sheet schema' };

    const searchToken = String(token).trim();
    const searchUser = String(username).trim();

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][tokenIdx]).trim() === searchToken) {
        // Enforce ownership check
        if (searchUser && String(data[i][ownerIdx]).trim() !== searchUser) {
          return { success: false, message: 'Not authorized to cancel this token' };
        }

        sheet.getRange(i + 1, statusIdx + 1).setValue('CLOSED');

        try {
          const cache = CacheService.getScriptCache();
          const cacheVer = cache.get('cache_version') || '1';
          cache.remove('kamad_dash_' + searchUser + '_district_' + cacheVer);
          cache.remove('kamad_dash_' + searchUser + '_madrasah_' + cacheVer);
        } catch (e) { }

        return { success: true };
      }
    }
    return { success: false, message: 'Token not found' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * Helper to resolve Madrasah deployment URL dynamically
 */
function getMadrasahDeploymentUrl_(ss) {
  try {
    const props = PropertiesService.getScriptProperties();
    let url = props.getProperty('MADRASAH_DEPLOYMENT_URL') || props.getProperty('DEPLOYMENT_URL');
    if (url) return url;

    // Fallback: Read from App_Settings sheet in shared spreadsheet
    const db = ss || getAppDb_();
    const settingsSheet = db.getSheetByName('App_Settings');
    if (settingsSheet) {
      const data = settingsSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === 'madrasah_url') {
          return data[i][1];
        }
      }
    }
  } catch (e) {
    console.error('Error reading madrasah_url from sheet:', e);
  }
  return '';
}

/**
 * Helper to resolve Pengawas deployment URL dynamically
 */
function getPengawasDeploymentUrl_(ss) {
  try {
    const props = PropertiesService.getScriptProperties();
    // 1. Coba dari DEPLOYMENT_URL (Pengawas Web App URL)
    let url = props.getProperty('DEPLOYMENT_URL');
    if (url) return url;

    // 2. Fallback ke URL script aktif otomatis
    url = ScriptApp.getService().getUrl();
    if (url) return url;

    // 3. Fallback terakhir: Read from App_Settings sheet in spreadsheet
    const db = ss || getAppDb_();
    const settingsSheet = db.getSheetByName('App_Settings');
    if (settingsSheet) {
      const data = settingsSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === 'pengawas_url') {
          return data[i][1];
        }
      }
    }
  } catch (e) {
    console.error('Error getting Pengawas deployment URL:', e);
  }
  return '';
}

/**
 * Helper to fetch all madrasahs from Master database for lookup fields
 */
function getAllMadrasahsForLookup_() {
  try {
    const ss = getMasterDb_();
    const sheet = ss.getSheets()[0];
    const data = sheet.getDataRange().getDisplayValues();
    if (!data || data.length < 2) return [];

    const headers = data[0].map(h => String(h).trim().toUpperCase());
    const idx = name => headers.findIndex(h => h.includes(name));
    const idxNsm = idx('NSM');
    const idxNama = headers.findIndex(h => { const u = h.toUpperCase(); return u.includes('NAMA') || u === 'NAME'; });
    const idxKec = idx('KEC');
    let idxKab = headers.findIndex(h => {
      const u = h.toUpperCase();
      return u === 'KABUPATEN' || u === 'KOTA' || u === 'KABUPATEN/KOTA' || u === 'KABUPATEN_KOTA';
    });
    if (idxKab === -1) {
      idxKab = headers.findIndex(h => {
        const u = h.toUpperCase();
        if (u.includes('KODE') || u.includes('CODE') || u.includes('ID') || u.includes('NO')) return false;
        return u.includes('KAB') || u.includes('KOTA') || u === 'DISTRICT';
      });
    }
    const idxProv = idx('PROV');

    const list = [];
    for (let i = 1; i < data.length; i++) {
      const nsm = String(data[i][idxNsm]).trim();
      if (!nsm) continue;
      list.push({
        madrasah_id: nsm,
        nsm: nsm,
        name: idxNama !== -1 ? data[i][idxNama] : '',
        nama: idxNama !== -1 ? data[i][idxNama] : '',
        kecamatan: idxKec !== -1 ? data[i][idxKec] : '',
        kabupaten: idxKab !== -1 ? data[i][idxKab] : '',
        provinsi: idxProv !== -1 ? data[i][idxProv] : ''
      });
    }
    return list;
  } catch (e) {
    console.error('Error getAllMadrasahsForLookup_:', e);
    return [];
  }
}

/**
 * API: VALIDATE SURVEY TOKEN
 * Checks if token is valid, not expired, and within usage limits
 */
function apiValidateSurveyToken(token) {
  try {
    const ss = getAppDb_();
    const tokenSheet = ss.getSheetByName('Survey_Tokens');
    if (!tokenSheet) return { success: false, message: 'Token system not initialized' };

    const data = tokenSheet.getDataRange().getValues();
    if (data.length <= 1) return { success: false, message: 'Invalid token' };

    const headers = data[0].map(h => String(h).trim().toLowerCase());
    const tokenIdx = headers.indexOf('token');
    const typeIdx = headers.indexOf('type');
    const formIdIdx = headers.indexOf('form_id');
    const roleTargetIdx = headers.indexOf('role_target');
    const targetScopeIdx = headers.indexOf('target_scope');
    const startTimeIdx = headers.indexOf('start_time');
    const endTimeIdx = headers.indexOf('end_time');
    const maxUsagesIdx = headers.indexOf('max_usages');
    const currentUsagesIdx = headers.indexOf('current_usages');
    const statusIdx = headers.indexOf('status');

    let tokenData = null;
    const searchToken = String(token).trim();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][tokenIdx]).trim() === searchToken) {
        tokenData = {
          token: String(data[i][tokenIdx]).trim(),
          type: typeIdx !== -1 ? String(data[i][typeIdx]).trim() : '',
          form_id: formIdIdx !== -1 ? String(data[i][formIdIdx]).trim() : '',
          role_target: roleTargetIdx !== -1 ? String(data[i][roleTargetIdx]).trim() : '',
          target_scope: targetScopeIdx !== -1 ? String(data[i][targetScopeIdx]).trim() : '',
          start_time: startTimeIdx !== -1 ? data[i][startTimeIdx] : '',
          end_time: endTimeIdx !== -1 ? data[i][endTimeIdx] : '',
          max_usages: maxUsagesIdx !== -1 ? parseInt(data[i][maxUsagesIdx]) || 0 : 0,
          current_usages: currentUsagesIdx !== -1 ? parseInt(data[i][currentUsagesIdx]) || 0 : 0,
          status: statusIdx !== -1 ? String(data[i][statusIdx]).trim() : ''
        };
        break;
      }
    }

    if (!tokenData) {
      return { success: false, message: 'Invalid token' };
    }

    // Check status
    if (tokenData.status !== 'ACTIVE') {
      return { success: false, message: 'Token is no longer active' };
    }

    // Check expiry
    const now = new Date();
    const startTime = new Date(tokenData.start_time);
    const endTime = new Date(tokenData.end_time);

    if (now < startTime) {
      return { success: false, message: 'Token not yet active' };
    }

    if (now > endTime) {
      return { success: false, message: 'Token has expired' };
    }

    // Check usage limit
    const maxUsages = parseInt(tokenData.max_usages) || 0;
    const currentUsages = parseInt(tokenData.current_usages) || 0;

    if (maxUsages > 0 && currentUsages >= maxUsages) {
      return { success: false, message: 'Token usage limit reached' };
    }

    // Get form definition
    const formDef = getMadrasahFormDefinitions()[tokenData.form_id];
    if (!formDef) {
      return { success: false, message: 'Form not found: ' + tokenData.form_id };
    }

    // Get madrasah context for pre-fill
    let madrasahContext = null;
    if (tokenData.type === 'INDIVIDUAL' && tokenData.target_scope) {
      const mInfo = getMadrasahByNsm(tokenData.target_scope);
      if (mInfo) {
        madrasahContext = {
          ...mInfo,
          name: mInfo.nama,
          madrasah_id: mInfo.nsm
        };
      }
    }

    // Get all madrasahs for lookup
    const madrasahsList = getAllMadrasahsForLookup_();

    // Return valid token with context
    return {
      success: true,
      token: tokenData.token,
      type: tokenData.type,
      form_id: tokenData.form_id,
      form_definition: formDef,
      role_target: tokenData.role_target,
      target_scope: tokenData.target_scope,
      madrasah_context: madrasahContext,
      madrasahs: madrasahsList,
      locked_madrasah_id: tokenData.type === 'INDIVIDUAL' ? tokenData.target_scope : null
    };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * API: INCREMENT TOKEN USAGE
 * Called after successful submission via token
 */
function apiIncrementTokenUsage(token) {
  try {
    const ss = getAppDb_();
    const tokenSheet = ss.getSheetByName('Survey_Tokens');
    if (!tokenSheet) return { success: false, message: 'Sheet not found' };

    const data = tokenSheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).toLowerCase().trim());
    const tokenIdx = headers.indexOf('token');
    const usageIdx = headers.indexOf('current_usages');
    const maxIdx = headers.indexOf('max_usages');
    const statusIdx = headers.indexOf('status');

    if (tokenIdx === -1 || usageIdx === -1) return { success: false, message: 'Invalid sheet schema' };

    const searchToken = String(token).trim();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][tokenIdx]).trim() === searchToken) {
        const currentUsages = parseInt(data[i][usageIdx]) || 0;
        const maxUsages = parseInt(data[i][maxIdx]) || 0;
        const newUsages = currentUsages + 1;

        tokenSheet.getRange(i + 1, usageIdx + 1).setValue(newUsages);

        // If max reached, mark as CLOSED
        if (maxUsages > 0 && newUsages >= maxUsages && statusIdx !== -1) {
          tokenSheet.getRange(i + 1, statusIdx + 1).setValue('CLOSED');
        }

        return { success: true };
      }
    }

    return { success: false, message: 'Token not found' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * API: SUBMIT SURVEY (Bypassed authentication flow)
 */
function apiSubmitSurvey(payload) {
  try {
    const token = payload.survey_token;
    if (!token) return { success: false, message: 'Survey token is required.' };

    // 1. Validate token
    const valRes = apiValidateSurveyToken(token);
    if (!valRes.success) {
      return { success: false, message: 'Validasi token gagal: ' + valRes.message };
    }

    // 2. Map payload to kamadSubmitForm payload format
    const targetNsm = valRes.locked_madrasah_id || payload.madrasah_id;
    if (!targetNsm) return { success: false, message: 'Madrasah ID (NSM) wajib diisi.' };

    const subPayload = {
      nsm: targetNsm,
      formId: valRes.form_id,
      data: payload.data,
      role: 'madrasah', // treat token user as madrasah
      isTokenSubmission: true
    };

    // 3. Call kamadSubmitForm
    const subRes = kamadSubmitForm(subPayload);
    if (!subRes.success) {
      return subRes;
    }

    // 4. Increment usage
    apiIncrementTokenUsage(token);

    return { success: true, message: 'Survey berhasil dikirim.' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}
