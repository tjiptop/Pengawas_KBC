// ============================================================
// PRE & POST TEST MODULE
// ============================================================

/**
 * Custom YAML parser sederhana untuk pre & post test
 * @param {string} yamlStr
 * @returns {object} Parsed test configuration
 */
function parsePrePostYaml_(yamlStr) {
  if (!yamlStr) return null;
  const lines = yamlStr.split('\n');
  let result = {
    title: '',
    description: '',
    shuffle_questions: false,
    shuffle_options: false,
    time_limit_minutes: 0,
    questions: []
  };

  let currentQuestion = null;
  let inQuestions = false;
  let listMode = null; // 'options', 'answer_list', 'pairs', 'right_options'
  let currentPair = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    const indent = line.search(/\S/);

    if (indent === 0) {
      inQuestions = false;
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx !== -1) {
        const key = trimmed.substring(0, colonIdx).trim();
        let val = trimmed.substring(colonIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }

        if (key === 'title') result.title = val;
        else if (key === 'description') result.description = val;
        else if (key === 'shuffle_questions') result.shuffle_questions = (val.toLowerCase() === 'true');
        else if (key === 'shuffle_options') result.shuffle_options = (val.toLowerCase() === 'true');
        else if (key === 'time_limit_minutes') result.time_limit_minutes = parseInt(val) || 0;
        else if (key === 'questions') {
          inQuestions = true;
        }
      }
    } else if (inQuestions) {
      if (trimmed.startsWith('-')) {
        let content = trimmed.substring(1).trim();
        const colonIdx = content.indexOf(':');
        
        // Cek apakah list item ini merupakan deklarasi pertanyaan baru
        const isNewQuestion = colonIdx !== -1 && 
          (content.startsWith('type:') || content.startsWith('name:') || content.startsWith('label:'));
          
        if (isNewQuestion) {
          if (currentQuestion) {
            result.questions.push(currentQuestion);
          }
          currentQuestion = {
            type: '',
            name: '',
            label: '',
            options: [],
            pairs: [],
            answer: null,
            category: ''
          };
          listMode = null;
          
          const key = content.substring(0, colonIdx).trim();
          let val = content.substring(colonIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
          }
          currentQuestion[key] = val;
        } else if (listMode === 'options' && currentQuestion) {
          if ((content.startsWith('"') && content.endsWith('"')) || (content.startsWith("'") && content.endsWith("'"))) {
            content = content.substring(1, content.length - 1);
          }
          currentQuestion.options.push(content);
        } else if (listMode === 'answer_list' && currentQuestion) {
          if ((content.startsWith('"') && content.endsWith('"')) || (content.startsWith("'") && content.endsWith("'"))) {
            content = content.substring(1, content.length - 1);
          }
          if (!Array.isArray(currentQuestion.answer)) {
            currentQuestion.answer = [];
          }
          currentQuestion.answer.push(content);
        } else if (listMode === 'pairs' && currentQuestion) {
          if (content.startsWith('left:')) {
            let leftVal = content.substring(5).trim();
            if ((leftVal.startsWith('"') && leftVal.endsWith('"')) || (leftVal.startsWith("'") && leftVal.endsWith("'"))) {
              leftVal = leftVal.substring(1, leftVal.length - 1);
            }
            currentPair = { left: leftVal, right_options: [] };
            currentQuestion.pairs.push(currentPair);
            listMode = 'pair_details';
          }
        } else if (listMode === 'right_options' && currentPair) {
          if ((content.startsWith('"') && content.endsWith('"')) || (content.startsWith("'") && content.endsWith("'"))) {
            content = content.substring(1, content.length - 1);
          }
          currentPair.right_options.push(content);
        }
      } else {
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx !== -1) {
          const key = trimmed.substring(0, colonIdx).trim();
          let val = trimmed.substring(colonIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
          }

          if (currentQuestion) {
            if (key === 'type' || key === 'name' || key === 'label' || key === 'category') {
              currentQuestion[key] = val;
              listMode = null;
            } else if (key === 'options') {
              listMode = 'options';
              if (val) {
                try {
                  currentQuestion.options = JSON.parse(val.replace(/'/g, '"'));
                } catch(e) {}
              }
            } else if (key === 'answer') {
              if (val.startsWith('[') && val.endsWith(']')) {
                try {
                  currentQuestion.answer = JSON.parse(val.replace(/'/g, '"'));
                } catch(e) {
                  currentQuestion.answer = [];
                }
              } else {
                currentQuestion.answer = val;
                listMode = 'answer_list';
              }
            } else if (key === 'pairs') {
              listMode = 'pairs';
            } else if (key === 'right_options') {
              listMode = 'right_options';
            } else if (key === 'left') {
              if (currentPair) {
                currentPair.left = val;
              }
            } else if (currentQuestion.type === 'matching' && listMode !== 'pairs') {
              if (!currentQuestion.answer || typeof currentQuestion.answer === 'string') {
                currentQuestion.answer = {};
              }
              currentQuestion.answer[key] = val;
            }
          }
        }
      }
    }
  }

  if (currentQuestion) {
    result.questions.push(currentQuestion);
  }

  return result;
}

/**
 * LCG (Linear Congruential Generator) seeded random
 * @param {string} seedStr
 * @returns {function} Rand function returning float 0-1
 */
function createRandom_(seedStr) {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) & 0xFFFFFFFF;
  }
  return function() {
    seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (seed >>> 0) / 0x100000000;
  };
}

/**
 * Mengacak array in-place dengan random generator
 * @param {Array} array
 * @param {function} randFn
 */
function shuffleArray_(array, randFn) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(randFn() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}

