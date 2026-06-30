function getMateriList() {
  try {
    const cache = CacheService.getScriptCache();
    const cacheVer = cache.get('cache_version') || '1';
    const cacheKey = 'materi_list_v' + cacheVer;
    const cached = cache.get(cacheKey);
    if (cached) {
      try { return JSON.parse(cached); } catch(e) {}
    }

    const ss = getAppDb_();
    let sheet = ss.getSheetByName('Pengawas_Materi');
    if (!sheet) {
      // Periksa apakah ada sheet lama bernama "Materi" untuk di-rename
      const oldSheet = ss.getSheetByName('Materi');
      if (oldSheet) {
        oldSheet.setName('Pengawas_Materi');
        sheet = oldSheet;
      } else {
        // Jika sheet belum ada, buat otomatis
        sheet = ss.insertSheet('Pengawas_Materi');
        sheet.appendRow(['Kelompok', 'Sub Kelompok', 'Judul Materi', 'Link', 'Status', 'Icon']);
        sheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#f3f3f3');
        sheet.setFrozenRows(1);
        
        // Data dummy awal
        sheet.appendRow(['KBC', 'Modul Dasar', 'Pengantar KBC', 'https://example.com/kbc1', 'Aktif', '📄']);
        sheet.appendRow(['KBC', 'Modul Lanjutan', 'Strategi KBC', 'https://example.com/kbc2', 'Aktif', '📄']);
        sheet.appendRow(['MAGIS', 'Materi Inti', 'Konsep MAGIS', 'https://example.com/magis1', 'Aktif', '📄']);
      }
    }
    
    return getMateriFromSheet_(sheet, cacheKey);
  } catch (e) {
    return apiError(e.message);
  }
}

function getKamadMateriList() {
  try {
    const cache = CacheService.getScriptCache();
    const cacheVer = cache.get('cache_version') || '1';
    const cacheKey = 'kamad_materi_list_v' + cacheVer;
    const cached = cache.get(cacheKey);
    if (cached) {
      try { return JSON.parse(cached); } catch(e) {}
    }

    const ss = getAppDb_();
    let sheet = ss.getSheetByName('Kamad_Materi');
    if (!sheet) {
      // Jika sheet belum ada, buat otomatis
      sheet = ss.insertSheet('Kamad_Materi');
      sheet.appendRow(['Kelompok', 'Sub Kelompok', 'Judul Materi', 'Link', 'Status', 'Icon']);
      sheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#f3f3f3');
      sheet.setFrozenRows(1);
      
      // Data dummy awal untuk Kamad
      sheet.appendRow(['KBC Madrasah', 'Buku Panduan', 'Panduan KBC untuk Kamad', 'https://example.com/kamad_kbc', 'Aktif', '📕']);
      sheet.appendRow(['MAGIS Madrasah', 'Buku Panduan', 'Panduan MAGIS untuk Kamad', 'https://example.com/kamad_magis', 'Aktif', '📕']);
    }

    return getMateriFromSheet_(sheet, cacheKey);
  } catch (e) {
    return apiError(e.message);
  }
}

function getMateriFromSheet_(sheet, cacheKey) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  
  const idxKelompok = headers.indexOf('Kelompok');
  const idxSub = headers.indexOf('Sub Kelompok');
  const idxJudul = headers.indexOf('Judul Materi');
  const idxLink = headers.indexOf('Link');
  const idxStatus = headers.indexOf('Status');
  
  let idxIcon = headers.indexOf('Icon');
  if (idxIcon === -1) {
    const nextCol = headers.length + 1;
    sheet.getRange(1, nextCol).setValue('Icon').setFontWeight('bold').setBackground('#f3f3f3');
    idxIcon = nextCol - 1;
    headers.push('Icon');
  }
  
  if (idxKelompok === -1 || idxJudul === -1 || idxLink === -1) {
    throw new Error("Format Sheet Materi tidak sesuai. Harus ada Kelompok, Judul Materi, Link");
  }
  
  const materiList = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[idxJudul] || !row[idxLink]) continue;
    
    if (idxStatus !== -1 && row[idxStatus] && String(row[idxStatus]).toLowerCase() !== 'aktif') {
      continue;
    }
    
    materiList.push({
      kelompok: String(row[idxKelompok] || 'Umum').trim(),
      subKelompok: idxSub !== -1 ? String(row[idxSub] || '').trim() : '',
      judul: String(row[idxJudul]).trim(),
      link: String(row[idxLink]).trim(),
      icon: idxIcon !== -1 ? String(row[idxIcon] || '').trim() : ''
    });
  }
  const res = apiSuccess(materiList);
  try { CacheService.getScriptCache().put(cacheKey, JSON.stringify(res), 3600); } catch(e) {}
  return res;
}
