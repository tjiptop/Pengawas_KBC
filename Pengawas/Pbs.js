function getKamadPbsSummary(nsm) {
  try {
    if (!nsm) return apiError('Parameter NSM tidak lengkap.', 'VALIDATION');

    const cache = CacheService.getScriptCache();
    const cacheVer = cache.get('cache_version') || '1';
    const cacheKey = 'kamad_pbs_summary_v' + cacheVer + '_' + nsm;
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
      return apiSuccess({ kesulitan: [], alat_bantu: [] }); // Data kosong
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

    // Saring baris berdasarkan NSM
    const nsmStr = String(nsm).trim();
    const matchedRows = data.slice(1).filter(row => String(row[idxNsm]).trim() === nsmStr);

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

    const resultPayload = {
      kesulitan: kesulitanRekap,
      alat_bantu: alatBantuRekap
    };

    const res = apiSuccess(resultPayload);
    try { cache.put(cacheKey, JSON.stringify(res), 21600); } catch(e) {} // Cache 6 jam
    return res;
  } catch (e) {
    return apiError('Gagal memuat rekap PBS: ' + e.toString(), 'SYSTEM_ERROR');
  }
}
