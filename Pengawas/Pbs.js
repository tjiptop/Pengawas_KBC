function getKamadPbsSummary(nsm) {
  try {
    if (!nsm) return apiError('Parameter NSM tidak lengkap.', 'VALIDATION');

    const cache = CacheService.getScriptCache();
    const cacheVer = cache.get('cache_version') || '1';
    const cacheKey = 'kamad_pbs_summary_s1_v' + cacheVer + '_' + nsm;
    const cached = cache.get(cacheKey);
    if (cached) {
      try { return JSON.parse(cached); } catch(e) {}
    }

    const data = getCachedMasterData_('master_pbs_rows', () => {
      const ss = getMasterDb_();
      const sheet = ss.getSheetByName('pbs');
      if (!sheet) return [];
      return sheet.getDataRange().getValues();
    }, 21600); // Cache 6 jam

    if (!data || data.length <= 1) {
      return apiSuccess({ kesulitan: [], alat_bantu: [], penyesuaian: [] }); // Data kosong
    }

    const headers = data[0].map(h => String(h).trim());
    const idxNsm = headers.indexOf('nsm');
    if (idxNsm === -1) {
      return apiError('Format Sheet pbs tidak sesuai. Kolom nsm tidak ditemukan.', 'FORMAT_ERROR');
    }

    // 1. Rekapitulasi Kesulitan (Kolom O s/d X -> Index 14 s/d 23)
    const startColDiff = 14;
    const endColDiff = 23;
    const diffList = [];
    for (let col = startColDiff; col <= endColDiff; col++) {
      if (col < headers.length) {
        diffList.push({
          index: col,
          name: headers[col] || ('Kesulitan ' + String.fromCharCode(65 + col - startColDiff))
        });
      }
    }

    // 2. Rekapitulasi Alat Bantu (Kolom Z s/d AM -> Index 25 s/d 38)
    const startColAlat = 25;
    const endColAlat = 38;
    const alatList = [];
    for (let col = startColAlat; col <= endColAlat; col++) {
      if (col < headers.length) {
        let rawName = headers[col] || '';
        let cleanName = rawName.replace(/,/g, '').trim(); // "Tong, kat Putih" -> "Tongkat Putih"
        alatList.push({
          index: col,
          name: cleanName || ('Alat ' + (col - startColAlat + 1))
        });
      }
    }

    // 3. Rekapitulasi Penyesuaian (Kolom AN s/d BA -> Index 39 s/d 52)
    const startColAdjust = 39;
    const endColAdjust = 52;
    const adjustList = [];
    for (let col = startColAdjust; col <= endColAdjust; col++) {
      if (col < headers.length) {
        adjustList.push({
          index: col,
          name: headers[col] || ('Penyesuaian ' + (col - startColAdjust + 1))
        });
      }
    }

    // Saring baris berdasarkan NSM
    const nsmStr = String(nsm).trim();
    const matchedRows = data.slice(1).filter(row => String(row[idxNsm]).trim() === nsmStr);

    // Hitung jumlah siswa L dan P dari Kolom L (index 11)
    let siswaL = 0;
    let siswaP = 0;
    matchedRows.forEach(row => {
      if (row.length > 11) {
        const genderVal = String(row[11] || '').trim().toLowerCase();
        if (genderVal.indexOf('l') === 0) {
          siswaL++;
        } else if (genderVal.indexOf('p') === 0) {
          siswaP++;
        }
      }
    });

    // Hitung akumulasi Kesulitan
    const kesulitanRekap = diffList.map(diff => {
      let sedikit = 0;
      let banyak = 0;
      let tidakBisa = 0;

      matchedRows.forEach(row => {
        const val = String(row[diff.index] || '').trim().toLowerCase();
        if (val === 'sedikit kesulitan') sedikit++;
        else if (val === 'banyak kesulitan') banyak++;
        else if (val === 'tidak bisa sama sekali') tidakBisa++;
      });

      return {
        kesulitan: diff.name,
        sedikit_kesulitan: sedikit,
        banyak_kesulitan: banyak,
        tidak_bisa_sama_sekali: tidakBisa
      };
    });

    // Hitung akumulasi Alat Bantu
    const alatBantuRekap = alatList.map(alat => {
      let tidakMiliki = 0;
      let sudahMiliki = 0;
      let tidakTahu = 0;

      matchedRows.forEach(row => {
        const val = String(row[alat.index] || '').trim().toLowerCase();
        if (val === 'dibutuhkan tetapi tidak memiliki' || val === 'tidak punya') {
          tidakMiliki++;
        } else if (val === 'dibutuhkan dan sudah memiliki' || val === 'punya') {
          sudahMiliki++;
        } else if (val === 'tidak tahu') {
          tidakTahu++;
        }
      });

      return {
        alat: alat.name,
        dibutuhkan_tidak_memiliki: tidakMiliki,
        dibutuhkan_sudah_memiliki: sudahMiliki,
        tidak_tahu: tidakTahu
      };
    });

    // Hitung akumulasi Penyesuaian
    const penyesuaianRekap = adjustList.map(adj => {
      let sudah = 0;
      let belum = 0;
      let bantuan = 0;

      matchedRows.forEach(row => {
        const val = String(row[adj.index] || '').trim().toLowerCase();
        if (val === 'kami sudah melakukan penyesuaian' || val === 'sudah disesuaikan') {
          sudah++;
        } else if (val === 'belum, tetapi akan melakukan penyesuaian' || val === 'belum disesuaikan') {
          belum++;
        } else if (val === 'belum dapat dilakukan karena keterbatasan sumber daya dan kapasitas' || val === 'membutuhkan bantuan') {
          bantuan++;
        }
      });

      return {
        penyesuaian: adj.name,
        sudah: sudah,
        belum: belum,
        bantuan: bantuan
      };
    });

    const resultPayload = {
      stats: {
        total: matchedRows.length,
        l: siswaL,
        p: siswaP
      },
      kesulitan: kesulitanRekap,
      alat_bantu: alatBantuRekap,
      penyesuaian: penyesuaianRekap
    };

    const res = apiSuccess(resultPayload);
    try { cache.put(cacheKey, JSON.stringify(res), 21600); } catch(e) {} // Cache 6 jam
    return res;
  } catch (e) {
    return apiError('Gagal memuat rekap PBS: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Mengambil rekap data ANBK dari sheet anbk pada MASTER_DB_ID
 */
function getKamadAnbkData(nsm) {
  try {
    if (!nsm) return apiError('Parameter NSM tidak lengkap.', 'VALIDATION');

    const cache = CacheService.getScriptCache();
    const cacheVer = cache.get('cache_version') || '1';
    const cacheKey = 'kamad_anbk_data_v' + cacheVer + '_' + nsm;
    const cached = cache.get(cacheKey);
    if (cached) {
      try { return JSON.parse(cached); } catch(e) {}
    }

    const data = getCachedMasterData_('master_anbk_rows', () => {
      const ss = getMasterDb_();
      const sheet = ss.getSheetByName('anbk');
      if (!sheet) return [];
      return sheet.getDataRange().getDisplayValues(); // Gunakan display values agar format % aman
    }, 21600); // Cache 6 jam

    if (!data || data.length <= 1) {
      return apiSuccess([]); // Data kosong
    }

    const headers = data[0].map(h => String(h).trim());
    const idxNsm = headers.indexOf('nsm');
    if (idxNsm === -1) {
      return apiError('Format Sheet anbk tidak sesuai. Kolom nsm tidak ditemukan.', 'FORMAT_ERROR');
    }

    const nsmStr = String(nsm).trim();
    const matchedRow = data.slice(1).find(row => String(row[idxNsm]).trim() === nsmStr);

    const result = [];
    if (matchedRow) {
      for (let i = 0; i < headers.length; i++) {
        if (i === idxNsm) continue;
        
        let val = matchedRow[i];
        result.push({
          label: headers[i],
          value: val !== null && val !== undefined ? String(val).trim() : '-'
        });
      }
    }

    const res = apiSuccess(result);
    try { cache.put(cacheKey, JSON.stringify(res), 21600); } catch(e) {}
    return res;
  } catch (e) {
    return apiError('Gagal memuat data ANBK: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Endpoint kombinasi untuk memuat seluruh data Madrasah (PBS & ANBK) sekaligus
 */
function getKamadDataMadrasahCombined(nsm) {
  try {
    const pbsRes = getKamadPbsSummary(nsm);
    const anbkRes = getKamadAnbkData(nsm);

    if (!pbsRes.success) return pbsRes;
    if (!anbkRes.success) return anbkRes;

    return apiSuccess({
      pbs: pbsRes.data,
      anbk: anbkRes.data
    });
  } catch (e) {
    return apiError('Gagal memuat data gabungan madrasah: ' + e.toString(), 'SYSTEM_ERROR');
  }
}
