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
          invite_status: (headersP.indexOf('invite_status') !== -1) ? dataP[i][headersP.indexOf('invite_status')] : '',
          kategori: (headersP.indexOf('kategori') !== -1) ? dataP[i][headersP.indexOf('kategori')] : 'Umum'
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
      
      // 2. Materi count mapping based on templates category
      let catMatCounts = {};
      try {
        const templatesFolder = getOrCreateTemplatesRoot_();
        const subfolders = templatesFolder.getFolders();
        while (subfolders.hasNext()) {
          const folder = subfolders.next();
          const catName = folder.getName();
          let mCount = 0;
          const templateFiles = folder.getFilesByName('materi.yaml');
          if (templateFiles.hasNext()) {
            const yamlStr = templateFiles.next().getBlob().getDataAsString();
            try {
              const parsed = jsyaml.load(yamlStr);
              if (parsed) {
                if (Array.isArray(parsed.materi_pelatihan)) {
                  mCount = parsed.materi_pelatihan.length;
                } else if (parsed.materi || parsed.lembar_kerja) {
                  mCount = 1;
                }
              }
            } catch(e) {}
          }
          catMatCounts[catName] = mCount;
        }
      } catch(e) {
        Logger.log('Gagal mapping materi count: ' + e.toString());
      }
      
      list = list.map(item => {
        item.peserta_count = pCounts[item.pelatihan_id] || 0;
        item.materi_count = catMatCounts[item.kategori || 'Umum'] || 0;
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
    
    ensurePelatihanExtColumns_(sheetPelatihan);
    
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
      const fotoIdx = hProfil.indexOf('Foto URL');
      
      for (let i = 1; i < dtProfil.length; i++) {
        let nip = String(dtProfil[i][nipIdx]).trim();
        if (nip) {
          profilMap[nip] = {
            nama: dtProfil[i][namaIdx],
            kabupaten: dtProfil[i][kabIdx],
            provinsi: dtProfil[i][provIdx],
            jenjang: dtProfil[i][jenjangIdx],
            kelamin: dtProfil[i][kelaminIdx],
            foto_url: fotoIdx !== -1 ? dtProfil[i][fotoIdx] : ''
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
            kelamin: prof.kelamin || '',
            foto_url: prof.foto_url || ''
          });
        }
      }
    }
    
    // 3. Materi List
    // 3. Materi List (directly from category's template.yaml)
    let materi = [];
    const kategori = String(pelatihan.kategori || 'Umum').trim();
    try {
      const templatesFolder = getOrCreateTemplatesRoot_();
      const kFolders = templatesFolder.getFoldersByName(kategori);
      if (kFolders.hasNext()) {
        const folder = kFolders.next();
        const templateFiles = folder.getFilesByName('materi.yaml');
        if (templateFiles.hasNext()) {
          const yamlStr = templateFiles.next().getBlob().getDataAsString();
          const parsed = jsyaml.load(yamlStr);
          if (parsed) {
            if (Array.isArray(parsed.materi_pelatihan)) {
              materi = parsed.materi_pelatihan.map((m, idx) => ({
                materi_id: m.materi_id || ('MAT-' + idx),
                judul_materi: m.judul_materi || 'Materi',
                urutan: idx + 1,
                config: {
                  deskripsi: m.deskripsi || '',
                  lembar_kerja: m.lembar_kerja || [],
                  materi: m.materi || []
                },
                soalYaml: null
              }));
            } else {
              materi = [{
                materi_id: 'MAT-' + kategori,
                judul_materi: 'Materi ' + kategori,
                urutan: 1,
                config: {
                  deskripsi: parsed.deskripsi || '',
                  lembar_kerja: parsed.lembar_kerja || [],
                  materi: parsed.materi || []
                },
                soalYaml: null
              }];
            }
          }
        }
      }
    } catch(e) {
      console.error('Gagal mengambil materi dari template kategori: ' + e.toString());
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
  return executeWithLock_(() => {
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
      ensurePelatihanExtColumns_(sheet);
      
      const dataP = sheet.getDataRange().getValues();
      const headersP = dataP[0] || [];
      if (headersP.indexOf('invite_code') === -1) {
        sheet.getRange(1, headersP.length + 1, 1, 2).setValues([['invite_code', 'invite_status']]);
        headersP.push('invite_code');
        headersP.push('invite_status');
      }
      
      const newRow = new Array(headersP.length).fill('');
      newRow[headersP.indexOf('pelatihan_id')] = pelatihanId;
      newRow[headersP.indexOf('judul')] = payload.judul;
      newRow[headersP.indexOf('deskripsi')] = payload.deskripsi || '';
      newRow[headersP.indexOf('nip_pelatih')] = payload.nip_pelatih;
      newRow[headersP.indexOf('provinsi')] = payload.provinsi;
      newRow[headersP.indexOf('tanggal_mulai')] = payload.tanggal_mulai || '';
      newRow[headersP.indexOf('tanggal_selesai')] = payload.tanggal_selesai || '';
      newRow[headersP.indexOf('status')] = 'draft';
      newRow[headersP.indexOf('created_at')] = timestamp;
      newRow[headersP.indexOf('updated_at')] = timestamp;
      newRow[headersP.indexOf('invite_code')] = inviteCode;
      newRow[headersP.indexOf('invite_status')] = 'open';
      if (headersP.indexOf('kategori') !== -1 && payload.kategori) {
        newRow[headersP.indexOf('kategori')] = payload.kategori;
      }
      if (headersP.indexOf('zona_waktu') !== -1 && payload.zona_waktu) {
        newRow[headersP.indexOf('zona_waktu')] = payload.zona_waktu;
      }
      
      sheet.appendRow(newRow);
      return apiSuccess({ pelatihan_id: pelatihanId }, 'Jadwal pelatihan berhasil dibuat sebagai draft.');
    } catch (e) {
      return apiError('Gagal membuat pelatihan: ' + e.toString(), 'SYSTEM_ERROR');
    }
  });
}

