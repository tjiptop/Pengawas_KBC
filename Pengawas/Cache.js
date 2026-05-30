// ============================================================
// CACHE LAYER & HELPER FUNCTIONS
// ============================================================

/**
 * Menyimpan data string besar ke CacheService dengan chunking
 * @param {string} key
 * @param {string} str
 * @param {number} expirationInSeconds
 */
function putCacheChunked(key, str, expirationInSeconds) {
  const cache = CacheService.getScriptCache();
  const CHUNK_SIZE = 90000;
  const chunks = Math.ceil(str.length / CHUNK_SIZE);
  let payload = {};
  for (let i = 0; i < chunks; i++) {
    payload[key + '_' + i] = str.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
  }
  payload[key + '_chunks'] = String(chunks);
  cache.putAll(payload, expirationInSeconds);
}

/**
 * Mengambil data string besar dari CacheService yang di-chunk
 * @param {string} key
 * @returns {string|null}
 */
function getCacheChunked(key) {
  const cache = CacheService.getScriptCache();
  const chunkCountStr = cache.get(key + '_chunks');
  if (!chunkCountStr) return null;
  const chunks = parseInt(chunkCountStr);
  let keys = [];
  for (let i = 0; i < chunks; i++) {
    keys.push(key + '_' + i);
  }
  const chunkData = cache.getAll(keys);
  let str = '';
  for (let i = 0; i < chunks; i++) {
    let chunk = chunkData[key + '_' + i];
    if (!chunk) return null; // Cache tidak lengkap
    str += chunk;
  }
  return str;
}

/**
 * Helper generik untuk mengambil data dengan caching layer
 * @param {string} key
 * @param {Function} fetchFn
 * @param {number} ttlSeconds
 * @returns {any}
 */
function getCachedMasterData_(key, fetchFn, ttlSeconds) {
  let cached = getCacheChunked(key);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      console.log('Error parsing cached data for ' + key + ': ' + e.toString());
    }
  }
  const data = fetchFn();
  try {
    putCacheChunked(key, JSON.stringify(data), ttlSeconds || 600);
  } catch (e) {
    console.log('Error saving cache for ' + key + ': ' + e.toString());
  }
  return data;
}

/**
 * Mencari data madrasah berdasarkan NSM dengan Caching 10 menit
 * @param {string|number} nsm
 * @returns {object|null}
 */
function getMadrasahByNsm(nsm) {
  try {
    const nsmStr = String(nsm).trim();
    // Cache selama 10 menit (600 detik)
    const data = getCachedMasterData_('master_madrasah_rows', () => {
      const ss = getMasterDb_();
      const sheet = ss.getSheets()[0];
      return sheet.getDataRange().getDisplayValues();
    }, 600);

    if (!data || data.length < 2) return null;

    const headers = data[0].map(h => String(h).trim());
    const idx = name => {
      const i = headers.findIndex(h => h.toUpperCase().includes(name));
      return i;
    };
    const idxNsm  = idx('NSM');
    const idxNama = headers.findIndex(h => { const u = h.toUpperCase(); return u.includes('NAMA') || u === 'NAME'; });
    const idxKec  = idx('KEC');
    const idxKab = headers.findIndex(h => { const u = h.toUpperCase(); return u.includes('KAB') || u.includes('KOTA') || u === 'DISTRICT'; });
    const idxProv = idx('PROV');
    const idxJenjang = headers.findIndex(h => { const u = h.toUpperCase(); return u.includes('JENJANG') || u === 'LEVEL'; });

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idxNsm]).trim() === nsmStr) {
        return {
          nsm:       nsmStr,
          nama:      idxNama    !== -1 ? data[i][idxNama]    : '',
          kecamatan: idxKec     !== -1 ? data[i][idxKec]     : '',
          kabupaten: idxKab     !== -1 ? data[i][idxKab]     : '',
          provinsi:  idxProv    !== -1 ? data[i][idxProv]    : '',
          jenjang:   idxJenjang !== -1 ? data[i][idxJenjang] : '',
        };
      }
    }
    return null;
  } catch (e) {
    console.log('getMadrasahByNsm error: ' + e.toString());
    return null;
  }
}
