// ============================================================
// _TEST.JS — Fungsi Testing Internal (hanya aktif di Staging)
// Tambahkan nama file ini ke .claspignore sebelum deploy ke Production
// ============================================================

/**
 * Jalankan semua test dasar aplikasi dan tampilkan hasilnya di Logger.
 * Panggil dari GAS Editor > Run > runTests_
 */
function runTests_() {
  if (!IS_STAGING) {
    Logger.log('⛔ runTests_ hanya boleh dijalankan di environment Staging.');
    return;
  }

  const results = [];
  const pass = (label) => { results.push('✅ PASS: ' + label); };
  const fail = (label, err) => { results.push('❌ FAIL: ' + label + (err ? ' → ' + err : '')); };

  // --- T1: Koneksi App Database ---
  try {
    const db = getAppDb_();
    if (db && db.getId()) pass('AppDB connection (ID: ' + db.getId().substring(0,8) + '...)');
    else fail('AppDB connection', 'Null result');
  } catch(e) { fail('AppDB connection', e.message); }

  // --- T2: Koneksi Master Madrasah Database ---
  try {
    const mdb = getMasterDb_();
    if (mdb && mdb.getId()) pass('MasterDB connection (ID: ' + mdb.getId().substring(0,8) + '...)');
    else fail('MasterDB connection', 'Null result');
  } catch(e) { fail('MasterDB connection', e.message); }

  // --- T3: Cache round-trip (put & get) ---
  try {
    const testKey = 'test_cache_' + Date.now();
    const testVal = JSON.stringify({ ok: true, ts: Date.now() });
    putCacheChunked(testKey, testVal, 30);
    const retrieved = getCacheChunked(testKey);
    if (retrieved === testVal) pass('Cache round-trip (chunked)');
    else fail('Cache round-trip', 'Value mismatch: got ' + retrieved);
  } catch(e) { fail('Cache round-trip', e.message); }

  // --- T4: apiSuccess helper ---
  try {
    const res = apiSuccess({ test: 1 }, 'OK');
    if (res.success === true && res.data.test === 1) pass('apiSuccess helper');
    else fail('apiSuccess helper', JSON.stringify(res));
  } catch(e) { fail('apiSuccess helper', e.message); }

  // --- T5: apiError helper ---
  try {
    const res = apiError('Test error', 'TEST_CODE');
    if (res.success === false && res.code === 'TEST_CODE') pass('apiError helper');
    else fail('apiError helper', JSON.stringify(res));
  } catch(e) { fail('apiError helper', e.message); }

  // --- T6: sanitizeHtml ---
  try {
    const cleaned = sanitizeHtml('<script>alert(1)</script>');
    if (cleaned.indexOf('<') === -1) pass('sanitizeHtml XSS');
    else fail('sanitizeHtml XSS', 'Still contains < char: ' + cleaned);
  } catch(e) { fail('sanitizeHtml', e.message); }

  // --- T7: sanitizeFormulaInjection ---
  try {
    const res = sanitizeFormulaInjection('=SUM(A1)');
    if (res.startsWith("'")) pass('sanitizeFormulaInjection');
    else fail('sanitizeFormulaInjection', 'Expected prefix quote, got: ' + res);
  } catch(e) { fail('sanitizeFormulaInjection', e.message); }

  // --- T8: getDashboardData (tanpa NIP nyata, cek structure) ---
  try {
    const res = getDashboardData('');
    if (res.success === false && res.code === 'VALIDATION') pass('getDashboardData validation guard');
    else fail('getDashboardData validation guard', JSON.stringify(res));
  } catch(e) { fail('getDashboardData', e.message); }

  // --- T9: IS_STAGING flag ---
  try {
    if (IS_STAGING === true) pass('IS_STAGING flag = true (as expected in staging)');
    else Logger.log('⚠️  IS_STAGING = false — pastikan APP_ENV diset ke "staging" di Script Properties');
  } catch(e) { fail('IS_STAGING flag', e.message); }

  // --- Hasil ---
  const passed = results.filter(r => r.startsWith('✅')).length;
  const failed = results.filter(r => r.startsWith('❌')).length;
  Logger.log('\n=== HASIL TEST (' + passed + '/' + (passed + failed) + ' lulus) ===\n' + results.join('\n'));

  return { passed, failed, results };
}