/**
 * Mengubah jadwal pelatihan (hanya jika masih draft)
 * @param {string} pelatihanId
 * @param {object} payload
 * @returns {object} Response standard
 */
function apiUpdatePelatihan(pelatihanId, payload, sessionToken) {
  return executeWithLock_(() => {
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
      
      ensurePelatihanExtColumns_(sheet);
      const updatedData = sheet.getDataRange().getValues();
      const updatedHeaders = updatedData[0];
      const idxKategori = updatedHeaders.indexOf('kategori');
      if (idxKategori !== -1 && payload.kategori !== undefined) {
        sheet.getRange(row, idxKategori + 1).setValue(payload.kategori);
      }
      const idxZonaWaktu = updatedHeaders.indexOf('zona_waktu');
      if (idxZonaWaktu !== -1 && payload.zona_waktu !== undefined) {
        sheet.getRange(row, idxZonaWaktu + 1).setValue(payload.zona_waktu);
      }
      
      sheet.getRange(row, idxUpdated + 1).setValue(new Date().toISOString());
      return apiSuccess(null, 'Jadwal pelatihan berhasil diperbarui.');
    } catch (e) {
      return apiError('Gagal memperbarui pelatihan: ' + e.toString(), 'SYSTEM_ERROR');
    }
  });
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
      'aktif'
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
  return executeWithLock_(() => {
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
  });
}

// apiSetMateri has been deleted.

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
    
    // 4. Calculate attendance count and total days
    const syarat = getSyaratSertifikat_(pelatihanId);
    detail.pelatihan.syarat_sertifikat = syarat;
    
    if (syarat === 'absensi_penuh') {
      const dStart = detail.pelatihan.tanggal_mulai ? new Date(detail.pelatihan.tanggal_mulai) : null;
      const dEnd = detail.pelatihan.tanggal_selesai ? new Date(detail.pelatihan.tanggal_selesai) : null;
      const allDays = [];
      if (dStart && dEnd) {
        for (let d = new Date(dStart); d <= dEnd; d.setDate(d.getDate() + 1)) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          allDays.push(y + '-' + m + '-' + dd);
        }
      }
      
      const sheetAbsen = ss.getSheetByName('PelatihanAbsensi');
      let hadirCount = 0;
      if (sheetAbsen && sheetAbsen.getLastRow() > 1 && allDays.length > 0) {
        const dataAbs = sheetAbsen.getDataRange().getValues();
        const hAbs = dataAbs[0];
        const idxAbsPid = hAbs.indexOf('pelatihan_id');
        const idxAbsNip = hAbs.indexOf('nip');
        const idxAbsDate = hAbs.indexOf('tanggal');
        
        const hadirSet = new Set();
        const nipStr = String(nipPeserta).trim();
        for (let i = 1; i < dataAbs.length; i++) {
          if (String(dataAbs[i][idxAbsPid]).trim() === String(pelatihanId).trim() &&
              String(dataAbs[i][idxAbsNip]).trim() === nipStr) {
            hadirSet.add(String(dataAbs[i][idxAbsDate]).trim().substring(0, 10));
          }
        }
        allDays.forEach(day => {
          if (hadirSet.has(day)) {
            hadirCount++;
          }
        });
      }
      
      detail.attendance_stats = {
        hadir_count: hadirCount,
        total_days: allDays.length
      };
    }
    
    return apiSuccess(detail);
  } catch (e) {
    return apiError('Gagal memuat dashboard pelatihan peserta: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

// apiGetAvailableMateri and apiGetMateriYaml have been deleted.

/**
 * Menyimpan konfigurasi JSON hasil sinkronisasi YAML ke Sheet Materi_Pelatihan
 * @param {string} materiId 
 * @param {string} jsonString 
 * @param {string} soalYamlString
 */
// apiSaveMateriConfig has been deleted.

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
      'terdaftar',
      new Date().toISOString()
    ]);
    
    return apiSuccess({ nip: nip });
  } catch (e) {
    return apiError('Gagal menambahkan peserta: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Menambahkan beberapa peserta sekaligus (bulk) ke pelatihan
 */
function apiAddPesertaBulk(pelatihanId, listNIP, sessionToken) {
  return executeWithLock_(() => {
    try {
      if (!checkPelatihanOwnership_(pelatihanId, sessionToken)) {
        return apiError('Anda tidak memiliki akses untuk menambah peserta ke pelatihan ini.', 'FORBIDDEN');
      }
      if (!pelatihanId || !listNIP || !Array.isArray(listNIP)) {
        return apiError('Parameter tidak lengkap.', 'VALIDATION');
      }
      
      const ss = getAppDb_();
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
      
      const sheetPeserta = ss.getSheetByName('PelatihanPeserta');
      if (!sheetPeserta) return apiError('Sheet PelatihanPeserta tidak ditemukan.', 'SYSTEM_ERROR');
      
      // Hitung jumlah peserta terdaftar saat ini
      const dataPes = sheetPeserta.getDataRange().getValues();
      const idxPid = dataPes[0].indexOf('pelatihan_id');
      const idxNip = dataPes[0].indexOf('nip_peserta');
      
      let currentNips = new Set();
      for (let i = 1; i < dataPes.length; i++) {
        if (String(dataPes[i][idxPid]).trim() === String(pelatihanId).trim()) {
          currentNips.add(String(dataPes[i][idxNip]).trim());
        }
      }
      
      // Filter NIP yang belum terdaftar
      const toAdd = listNIP.filter(nip => nip && !currentNips.has(String(nip).trim()));
      if (currentNips.size + toAdd.length > MAX_PESERTA_PER_PELATIHAN) {
        return apiError('Jumlah peserta melebihi batas maksimal (' + MAX_PESERTA_PER_PELATIHAN + ' orang).', 'LIMIT_EXCEEDED');
      }
      
      if (toAdd.length === 0) {
        return apiSuccess(null, 'Semua pengawas terpilih sudah terdaftar.');
      }
      
      // Ambil profile untuk NIP yang akan ditambahkan
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
              nama: dtProfil[i][namaIdx] || ('Pengawas (' + nip + ')'),
              kabupaten: dtProfil[i][kabIdx] || 'Lainnya'
            };
          }
        }
      }
      
      // Append rows
      const nowStr = new Date().toISOString();
      toAdd.forEach(nip => {
        const prof = profilMap[String(nip).trim()] || { nama: 'Pengawas (' + nip + ')', kabupaten: 'Lainnya' };
        sheetPeserta.appendRow([
          pelatihanId,
          String(nip).trim(),
          prof.nama,
          prof.kabupaten,
          'terdaftar',
          nowStr
        ]);
      });
      
      return apiSuccess(null, toAdd.length + ' peserta berhasil ditambahkan.');
    } catch (e) {
      return apiError('Gagal menambahkan peserta secara massal: ' + e.toString(), 'SYSTEM_ERROR');
    }
  });
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

