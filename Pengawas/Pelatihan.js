// ============================================================
// PELATIHAN (TRAINING OF TRAINERS) MODULE
// ============================================================

const MAX_PESERTA_PER_PELATIHAN = 50;

/**
 * Mendapatkan daftar pelatihan yang dibuat oleh pelatih tertentu
 * @param {string} nipPelatih
 * @returns {object} Response standard dengan daftar pelatihan
 */
function apiGetPelatihanList(nipPelatih) {
  try {
    if (!nipPelatih) return apiError('NIP Pelatih harus diisi.', 'VALIDATION');
    const ss = getAppDb_();
    
    // Read Pelatihan
    const sheetPelatihan = ss.getSheetByName('Pelatihan');
    if (!sheetPelatihan) return apiSuccess([]);
    const dataP = sheetPelatihan.getDataRange().getValues();
    const headersP = dataP[0] || [];
    const nipStr = String(nipPelatih).trim();
    
    // Indexes
    const idxId = headersP.indexOf('pelatihan_id');
    const idxJudul = headersP.indexOf('judul');
    const idxDesc = headersP.indexOf('deskripsi');
    const idxPelatih = headersP.indexOf('nip_pelatih');
    const idxProv = headersP.indexOf('provinsi');
    const idxTglMulai = headersP.indexOf('tanggal_mulai');
    const idxTglSelesai = headersP.indexOf('tanggal_selesai');
    const idxStatus = headersP.indexOf('status');
    const idxCreated = headersP.indexOf('created_at');
    
    let list = [];
    for (let i = 1; i < dataP.length; i++) {
      if (String(dataP[i][idxPelatih]).trim() === nipStr) {
        list.push({
          pelatihan_id: dataP[i][idxId],
          judul: dataP[i][idxJudul],
          deskripsi: dataP[i][idxDesc],
          nip_pelatih: dataP[i][idxPelatih],
          provinsi: dataP[i][idxProv],
          tanggal_mulai: dataP[i][idxTglMulai],
          tanggal_selesai: dataP[i][idxTglSelesai],
          status: dataP[i][idxStatus],
          created_at: dataP[i][idxCreated],
          invite_code: (headersP.indexOf('invite_code') !== -1) ? dataP[i][headersP.indexOf('invite_code')] : '',
          invite_status: (headersP.indexOf('invite_status') !== -1) ? dataP[i][headersP.indexOf('invite_status')] : ''
        });
      }
    }
    
    // Enrich with counts
    if (list.length > 0) {
      // 1. Participant count mapping
      const sheetPeserta = ss.getSheetByName('PelatihanPeserta');
      let pCounts = {};
      if (sheetPeserta && sheetPeserta.getLastRow() > 1) {
        const dataPes = sheetPeserta.getDataRange().getValues();
        const pHeaders = dataPes[0];
        const idxPId = pHeaders.indexOf('pelatihan_id');
        for (let i = 1; i < dataPes.length; i++) {
          let pid = dataPes[i][idxPId];
          pCounts[pid] = (pCounts[pid] || 0) + 1;
        }
      }
      
      // 2. Materi count mapping
      const sheetMateri = ss.getSheetByName('PelatihanMateri');
      let mCounts = {};
      if (sheetMateri && sheetMateri.getLastRow() > 1) {
        const dataMat = sheetMateri.getDataRange().getValues();
        const mHeaders = dataMat[0];
        const idxMId = mHeaders.indexOf('pelatihan_id');
        for (let i = 1; i < dataMat.length; i++) {
          let pid = dataMat[i][idxMId];
          mCounts[pid] = (mCounts[pid] || 0) + 1;
        }
      }
      
      list = list.map(item => {
        item.peserta_count = pCounts[item.pelatihan_id] || 0;
        item.materi_count = mCounts[item.pelatihan_id] || 0;
        return item;
      });
    }
    
    // Sort newest first
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return apiSuccess(list);
  } catch (e) {
    return apiError('Gagal mengambil daftar pelatihan: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Mendapatkan detail pelatihan lengkap (peserta, materi, test status)
 * @param {string} pelatihanId
 * @returns {object} Response standard dengan detail lengkap
 */
function apiGetPelatihanDetail(pelatihanId) {
  try {
    if (!pelatihanId) return apiError('ID Pelatihan harus diisi.', 'VALIDATION');
    const ss = getAppDb_();
    
    // 1. Pelatihan Detail
    const sheetPelatihan = ss.getSheetByName('Pelatihan');
    if (!sheetPelatihan) return apiError('Sheet Pelatihan tidak ada.', 'SYSTEM_ERROR');
    const dataP = sheetPelatihan.getDataRange().getValues();
    const headersP = dataP[0] || [];
    const idxId = headersP.indexOf('pelatihan_id');
    
    let pelatihan = null;
    let rowIdx = -1;
    for (let i = 1; i < dataP.length; i++) {
      if (String(dataP[i][idxId]).trim() === String(pelatihanId).trim()) {
        pelatihan = {};
        for (let j = 0; j < headersP.length; j++) {
          pelatihan[headersP[j]] = dataP[i][j];
        }
        rowIdx = i + 1;
        break;
      }
    }
    
    if (!pelatihan) return apiError('Pelatihan tidak ditemukan.', 'NOT_FOUND');

    // Backfill invite code if missing
    if (!pelatihan.invite_code || !pelatihan.invite_status) {
      let isChanged = false;
      if (!pelatihan.invite_code) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
        pelatihan.invite_code = code;
        isChanged = true;
      }
      if (!pelatihan.invite_status) {
        pelatihan.invite_status = 'open';
        isChanged = true;
      }
      
      if (isChanged) {
        // Ensure headers exist
        let idxCode = headersP.indexOf('invite_code');
        let idxStat = headersP.indexOf('invite_status');
        
        if (idxCode === -1) {
          idxCode = headersP.length;
          idxStat = headersP.length + 1;
          headersP.push('invite_code');
          headersP.push('invite_status');
          sheetPelatihan.getRange(1, idxCode + 1, 1, 2).setValues([['invite_code', 'invite_status']]);
        }
        
        sheetPelatihan.getRange(rowIdx, idxCode + 1).setValue(pelatihan.invite_code);
        sheetPelatihan.getRange(rowIdx, idxStat + 1).setValue(pelatihan.invite_status);
      }
    }
    
    // 2. Load Profiles bulk
    let profilMap = {};
    const sheetProfil = ss.getSheetByName('Profil');
    if (sheetProfil && sheetProfil.getLastRow() > 1) {
      const dtProfil = sheetProfil.getDataRange().getDisplayValues();
      const hProfil = dtProfil[0];
      const nipIdx = hProfil.indexOf('NIP');
      const kabIdx = hProfil.indexOf('Kabupaten');
      const provIdx = hProfil.indexOf('Provinsi');
      const jenjangIdx = hProfil.indexOf('Jenjang');
      const kelaminIdx = hProfil.indexOf('Kelamin');
      const namaIdx = hProfil.indexOf('Nama');
      
      for (let i = 1; i < dtProfil.length; i++) {
        let nip = String(dtProfil[i][nipIdx]).trim();
        if (nip) {
          profilMap[nip] = {
            nama: dtProfil[i][namaIdx],
            kabupaten: dtProfil[i][kabIdx],
            provinsi: dtProfil[i][provIdx],
            jenjang: dtProfil[i][jenjangIdx],
            kelamin: dtProfil[i][kelaminIdx]
          };
        }
      }
    }

    // 3. Peserta List
    let peserta = [];
    const sheetPeserta = ss.getSheetByName('PelatihanPeserta');
    if (sheetPeserta && sheetPeserta.getLastRow() > 1) {
      const dataPes = sheetPeserta.getDataRange().getValues();
      const headersPes = dataPes[0];
      const idxPid = headersPes.indexOf('pelatihan_id');
      const idxNip = headersPes.indexOf('nip_peserta');
      const idxStatus = headersPes.indexOf('status');
      
      for (let i = 1; i < dataPes.length; i++) {
        if (String(dataPes[i][idxPid]).trim() === String(pelatihanId).trim()) {
          const nip = String(dataPes[i][idxNip]).trim();
          const prof = profilMap[nip] || {};
          peserta.push({
            nip_peserta: nip,
            nama_peserta: prof.nama || dataPes[i][headersPes.indexOf('nama_peserta')],
            kabupaten: prof.kabupaten || dataPes[i][headersPes.indexOf('kabupaten')],
            status: dataPes[i][idxStatus],
            provinsi: prof.provinsi || '',
            jenjang: prof.jenjang || '',
            kelamin: prof.kelamin || ''
          });
        }
      }
    }
    
    // 3. Materi List
    let materi = [];
    const sheetMateri = ss.getSheetByName('PelatihanMateri');
    if (sheetMateri && sheetMateri.getLastRow() > 1) {
      const dataMat = sheetMateri.getDataRange().getValues();
      const headersMat = dataMat[0];
      const idxPid = headersMat.indexOf('pelatihan_id');
      const idxMatId = headersMat.indexOf('materi_id');
      const idxUrutan = headersMat.indexOf('urutan');
      const idxJudul = headersMat.indexOf('judul_materi');
      
      // Load konfigurasi from Materi_Pelatihan
      const sheetMateriRef = ss.getSheetByName('Materi_Pelatihan');
      let configMap = {};
      let soalMap = {};
      if (sheetMateriRef && sheetMateriRef.getLastRow() > 1) {
        const refData = sheetMateriRef.getDataRange().getValues();
        const refHead = refData[0];
        const refIdIdx = refHead.indexOf('materi_id');
        const refConfIdx = refHead.indexOf('konfigurasi_template');
        const refSoalIdx = refHead.indexOf('konfigurasi_soal');
        
        for (let k = 1; k < refData.length; k++) {
          const mIdStr = String(refData[k][refIdIdx]).trim();
          if (!mIdStr) continue;
          
          if (refConfIdx !== -1 && refData[k][refConfIdx]) {
            try { configMap[mIdStr] = JSON.parse(String(refData[k][refConfIdx])); } catch(e) {}
          }
          if (refSoalIdx !== -1 && refData[k][refSoalIdx]) {
            soalMap[mIdStr] = String(refData[k][refSoalIdx]);
          }
        }
      }
      
      for (let i = 1; i < dataMat.length; i++) {
        if (String(dataMat[i][idxPid]).trim() === String(pelatihanId).trim()) {
          const mId = String(dataMat[i][idxMatId]).trim();
          materi.push({
            materi_id: mId,
            urutan: Number(dataMat[i][idxUrutan]),
            judul_materi: dataMat[i][idxJudul],
            config: configMap[mId] || null,
            soalYaml: soalMap[mId] || null
          });
        }
      }
      materi.sort((a, b) => a.urutan - b.urutan);
    }
    
    // 4. Test Status (PrePostSoal)
    let test = null;
    const sheetSoal = ss.getSheetByName('PrePostSoal');
    if (sheetSoal && sheetSoal.getLastRow() > 1) {
      const dataSoal = sheetSoal.getDataRange().getValues();
      const headersSoal = dataSoal[0];
      const idxSid = headersSoal.indexOf('soal_id');
      const idxPid = headersSoal.indexOf('pelatihan_id');
      const idxYaml = headersSoal.indexOf('yaml_definition');
      const idxSPre = headersSoal.indexOf('status_pre');
      const idxSPost = headersSoal.indexOf('status_post');
      const idxPreB = headersSoal.indexOf('pre_dibuka_pada');
      const idxPreT = headersSoal.indexOf('pre_ditutup_pada');
      const idxPostB = headersSoal.indexOf('post_dibuka_pada');
      const idxPostT = headersSoal.indexOf('post_ditutup_pada');
      
      for (let i = 1; i < dataSoal.length; i++) {
        if (String(dataSoal[i][idxPid]).trim() === String(pelatihanId).trim()) {
          test = {
            soal_id: dataSoal[i][idxSid],
            yaml_definition: dataSoal[i][idxYaml],
            status_pre: dataSoal[i][idxSPre],
            status_post: dataSoal[i][idxSPost],
            pre_dibuka_pada: dataSoal[i][idxPreB],
            pre_ditutup_pada: dataSoal[i][idxPreT],
            post_dibuka_pada: dataSoal[i][idxPostB],
            post_ditutup_pada: dataSoal[i][idxPostT]
          };
          break;
        }
      }
    }
    
    return apiSuccess({
      pelatihan: pelatihan,
      peserta: peserta,
      materi: materi,
      test: test
    });
  } catch (e) {
    return apiError('Gagal mengambil detail pelatihan: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Membuat jadwal pelatihan baru
 * @param {object} payload
 * @returns {object} Response standard dengan ID pelatihan
 */
function apiCreatePelatihan(payload, sessionToken) {
  try {
    const nip = validateSession_(sessionToken);
    if (!nip) return apiError('Sesi tidak valid atau kedaluwarsa. Silakan login kembali.', 'UNAUTHORIZED');
    if (String(nip).trim() !== String(payload.nip_pelatih).trim()) {
      return apiError('NIP pelatih tidak cocok dengan sesi Anda.', 'FORBIDDEN');
    }
    if (!payload || !payload.judul || !payload.nip_pelatih || !payload.provinsi) {
      return apiError('Data judul, pelatih, dan provinsi harus diisi.', 'VALIDATION');
    }
    
    const ss = getAppDb_();
    const sheet = ss.getSheetByName('Pelatihan');
    if (!sheet) return apiError('Sheet Pelatihan tidak ditemukan.', 'SYSTEM_ERROR');
    
    const pelatihanId = 'PLT-' + Utilities.getUuid().substring(0, 8).toUpperCase();
    const timestamp = new Date().toISOString();
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let inviteCode = '';
    for (let i = 0; i < 4; i++) {
      inviteCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Ensure headers exist
    const dataP = sheet.getDataRange().getValues();
    const headersP = dataP[0] || [];
    if (headersP.indexOf('invite_code') === -1) {
      sheet.getRange(1, headersP.length + 1, 1, 2).setValues([['invite_code', 'invite_status']]);
    }
    
    const newRow = [
      pelatihanId,
      payload.judul,
      payload.deskripsi || '',
      payload.nip_pelatih,
      payload.provinsi,
      payload.tanggal_mulai || '',
      payload.tanggal_selesai || '',
      'draft', // status default
      timestamp,
      timestamp,
      inviteCode,
      'open'
    ];
    
    sheet.appendRow(newRow);
    return apiSuccess({ pelatihan_id: pelatihanId }, 'Jadwal pelatihan berhasil dibuat sebagai draft.');
  } catch (e) {
    return apiError('Gagal membuat pelatihan: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Mengubah jadwal pelatihan (hanya jika masih draft)
 * @param {string} pelatihanId
 * @param {object} payload
 * @returns {object} Response standard
 */
function apiUpdatePelatihan(pelatihanId, payload, sessionToken) {
  try {
    if (!checkPelatihanOwnership_(pelatihanId, sessionToken)) {
      return apiError('Anda tidak memiliki akses untuk mengubah pelatihan ini.', 'FORBIDDEN');
    }
    if (!pelatihanId || !payload) return apiError('Parameter tidak lengkap.', 'VALIDATION');
    const ss = getAppDb_();
    const sheet = ss.getSheetByName('Pelatihan');
    if (!sheet) return apiError('Sheet Pelatihan tidak ditemukan.', 'SYSTEM_ERROR');
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idxId = headers.indexOf('pelatihan_id');
    const idxStatus = headers.indexOf('status');
    const idxJudul = headers.indexOf('judul');
    const idxDesc = headers.indexOf('deskripsi');
    const idxProv = headers.indexOf('provinsi');
    const idxTglMulai = headers.indexOf('tanggal_mulai');
    const idxTglSelesai = headers.indexOf('tanggal_selesai');
    const idxUpdated = headers.indexOf('updated_at');
    const row = findRowIndex_(sheet, idxId, pelatihanId);
    if (row === -1) return apiError('Pelatihan tidak ditemukan.', 'NOT_FOUND');
    
    const status = String(data[row - 1][idxStatus]).trim().toLowerCase();
    if (status !== 'draft') {
      return apiError('Hanya pelatihan berstatus DRAFT yang dapat diedit.', 'INVALID_STATUS');
    }
    
    if (payload.judul) sheet.getRange(row, idxJudul + 1).setValue(payload.judul);
    if (payload.deskripsi !== undefined) sheet.getRange(row, idxDesc + 1).setValue(payload.deskripsi);
    if (payload.provinsi) sheet.getRange(row, idxProv + 1).setValue(payload.provinsi);
    if (payload.tanggal_mulai !== undefined) sheet.getRange(row, idxTglMulai + 1).setValue(payload.tanggal_mulai);
    if (payload.tanggal_selesai !== undefined) sheet.getRange(row, idxTglSelesai + 1).setValue(payload.tanggal_selesai);
    
    sheet.getRange(row, idxUpdated + 1).setValue(new Date().toISOString());
    return apiSuccess(null, 'Jadwal pelatihan berhasil diperbarui.');
  } catch (e) {
    return apiError('Gagal memperbarui pelatihan: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Menghapus pelatihan beserta data terkait (hanya jika masih draft)
 * @param {string} pelatihanId
 * @returns {object} Response standard
 */
function apiDeletePelatihan(pelatihanId, sessionToken) {
  try {
    if (!checkPelatihanOwnership_(pelatihanId, sessionToken)) {
      return apiError('Anda tidak memiliki akses untuk menghapus pelatihan ini.', 'FORBIDDEN');
    }
    if (!pelatihanId) return apiError('ID Pelatihan harus diisi.', 'VALIDATION');
    const ss = getAppDb_();
    
    // Check status
    const sheetP = ss.getSheetByName('Pelatihan');
    if (!sheetP) return apiError('Sheet Pelatihan tidak ditemukan.', 'SYSTEM_ERROR');
    const dataP = sheetP.getDataRange().getValues();
    const idxId = dataP[0].indexOf('pelatihan_id');
    const idxStatus = dataP[0].indexOf('status');
    
    const rowToDelete = findRowIndex_(sheetP, idxId, pelatihanId);
    if (rowToDelete === -1) return apiError('Pelatihan tidak ditemukan.', 'NOT_FOUND');
    const isDraft = String(dataP[rowToDelete - 1][idxStatus]).trim().toLowerCase() === 'draft';
    if (!isDraft) return apiError('Hanya pelatihan dengan status DRAFT yang bisa dihapus.', 'INVALID_STATUS');
    
    // 1. Delete Pelatihan
    sheetP.deleteRow(rowToDelete);
    
    // Helper to delete related rows from another sheet
    const deleteRelatedRows = (sheetName) => {
      const sh = ss.getSheetByName(sheetName);
      if (sh && sh.getLastRow() > 1) {
        const dt = sh.getDataRange().getValues();
        const pidIdx = dt[0].indexOf('pelatihan_id');
        if (pidIdx !== -1) {
          for (let i = dt.length - 1; i >= 1; i--) {
            if (String(dt[i][pidIdx]).trim() === String(pelatihanId).trim()) {
              sh.deleteRow(i + 1);
            }
          }
        }
      }
    };
    
    // 2. Delete PelatihanPeserta
    deleteRelatedRows('PelatihanPeserta');
    
    // 3. Delete PelatihanMateri
    deleteRelatedRows('PelatihanMateri');
    
    // 4. Delete PrePostSoal
    deleteRelatedRows('PrePostSoal');
    
    // 5. Delete PrePostResponses
    deleteRelatedRows('PrePostResponses');
    
    return apiSuccess(null, 'Pelatihan dan seluruh data terkait berhasil dihapus.');
  } catch (e) {
    return apiError('Gagal menghapus pelatihan: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Aktivasi pelatihan (draft -> aktif)
 * @param {string} pelatihanId
 * @returns {object} Response standard
 */
function apiAktivasiPelatihan(pelatihanId, sessionToken) {
  try {
    if (!checkPelatihanOwnership_(pelatihanId, sessionToken)) {
      return apiError('Anda tidak memiliki akses untuk mengaktifkan pelatihan ini.', 'FORBIDDEN');
    }
    if (!pelatihanId) return apiError('ID Pelatihan harus diisi.', 'VALIDATION');
    const ss = getAppDb_();
    
    // 1. Cek detail pelatihan
    const detailRes = apiGetPelatihanDetail(pelatihanId);
    if (!detailRes.success) return detailRes;
    
    const detail = detailRes.data;
    if (detail.pelatihan.status !== 'draft') {
      return apiError('Pelatihan sudah aktif atau selesai.', 'INVALID_STATUS');
    }
    
    // 2. Validasi jumlah peserta
    if (detail.peserta.length === 0) {
      return apiError('Pelatihan tidak dapat diaktifkan karena belum memiliki peserta.', 'VALIDATION');
    }
    
    // 3. Validasi jumlah materi
    if (detail.materi.length === 0) {
      return apiError('Pelatihan tidak dapat diaktifkan karena belum memiliki materi.', 'VALIDATION');
    }
    
    // 4. Validasi pre/post test
    if (!detail.test) {
      return apiError('Pelatihan tidak dapat diaktifkan karena Pre/Post Test belum disetup.', 'VALIDATION');
    }
    
    
    // Update status
    const sheet = ss.getSheetByName('Pelatihan');
    const data = sheet.getDataRange().getValues();
    const idxId = data[0].indexOf('pelatihan_id');
    const row = findRowIndex_(sheet, idxId, pelatihanId);
    if (row === -1) return apiError('Pelatihan tidak ditemukan.', 'NOT_FOUND');
    
    const idxStatus = data[0].indexOf('status');
    const idxUpdated = data[0].indexOf('updated_at');
    sheet.getRange(row, idxStatus + 1).setValue('aktif');
    sheet.getRange(row, idxUpdated + 1).setValue(new Date().toISOString());
    return apiSuccess(null, 'Pelatihan berhasil diaktifkan.');
  } catch (e) {
    return apiError('Gagal mengaktifkan pelatihan: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Menyelesaikan pelatihan (aktif -> selesai)
 * @param {string} pelatihanId
 * @returns {object} Response standard
 */
function apiSelesaikanPelatihan(pelatihanId, sessionToken) {
  try {
    if (!checkPelatihanOwnership_(pelatihanId, sessionToken)) {
      return apiError('Anda tidak memiliki akses untuk menyelesaikan pelatihan ini.', 'FORBIDDEN');
    }
    if (!pelatihanId) return apiError('ID Pelatihan harus diisi.', 'VALIDATION');
    const ss = getAppDb_();
    
    const sheet = ss.getSheetByName('Pelatihan');
    if (!sheet) return apiError('Sheet Pelatihan tidak ditemukan.', 'SYSTEM_ERROR');
    const data = sheet.getDataRange().getValues();
    const idxId = data[0].indexOf('pelatihan_id');
    const idxStatus = data[0].indexOf('status');
    const idxUpdated = data[0].indexOf('updated_at');
    
    const row = findRowIndex_(sheet, idxId, pelatihanId);
    if (row === -1) return apiError('Pelatihan tidak ditemukan.', 'NOT_FOUND');
    
    const curStatus = String(data[row - 1][idxStatus]).trim().toLowerCase();
    if (curStatus !== 'aktif') {
      return apiError('Hanya pelatihan aktif yang dapat diselesaikan.', 'INVALID_STATUS');
    }
    
    sheet.getRange(row, idxStatus + 1).setValue('selesai');
    sheet.getRange(row, idxUpdated + 1).setValue(new Date().toISOString());
    
    // Tutup pre & post test jika masih ada yang terbuka
    const sheetSoal = ss.getSheetByName('PrePostSoal');
    if (sheetSoal && sheetSoal.getLastRow() > 1) {
      const dataS = sheetSoal.getDataRange().getValues();
      const idxPid = dataS[0].indexOf('pelatihan_id');
      const idxSPre = dataS[0].indexOf('status_pre');
      const idxSPost = dataS[0].indexOf('status_post');
      
      const soalRow = findRowIndex_(sheetSoal, idxPid, pelatihanId);
      if (soalRow !== -1) {
        if (String(dataS[soalRow - 1][idxSPre]).trim() === 'aktif') {
          sheetSoal.getRange(soalRow, idxSPre + 1).setValue('ditutup');
        }
        if (String(dataS[soalRow - 1][idxSPost]).trim() === 'aktif') {
          sheetSoal.getRange(soalRow, idxSPost + 1).setValue('ditutup');
        }
      }
    }
    
    return apiSuccess(null, 'Pelatihan berhasil diselesaikan.');
  } catch (e) {
    return apiError('Gagal menyelesaikan pelatihan: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Menutup kode undangan pelatihan
 * @param {string} pelatihanId
 * @returns {object} Response standard
 */
function apiCloseInvitation(pelatihanId, sessionToken) {
  try {
    if (!checkPelatihanOwnership_(pelatihanId, sessionToken)) {
      return apiError('Anda tidak memiliki akses untuk menutup undangan pelatihan ini.', 'FORBIDDEN');
    }
    if (!pelatihanId) return apiError('ID Pelatihan harus diisi.', 'VALIDATION');
    const ss = getAppDb_();
    const sheet = ss.getSheetByName('Pelatihan');
    if (!sheet) return apiError('Sheet Pelatihan tidak ditemukan.', 'SYSTEM_ERROR');
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idxId = headers.indexOf('pelatihan_id');
    const idxInviteStatus = headers.indexOf('invite_status');
    const idxUpdated = headers.indexOf('updated_at');
    
    if (idxInviteStatus === -1) return apiError('Fitur kode undangan belum tersedia.', 'SYSTEM_ERROR');
    
    const row = findRowIndex_(sheet, idxId, pelatihanId);
    if (row === -1) return apiError('Pelatihan tidak ditemukan.', 'NOT_FOUND');
    
    sheet.getRange(row, idxInviteStatus + 1).setValue('closed');
    sheet.getRange(row, idxUpdated + 1).setValue(new Date().toISOString());
    return apiSuccess(null, 'Kode undangan berhasil ditutup.');
  } catch (e) {
    return apiError('Gagal menutup undangan: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Bergabung ke pelatihan menggunakan kode 4 karakter
 * @param {string} nipPeserta
 * @param {string} inviteCode
 * @returns {object} Response standard
 */
function apiJoinPelatihanByCode(nipPeserta, inviteCode) {
  try {
    if (!nipPeserta || !inviteCode) return apiError('NIP dan Kode Undangan harus diisi.', 'VALIDATION');
    const codeStr = String(inviteCode).trim().toUpperCase();
    if (codeStr.length !== 4) return apiError('Kode undangan harus 4 karakter.', 'VALIDATION');
    
    const ss = getAppDb_();
    const sheet = ss.getSheetByName('Pelatihan');
    if (!sheet) return apiError('Sheet Pelatihan tidak ditemukan.', 'SYSTEM_ERROR');
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idxId = headers.indexOf('pelatihan_id');
    const idxCode = headers.indexOf('invite_code');
    const idxStatus = headers.indexOf('invite_status');
    const idxPelatih = headers.indexOf('nip_pelatih');
    
    if (idxCode === -1 || idxStatus === -1) {
      return apiError('Kode undangan tidak valid atau belum disupport.', 'INVALID_CODE');
    }
    
    const row = findRowIndex_(sheet, idxCode, codeStr);
    if (row === -1) {
      return apiError('Kode undangan tidak ditemukan.', 'NOT_FOUND');
    }
    if (String(data[row - 1][idxStatus]).trim().toLowerCase() !== 'open') {
      return apiError('Kode undangan ini sudah ditutup oleh pelatih.', 'CLOSED_CODE');
    }
    targetPelatihanId = String(data[row - 1][idxId]).trim();
    pelatihNip = String(data[row - 1][idxPelatih]).trim();
    
    if (String(nipPeserta).trim() === pelatihNip) {
      return apiError('Anda adalah pelatih dari pelatihan ini.', 'VALIDATION');
    }
    
    // Cek apakah sudah tergabung
    const sheetPeserta = ss.getSheetByName('PelatihanPeserta');
    if (!sheetPeserta) return apiError('Sheet PelatihanPeserta tidak ditemukan.', 'SYSTEM_ERROR');
    
    const dataPes = sheetPeserta.getDataRange().getValues();
    const headersPes = dataPes[0];
    const idxPid = headersPes.indexOf('pelatihan_id');
    const idxNip = headersPes.indexOf('nip_peserta');
    
    for (let i = 1; i < dataPes.length; i++) {
      if (String(dataPes[i][idxPid]).trim() === targetPelatihanId && String(dataPes[i][idxNip]).trim() === String(nipPeserta).trim()) {
        return apiError('Anda sudah terdaftar di pelatihan ini.', 'ALREADY_JOINED');
      }
    }
    
    // Ambil profil peserta
    let namaPeserta = 'Pengawas (' + nipPeserta + ')';
    let kabPeserta = 'Lainnya';
    const sheetProfil = ss.getSheetByName('Profil');
    if (sheetProfil && sheetProfil.getLastRow() > 1) {
      const dtProfil = sheetProfil.getDataRange().getDisplayValues();
      const hProfil = dtProfil[0];
      const pNipIdx = hProfil.indexOf('NIP');
      const pNamaIdx = hProfil.indexOf('Nama');
      const pKabIdx = hProfil.indexOf('Kabupaten');
      
      const pRow = findRowIndex_(sheetProfil, pNipIdx, nipPeserta);
      if (pRow !== -1) {
        namaPeserta = dtProfil[pRow - 1][pNamaIdx] || namaPeserta;
        kabPeserta = dtProfil[pRow - 1][pKabIdx] || kabPeserta;
      }
    }
    
    sheetPeserta.appendRow([
      targetPelatihanId,
      nipPeserta,
      namaPeserta,
      kabPeserta,
      'terdaftar'
    ]);
    
    return apiSuccess({ pelatihan_id: targetPelatihanId }, 'Berhasil bergabung dengan pelatihan.');
  } catch (e) {
    return apiError('Gagal bergabung: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Mendapatkan daftar calon peserta pelatihan (seluruh pengawas di satu provinsi)
 * Hasilnya dikelompokkan berdasarkan Kabupaten (Tree Model)
 * @param {string} provinsi
 * @returns {object} Response standard dengan tree { Kabupaten: [ { NIP, Nama, Jenjang } ] }
 */
function apiGetCalonPeserta(provinsi) {
  try {
    if (!provinsi) return apiError('Provinsi harus dispesifikasi.', 'VALIDATION');
    const ss = getAppDb_();
    
    const sheetProfil = ss.getSheetByName('Profil');
    if (!sheetProfil) return apiSuccess({});
    
    const dataProfil = sheetProfil.getDataRange().getDisplayValues();
    if (dataProfil.length < 2) return apiSuccess({});
    
    const headers = dataProfil[0].map(h => String(h).trim().toUpperCase());
    const idxNip = headers.indexOf('NIP');
    const idxNama = headers.findIndex(h => h.includes('NAMA'));
    const idxProv = headers.findIndex(h => h.includes('PROVINSI'));
    const idxKab = headers.findIndex(h => h.includes('KABUPATEN'));
    const idxJenjang = headers.findIndex(h => h.includes('JENJANG'));
    
    const provLower = String(provinsi).toLowerCase().trim();
    let tree = {};
    
    for (let i = 1; i < dataProfil.length; i++) {
      const pProv = String(dataProfil[i][idxProv]).toLowerCase().trim();
      const nip = String(dataProfil[i][idxNip]).trim();
      
      // Filter by province and skip empty NIPs
      if (pProv === provLower && nip) {
        let kab = dataProfil[i][idxKab] || 'Lainnya';
        // Clean Kabupaten name a bit for keys
        kab = String(kab).trim();
        
        if (!tree[kab]) {
          tree[kab] = [];
        }
        
        tree[kab].push({
          nip: nip,
          nama: dataProfil[i][idxNama] || ('Pengawas (' + nip + ')'),
          jenjang: dataProfil[i][idxJenjang] || ''
        });
      }
    }
    
    // Sort names within each kabupaten
    Object.keys(tree).forEach(kab => {
      tree[kab].sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
    });
    
    return apiSuccess(tree);
  } catch (e) {
    return apiError('Gagal mengambil calon peserta: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Mengatur daftar peserta untuk suatu pelatihan (menyimpan/mengupdate ke sheet PelatihanPeserta)
 * @param {string} pelatihanId
 * @param {Array<string>} listNIP
 * @returns {object} Response standard
 */
function apiSetPeserta(pelatihanId, listNIP, sessionToken) {
  try {
    if (!checkPelatihanOwnership_(pelatihanId, sessionToken)) {
      return apiError('Anda tidak memiliki akses untuk mengatur peserta pelatihan ini.', 'FORBIDDEN');
    }
    if (!pelatihanId || !listNIP) return apiError('Parameter tidak lengkap.', 'VALIDATION');
    if (listNIP.length > MAX_PESERTA_PER_PELATIHAN) {
      return apiError('Jumlah peserta melebihi batas maksimal (' + MAX_PESERTA_PER_PELATIHAN + ' orang).', 'LIMIT_EXCEEDED');
    }
    
    const ss = getAppDb_();
    
    // 1. Cek status pelatihan
    const sheetP = ss.getSheetByName('Pelatihan');
    if (!sheetP) return apiError('Sheet Pelatihan tidak ditemukan.', 'SYSTEM_ERROR');
    const dataP = sheetP.getDataRange().getValues();
    const idxId = dataP[0].indexOf('pelatihan_id');
    const idxStatus = dataP[0].indexOf('status');
    
    let isSelesai = false;
    for (let i = 1; i < dataP.length; i++) {
      if (String(dataP[i][idxId]).trim() === String(pelatihanId).trim()) {
        isSelesai = String(dataP[i][idxStatus]).trim().toLowerCase() === 'selesai';
        break;
      }
    }
    if (isSelesai) {
      return apiError('Tidak dapat mengubah peserta pada pelatihan yang sudah SELESAI.', 'INVALID_STATUS');
    }
    
    // 2. Hapus peserta lama
    const sheetPeserta = ss.getSheetByName('PelatihanPeserta');
    if (!sheetPeserta) return apiError('Sheet PelatihanPeserta tidak ditemukan.', 'SYSTEM_ERROR');
    
    const dtPes = sheetPeserta.getDataRange().getValues();
    const idxPid = dtPes[0].indexOf('pelatihan_id');
    for (let i = dtPes.length - 1; i >= 1; i--) {
      if (String(dtPes[i][idxPid]).trim() === String(pelatihanId).trim()) {
        sheetPeserta.deleteRow(i + 1);
      }
    }
    
    // 3. Baca Profil untuk menyalin data profil peserta
    const sheetProfil = ss.getSheetByName('Profil');
    let profilMap = {};
    if (sheetProfil && sheetProfil.getLastRow() > 1) {
      const dtProfil = sheetProfil.getDataRange().getDisplayValues();
      const hProfil = dtProfil[0];
      const nipIdx = hProfil.indexOf('NIP');
      const namaIdx = hProfil.indexOf('Nama');
      const kabIdx = hProfil.indexOf('Kabupaten');
      
      for (let i = 1; i < dtProfil.length; i++) {
        let nip = String(dtProfil[i][nipIdx]).trim();
        if (nip) {
          profilMap[nip] = {
            nama: dtProfil[i][namaIdx] || 'Pengawas',
            kabupaten: dtProfil[i][kabIdx] || 'Lainnya'
          };
        }
      }
    }
    
    // 4. Tambah peserta baru
    if (listNIP.length > 0) {
      let rowsToInsert = [];
      for (let nip of listNIP) {
        let nipStr = String(nip).trim();
        let prof = profilMap[nipStr] || { nama: 'Pengawas (' + nipStr + ')', kabupaten: 'Lainnya' };
        rowsToInsert.push([
          pelatihanId,
          nipStr,
          prof.nama,
          prof.kabupaten,
          'terdaftar' // status default peserta
        ]);
      }
      sheetPeserta.getRange(sheetPeserta.getLastRow() + 1, 1, rowsToInsert.length, rowsToInsert[0].length).setValues(rowsToInsert);
    }
    
    return apiSuccess(null, 'Peserta pelatihan berhasil diperbarui.');
  } catch (e) {
    return apiError('Gagal mengatur peserta pelatihan: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Mengatur materi terpilih untuk suatu pelatihan
 * @param {string} pelatihanId
 * @param {Array<object>} listMateri Array dari { materi_id, judul_materi }
 * @returns {object} Response standard
 */
function apiSetMateri(pelatihanId, listMateri, sessionToken) {
  try {
    if (!checkPelatihanOwnership_(pelatihanId, sessionToken)) {
      return apiError('Anda tidak memiliki akses untuk mengatur materi pelatihan ini.', 'FORBIDDEN');
    }
    if (!pelatihanId || !listMateri) return apiError('Parameter tidak lengkap.', 'VALIDATION');
    const ss = getAppDb_();
    
    // 1. Cek status pelatihan
    const sheetP = ss.getSheetByName('Pelatihan');
    if (!sheetP) return apiError('Sheet Pelatihan tidak ditemukan.', 'SYSTEM_ERROR');
    const dataP = sheetP.getDataRange().getValues();
    const idxId = dataP[0].indexOf('pelatihan_id');
    const idxStatus = dataP[0].indexOf('status');
    
    let isSelesai = false;
    for (let i = 1; i < dataP.length; i++) {
      if (String(dataP[i][idxId]).trim() === String(pelatihanId).trim()) {
        isSelesai = String(dataP[i][idxStatus]).trim().toLowerCase() === 'selesai';
        break;
      }
    }
    if (isSelesai) {
      return apiError('Tidak dapat mengubah materi pada pelatihan yang sudah SELESAI.', 'INVALID_STATUS');
    }
    
    // 2. Hapus materi lama
    const sheetMat = ss.getSheetByName('PelatihanMateri');
    if (!sheetMat) return apiError('Sheet PelatihanMateri tidak ditemukan.', 'SYSTEM_ERROR');
    
    const dtMat = sheetMat.getDataRange().getValues();
    const idxPid = dtMat[0].indexOf('pelatihan_id');
    for (let i = dtMat.length - 1; i >= 1; i--) {
      if (String(dtMat[i][idxPid]).trim() === String(pelatihanId).trim()) {
        sheetMat.deleteRow(i + 1);
      }
    }
    
    // 3. Tambah materi baru
    if (listMateri.length > 0) {
      let rowsToInsert = [];
      for (let i = 0; i < listMateri.length; i++) {
        let item = listMateri[i];
        rowsToInsert.push([
          pelatihanId,
          item.materi_id,
          i + 1, // urutan
          item.judul_materi
        ]);
      }
      sheetMat.getRange(sheetMat.getLastRow() + 1, 1, rowsToInsert.length, rowsToInsert[0].length).setValues(rowsToInsert);
    }
    
    return apiSuccess(null, 'Materi pelatihan berhasil diperbarui.');
  } catch (e) {
    return apiError('Gagal mengatur materi pelatihan: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Mengambil daftar pelatihan yang diikuti oleh pengawas tertentu (untuk dashboard peserta)
 * @param {string} nipPeserta
 * @returns {object} Response standard dengan list pelatihan yang diikuti
 */
function apiGetPelatihanPesertaList(nipPeserta) {
  try {
    if (!nipPeserta) return apiError('NIP Peserta harus diisi.', 'VALIDATION');
    const ss = getAppDb_();
    
    const sheetPeserta = ss.getSheetByName('PelatihanPeserta');
    if (!sheetPeserta) return apiSuccess([]);
    const dataPes = sheetPeserta.getDataRange().getValues();
    if (dataPes.length < 2) return apiSuccess([]);
    
    const pHeaders = dataPes[0];
    const idxPid = pHeaders.indexOf('pelatihan_id');
    const idxNip = pHeaders.indexOf('nip_peserta');
    const nipStr = String(nipPeserta).trim();
    
    let pids = [];
    for (let i = 1; i < dataPes.length; i++) {
      if (String(dataPes[i][idxNip]).trim() === nipStr) {
        pids.push(String(dataPes[i][idxPid]).trim());
      }
    }
    
    if (pids.length === 0) return apiSuccess([]);
    
    // Fetch Pelatihan details
    const sheetPelatihan = ss.getSheetByName('Pelatihan');
    if (!sheetPelatihan) return apiSuccess([]);
    const dataP = sheetPelatihan.getDataRange().getValues();
    const headersP = dataP[0];
    
    const idxId = headersP.indexOf('pelatihan_id');
    const idxJudul = headersP.indexOf('judul');
    const idxDesc = headersP.indexOf('deskripsi');
    const idxPelatih = headersP.indexOf('nip_pelatih');
    const idxProv = headersP.indexOf('provinsi');
    const idxTglMulai = headersP.indexOf('tanggal_mulai');
    const idxTglSelesai = headersP.indexOf('tanggal_selesai');
    const idxStatus = headersP.indexOf('status');
    
    let list = [];
    for (let i = 1; i < dataP.length; i++) {
      let pId = String(dataP[i][idxId]).trim();
      if (pids.includes(pId)) {
        list.push({
          pelatihan_id: pId,
          judul: dataP[i][idxJudul],
          deskripsi: dataP[i][idxDesc],
          nip_pelatih: dataP[i][idxPelatih],
          provinsi: dataP[i][idxProv],
          tanggal_mulai: dataP[i][idxTglMulai],
          tanggal_selesai: dataP[i][idxTglSelesai],
          status: dataP[i][idxStatus]
        });
      }
    }
    
    // Sort by start date
    list.sort((a, b) => new Date(b.tanggal_mulai) - new Date(a.tanggal_mulai));
    return apiSuccess(list);
  } catch (e) {
    return apiError('Gagal mengambil daftar pelatihan peserta: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Composite API: Mengambil data pelatihan lengkap dari sudut pandang peserta
 * @param {string} pelatihanId
 * @param {string} nipPeserta
 * @returns {object} Detail pelatihan + status Pre/Post Test peserta
 */
function apiGetDashboardPelatihan(pelatihanId, nipPeserta) {
  try {
    if (!pelatihanId || !nipPeserta) return apiError('Parameter tidak lengkap.', 'VALIDATION');
    const ss = getAppDb_();
    
    // 1. Get training details, materi
    const detailRes = apiGetPelatihanDetail(pelatihanId);
    if (!detailRes.success) return detailRes;
    const detail = detailRes.data;
    
    // 2. Fetch trainer's name
    let namaPelatih = 'Pelatih';
    const trainerProfile = getProfile(detail.pelatihan.nip_pelatih);
    if (trainerProfile && trainerProfile.Nama) {
      namaPelatih = trainerProfile.Nama;
    }
    detail.pelatihan.nama_pelatih = namaPelatih;
    
    // 3. Get participant response status
    detail.test_status = {
      pretest: { completed: false, skor: 0 },
      posttest: { completed: false, skor: 0 }
    };
    
    if (detail.test) {
      const sheetResp = ss.getSheetByName('PrePostResponses');
      if (sheetResp && sheetResp.getLastRow() > 1) {
        const dataResp = sheetResp.getDataRange().getValues();
        const headersResp = dataResp[0];
        const idxPid = headersResp.indexOf('pelatihan_id');
        const idxNip = headersResp.indexOf('nip_peserta');
        const idxType = headersResp.indexOf('tipe');
        const idxSkor = headersResp.indexOf('skor_total');
        
        const nipStr = String(nipPeserta).trim();
        for (let i = 1; i < dataResp.length; i++) {
          if (String(dataResp[i][idxPid]).trim() === String(pelatihanId).trim() && 
              String(dataResp[i][idxNip]).trim() === nipStr) {
            let type = String(dataResp[i][idxType]).trim().toLowerCase();
            let skor = Number(dataResp[i][idxSkor]);
            if (type === 'pretest') {
              detail.test_status.pretest.completed = true;
              detail.test_status.pretest.skor = skor;
            } else if (type === 'posttest') {
              detail.test_status.posttest.completed = true;
              detail.test_status.posttest.skor = skor;
            }
          }
        }
      }
    }
    
    return apiSuccess(detail);
  } catch (e) {
    return apiError('Gagal memuat dashboard pelatihan peserta: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Mengambil daftar materi pelatihan dari sheet Materi_Pelatihan
 * @returns {object} Response standard dengan list materi
 */
function apiGetAvailableMateri() {
  try {
    const cache = CacheService.getScriptCache();
    const cachedAvailableMateri = cache.get('available_materi_list');
    if (cachedAvailableMateri) {
      try {
        return apiSuccess(JSON.parse(cachedAvailableMateri));
      } catch (e) {}
    }
    const ss = getAppDb_();
    const sheet = ss.getSheetByName('Materi_Pelatihan');
    if (!sheet) return apiSuccess([]);
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return apiSuccess([]);
    const headers = data[0];
    const idxId = headers.indexOf('materi_id');
    const idxJudul = headers.indexOf('judul_materi');
    const idxDesc = headers.indexOf('deskripsi');
    const idxConfig = headers.indexOf('konfigurasi_template');
    
    let list = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][idxId]) {
        let config = null;
        if (idxConfig !== -1 && data[i][idxConfig]) {
            try { config = JSON.parse(String(data[i][idxConfig])); } catch(e) {}
        }
        list.push({
          id: String(data[i][idxId]).trim(),
          title: String(data[i][idxJudul] || '').trim(),
          description: String(data[i][idxDesc] || '').trim(),
          group: 'Materi Pelatihan',
          config: config
        });
      }
    }
    try {
      cache.put('available_materi_list', JSON.stringify(list), 1800); // 30 mins
    } catch(e) {}
    return apiSuccess(list);
  } catch (e) {
    return apiError('Gagal mengambil daftar materi: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Membaca template YAML dari Google Drive untuk Materi Pelatihan
 * Jika belum ada, akan membuat struktur foldernya dan template default.
 * @param {string} materiId 
 */
function apiGetMateriYaml(materiId) {
  try {
    const ss = getAppDb_();
    const sheet = ss.getSheetByName('Materi_Pelatihan');
    if (!sheet) return apiError('Sheet Materi_Pelatihan tidak ditemukan');
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idxId = headers.indexOf('materi_id');
    const idxJudul = headers.indexOf('judul_materi');
    
    let judulMateri = '';
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idxId]).trim() === materiId) {
        judulMateri = String(data[i][idxJudul]).trim();
        break;
      }
    }
    
    if (!judulMateri) return apiError('Materi tidak ditemukan');
    
    const appDbFolder = DriveApp.getFileById(APP_DB_ID).getParents().next();
    
    // Cari atau buat folder "pelatihan"
    let pelatihanFolder;
    const pFolders = appDbFolder.getFoldersByName('pelatihan');
    if (pFolders.hasNext()) {
      pelatihanFolder = pFolders.next();
    } else {
      pelatihanFolder = appDbFolder.createFolder('pelatihan');
    }
    
    // Sanitize judul materi untuk nama folder
    const safeJudul = judulMateri.replace(/[\\/:*?"<>|]/g, "_");
    let materiFolder;
    const mFolders = pelatihanFolder.getFoldersByName(safeJudul);
    if (mFolders.hasNext()) {
      materiFolder = mFolders.next();
    } else {
      materiFolder = pelatihanFolder.createFolder(safeJudul);
    }
    
    // Cari atau buat file template.yaml
    let yamlFile;
    const yFiles = materiFolder.getFilesByName('template.yaml');
    let yamlString = '';
    if (yFiles.hasNext()) {
      yamlFile = yFiles.next();
      yamlString = yamlFile.getBlob().getDataAsString();
    } else {
      const defaultYaml = `deskripsi: "Pelatihan ini memberikan pemahaman mendalam tentang manajemen madrasah..."\npre_post_test:\n  pre_test_url: ""\n  post_test_url: ""\nlembar_kerja:\n  - judul: "LK 1: Pemetaan Masalah"\n    url: ""\nmateri:\n  - judul: "Modul Dasar Kepemimpinan"\n    url: ""\n`;
      yamlFile = materiFolder.createFile('template.yaml', defaultYaml, MimeType.PLAIN_TEXT);
      yamlString = defaultYaml;
    }
    
    // Cari atau buat file soal.yaml
    let soalFile;
    const sFiles = materiFolder.getFilesByName('soal.yaml');
    let soalYamlString = '';
    if (sFiles.hasNext()) {
      soalFile = sFiles.next();
      soalYamlString = soalFile.getBlob().getDataAsString();
    } else {
      const defaultSoal = [
        'title: "Pre/Post Test Pemahaman ' + judulMateri + '"',
        'description: "Soal evaluasi pemahaman baseline untuk pengawas"',
        'shuffle_questions: true',
        'shuffle_options: true',
        'time_limit_minutes: 30',
        '',
        'questions:',
        '  - type: radio',
        '    name: q1',
        '    label: "Pertanyaan pilihan ganda contoh:"',
        '    options:',
        '      - "Pilihan A"',
        '      - "Pilihan B"',
        '      - "Pilihan C"',
        '      - "Pilihan D"',
        '    answer: "Pilihan A"',
        '    category: "Konsep Dasar"',
        '',
        '  - type: boolean',
        '    name: q2',
        '    label: "Pernyataan benar/salah contoh."',
        '    answer: "Benar"',
        '    category: "Konsep Dasar"',
        '',
        '  - type: checkbox',
        '    name: q3',
        '    label: "Pilih semua jawaban yang benar:"',
        '    options:',
        '      - "Opsi 1"',
        '      - "Opsi 2"',
        '      - "Opsi 3"',
        '      - "Opsi 4"',
        '    answer: ["Opsi 1", "Opsi 2"]',
        '    category: "Konsep Dasar"',
        '',
        '  - type: matching',
        '    name: q4',
        '    label: "Pasangkan item di bawah ini dengan definisinya:"',
        '    pairs:',
        '      - left: "Item A"',
        '        right_options:',
        '          - "Definisi 1"',
        '          - "Definisi 2"',
        '      - left: "Item B"',
        '        right_options:',
        '          - "Definisi 1"',
        '          - "Definisi 2"',
        '    answer:',
        '      "Item A": "Definisi 1"',
        '      "Item B": "Definisi 2"',
        '    category: "Konsep Dasar"',
      ].join('\n');
      soalFile = materiFolder.createFile('soal.yaml', defaultSoal, MimeType.PLAIN_TEXT);
      soalYamlString = defaultSoal;
    }
    
    return apiSuccess({
      yaml: yamlString,
      soalYaml: soalYamlString,
      folderUrl: materiFolder.getUrl()
    });
  } catch(e) {
    return apiError('Gagal membaca YAML: ' + e.message);
  }
}

/**
 * Menyimpan konfigurasi JSON hasil sinkronisasi YAML ke Sheet Materi_Pelatihan
 * @param {string} materiId 
 * @param {string} jsonString 
 * @param {string} soalYamlString
 */
function apiSaveMateriConfig(materiId, jsonString, soalYamlString, sessionToken) {
  try {
    const nip = validateSession_(sessionToken);
    if (!nip) return apiError('Sesi tidak valid atau kedaluwarsa. Silakan login kembali.', 'UNAUTHORIZED');
    const ss = getAppDb_();
    const sheet = ss.getSheetByName('Materi_Pelatihan');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idxId = headers.indexOf('materi_id');
    let idxConfig = headers.indexOf('konfigurasi_template');
    let idxSoal = headers.indexOf('konfigurasi_soal');
    
    if (idxConfig === -1) {
      idxConfig = headers.length;
      headers.push('konfigurasi_template');
      sheet.getRange(1, idxConfig + 1).setValue('konfigurasi_template');
    }
    if (idxSoal === -1) {
      idxSoal = headers.length;
      headers.push('konfigurasi_soal');
      sheet.getRange(1, idxSoal + 1).setValue('konfigurasi_soal');
    }
    
    const rowIndex = findRowIndex_(sheet, idxId, materiId);
    if (rowIndex === -1) return apiError('Materi tidak ditemukan');
    
    sheet.getRange(rowIndex, idxConfig + 1).setValue(jsonString);
    if (soalYamlString !== undefined) {
      sheet.getRange(rowIndex, idxSoal + 1).setValue(soalYamlString);
    }
    
    try {
      const cache = CacheService.getScriptCache();
      cache.remove('available_materi_list');
    } catch(e) {}
    return apiSuccess(null, 'Berhasil sinkronisasi dan menyimpan JSON template');
  } catch(e) {
    return apiError('Gagal menyimpan konfigurasi: ' + e.message);
  }
}

/**
 * Mencari pengawas berdasarkan NIP atau Nama pada suatu provinsi
 * @param {string} provinsi 
 * @param {string} keyword 
 * @returns {object} Response standard list profil pengawas (max 20)
 */
function apiSearchPengawas(provinsi, keyword) {
  try {
    if (!provinsi || !keyword || keyword.trim() === '') return apiSuccess([]);
    const ss = getAppDb_();
    const sheetProfil = ss.getSheetByName('Profil');
    if (!sheetProfil) return apiSuccess([]);
    
    const dataProfil = sheetProfil.getDataRange().getDisplayValues();
    if (dataProfil.length < 2) return apiSuccess([]);
    
    const headers = dataProfil[0].map(h => String(h).trim().toUpperCase());
    const idxNip = headers.indexOf('NIP');
    const idxNama = headers.findIndex(h => h.includes('NAMA'));
    const idxProv = headers.findIndex(h => h.includes('PROVINSI'));
    const idxKab = headers.findIndex(h => h.includes('KABUPATEN'));
    const idxJenjang = headers.findIndex(h => h.includes('JENJANG'));
    const idxKelamin = headers.findIndex(h => h.includes('KELAMIN'));
    
    const provLower = String(provinsi).toLowerCase().trim();
    const keyLower = String(keyword).toLowerCase().trim();
    let results = [];
    
    for (let i = 1; i < dataProfil.length; i++) {
      const pProv = String(dataProfil[i][idxProv]).toLowerCase().trim();
      const nip = String(dataProfil[i][idxNip]).trim();
      const nama = String(dataProfil[i][idxNama]).trim();
      
      if (pProv === provLower && nip) {
        if (nip.toLowerCase().includes(keyLower) || nama.toLowerCase().includes(keyLower)) {
          results.push({
            nip: nip,
            nama: nama,
            kabupaten: dataProfil[i][idxKab] || '',
            jenjang: dataProfil[i][idxJenjang] || '',
            kelamin: dataProfil[i][idxKelamin] || ''
          });
          if (results.length >= 20) break; // Limit 20 results
        }
      }
    }
    
    return apiSuccess(results);
  } catch (e) {
    return apiError('Gagal mencari pengawas: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Menambahkan satu peserta ke pelatihan
 */
function apiAddPeserta(pelatihanId, nip, sessionToken) {
  try {
    if (!checkPelatihanOwnership_(pelatihanId, sessionToken)) {
      return apiError('Anda tidak memiliki akses untuk menambah peserta ke pelatihan ini.', 'FORBIDDEN');
    }
    if (!pelatihanId || !nip) return apiError('Parameter tidak lengkap', 'VALIDATION');
    const ss = getAppDb_();
    
    // Check max peserta
    const sheetPeserta = ss.getSheetByName('PelatihanPeserta');
    if (sheetPeserta) {
      const data = sheetPeserta.getDataRange().getValues();
      let count = 0;
      let alreadyExists = false;
      const idxPid = data[0].indexOf('pelatihan_id');
      const idxNip = data[0].indexOf('nip_peserta');
      
      for(let i=1; i<data.length; i++) {
        if (String(data[i][idxPid]).trim() === String(pelatihanId).trim()) {
          count++;
          if (String(data[i][idxNip]).trim() === String(nip).trim()) {
            alreadyExists = true;
          }
        }
      }
      
      if (alreadyExists) return apiError('Peserta sudah terdaftar', 'ALREADY_EXISTS');
      // MAX_PESERTA_PER_PELATIHAN is defined globally
      if (typeof MAX_PESERTA_PER_PELATIHAN !== 'undefined' && count >= MAX_PESERTA_PER_PELATIHAN) {
        return apiError('Jumlah peserta sudah maksimal (' + MAX_PESERTA_PER_PELATIHAN + ')', 'LIMIT_EXCEEDED');
      }
    }
    
    const prof = getProfile(nip);
    if (!prof) return apiError('Profil tidak ditemukan', 'NOT_FOUND');
    
    sheetPeserta.appendRow([
      pelatihanId,
      nip,
      prof.Nama || '',
      prof.Kabupaten || '',
      'aktif',
      new Date().toISOString()
    ]);
    
    return apiSuccess({ nip: nip });
  } catch (e) {
    return apiError('Gagal menambahkan peserta: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Menghapus satu peserta dari pelatihan
 */
function apiRemovePeserta(pelatihanId, nip, sessionToken) {
  try {
    if (!checkPelatihanOwnership_(pelatihanId, sessionToken)) {
      return apiError('Anda tidak memiliki akses untuk menghapus peserta dari pelatihan ini.', 'FORBIDDEN');
    }
    if (!pelatihanId || !nip) return apiError('Parameter tidak lengkap', 'VALIDATION');
    const ss = getAppDb_();
    const sheetPeserta = ss.getSheetByName('PelatihanPeserta');
    if (!sheetPeserta) return apiError('Sheet tidak ada', 'SYSTEM_ERROR');
    
    const data = sheetPeserta.getDataRange().getValues();
    const idxPid = data[0].indexOf('pelatihan_id');
    const idxNip = data[0].indexOf('nip_peserta');
    
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][idxPid]).trim() === String(pelatihanId).trim() && 
          String(data[i][idxNip]).trim() === String(nip).trim()) {
        sheetPeserta.deleteRow(i + 1);
        return apiSuccess({ nip: nip });
      }
    }
    
    return apiError('Peserta tidak ditemukan di pelatihan', 'NOT_FOUND');
  } catch(e) {
    return apiError('Gagal menghapus peserta: ' + e.toString(), 'SYSTEM_ERROR');
  }
}