// ============================================================
// PUBLIC SOAL CRUD APIs
// ============================================================

function apiCreatePrePostSoal(pelatihanId, yamlDef) {
  try {
    if (!pelatihanId || !yamlDef) return apiError('Parameter tidak lengkap.', 'VALIDATION');
    const ss = getAppDb_();
    const sheet = ss.getSheetByName('PrePostSoal');
    if (!sheet) return apiError('Sheet PrePostSoal tidak ditemukan.', 'SYSTEM_ERROR');
    
    // Cek apakah sudah ada soal untuk pelatihan ini
    const data = sheet.getDataRange().getValues();
    const idxPid = data[0].indexOf('pelatihan_id');
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idxPid]).trim() === String(pelatihanId).trim()) {
        return apiError('Soal pre/post test untuk pelatihan ini sudah ada. Gunakan update.', 'ALREADY_EXISTS');
      }
    }
    
    // Validasi parse YAML
    const parsed = parsePrePostYaml_(yamlDef);
    if (!parsed || parsed.questions.length === 0) {
      return apiError('Format YAML tidak valid atau tidak memiliki pertanyaan.', 'YAML_PARSE_ERROR');
    }
    
    const soalId = 'SOAL-' + Utilities.getUuid().substring(0, 8).toUpperCase();
    const newRow = [
      soalId,
      pelatihanId,
      yamlDef,
      'draft', // status_pre
      'draft', // status_post
      '', // pre_dibuka_pada
      '', // pre_ditutup_pada
      '', // post_dibuka_pada
      ''  // post_ditutup_pada
    ];
    
    sheet.appendRow(newRow);
    return apiSuccess({ soal_id: soalId }, 'Definisi soal Pre/Post Test berhasil disimpan.');
  } catch (e) {
    return apiError('Gagal membuat soal: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

function apiUpdatePrePostSoal(soalId, yamlDef) {
  try {
    if (!soalId || !yamlDef) return apiError('Parameter tidak lengkap.', 'VALIDATION');
    const ss = getAppDb_();
    const sheet = ss.getSheetByName('PrePostSoal');
    if (!sheet) return apiError('Sheet PrePostSoal tidak ditemukan.', 'SYSTEM_ERROR');
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idxId = headers.indexOf('soal_id');
    const idxYaml = headers.indexOf('yaml_definition');
    const idxSPre = headers.indexOf('status_pre');
    const idxSPost = headers.indexOf('status_post');
    
    // Validasi parse YAML
    const parsed = parsePrePostYaml_(yamlDef);
    if (!parsed || parsed.questions.length === 0) {
      return apiError('Format YAML tidak valid atau tidak memiliki pertanyaan.', 'YAML_PARSE_ERROR');
    }
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idxId]).trim() === String(soalId).trim()) {
        const sPre = String(data[i][idxSPre]).trim().toLowerCase();
        const sPost = String(data[i][idxSPost]).trim().toLowerCase();
        
        if (sPre !== 'draft' || sPost !== 'draft') {
          return apiError('Soal tidak dapat diubah karena test sudah pernah dibuka.', 'INVALID_STATUS');
        }
        
        sheet.getRange(i + 1, idxYaml + 1).setValue(yamlDef);
        return apiSuccess(null, 'Definisi soal Pre/Post Test berhasil diperbarui.');
      }
    }
    return apiError('Soal tidak ditemukan.', 'NOT_FOUND');
  } catch (e) {
    return apiError('Gagal memperbarui soal: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

function apiGetPrePostSoal(soalId) {
  try {
    if (!soalId) return apiError('ID Soal harus diisi.', 'VALIDATION');
    const ss = getAppDb_();
    const sheet = ss.getSheetByName('PrePostSoal');
    if (!sheet) return apiError('Sheet PrePostSoal tidak ditemukan.', 'SYSTEM_ERROR');
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idxId = headers.indexOf('soal_id');
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idxId]).trim() === String(soalId).trim()) {
        let soal = {};
        for (let j = 0; j < headers.length; j++) {
          soal[headers[j]] = data[i][j];
        }
        return apiSuccess(soal);
      }
    }
    return apiError('Soal tidak ditemukan.', 'NOT_FOUND');
  } catch (e) {
    return apiError('Gagal mengambil soal: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

// ============================================================
// TEST CONTROL (TRAINER ACTIONS)
// ============================================================

function apiBukaPreTest(soalId) {
  return setTestStatus_(soalId, 'status_pre', 'aktif', 'pre_dibuka_pada');
}

function apiTutupPreTest(soalId) {
  return setTestStatus_(soalId, 'status_pre', 'ditutup', 'pre_ditutup_pada');
}

function apiBukaPostTest(soalId) {
  return setTestStatus_(soalId, 'status_post', 'aktif', 'post_dibuka_pada');
}

function apiTutupPostTest(soalId) {
  return setTestStatus_(soalId, 'status_post', 'ditutup', 'post_ditutup_pada');
}

function setTestStatus_(soalId, statusField, newStatus, timestampField) {
  try {
    const ss = getAppDb_();
    const sheet = ss.getSheetByName('PrePostSoal');
    if (!sheet) return apiError('Sheet PrePostSoal tidak ditemukan.', 'SYSTEM_ERROR');
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idxId = headers.indexOf('soal_id');
    const idxStatus = headers.indexOf(statusField);
    const idxTime = headers.indexOf(timestampField);
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idxId]).trim() === String(soalId).trim()) {
        sheet.getRange(i + 1, idxStatus + 1).setValue(newStatus);
        sheet.getRange(i + 1, idxTime + 1).setValue(new Date().toISOString());
        return apiSuccess(null, 'Status test berhasil diupdate.');
      }
    }
    return apiError('Soal tidak ditemukan.', 'NOT_FOUND');
  } catch (e) {
    return apiError('Gagal mengubah status test: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

// ============================================================
// PARTICIPANT TEST-TAKING APIs
// ============================================================

/**
 * Mengambil soal pre/post test untuk dikerjakan peserta
 * Melakukan pengacakan seeded dan membuang kunci jawaban
 * @param {string} soalId
 * @param {string} nipPeserta
 * @param {string} tipe 'pretest' | 'posttest'
 * @returns {object} Standard API response dengan test schema (aman tanpa kunci)
 */
function apiGetTestUntukPeserta(soalId, nipPeserta, tipe) {
  try {
    if (!soalId || !nipPeserta || !tipe) return apiError('Parameter tidak lengkap.', 'VALIDATION');
    const ss = getAppDb_();
    
    // 1. Ambil soal detail
    const sheetSoal = ss.getSheetByName('PrePostSoal');
    if (!sheetSoal) return apiError('Sheet Soal tidak ditemukan.', 'SYSTEM_ERROR');
    const dataS = sheetSoal.getDataRange().getValues();
    const headersS = dataS[0];
    const idxId = headersS.indexOf('soal_id');
    const idxYaml = headersS.indexOf('yaml_definition');
    const idxSPre = headersS.indexOf('status_pre');
    const idxSPost = headersS.indexOf('status_post');
    const idxPelId = headersS.indexOf('pelatihan_id');
    
    let soalRow = null;
    for (let i = 1; i < dataS.length; i++) {
      if (String(dataS[i][idxId]).trim() === String(soalId).trim()) {
        soalRow = dataS[i];
        break;
      }
    }
    
    if (!soalRow) return apiError('Soal tidak ditemukan.', 'NOT_FOUND');
    
    const pelatihanId = soalRow[idxPelId];
    const statusPre = String(soalRow[idxSPre]).toLowerCase();
    const statusPost = String(soalRow[idxSPost]).toLowerCase();
    
    // 2. Cek apakah test aktif
    if (tipe === 'pretest' && statusPre !== 'aktif') {
      return apiError('Pre-Test tidak sedang dibuka.', 'TEST_INACTIVE');
    }
    if (tipe === 'posttest' && statusPost !== 'aktif') {
      return apiError('Post-Test tidak sedang dibuka.', 'TEST_INACTIVE');
    }
    
    // 3. Cek apakah peserta sudah pernah mengisi test tipe ini
    const sheetResp = ss.getSheetByName('PrePostResponses');
    let hasSubmitted = false;
    if (sheetResp && sheetResp.getLastRow() > 1) {
      const dataResp = sheetResp.getDataRange().getValues();
      const rHeaders = dataResp[0];
      const idxPid = rHeaders.indexOf('pelatihan_id');
      const idxNip = rHeaders.indexOf('nip_peserta');
      const idxType = rHeaders.indexOf('tipe');
      
      const nipStr = String(nipPeserta).trim();
      for (let i = 1; i < dataResp.length; i++) {
        if (String(dataResp[i][idxPid]).trim() === String(pelatihanId).trim() && 
            String(dataResp[i][idxNip]).trim() === nipStr && 
            String(dataResp[i][idxType]).trim().toLowerCase() === tipe.toLowerCase()) {
          hasSubmitted = true;
          break;
        }
      }
    }
    
    if (hasSubmitted) {
      return apiError('Anda sudah mengerjakan test ini sebelumnya.', 'ALREADY_SUBMITTED');
    }
    
    // 4. Generate/Retrieve seed dari CacheService agar deterministik saat keluar-masuk
    const cache = CacheService.getScriptCache();
    const cacheKey = 'seed_' + soalId + '_' + nipPeserta + '_' + tipe;
    let seed = cache.get(cacheKey);
    if (!seed) {
      seed = String(Math.floor(Math.random() * 900000) + 100000);
      cache.put(cacheKey, seed, 7200); // Tahan 2 jam
    }
    
    // 5. Parse dan acak soal
    const testConfig = parsePrePostYaml_(soalRow[idxYaml]);
    if (!testConfig) return apiError('Gagal memproses definisi soal.', 'YAML_PARSE_ERROR');
    
    const rand = createRandom_(seed);
    
    // Salin array soal agar pengacakan tidak mengotori cache runtime
    let clientQuestions = testConfig.questions.map(q => {
      let copy = {
        type: q.type,
        name: q.name,
        label: q.label,
        category: q.category || 'Umum'
      };
      
      // Salin options / pairs
      if (q.options) {
        copy.options = [...q.options];
      }
      if (q.pairs) {
        // deep copy pairs
        copy.pairs = q.pairs.map(p => ({
          left: p.left,
          right_options: [...p.right_options]
        }));
      }
      
      // BUANG FIELD KUNCI JAWABAN (agar aman dari inspect element browser)
      delete copy.answer;
      return copy;
    });
    
    // Lakukan pengacakan jika di-enable di konfigurasi
    if (testConfig.shuffle_questions) {
      shuffleArray_(clientQuestions, rand);
    }
    
    if (testConfig.shuffle_options) {
      clientQuestions.forEach(q => {
        if (q.options && q.type !== 'boolean') { // benar/salah tidak diacak opsi
          shuffleArray_(q.options, rand);
        }
        if (q.pairs) {
          // Acak left items
          shuffleArray_(q.pairs, rand);
          // Acak right_options untuk tiap item
          q.pairs.forEach(p => {
            shuffleArray_(p.right_options, rand);
          });
        }
      });
    }
    
    return apiSuccess({
      title: testConfig.title,
      description: testConfig.description,
      time_limit_minutes: testConfig.time_limit_minutes,
      questions: clientQuestions,
      seed: seed
    });
  } catch (e) {
    return apiError('Gagal memuat soal peserta: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Menyimpan jawaban pre/post test peserta
 * Menghitung skor secara aman di sisi server menggunakan YAML asli
 * @param {string} soalId
 * @param {string} nipPeserta
 * @param {string} tipe 'pretest' | 'posttest'
 * @param {object} jawaban Map { nama_soal: jawaban_value }
 * @returns {object} Response standard dengan hasil skor
 */
function apiSubmitTestJawaban(soalId, nipPeserta, tipe, jawaban) {
  try {
    if (!soalId || !nipPeserta || !tipe || !jawaban) {
      return apiError('Parameter tidak lengkap.', 'VALIDATION');
    }
    
    const ss = getAppDb_();
    
    // 1. Load Soal & status
    const sheetSoal = ss.getSheetByName('PrePostSoal');
    if (!sheetSoal) return apiError('Sheet Soal tidak ditemukan.', 'SYSTEM_ERROR');
    
    const dataS = sheetSoal.getDataRange().getValues();
    const idxId = dataS[0].indexOf('soal_id');
    const idxYaml = dataS[0].indexOf('yaml_definition');
    const idxSPre = dataS[0].indexOf('status_pre');
    const idxSPost = dataS[0].indexOf('status_post');
    const idxPelId = dataS[0].indexOf('pelatihan_id');
    
    let soalRow = null;
    for (let i = 1; i < dataS.length; i++) {
      if (String(dataS[i][idxId]).trim() === String(soalId).trim()) {
        soalRow = dataS[i];
        break;
      }
    }
    if (!soalRow) return apiError('Soal tidak ditemukan.', 'NOT_FOUND');
    
    const pelatihanId = soalRow[idxPelId];
    const statusPre = String(soalRow[idxSPre]).toLowerCase();
    const statusPost = String(soalRow[idxSPost]).toLowerCase();
    
    // Cek apakah test aktif
    if (tipe === 'pretest' && statusPre !== 'aktif') {
      return apiError('Pre-Test tidak aktif.', 'TEST_INACTIVE');
    }
    if (tipe === 'posttest' && statusPost !== 'aktif') {
      return apiError('Post-Test tidak aktif.', 'TEST_INACTIVE');
    }
    
    // 2. Cek apakah sudah pernah submit tipe ini
    const sheetResp = ss.getSheetByName('PrePostResponses');
    if (!sheetResp) return apiError('Sheet responses tidak ditemukan.', 'SYSTEM_ERROR');
    
    const dataResp = sheetResp.getDataRange().getValues();
    const idxPid = dataResp[0].indexOf('pelatihan_id');
    const idxNip = dataResp[0].indexOf('nip_peserta');
    const idxType = dataResp[0].indexOf('tipe');
    
    const nipStr = String(nipPeserta).trim();
    for (let i = 1; i < dataResp.length; i++) {
      if (String(dataResp[i][idxPid]).trim() === String(pelatihanId).trim() && 
          String(dataResp[i][idxNip]).trim() === nipStr && 
          String(dataResp[i][idxType]).trim().toLowerCase() === tipe.toLowerCase()) {
        return apiError('Anda sudah mengumpulkan test ini sebelumnya.', 'ALREADY_SUBMITTED');
      }
    }
    
    // 3. Load YAML asli untuk grading
    const testConfig = parsePrePostYaml_(soalRow[idxYaml]);
    if (!testConfig) return apiError('Gagal memproses soal YAML.', 'YAML_PARSE_ERROR');
    
    // 4. Hitung Skor Otomatis
    let totalQuestions = testConfig.questions.length;
    if (totalQuestions === 0) return apiError('Soal tidak valid.', 'NO_QUESTIONS');
    
    let sumScore = 0.0;
    let categoryScoresMap = {}; // categoryName: { totalPoints: 0, count: 0 }
    
    testConfig.questions.forEach(q => {
      let qName = q.name;
      let qType = q.type;
      let qCat = q.category || 'Umum';
      let qAns = q.answer;
      
      let uAns = jawaban[qName];
      let score = 0.0;
      
      if (uAns !== undefined && uAns !== null) {
        if (qType === 'radio' || qType === 'boolean') {
          // Case-insensitive comparison
          if (String(uAns).trim().toLowerCase() === String(qAns).trim().toLowerCase()) {
            score = 1.0;
          }
        } 
        else if (qType === 'checkbox') {
          // Checklist multiple options
          if (Array.isArray(uAns) && Array.isArray(qAns)) {
            let userSet = new Set(uAns.map(v => String(v).trim().toLowerCase()));
            let correctSet = new Set(qAns.map(v => String(v).trim().toLowerCase()));
            
            let correctChosen = 0;
            let wrongChosen = 0;
            
            userSet.forEach(item => {
              if (correctSet.has(item)) correctChosen++;
              else wrongChosen++;
            });
            
            let pts = correctChosen - wrongChosen;
            if (pts < 0) pts = 0;
            score = qAns.length > 0 ? (pts / qAns.length) : 0;
          }
        } 
        else if (qType === 'matching') {
          // Memasangkan pasangan key-value
          if (typeof uAns === 'object' && typeof qAns === 'object' && uAns !== null && qAns !== null) {
            let correctPairs = 0;
            let totalPairs = Object.keys(qAns).length;
            
            for (let leftKey in qAns) {
              let userVal = uAns[leftKey];
              let correctVal = qAns[leftKey];
              if (userVal !== undefined && String(userVal).trim().toLowerCase() === String(correctVal).trim().toLowerCase()) {
                correctPairs++;
              }
            }
            score = totalPairs > 0 ? (correctPairs / totalPairs) : 0.0;
          }
        }
      }
      
      sumScore += score;
      
      // Tambahkan ke kategori
      if (!categoryScoresMap[qCat]) {
        categoryScoresMap[qCat] = { sum: 0.0, count: 0 };
      }
      categoryScoresMap[qCat].sum += score;
      categoryScoresMap[qCat].count += 1;
    });
    
    // Hitung persentase skor total (0-100)
    let skorTotal = (sumScore / totalQuestions) * 100.0;
    // Rata-rata dibulatkan 2 desimal
    skorTotal = Math.round(skorTotal * 100) / 100;
    
    // Hitung skor per kategori
    let skorKategoriObj = {};
    Object.keys(categoryScoresMap).forEach(cat => {
      let percent = (categoryScoresMap[cat].sum / categoryScoresMap[cat].count) * 100.0;
      skorKategoriObj[cat] = Math.round(percent * 100) / 100;
    });
    
    // 5. Simpan Response ke Sheet
    const responseId = 'PPR-' + Utilities.getUuid().substring(0, 8).toUpperCase();
    const cache = CacheService.getScriptCache();
    const cacheKey = 'seed_' + soalId + '_' + nipPeserta + '_' + tipe;
    let seedUsed = cache.get(cacheKey) || '0';
    
    const newResponseRow = [
      responseId,
      soalId,
      pelatihanId,
      nipStr,
      tipe.toLowerCase(),
      JSON.stringify(jawaban),
      skorTotal,
      JSON.stringify(skorKategoriObj),
      seedUsed,
      new Date().toISOString()
    ];
    
    sheetResp.appendRow(newResponseRow);
    
    // Update status kehadiran di PelatihanPeserta jika ini pretest
    if (tipe.toLowerCase() === 'pretest') {
      const sheetPeserta = ss.getSheetByName('PelatihanPeserta');
      if (sheetPeserta && sheetPeserta.getLastRow() > 1) {
        const dtPes = sheetPeserta.getDataRange().getValues();
        const pIdIdx = dtPes[0].indexOf('pelatihan_id');
        const nipIdx = dtPes[0].indexOf('nip_peserta');
        const statIdx = dtPes[0].indexOf('status');
        
        for (let i = 1; i < dtPes.length; i++) {
          if (String(dtPes[i][pIdIdx]).trim() === String(pelatihanId).trim() && 
              String(dtPes[i][nipIdx]).trim() === nipStr) {
            sheetPeserta.getRange(i + 1, statIdx + 1).setValue('hadir');
            break;
          }
        }
      }
    } else if (tipe.toLowerCase() === 'posttest') {
      // Selesaikan kehadiran di PelatihanPeserta jika ini posttest
      const sheetPeserta = ss.getSheetByName('PelatihanPeserta');
      if (sheetPeserta && sheetPeserta.getLastRow() > 1) {
        const dtPes = sheetPeserta.getDataRange().getValues();
        const pIdIdx = dtPes[0].indexOf('pelatihan_id');
        const nipIdx = dtPes[0].indexOf('nip_peserta');
        const statIdx = dtPes[0].indexOf('status');
        
        for (let i = 1; i < dtPes.length; i++) {
          if (String(dtPes[i][pIdIdx]).trim() === String(pelatihanId).trim() && 
              String(dtPes[i][nipIdx]).trim() === nipStr) {
            sheetPeserta.getRange(i + 1, statIdx + 1).setValue('selesai');
            break;
          }
        }
      }
    }
    
    return apiSuccess({ skor: skorTotal }, 'Jawaban berhasil dikirim.');
  } catch (e) {
    return apiError('Gagal mengirim jawaban: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Mengambil skor pre & post test pribadi pengawas
 * @param {string} pelatihanId
 * @param {string} nipPeserta
 * @returns {object} Response standard dengan skor pre & post
 */
function apiGetHasilPribadi(pelatihanId, nipPeserta) {
  try {
    if (!pelatihanId || !nipPeserta) return apiError('Parameter tidak lengkap.', 'VALIDATION');
    const ss = getAppDb_();
    
    const sheetResp = ss.getSheetByName('PrePostResponses');
    let res = {
      pre: null,
      post: null
    };
    
    if (sheetResp && sheetResp.getLastRow() > 1) {
      const dataResp = sheetResp.getDataRange().getValues();
      const headers = dataResp[0];
      const idxPid = headers.indexOf('pelatihan_id');
      const idxNip = headers.indexOf('nip_peserta');
      const idxType = headers.indexOf('tipe');
      const idxSkor = headers.indexOf('skor_total');
      const idxKategori = headers.indexOf('skor_kategori_json');
      const idxTime = headers.indexOf('timestamp');
      
      const nipStr = String(nipPeserta).trim();
      for (let i = 1; i < dataResp.length; i++) {
        if (String(dataResp[i][idxPid]).trim() === String(pelatihanId).trim() && 
            String(dataResp[i][idxNip]).trim() === nipStr) {
          
          let type = String(dataResp[i][idxType]).trim().toLowerCase();
          let payload = {
            skor: Number(dataResp[i][idxSkor]),
            kategori: JSON.parse(dataResp[i][idxKategori] || '{}'),
            timestamp: dataResp[i][idxTime]
          };
          
          if (type === 'pretest') res.pre = payload;
          else if (type === 'posttest') res.post = payload;
        }
      }
    }
    
    return apiSuccess(res);
  } catch (e) {
    return apiError('Gagal mengambil hasil pribadi: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

// ============================================================
// STATISTICAL ANALYSIS MODULE
// ============================================================

/**
 * Mengambil semua respons pre & post untuk dianalisis
 * @param {string} pelatihanId
 * @returns {object} List respons pre & post
 */
function apiGetHasilPrePost(pelatihanId) {
  try {
    if (!pelatihanId) return apiError('ID Pelatihan harus diisi.', 'VALIDATION');
    const ss = getAppDb_();
    
    const sheetResp = ss.getSheetByName('PrePostResponses');
    let list = [];
    
    if (sheetResp && sheetResp.getLastRow() > 1) {
      const dataResp = sheetResp.getDataRange().getValues();
      const headers = dataResp[0];
      const idxPid = headers.indexOf('pelatihan_id');
      const idxNip = headers.indexOf('nip_peserta');
      const idxType = headers.indexOf('tipe');
      const idxSkor = headers.indexOf('skor_total');
      const idxKategori = headers.indexOf('skor_kategori_json');
      const idxTime = headers.indexOf('timestamp');
      
      for (let i = 1; i < dataResp.length; i++) {
        if (String(dataResp[i][idxPid]).trim() === String(pelatihanId).trim()) {
          list.push({
            nip: dataResp[i][idxNip],
            tipe: dataResp[i][idxType],
            skor: Number(dataResp[i][idxSkor]),
            kategori: JSON.parse(dataResp[i][idxKategori] || '{}'),
            timestamp: dataResp[i][idxTime]
          });
        }
      }
    }
    
    return apiSuccess(list);
  } catch (e) {
    return apiError('Gagal memuat respons test: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Approximation cumulative normal standard CDF (Abramowitz & Stegun 26.2.17)
 * @param {number} z
 * @returns {number} probability
 */
function normalCDF_(z) {
  const p = 0.2316419;
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  
  const t = 1 / (1 + p * Math.abs(z));
  const factor = 1 - 1 / Math.sqrt(2 * Math.PI) * Math.exp(-z * z / 2) * (b1 * t + b2 * t*t + b3 * t*t*t + b4 * t*t*t*t + b5 * t*t*t*t*t);
  
  return z >= 0 ? factor : 1 - factor;
}

/**
 * Menghitung p-value dari t-value untuk paired t-test menggunakan Wallace Approximation
 * @param {number} t
 * @param {number} df degrees of freedom
 * @returns {number} two-tailed p-value
 */
function tDist2TailPValue_(t, df) {
  if (df <= 0) return 1.0;
  t = Math.abs(t);
  // Wallace (1959) approximation
  const z = Math.sqrt(df * Math.log(1 + t*t / df) * (1 - 1 / (2 * df)));
  const p = 2 * (1 - normalCDF_(z));
  return Math.min(Math.max(p, 0.0), 1.0); // clamp 0-1
}

/**
 * Menghitung analisis statistik lengkap: Paired T-Test, Cohen's d Effect Size, Kategori Comparison, Detail Peserta
 * @param {string} pelatihanId
 * @returns {object} Analisis detail untuk visualisasi
 */
function apiHitungAnalisis(pelatihanId) {
  try {
    if (!pelatihanId) return apiError('ID Pelatihan harus diisi.', 'VALIDATION');
    const ss = getAppDb_();
    
    // 1. Get training details
    const sheetP = ss.getSheetByName('Pelatihan');
    if (!sheetP) return apiError('Sheet Pelatihan tidak ada.', 'SYSTEM_ERROR');
    const dataP = sheetP.getDataRange().getValues();
    const idxId = dataP[0].indexOf('pelatihan_id');
    const idxJudul = dataP[0].indexOf('judul');
    const idxTglM = dataP[0].indexOf('tanggal_mulai');
    const idxTglS = dataP[0].indexOf('tanggal_selesai');
    const idxPelatih = dataP[0].indexOf('nip_pelatih');
    
    let pelatihanObj = null;
    for (let i = 1; i < dataP.length; i++) {
      if (String(dataP[i][idxId]).trim() === String(pelatihanId).trim()) {
        pelatihanObj = {
          judul: dataP[i][idxJudul],
          tanggal_mulai: dataP[i][idxTglM],
          tanggal_selesai: dataP[i][idxTglS],
          nip_pelatih: dataP[i][idxPelatih]
        };
        break;
      }
    }
    
    if (!pelatihanObj) return apiError('Pelatihan tidak ditemukan.', 'NOT_FOUND');
    
    // Tambah nama pelatih
    let prof = getProfile(pelatihanObj.nip_pelatih);
    pelatihanObj.nama_pelatih = prof ? prof.Nama : 'Pelatih';
    
    // 2. Baca Peserta Terdaftar
    const sheetPes = ss.getSheetByName('PelatihanPeserta');
    let pesertaMap = {}; // NIP: { nama, kabupaten }
    if (sheetPes && sheetPes.getLastRow() > 1) {
      const dataPes = sheetPes.getDataRange().getValues();
      const idxPid = dataPes[0].indexOf('pelatihan_id');
      const idxNip = dataPes[0].indexOf('nip_peserta');
      const idxNama = dataPes[0].indexOf('nama_peserta');
      const idxKab = dataPes[0].indexOf('kabupaten');
      
      for (let i = 1; i < dataPes.length; i++) {
        if (String(dataPes[i][idxPid]).trim() === String(pelatihanId).trim()) {
          let nip = String(dataPes[i][idxNip]).trim();
          pesertaMap[nip] = {
            nama: dataPes[i][idxNama],
            kabupaten: dataPes[i][idxKab]
          };
        }
      }
    }
    
    // 3. Baca Responses
    const respRes = apiGetHasilPrePost(pelatihanId);
    if (!respRes.success) return respRes;
    const responses = respRes.data;
    
    // Kelompokkan responses berdasarkan NIP
    let pairsMap = {}; // NIP: { pre: null/val, post: null/val }
    
    responses.forEach(r => {
      let nip = r.nip;
      if (!pairsMap[nip]) {
        pairsMap[nip] = { pre: null, post: null };
      }
      if (r.tipe === 'pretest') pairsMap[nip].pre = r;
      else if (r.tipe === 'posttest') pairsMap[nip].post = r;
    });
    
    // Filter hanya peserta yang mengisi KEDUA test (Pre dan Post) untuk paired analysis
    let validPairs = [];
    let detailPesertaList = []; // Untuk tabel per-peserta
    
    Object.keys(pairsMap).forEach(nip => {
      let p = pairsMap[nip];
      let pMeta = pesertaMap[nip] || { nama: 'Pengawas (' + nip + ')', kabupaten: 'Lainnya' };
      
      let preSkor = p.pre ? p.pre.skor : null;
      let postSkor = p.post ? p.post.skor : null;
      
      detailPesertaList.push({
        nip: nip,
        nama: pMeta.nama,
        kabupaten: pMeta.kabupaten,
        pre_skor: preSkor,
        post_skor: postSkor,
        diff: (preSkor !== null && postSkor !== null) ? (postSkor - preSkor) : null
      });
      
      if (preSkor !== null && postSkor !== null) {
        validPairs.push({
          nip: nip,
          pre: preSkor,
          post: postSkor,
          diff: postSkor - preSkor,
          pre_kat: p.pre.kategori,
          post_kat: p.post.kategori
        });
      }
    });
    
    let n = validPairs.length;
    let ringkasan = { n_peserta: n, mean_pre: 0, mean_post: 0, mean_diff: 0 };
    let statistik = { t_value: 0, df: 0, p_value: 1.0, signifikan: false, cohens_d: 0, effect_interpretation: 'N/A' };
    let kategoriList = [];
    
    if (n > 1) {
      // 4. Hitung T-Test & Effect Size
      let sumPre = 0, sumPost = 0, sumDiff = 0;
      validPairs.forEach(p => {
        sumPre += p.pre;
        sumPost += p.post;
        sumDiff += p.diff;
      });
      
      let meanPre = sumPre / n;
      let meanPost = sumPost / n;
      let meanDiff = sumDiff / n;
      
      // Standard Deviation of Differences
      let sumSqDiff = 0;
      validPairs.forEach(p => {
        sumSqDiff += Math.pow(p.diff - meanDiff, 2);
      });
      let sdDiff = Math.sqrt(sumSqDiff / (n - 1));
      
      // Standard Error of Mean Difference
      let seDiff = sdDiff / Math.sqrt(n);
      
      // T-Value
      let tVal = seDiff > 0 ? (meanDiff / seDiff) : 0;
      let df = n - 1;
      let pVal = tDist2TailPValue_(tVal, df);
      
      // Standard Deviation Pre & Post (untuk Cohen's d)
      let sumSqPre = 0, sumSqPost = 0;
      validPairs.forEach(p => {
        sumSqPre += Math.pow(p.pre - meanPre, 2);
        sumSqPost += Math.pow(p.post - meanPost, 2);
      });
      let sdPre = Math.sqrt(sumSqPre / (n - 1));
      let sdPost = Math.sqrt(sumSqPost / (n - 1));
      
      // Cohen's d (paired version: using standard deviations pooled)
      let sdPooled = Math.sqrt((Math.pow(sdPre, 2) + Math.pow(sdPost, 2)) / 2.0);
      let cohensD = sdPooled > 0 ? ((meanPost - meanPre) / sdPooled) : 0;
      
      // Interpretasi Cohen's d
      let effectInterpretation = 'Sangat Kecil';
      let dAbs = Math.abs(cohensD);
      if (dAbs < 0.2) effectInterpretation = 'Sangat Kecil';
      else if (dAbs < 0.5) effectInterpretation = 'Kecil';
      else if (dAbs < 0.8) effectInterpretation = 'Sedang';
      else effectInterpretation = 'Besar';
      
      ringkasan = {
        n_peserta: n,
        mean_pre: Math.round(meanPre * 100) / 100,
        mean_post: Math.round(meanPost * 100) / 100,
        mean_diff: Math.round(meanDiff * 100) / 100
      };
      
      statistik = {
        t_value: Math.round(tVal * 1000) / 1000,
        df: df,
        p_value: pVal < 0.001 ? '< 0.001' : (Math.round(pVal * 1000) / 1000),
        signifikan: pVal < 0.05,
        cohens_d: Math.round(cohensD * 100) / 100,
        effect_interpretation: effectInterpretation
      };
      
      // 5. Analisis Per Kategori
      let categorySums = {}; // catName: { sumPre, sumPost, count }
      validPairs.forEach(p => {
        // Gabungkan kategori dari Pre & Post (harus identik)
        let cats = Object.keys(p.pre_kat);
        cats.forEach(c => {
          if (!categorySums[c]) {
            categorySums[c] = { sumPre: 0, sumPost: 0, count: 0 };
          }
          categorySums[c].sumPre += p.pre_kat[c] || 0;
          categorySums[c].sumPost += p.post_kat[c] || 0;
          categorySums[c].count += 1;
        });
      });
      
      Object.keys(categorySums).forEach(cName => {
        let count = categorySums[cName].count;
        let cMeanPre = categorySums[cName].sumPre / count;
        let cMeanPost = categorySums[cName].sumPost / count;
        kategoriList.push({
          kategori: cName,
          mean_pre: Math.round(cMeanPre * 100) / 100,
          mean_post: Math.round(cMeanPost * 100) / 100,
          mean_diff: Math.round((cMeanPost - cMeanPre) * 100) / 100
        });
      });
    }
    
    return apiSuccess({
      pelatihan: pelatihanObj,
      ringkasan: ringkasan,
      statistik: statistik,
      kategori: kategoriList,
      detail_peserta: detailPesertaList
    });
  } catch (e) {
    return apiError('Gagal menghitung analisis: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Mengekspor analisis pelatihan ke file spreadsheet Google Sheets baru
 * dan mengembalikan link url untuk dibuka/didownload
 * @param {string} pelatihanId
 * @returns {object} Standard API response dengan url spreadsheet
 */
function apiExportAnalisisExcel(pelatihanId) {
  try {
    const analysisRes = apiHitungAnalisis(pelatihanId);
    if (!analysisRes.success) return analysisRes;
    
    const analysis = analysisRes.data;
    const ss = SpreadsheetApp.create("Analisis Pelatihan - " + analysis.pelatihan.judul);
    
    // Sheet 1: Ringkasan
    const sh1 = ss.getActiveSheet();
    sh1.setName("Ringkasan Statistik");
    sh1.appendRow(["ANALISIS HASIL PRE & POST TEST"]);
    sh1.appendRow(["Pelatihan:", analysis.pelatihan.judul]);
    sh1.appendRow(["Pelatih:", analysis.pelatihan.nama_pelatih || ""]);
    sh1.appendRow(["Tanggal:", analysis.pelatihan.tanggal_mulai + " s.d " + analysis.pelatihan.tanggal_selesai]);
    sh1.appendRow([]);
    
    sh1.appendRow(["RINGKASAN"]);
    sh1.appendRow(["Jumlah Peserta Mengisi:", analysis.ringkasan.n_peserta]);
    sh1.appendRow(["Rata-rata Pre-Test:", analysis.ringkasan.mean_pre]);
    sh1.appendRow(["Rata-rata Post-Test:", analysis.ringkasan.mean_post]);
    sh1.appendRow(["Rata-rata Peningkatan:", analysis.ringkasan.mean_diff]);
    sh1.appendRow([]);
    
    sh1.appendRow(["UJI STATISTIK"]);
    sh1.appendRow(["Paired T-Test (t-statistic):", analysis.statistik.t_value]);
    sh1.appendRow(["Degrees of Freedom (df):", analysis.statistik.df]);
    sh1.appendRow(["P-Value:", analysis.statistik.p_value]);
    sh1.appendRow(["Kesimpulan T-Test:", analysis.statistik.signifikan ? "Signifikan (Terdapat peningkatan nyata)" : "Tidak Signifikan"]);
    sh1.appendRow([]);
    
    sh1.appendRow(["EFFECT SIZE"]);
    sh1.appendRow(["Cohen's d:", analysis.statistik.cohens_d]);
    sh1.appendRow(["Interpretasi Efek:", analysis.statistik.effect_interpretation]);
    
    // Style ringkasan
    sh1.getRange("A1").setFontWeight("bold").setFontSize(14);
    sh1.getRange("A6").setFontWeight("bold").setFontSize(12);
    sh1.getRange("A11").setFontWeight("bold").setFontSize(12);
    sh1.getRange("A17").setFontWeight("bold").setFontSize(12);
    sh1.getRange("A1:B22").setNumberFormat("@");
    
    // Sheet 2: Hasil Per Kategori
    const sh2 = ss.insertSheet("Kategori");
    sh2.appendRow(["Kategori Soal", "Rata-rata Pre", "Rata-rata Post", "Peningkatan (Delta)"]);
    analysis.kategori.forEach(k => {
      sh2.appendRow([k.kategori, k.mean_pre, k.mean_post, k.mean_diff]);
    });
    sh2.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#d9ead3");
    
    // Sheet 3: Detail Peserta
    const sh3 = ss.insertSheet("Detail Peserta");
    sh3.appendRow(["No", "NIP", "Nama Peserta", "Kabupaten", "Skor Pre-Test", "Skor Post-Test", "Peningkatan (Delta)"]);
    analysis.detail_peserta.forEach((dp, idx) => {
      sh3.appendRow([idx + 1, dp.nip, dp.nama, dp.kabupaten, dp.pre_skor !== null ? dp.pre_skor : 'Belum mengisi', dp.post_skor !== null ? dp.post_skor : 'Belum mengisi', dp.diff !== null ? dp.diff : '-']);
    });
    sh3.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#d9ead3");
    
    // Set sharing public view so user can open it
    const file = DriveApp.getFileById(ss.getId());
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Add to the folder of the database if possible
    try {
      const dbFile = DriveApp.getFileById(APP_DB_ID);
      const parents = dbFile.getParents();
      if (parents.hasNext()) {
        parents.next().addFile(file);
        DriveApp.getRootFolder().removeFile(file); // remove from root if added to parent
      }
    } catch(e) {}
    
    return apiSuccess({ url: ss.getUrl() }, "Analisis berhasil diexport ke Spreadsheet.");
  } catch (e) {
    return apiError("Gagal mengexport analisis ke Excel: " + e.toString(), "EXPORT_ERROR");
  }
}