/**
 * API: Menghapus beberapa peserta sekaligus dari pelatihan (bulk)
 */
function apiRemovePesertaBulk(pelatihanId, listNIP, sessionToken) {
  return executeWithLock_(() => {
    try {
      if (!checkPelatihanOwnership_(pelatihanId, sessionToken)) {
        return apiError('Anda tidak memiliki akses untuk menghapus peserta dari pelatihan ini.', 'FORBIDDEN');
      }
      if (!pelatihanId || !listNIP || !Array.isArray(listNIP)) {
        return apiError('Parameter tidak lengkap', 'VALIDATION');
      }
      
      const ss = getAppDb_();
      
      // Cek apakah pelatihan sudah SELESAI
      const sheetP = ss.getSheetByName('Pelatihan');
      if (sheetP) {
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
      }

      const sheetPeserta = ss.getSheetByName('PelatihanPeserta');
      if (!sheetPeserta) return apiError('Sheet tidak ada', 'SYSTEM_ERROR');
      
      const data = sheetPeserta.getDataRange().getValues();
      const idxPid = data[0].indexOf('pelatihan_id');
      const idxNip = data[0].indexOf('nip_peserta');
      
      const nipsToRemove = new Set(listNIP.map(nip => String(nip).trim()));
      let removedCount = 0;
      
      // Hapus baris dari bawah ke atas agar tidak merusak indeks baris
      for (let i = data.length - 1; i >= 1; i--) {
        if (String(data[i][idxPid]).trim() === String(pelatihanId).trim() && 
            nipsToRemove.has(String(data[i][idxNip]).trim())) {
          sheetPeserta.deleteRow(i + 1);
          removedCount++;
        }
      }
      
      return apiSuccess({ count: removedCount }, removedCount + ' peserta berhasil dihapus.');
    } catch(e) {
      return apiError('Gagal menghapus peserta secara massal: ' + e.toString(), 'SYSTEM_ERROR');
    }
  });
}

/**
 * Mengambil daftar kategori pelatihan dari Settings
 * @returns {object} Response standard dengan list kategori
 */
function apiGetKategoriPelatihan() {
  try {
    const res = apiGetKategoriFromTemplates();
    return res;
  } catch(e) {
    return apiError('Gagal mengambil kategori dari folder templates: ' + e.toString());
  }
}

/**
 * Helper: Mengambil atau membuat sheet PelatihanAbsensi
 */
function ensureAbsensiSheet_(ss) {
  let sheet = ss.getSheetByName('PelatihanAbsensi');
  if (!sheet) {
    sheet = ss.insertSheet('PelatihanAbsensi');
    sheet.appendRow(['pelatihan_id', 'nip', 'tanggal', 'waktu_absen', 'status_absen']);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#d9ead3');
  }
  return sheet;
}

