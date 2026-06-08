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

  // --- T10: YAML Parser & Test Grading ---
  try {
    const mockYaml = `
title: "Test A"
questions:
  - type: radio
    name: q1
    label: "Q1"
    options: [A, B, C]
    answer: "A"
    category: "Cat1"
  - type: boolean
    name: q2
    label: "Q2"
    answer: "Benar"
    category: "Cat1"
  - type: checkbox
    name: q3
    label: "Q3"
    options: [X, Y, Z]
    answer: [X, Y]
    category: "Cat2"
  - type: matching
    name: q4
    label: "Q4"
    pairs:
      - left: "L1"
        right_options: [R1, R2]
    answer:
      L1: R1
    category: "Cat2"
`;
    const parsed = parsePrePostYaml_(mockYaml);
    if (parsed && parsed.questions.length === 4 && parsed.questions[0].name === 'q1') {
      pass('YAML Parser: parsePrePostYaml_ parsing structure');
    } else {
      fail('YAML Parser', 'Parsed structure mismatch: ' + JSON.stringify(parsed));
    }
  } catch(e) { fail('YAML Parser', e.message); }

  // --- T11: Seed Shuffling Determinism ---
  try {
    const list = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const rand1 = createRandom_('123456');
    const rand2 = createRandom_('123456');
    const rand3 = createRandom_('987654');
    
    let arr1 = [...list];
    let arr2 = [...list];
    let arr3 = [...list];
    
    shuffleArray_(arr1, rand1);
    shuffleArray_(arr2, rand2);
    shuffleArray_(arr3, rand3);
    
    const sameOrder = JSON.stringify(arr1) === JSON.stringify(arr2);
    const diffOrder = JSON.stringify(arr1) !== JSON.stringify(arr3);
    
    if (sameOrder && diffOrder) {
      pass('LCG Seeded Shuffling: Deterministic same seed, random different seed');
    } else {
      fail('LCG Shuffling', `Same seed same order: ${sameOrder}, Diff seed diff order: ${diffOrder}`);
    }
  } catch(e) { fail('LCG Shuffling', e.message); }

  // --- T12: Stats Calculations (Paired T-Test & Cohen's d) ---
  try {
    // Wallace & normal standard CDF test
    const norm = normalCDF_(1.96); // should be around 0.975
    const tVal = tDist2TailPValue_(2.776, 4); // should be around 0.05
    const isNormOk = Math.abs(norm - 0.975) < 0.01;
    const isTPValOk = Math.abs(tVal - 0.05) < 0.01;
    
    if (isNormOk && isTPValOk) {
      pass('Statistics: Wallace standard t-distribution & normal standard approximation');
    } else {
      fail('Statistics calculations', `NormalCDF(1.96)=${norm} (expected ~0.975), tDist2TailPValue(2.776, 4)=${tVal} (expected ~0.05)`);
    }
  } catch(e) { fail('Statistics calculations', e.message); }

  // --- Hasil ---
  const passed = results.filter(r => r.startsWith('✅')).length;
  const failed = results.filter(r => r.startsWith('❌')).length;
  Logger.log('\n=== HASIL TEST (' + passed + '/' + (passed + failed) + ' lulus) ===\n' + results.join('\n'));

  return { passed, failed, results };
}
