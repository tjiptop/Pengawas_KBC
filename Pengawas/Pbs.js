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

    const ss = getMasterDb_();
    const sheet = ss.getSheetByName('pbs');
    if (!sheet) {
      return apiError('Sheet pbs tidak ditemukan pada Database Master.', 'NOT_FOUND');
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return apiSuccess([]); // Data kosong
    }

    const headers = data[0].map(h => String(h).trim());
    const idxNsm = headers.indexOf('nsm');
    if (idxNsm === -1) {
      return apiError('Format Sheet pbs tidak sesuai. Kolom nsm tidak ditemukan.', 'FORMAT_ERROR');
    }

    // Kolom O s/d X adalah index 14 s/d 23 (1-indexed kolom ke-15 s/d 24)
    const startColIdx = 14; // Kolom O
    const endColIdx = 23;   // Kolom X
    const difficulties = [];
    for (let col = startColIdx; col <= endColIdx; col++) {
      if (col < headers.length) {
        difficulties.push({
          index: col,
          name: headers[col] || ('Kesulitan ' + String.fromCharCode(65 + col - startColIdx))
        });
      }
    }

    // Saring baris berdasarkan NSM
    const nsmStr = String(nsm).trim();
    const matchedRows = data.slice(1).filter(row => String(row[idxNsm]).trim() === nsmStr);

    // Hitung akumulasi
    const summary = difficulties.map(diff => {
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

    const res = apiSuccess(summary);
    try { cache.put(cacheKey, JSON.stringify(res), 21600); } catch(e) {} // Cache 6 jam
    return res;
  } catch (e) {
    return apiError('Gagal memuat rekap PBS: ' + e.toString(), 'SYSTEM_ERROR');
  }
}