/**
 * Helper: Mendapatkan zona waktu pelatihan dari sheet Pelatihan
 */
function getPelatihanTimezone_(ss, pelatihanId) {
  const sheet = ss.getSheetByName('Pelatihan');
  let timezone = 'Asia/Jakarta'; // default
  if (sheet) {
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idxId = headers.indexOf('pelatihan_id');
    const idxTz = headers.indexOf('zona_waktu');
    if (idxId !== -1 && idxTz !== -1) {
      const row = findRowIndex_(sheet, idxId, pelatihanId);
      if (row !== -1 && data[row - 1][idxTz]) {
        timezone = String(data[row - 1][idxTz]).trim();
      }
    }
  }
  return timezone;
}

/**
 * Helper: Mendapatkan tanggal hari ini (YYYY-MM-DD) berdasarkan zona waktu pelatihan
 */
function getPelatihanLocalTodayStr_(pelatihanId) {
  const ss = getAppDb_();
  const timezone = getPelatihanTimezone_(ss, pelatihanId);
  return Utilities.formatDate(new Date(), timezone, 'yyyy-MM-dd');
}

/**
 * Helper: Memformat nilai tanggal dari sheet (bisa berupa Date object atau string) ke format YYYY-MM-DD
 */
function formatSheetDate_(val, timezone) {
  // Always use the script/spreadsheet timezone for reading Date objects from the spreadsheet
  // to avoid date shifting caused by differing training/local timezones.
  const tz = Session.getScriptTimeZone();
  if (val instanceof Date) {
    return Utilities.formatDate(val, tz, 'yyyy-MM-dd');
  }
  const str = String(val).trim();
  if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
    return str.substring(0, 10);
  }
  return str;
}

/**
 * API: Menyimpan absensi peserta untuk suatu pelatihan dan tanggal tertentu
 */
function apiSubmitAbsensi(pelatihanId, nip, tanggal, inputtedCode) {
  return executeWithLock_(() => {
    try {
      if (!pelatihanId || !nip) return apiError('Parameter tidak lengkap.', 'VALIDATION');
      
      const targetDate = tanggal || getPelatihanLocalTodayStr_(pelatihanId);
      
      // Check config in Properties
      const key = 'absen_config_' + pelatihanId + '_' + targetDate;
      const configStr = PropertiesService.getScriptProperties().getProperty(key);
      if (!configStr) {
        return apiError('Absensi belum diaktifkan oleh pelatih untuk hari ini.', 'NOT_ACTIVATED');
      }
      
      const config = JSON.parse(configStr);
      if (config.type.endsWith('min')) {
        const minutes = parseInt(config.type.replace('min', '')) || 10;
        const elapsedMs = Date.now() - new Date(config.openedAt).getTime();
        if (elapsedMs > minutes * 60 * 1000) {
          return apiError('Kode absensi telah kedaluwarsa (batas waktu ' + minutes + ' menit habis).', 'EXPIRED');
        }
      }

      // Validasi kode absensi
      const correctCode = generateAttendanceCode_(pelatihanId, targetDate);
      if (!inputtedCode || String(inputtedCode).trim().toUpperCase() !== correctCode) {
        return apiError('Kode absensi salah atau tidak valid.', 'VALIDATION');
      }
      
      const ss = getAppDb_();
      
      // 1. Validasi kepesertaan
      const sheetPeserta = ss.getSheetByName('PelatihanPeserta');
      if (!sheetPeserta) return apiError('Sheet PelatihanPeserta tidak ditemukan.', 'SYSTEM_ERROR');
      
      const dataP = sheetPeserta.getDataRange().getValues();
      const headersP = dataP[0];
      const idxPid = headersP.indexOf('pelatihan_id');
      const idxNip = headersP.indexOf('nip_peserta');
      
      let isRegistered = false;
      for (let i = 1; i < dataP.length; i++) {
        if (String(dataP[i][idxPid]).trim() === String(pelatihanId).trim() &&
            String(dataP[i][idxNip]).trim() === String(nip).trim()) {
          isRegistered = true;
          break;
        }
      }
      if (!isRegistered) return apiError('Anda tidak terdaftar dalam pelatihan ini.', 'FORBIDDEN');
      
      // 2. Cek absensi ganda
      const sheetAbsen = ensureAbsensiSheet_(ss);
      const dataA = sheetAbsen.getDataRange().getValues();
      const headersA = dataA[0];
      const idxAPid = headersA.indexOf('pelatihan_id');
      const idxANip = headersA.indexOf('nip');
      const idxADate = headersA.indexOf('tanggal');
      
      const tz = getPelatihanTimezone_(ss, pelatihanId);
      for (let i = 1; i < dataA.length; i++) {
        const dateVal = dataA[i][idxADate];
        const dateStr = formatSheetDate_(dateVal, tz);
        
        if (String(dataA[i][idxAPid]).trim() === String(pelatihanId).trim() &&
            String(dataA[i][idxANip]).trim() === String(nip).trim() &&
            dateStr === String(targetDate).trim()) {
          return apiError('Anda sudah melakukan absensi hari ini (' + targetDate + ').', 'DUPLICATE');
        }
      }
      
      // 3. Tambahkan baris absensi
      const newRow = new Array(headersA.length).fill('');
      newRow[headersA.indexOf('pelatihan_id')] = pelatihanId;
      newRow[headersA.indexOf('nip')] = nip;
      newRow[headersA.indexOf('tanggal')] = targetDate;
      newRow[headersA.indexOf('waktu_absen')] = new Date().toISOString();
      newRow[headersA.indexOf('status_absen')] = 'Hadir';
      
      sheetAbsen.appendRow(newRow);
      return apiSuccess({ tanggal: targetDate }, 'Absensi berhasil disimpan.');
    } catch(e) {
      return apiError('Gagal memproses absensi: ' + e.toString(), 'SYSTEM_ERROR');
    }
  });
}

