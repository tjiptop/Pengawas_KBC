// ============================================================
// MADRASAH SASARAN MODULE
// ============================================================

/**
 * Mengambil daftar Madrasah untuk sasaran berdasarkan Kabupaten, Jenjang, dan NIP Pengawas
 * Memanfaatkan caching layer 21600 detik (6 jam) untuk data kabupaten tertentu
 * @param {string} kabupaten
 * @param {string} jenjangStr
 * @param {string|number} currentNip
 * @returns {Array<object>} Daftar Madrasah yang tersedia
 */
function getMadrasahForSasaran(kabupaten, jenjangStr, currentNip) {
  try {
    const ssApp = getAppDb_();
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
    let cleanProfileKab = cleanRegencyName_(kabupaten);
    
    let allowedJenjangs = String(jenjangStr || '').split(',').map(j => j.trim().toLowerCase()).filter(j => j !== '');
    
    // Gunakan versi cache untuk bypass cache lama jika di-reset
    const cache = CacheService.getScriptCache();
    let cacheVersion = cache.get('cache_version') || '1';
    let safeCacheKey = 'kab_madrasah_v' + cacheVersion + '_' + cleanProfileKab.substring(0, 50);
    
    let cachedDataStr = getCacheChunked(safeCacheKey);
    let allKabMadrasahs = null;

    if (cachedDataStr) {
      try {
        allKabMadrasahs = JSON.parse(cachedDataStr);
      } catch (e) {
        console.warn('Gagal membaca cache kabupaten ' + kabupaten + ': ' + e.toString());
      }
    }

    if (!allKabMadrasahs) {
      const ss = getMasterDb_();
      const sheet = ss.getSheets()[0];
      const data = sheet.getDataRange().getValues();
      const headers = data[0];

      let idxNSM = headers.findIndex(h => {
        const u = h.toString().toUpperCase();
        return u === 'NSM' || (u.includes('NSM') && !u.includes('KODE') && !u.includes('ID'));
      });
      let idxNPSN = headers.findIndex(h => h.toString().toUpperCase().includes('NPSN'));
      let idxNama = headers.findIndex(h => {
        const u = h.toString().toUpperCase();
        return u === 'NAMA' || u === 'NAMA_MADRASAH' || (u.includes('NAMA') && !u.includes('KAB') && !u.includes('KEC'));
      });
      
      // Pencarian kolom Kabupaten yang aman dari kolom kode/ID
      let idxKab = headers.findIndex(h => {
        const u = h.toString().toUpperCase();
        return u === 'KABUPATEN' || u === 'KOTA' || u === 'KABUPATEN/KOTA' || u === 'KABUPATEN_KOTA';
      });
      if (idxKab === -1) {
        idxKab = headers.findIndex(h => {
          const u = h.toString().toUpperCase();
          if (u.includes('KODE') || u.includes('CODE') || u.includes('ID') || u.includes('NO')) return false;
          return u.includes('KAB') || u.includes('KOTA') || u === 'DISTRICT';
        });
      }

      let idxKec = headers.findIndex(h => h.toString().toUpperCase().includes('SUB_DISTRICT') || h.toString().toUpperCase().includes('KECAMATAN') || h.toString().toUpperCase().includes('KEC'));
      let idxJenjang = headers.findIndex(h => h.toString().toUpperCase().includes('JENJANG') || h.toString().toUpperCase().includes('BENTUK') || h.toString().toUpperCase() === 'LEVEL');

      if (idxNSM === -1) idxNSM = 0;
      if (idxNama === -1) idxNama = 1;
      if (idxKab === -1) idxKab = 2;
      if (idxJenjang === -1) idxJenjang = 3;

      allKabMadrasahs = [];
      for (let i = 1; i < data.length; i++) {
        let kab = String(data[i][idxKab]).toLowerCase().trim();
        let cleanDbKab = cleanRegencyName_(kab);

        if (!cleanProfileKab || cleanDbKab === cleanProfileKab) {
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
  } catch (e) {
    console.error('getMadrasahForSasaran error: ' + e.toString());
    return [];
  }
}

/**
 * Mengambil daftar Madrasah binaan (sasaran) milik Pengawas tertentu
 * @param {string|number} nip
 * @returns {Array<object>} Daftar Madrasah binaan
 */
function getSasaran(nip) {
  try {
    const ss = getAppDb_();
    const sheet = ss.getSheetByName('Sasaran');
    if (!sheet) return [];
    
    // Gunakan getDisplayValues agar tidak terkena format eksponensial angka panjang seperti NSM
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
  } catch (e) {
    console.error('getSasaran error: ' + e.toString());
    return [];
  }
}

/**
 * Menyimpan pilihan sasaran baru dan menghapus data sasaran lama milik Pengawas tertentu
 * @param {string|number} nip
 * @param {Array<object>} nsmListArray
 * @returns {object} Response standard
 */
function saveSasaranList(nip, nsmListArray) {
  try {
    if (!nip) return apiError('NIP tidak valid.', 'VALIDATION');

    const ssApp = getAppDb_();
    let sheet = ssApp.getSheetByName('Sasaran');
    if (!sheet) {
      sheet = ssApp.insertSheet('Sasaran');
    }

    const ssMaster = getMasterDb_();
    const sheetMaster = ssMaster.getSheets()[0];
    const dataMaster = sheetMaster.getDataRange().getValues();
    const headersMaster = dataMaster[0] || [];

    // Set headers jika kosong
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

    // Hapus baris sasaran lama milik pengawas ini
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][0]).trim() == nipStr) {
        sheet.deleteRow(i + 1);
      }
    }

    // Insert baris sasaran baru dengan seluruh data master lengkap
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
  } catch (e) {
    return apiError('Kesalahan sistem saat menyimpan daftar sasaran: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Composite API: Mengambil data Sasaran aktif dan daftar Madrasah yang tersedia untuk dipilih sekaligus
 * Mengurangi round-trip API call dari 2 kali menjadi 1 kali.
 * @param {string|number} nip
 * @param {string} kabupaten
 * @param {string} jenjangStr
 * @returns {object} Response standard dengan data sasaran dan available madrasah
 */
function getSasaranPageData(nip, kabupaten, jenjangStr) {
  try {
    const ss = getMasterDb_();
    const sheets = ss.getSheets().map(s => s.getName());
    const firstSheet = ss.getSheets()[0];
    const headers = firstSheet ? firstSheet.getDataRange().getValues()[0] : [];
    
    let idxKab = headers.findIndex(h => {
      const u = h.toString().toUpperCase();
      return u === 'KABUPATEN' || u === 'KOTA' || u === 'KABUPATEN/KOTA' || u === 'KABUPATEN_KOTA';
    });
    if (idxKab === -1) {
      idxKab = headers.findIndex(h => {
        const u = h.toString().toUpperCase();
        if (u.includes('KODE') || u.includes('CODE') || u.includes('ID') || u.includes('NO')) return false;
        return u.includes('KAB') || u.includes('KOTA') || u === 'DISTRICT';
      });
    }

    const sampleRow = firstSheet && firstSheet.getLastRow() > 1 ? firstSheet.getDataRange().getValues()[1] : [];
    
    // Cari kabupaten Parepare di sheet pertama
    let foundParepareCount = 0;
    if (firstSheet) {
      const vals = firstSheet.getDataRange().getValues();
      for (let i = 1; i < vals.length; i++) {
        if (idxKab !== -1 && String(vals[i][idxKab]).toLowerCase().includes('pare')) {
          foundParepareCount++;
        }
      }
    }

    const activeSasaran = getSasaran(nip);
    const availableMadrasah = getMadrasahForSasaran(kabupaten, jenjangStr, nip);
    
    return apiSuccess({
      sasaran: activeSasaran,
      available: availableMadrasah,
      diagnostics: {
        sheets: sheets,
        headers: headers,
        idxKab: idxKab,
        sampleRow: sampleRow,
        foundParepareCount: foundParepareCount
      }
    });
  } catch (e) {
    return apiError('Gagal memuat data halaman sasaran: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Normalisasi nama kabupaten/kota untuk perbandingan yang robust (case-insensitive, remove prefixes, remove spaces/hyphens)
 * @param {string} name
 * @returns {string} Cleaned name
 */
function cleanRegencyName_(name) {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .replace(/^kab\.\s+/i, '')
    .replace(/^kabupaten\s+/i, '')
    .replace(/^kota\s+/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}