/**
 * API: Mendapatkan status absensi hari ini untuk peserta
 */
function apiGetTodayAbsensiStatus(pelatihanId, nip) {
  try {
    const todayStr = getPelatihanLocalTodayStr_(pelatihanId);
    const ss = getAppDb_();
    
    // Cek apakah sudah absen
    const sheetAbsen = ss.getSheetByName('PelatihanAbsensi');
    let sudahAbsen = false;
    if (sheetAbsen) {
      const dataA = sheetAbsen.getDataRange().getValues();
      const headersA = dataA[0];
      const idxAPid = headersA.indexOf('pelatihan_id');
      const idxANip = headersA.indexOf('nip');
      const idxADate = headersA.indexOf('tanggal');
      
      const tz = getPelatihanTimezone_(ss, pelatihanId);
      for (let i = 1; i < dataA.length; i++) {
        const dateVal = dataA[i][idxADate];
        const dateStr = formatSheetDate_(dateVal, tz);
        
        if (String(dataA[i][idxAPid]).trim() === String(pelatihanId).trim() &&
            String(dataA[i][idxANip]).trim() === String(nip).trim() &&
            dateStr === String(todayStr).trim()) {
          sudahAbsen = true;
          break;
        }
      }
    }
    
    if (sudahAbsen) {
      return apiSuccess({ sudah_absen: true, tanggal: todayStr });
    }
    
    // Cek status buka/aktifasi dari Properties
    const key = 'absen_config_' + pelatihanId + '_' + todayStr;
    const configStr = PropertiesService.getScriptProperties().getProperty(key);
    let statusAbsen = 'belum_mulai';
    
    if (configStr) {
      const config = JSON.parse(configStr);
      if (config.type.endsWith('min')) {
        const minutes = parseInt(config.type.replace('min', '')) || 10;
        const elapsedMs = Date.now() - new Date(config.openedAt).getTime();
        if (elapsedMs > minutes * 60 * 1000) {
          statusAbsen = 'expired';
        } else {
          statusAbsen = 'aktif';
        }
      } else {
        statusAbsen = 'aktif';
      }
    }
    
    const configParsed = configStr ? JSON.parse(configStr) : null;
    return apiSuccess({ sudah_absen: false, tanggal: todayStr, status_absen: statusAbsen, config: configParsed });
  } catch(e) {
    return apiError(e.toString());
  }
}

/**
 * API: Mengaktifkan absensi hari ini dengan pilihan masa berlaku
 */
function apiActivateAbsensi(pelatihanId, expiryType) {
  try {
    const todayStr = getPelatihanLocalTodayStr_(pelatihanId);
    
    const key = 'absen_config_' + pelatihanId + '_' + todayStr;
    const config = {
      openedAt: new Date().toISOString(),
      type: expiryType
    };
    PropertiesService.getScriptProperties().setProperty(key, JSON.stringify(config));
    
    return apiGetAbsensiRekap(pelatihanId);
  } catch (e) {
    return apiError('Gagal mengaktifkan absensi: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * API: Mendapatkan daftar NIP yang sudah hadir hari ini untuk real-time update
 */
function apiGetAbsensiToday(pelatihanId, tanggal) {
  try {
    const targetDate = tanggal || getPelatihanLocalTodayStr_(pelatihanId);
    const ss = getAppDb_();
    const tz = getPelatihanTimezone_(ss, pelatihanId);
    const sheetAbsen = ss.getSheetByName('PelatihanAbsensi');
    if (!sheetAbsen) return apiSuccess([]);
    
    const dataA = sheetAbsen.getDataRange().getValues();
    const headersA = dataA[0];
    const idxAPid = headersA.indexOf('pelatihan_id');
    const idxANip = headersA.indexOf('nip');
    const idxADate = headersA.indexOf('tanggal');
    
    const presentNips = [];
    for (let i = 1; i < dataA.length; i++) {
      const dateVal = dataA[i][idxADate];
      const dateStr = formatSheetDate_(dateVal, tz);
      
      if (String(dataA[i][idxAPid]).trim() === String(pelatihanId).trim() &&
          dateStr === String(targetDate).trim()) {
        presentNips.push(String(dataA[i][idxANip]).trim());
      }
    }
    return apiSuccess(presentNips);
  } catch(e) {
    return apiError(e.toString());
  }
}

/**
 * API: Mendapatkan rekapitulasi kehadiran lengkap (pelatih view)
 */
function apiGetAbsensiRekap(pelatihanId) {
  try {
    const ss = getAppDb_();
    
    // 1. Dapatkan daftar seluruh peserta
    const sheetPeserta = ss.getSheetByName('PelatihanPeserta');
    const sheetProfil = ss.getSheetByName('Profil');
    if (!sheetPeserta || !sheetProfil) return apiError('Sheet database peserta tidak ditemukan.', 'SYSTEM_ERROR');
    
    const dataPes = sheetPeserta.getDataRange().getValues();
    const headersPes = dataPes[0];
    const idxPPid = headersPes.indexOf('pelatihan_id');
    const idxPNip = headersPes.indexOf('nip_peserta');
    
    const registeredNips = [];
    for (let i = 1; i < dataPes.length; i++) {
      if (String(dataPes[i][idxPPid]).trim() === String(pelatihanId).trim()) {
        registeredNips.push(String(dataPes[i][idxPNip]).trim());
      }
    }
    
    const dataProf = sheetProfil.getDataRange().getValues();
    const headersProf = dataProf[0];
    const idxProfNip = headersProf.indexOf('NIP');
    const idxProfNama = headersProf.indexOf('Nama');
    
    const participants = [];
    registeredNips.forEach(nip => {
      let nama = 'Tanpa Nama';
      for (let i = 1; i < dataProf.length; i++) {
        if (String(dataProf[i][idxProfNip]).trim() === String(nip).trim()) {
          nama = dataProf[i][idxProfNama];
          break;
        }
      }
      participants.push({ nip: nip, nama: nama });
    });
    
    // 2. Dapatkan seluruh log absensi
    const sheetAbsen = ensureAbsensiSheet_(ss);
    const dataA = sheetAbsen.getDataRange().getValues();
    const headersA = dataA[0];
    const idxAPid = headersA.indexOf('pelatihan_id');
    const idxANip = headersA.indexOf('nip');
    const idxADate = headersA.indexOf('tanggal');
    
    // Filter dan cari tanggal-tanggal unik
    const tz = getPelatihanTimezone_(ss, pelatihanId);
    const uniqueDatesSet = new Set();
    const logs = [];
    for (let i = 1; i < dataA.length; i++) {
      if (String(dataA[i][idxAPid]).trim() === String(pelatihanId).trim()) {
        const dateVal = dataA[i][idxADate];
        const dateStr = formatSheetDate_(dateVal, tz);
        uniqueDatesSet.add(dateStr);
        logs.push({
          nip: String(dataA[i][idxANip]).trim(),
          tanggal: dateStr
        });
      }
    }
    
    // Urutkan tanggal
    const uniqueDates = Array.from(uniqueDatesSet).sort();
    
    // Bangun peta kehadiran
    const attendanceMap = {};
    participants.forEach(p => {
      attendanceMap[p.nip] = {};
      uniqueDates.forEach(date => {
        attendanceMap[p.nip][date] = false;
      });
    });
    
    logs.forEach(log => {
      if (attendanceMap[log.nip]) {
        attendanceMap[log.nip][log.tanggal] = true;
      }
    });
    
    // Tambahkan info zona waktu dan tanggal hari ini
    const todayStr = getPelatihanLocalTodayStr_(pelatihanId);
    const attendanceCode = generateAttendanceCode_(pelatihanId, todayStr);
    
    const configKey = 'absen_config_' + pelatihanId + '_' + todayStr;
    const configStr = PropertiesService.getScriptProperties().getProperty(configKey);
    const activeConfig = configStr ? JSON.parse(configStr) : null;
    
    return apiSuccess({
      participants: participants,
      uniqueDates: uniqueDates,
      attendanceMap: attendanceMap,
      todayStr: todayStr,
      attendanceCode: attendanceCode,
      activeConfig: activeConfig
    });
  } catch(e) {
    return apiError('Gagal memuat rekap absensi: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * API: Menandai kehadiran manual oleh pelatih (manual override)
 */
function apiMarkAbsenManual(pelatihanId, nip, tanggal, status) {
  return executeWithLock_(() => {
    try {
      if (!pelatihanId || !nip || !tanggal) return apiError('Parameter tidak lengkap.', 'VALIDATION');
      
      const ss = getAppDb_();
      const sheetAbsen = ensureAbsensiSheet_(ss);
      const dataA = sheetAbsen.getDataRange().getValues();
      const headersA = dataA[0];
      const idxAPid = headersA.indexOf('pelatihan_id');
      const idxANip = headersA.indexOf('nip');
      const idxADate = headersA.indexOf('tanggal');
      
      let existingRow = -1;
      for (let i = 1; i < dataA.length; i++) {
        if (String(dataA[i][idxAPid]).trim() === String(pelatihanId).trim() &&
            String(dataA[i][idxANip]).trim() === String(nip).trim() &&
            String(dataA[i][idxADate]).trim() === String(tanggal).trim()) {
          existingRow = i + 1;
          break;
        }
      }
      
      if (status === 'Hadir') {
        if (existingRow === -1) {
          const newRow = new Array(headersA.length).fill('');
          newRow[headersA.indexOf('pelatihan_id')] = pelatihanId;
          newRow[headersA.indexOf('nip')] = nip;
          newRow[headersA.indexOf('tanggal')] = tanggal;
          newRow[headersA.indexOf('waktu_absen')] = new Date().toISOString() + ' (Manual)';
          newRow[headersA.indexOf('status_absen')] = 'Hadir';
          sheetAbsen.appendRow(newRow);
        }
      } else {
        // Hapus log absensi jika diset tidak hadir
        if (existingRow !== -1) {
          sheetAbsen.deleteRow(existingRow);
        }
      }
      return apiSuccess(null, 'Status kehadiran berhasil diperbarui.');
    } catch(e) {
      return apiError('Gagal mengubah absensi manual: ' + e.toString(), 'SYSTEM_ERROR');
    }
  });
}

/**
 * Helper: Mengambil atau membuat sheet PelatihanDokumentasi
 */
function ensureDokumentasiSheet_(ss) {
  let sheet = ss.getSheetByName('PelatihanDokumentasi');
  if (!sheet) {
    sheet = ss.insertSheet('PelatihanDokumentasi');
    sheet.appendRow(['pelatihan_id', 'file_id', 'file_url', 'catatan', 'created_at']);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#d9ead3');
  }
  return sheet;
}

/**
 * Helper: Mendapatkan atau membuat subfolder di dalam folder pelatihan spesifik
 * Struktur: pelatihan/pelatihan_{id}/{subFolderName}
 */
function getPelatihanSubFolder_(pelatihanId, subFolderName) {
  const ssFile = DriveApp.getFileById(APP_DB_ID);
  const parents = ssFile.getParents();
  let parentFolder = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  
  // 1. Ambil atau buat folder utama "pelatihan"
  let mainPelatihanFolder;
  const pFolders = parentFolder.getFoldersByName('pelatihan');
  if (pFolders.hasNext()) {
    mainPelatihanFolder = pFolders.next();
  } else {
    mainPelatihanFolder = parentFolder.createFolder('pelatihan');
    mainPelatihanFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }
  
  // 2. Ambil atau buat folder spesifik pelatihan "pelatihan_{id}"
  const instanceFolderName = 'pelatihan_' + String(pelatihanId).trim();
  let instanceFolder;
  const iFolders = mainPelatihanFolder.getFoldersByName(instanceFolderName);
  if (iFolders.hasNext()) {
    instanceFolder = iFolders.next();
  } else {
    instanceFolder = mainPelatihanFolder.createFolder(instanceFolderName);
    instanceFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }
  
  // 3. Ambil atau buat subfolder target (misal "dokumentasi" atau "sertifikat")
  let targetFolder;
  const tFolders = instanceFolder.getFoldersByName(subFolderName);
  if (tFolders.hasNext()) {
    targetFolder = tFolders.next();
  } else {
    targetFolder = instanceFolder.createFolder(subFolderName);
    targetFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }
  
  return targetFolder;
}

/**
 * API: Menyimpan foto dokumentasi beserta catatan ke Google Drive dan database
 */
function apiSaveDokumentasi(pelatihanId, base64Data, filename, catatan) {
  return executeWithLock_(() => {
    try {
      if (!pelatihanId || !base64Data) return apiError('Parameter tidak lengkap.', 'VALIDATION');
      
      const ss = getAppDb_();
      const sheet = ensureDokumentasiSheet_(ss);
      
      // 1. Dapatkan subfolder dokumentasi
      const folder = getPelatihanSubFolder_(pelatihanId, 'dokumentasi');
      
      // 2. Simpan file foto ke Drive
      const contentType = base64Data.substring(5, base64Data.indexOf(';'));
      const bytes = Utilities.base64Decode(base64Data.split(',')[1]);
      
      // Nama berkas aman
      const ext = contentType.split('/')[1] || 'jpg';
      const safeFilename = (filename || 'photo').replace(/[^a-zA-Z0-9_-]/g, '_') + '_' + Date.now() + '.' + ext;
      const blob = Utilities.newBlob(bytes, contentType, safeFilename);
      
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      const fileId = file.getId();
      const fileUrl = 'https://lh3.googleusercontent.com/d/' + fileId;
      
      // 3. Catat di spreadsheet
      const newRow = [
        pelatihanId,
        fileId,
        fileUrl,
        catatan || '',
        new Date().toISOString()
      ];
      sheet.appendRow(newRow);
      
      return apiSuccess({ file_id: fileId, file_url: fileUrl }, 'Dokumentasi berhasil disimpan.');
    } catch (e) {
      return apiError('Gagal menyimpan dokumentasi: ' + e.toString(), 'SYSTEM_ERROR');
    }
  });
}

/**
 * API: Mendapatkan daftar dokumentasi kegiatan pelatihan
 */
function apiGetDokumentasiList(pelatihanId) {
  try {
    if (!pelatihanId) return apiError('Parameter pelatihanId tidak lengkap.', 'VALIDATION');
    
    const ss = getAppDb_();
    const sheet = ss.getSheetByName('PelatihanDokumentasi');
    if (!sheet || sheet.getLastRow() < 2) return apiSuccess([]);
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idxPid = headers.indexOf('pelatihan_id');
    const idxFid = headers.indexOf('file_id');
    const idxFurl = headers.indexOf('file_url');
    const idxCat = headers.indexOf('catatan');
    const idxDate = headers.indexOf('created_at');
    
    const list = [];
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idxPid]).trim() === String(pelatihanId).trim()) {
        list.push({
          file_id: String(data[i][idxFid]).trim(),
          file_url: String(data[i][idxFurl]).trim(),
          catatan: data[i][idxCat] || '',
          created_at: data[i][idxDate] || ''
        });
      }
    }
    
    // Urutkan dokumentasi terbaru di atas
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    return apiSuccess(list);
  } catch (e) {
    return apiError('Gagal memuat daftar dokumentasi: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * API: Menghapus dokumentasi kegiatan pelatihan
 */
function apiDeleteDokumentasi(pelatihanId, fileId) {
  return executeWithLock_(() => {
    try {
      if (!pelatihanId || !fileId) return apiError('Parameter tidak lengkap.', 'VALIDATION');
      
      const ss = getAppDb_();
      const sheet = ss.getSheetByName('PelatihanDokumentasi');
      if (!sheet || sheet.getLastRow() < 2) return apiError('Data dokumentasi kosong.', 'NOT_FOUND');
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const idxPid = headers.indexOf('pelatihan_id');
      const idxFid = headers.indexOf('file_id');
      
      let rowToDelete = -1;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idxPid]).trim() === String(pelatihanId).trim() &&
            String(data[i][idxFid]).trim() === String(fileId).trim()) {
          rowToDelete = i + 1;
          break;
        }
      }
      
      if (rowToDelete === -1) {
        return apiError('Data dokumentasi tidak ditemukan.', 'NOT_FOUND');
      }
      
      // Hapus file dari Drive
      try {
        const file = DriveApp.getFileById(fileId);
        file.setTrashed(true);
      } catch (e) {
        Logger.log('Warning: File Drive ' + fileId + ' tidak dapat ditemukan/dihapus: ' + e.toString());
      }
      
      // Hapus baris dari sheet
      sheet.deleteRow(rowToDelete);
      
      return apiSuccess(null, 'Dokumentasi berhasil dihapus.');
    } catch (e) {
      return apiError('Gagal menghapus dokumentasi: ' + e.toString(), 'SYSTEM_ERROR');
    }
  });
}

/**
 * Helper: Membuat kode absensi 4 karakter secara deterministik
 * berdasarkan pelatihanId dan tanggal
 */
/**
 * API: Set syarat sertifikat untuk suatu pelatihan
 * @param {string} pelatihanId
 * @param {string} syarat  'absensi_penuh' | 'preposttest'
 * @param {string} sessionToken
 */
function apiSetSyaratSertifikat(pelatihanId, syarat, sessionToken) {
  try {
    if (!pelatihanId || !syarat) return apiError('Parameter tidak lengkap.', 'VALIDATION');
    if (!checkPelatihanOwnership_(pelatihanId, sessionToken)) {
      return apiError('Anda tidak memiliki akses untuk mengubah setting pelatihan ini.', 'FORBIDDEN');
    }
    const allowed = ['absensi_penuh', 'preposttest'];
    if (!allowed.includes(syarat)) return apiError('Nilai syarat tidak valid.', 'VALIDATION');

    const key = 'syarat_sertifikat_' + pelatihanId;
    PropertiesService.getScriptProperties().setProperty(key, syarat);
    return apiSuccess({ syarat: syarat }, 'Syarat sertifikat berhasil disimpan.');
  } catch (e) {
    return apiError('Gagal menyimpan syarat sertifikat: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * API: Baca syarat sertifikat yang aktif untuk suatu pelatihan
 * @param {string} pelatihanId
 * @returns {object} { syarat: 'absensi_penuh'|'preposttest' }
 */
function apiGetSyaratSertifikat(pelatihanId) {
  try {
    if (!pelatihanId) return apiError('Parameter tidak lengkap.', 'VALIDATION');
    const key = 'syarat_sertifikat_' + pelatihanId;
    const syarat = PropertiesService.getScriptProperties().getProperty(key) || 'preposttest';
    return apiSuccess({ syarat: syarat });
  } catch (e) {
    return apiError('Gagal membaca syarat sertifikat: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Helper internal: baca syarat sertifikat (digunakan dari Survey.js)
 */
function getSyaratSertifikat_(pelatihanId) {
  const key = 'syarat_sertifikat_' + pelatihanId;
  return PropertiesService.getScriptProperties().getProperty(key) || 'preposttest';
}

function generateAttendanceCode_(pelatihanId, dateStr) {
  const seedStr = String(pelatihanId) + '_' + String(dateStr);
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) & 0xFFFFFFFF;
  }
  // Konversi hash ke 4 karakter alfanumerik uppercase (hindari 0, 1, O, I agar tidak bingung)
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  let temp = Math.abs(hash);
  for (let i = 0; i < 4; i++) {
    code += chars[temp % chars.length];
    temp = Math.floor(temp / chars.length);
  }
  return code;
}
