/**
 * SURVEY.JS — Backend untuk Survey Awal, Feedback Akhir, dan Sertifikat Pelatihan
 *
 * Alur:
 *  1. Peserta join → Survey Awal (YAML per-pelatihan atau default)
 *  2. Pelatihan selesai → Feedback Akhir (YAML per-pelatihan atau default)
 *  3. Feedback terisi + Pre&Post Test selesai → Sertifikat (Google Docs mail merge)
 */

// ============================================================
// DEFAULT YAML TEMPLATES (fallback jika pelatih belum set)
// ============================================================

const DEFAULT_SURVEY_AWAL_YAML = `title: Survey Awal Pelatihan
description: Bantu kami mengenal harapan Anda sebelum memulai pelatihan.
questions:
  - name: motivasi
    label: Apa motivasi utama Anda mengikuti pelatihan ini?
    type: radio
    required: true
    options:
      - Pengembangan kompetensi profesional
      - Kebutuhan tugas dari dinas
      - Meningkatkan kualitas pengawasan madrasah
      - Ingin mengenal konsep KBC lebih dalam
      - Lainnya

  - name: pengalaman_kbc
    label: Apakah Anda sudah pernah menerapkan konsep KBC di sekolah binaan?
    type: radio
    required: true
    options:
      - Sudah menerapkan sepenuhnya
      - Sudah mencoba sebagian
      - Belum, tapi pernah membaca/mendengar
      - Belum tahu sama sekali

  - name: harapan
    label: Apa harapan utama Anda dari pelatihan ini?
    type: textarea
    placeholder: Tuliskan harapan Anda secara singkat...
    required: false

  - name: kesiapan
    label: Seberapa siap Anda mengikuti pelatihan ini?
    type: rating
    max: 5
    required: true
`;

const DEFAULT_FEEDBACK_YAML = `title: Feedback Akhir Pelatihan
description: Pendapat Anda sangat berharga untuk meningkatkan kualitas pelatihan ke depannya.
questions:
  - name: rating_keseluruhan
    label: Rating keseluruhan pelatihan ini
    type: rating
    max: 5
    required: true

  - name: kualitas_materi
    label: Kualitas dan relevansi materi pelatihan
    type: rating
    max: 5
    required: true

  - name: kemampuan_pelatih
    label: Kemampuan dan cara penyampaian pelatih
    type: rating
    max: 5
    required: true

  - name: manfaat_praktis
    label: Seberapa bermanfaat pelatihan ini secara praktis bagi Anda?
    type: rating
    max: 5
    required: true

  - name: rekomendasi
    label: Apakah Anda merekomendasikan pelatihan ini kepada rekan sesama pengawas?
    type: radio
    required: true
    options:
      - Ya, sangat merekomendasikan
      - Ya, merekomendasikan
      - Tidak yakin
      - Tidak merekomendasikan

  - name: saran
    label: Saran dan masukan untuk peningkatan pelatihan berikutnya
    type: textarea
    placeholder: Tuliskan saran Anda...
    required: false
`;

// ============================================================
// UTILITY: PARSE SURVEY/FEEDBACK YAML
// ============================================================

/**
 * Parse YAML survey/feedback (format sederhana, bukan full YAML parser)
 * @param {string} yamlStr
 * @returns {object|null} { title, description, questions: [{name, label, type, options, max, required, placeholder}] }
 */
function parseSurveyYaml_(yamlStr) {
  if (!yamlStr || typeof yamlStr !== 'string') return null;

  // Coba parse jika sudah JSON (cached)
  if (yamlStr.trim().startsWith('{')) {
    try { return JSON.parse(yamlStr); } catch(e) {}
  }

  try {
    const lines = yamlStr.split('\n');
    const result = { title: '', description: '', questions: [] };
    let currentQuestion = null;
    let inOptions = false;
    let inQuestions = false;

    for (let raw of lines) {
      const line = raw;
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const indent = line.search(/\S/);

      if (indent === 0) {
        if (trimmed.startsWith('title:')) {
          result.title = trimmed.substring('title:'.length).trim().replace(/^['"]|['"]$/g, '');
        } else if (trimmed.startsWith('description:')) {
          result.description = trimmed.substring('description:'.length).trim().replace(/^['"]|['"]$/g, '');
        } else if (trimmed.startsWith('questions:')) {
          inQuestions = true;
        }
        inOptions = false;
        continue;
      }

      if (inQuestions) {
        if (trimmed.startsWith('- name:')) {
          if (currentQuestion) result.questions.push(currentQuestion);
          currentQuestion = {
            name: trimmed.substring('- name:'.length).trim(),
            label: '', type: 'text', required: false, options: [], max: 5, placeholder: ''
          };
          inOptions = false;
        } else if (currentQuestion) {
          if (trimmed.startsWith('label:')) {
            currentQuestion.label = trimmed.substring('label:'.length).trim().replace(/^['"]|['"]$/g, '');
          } else if (trimmed.startsWith('type:')) {
            currentQuestion.type = trimmed.substring('type:'.length).trim();
          } else if (trimmed.startsWith('required:')) {
            currentQuestion.required = trimmed.substring('required:'.length).trim().toLowerCase() === 'true';
          } else if (trimmed.startsWith('max:')) {
            currentQuestion.max = parseInt(trimmed.substring('max:'.length).trim()) || 5;
          } else if (trimmed.startsWith('placeholder:')) {
            currentQuestion.placeholder = trimmed.substring('placeholder:'.length).trim().replace(/^['"]|['"]$/g, '');
          } else if (trimmed.startsWith('options:')) {
            inOptions = true;
          } else if (inOptions && trimmed.startsWith('- ')) {
            currentQuestion.options.push(trimmed.substring(2).trim().replace(/^['"]|['"]$/g, ''));
          }
        }
      }
    }
    if (currentQuestion) result.questions.push(currentQuestion);
    return result;
  } catch(e) {
    console.error('parseSurveyYaml_ error: ' + e.toString());
    return null;
  }
}

// ============================================================
// UTIL: GET SURVEY/FEEDBACK YAML FOR A PELATIHAN
// ============================================================

/**
 * Ambil konfigurasi YAML survey awal untuk suatu pelatihan.
 * Prioritas: custom per-pelatihan → default global
 */
function getSurveyYamlForPelatihan_(pelatihanId, type) {
  const ss = getAppDb_();
  const sheet = ss.getSheetByName('Pelatihan');
  if (!sheet) return type === 'survey' ? DEFAULT_SURVEY_AWAL_YAML : DEFAULT_FEEDBACK_YAML;

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idxId = headers.indexOf('pelatihan_id');
  const idxKategori = headers.indexOf('kategori');

  if (idxId === -1 || idxKategori === -1) return type === 'survey' ? DEFAULT_SURVEY_AWAL_YAML : DEFAULT_FEEDBACK_YAML;

  let kategori = 'Umum';
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idxId]).trim() === String(pelatihanId).trim()) {
      kategori = String(data[i][idxKategori] || 'Umum').trim();
      break;
    }
  }

  try {
    const templatesFolder = getOrCreateTemplatesRoot_();
    const kFolders = templatesFolder.getFoldersByName(kategori);
    if (kFolders.hasNext()) {
      const folder = kFolders.next();
      const filename = type === 'survey' ? 'survey.yaml' : 'feedback.yaml';
      const files = folder.getFilesByName(filename);
      if (files.hasNext()) {
        return files.next().getBlob().getDataAsString();
      }
    }
  } catch(e) {
    console.error('getSurveyYamlForPelatihan_ error: ' + e.toString());
  }

  return null;
}

/**
 * Pastikan kolom survey_yaml, feedback_yaml, sertifikat_doc_id ada di sheet Pelatihan.
 * Kolom ditambahkan dinamis jika belum ada.
 */
function ensurePelatihanExtColumns_(sheet) {
  if (!sheet || sheet.getLastRow() < 1) return;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const needed = ['sertifikat_doc_id', 'kategori'];
  needed.forEach(col => {
    if (headers.indexOf(col) === -1) {
      const newCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, newCol).setValue(col);
    }
  });
}

/**
 * Setup Survey Awal (Langkah 2 Wizard)
 */
function apiSetupTrainingSurveyAwal(pelatihanId) {
  return executeWithLock_(() => {
    try {
      const ss = getAppDb_();
      const sheet = ss.getSheetByName('Pelatihan');
      if (!sheet) return apiError('Sheet Pelatihan tidak ditemukan.', 'SYSTEM_ERROR');
      
      ensurePelatihanExtColumns_(sheet);
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const idxId = headers.indexOf('pelatihan_id');
      const idxKategori = headers.indexOf('kategori');
      
      const row = findRowIndex_(sheet, idxId, pelatihanId);
      if (row === -1) return apiError('Pelatihan tidak ditemukan.', 'NOT_FOUND');
      
      const kategori = String(data[row - 1][idxKategori] || 'Umum').trim();
      const templatesFolder = getOrCreateTemplatesRoot_();
      const kFolders = templatesFolder.getFoldersByName(kategori);
      if (!kFolders.hasNext()) {
        return apiError('Folder template kategori ' + kategori + ' tidak ditemukan.', 'NOT_FOUND');
      }
      
      const folder = kFolders.next();
      const surveyFiles = folder.getFilesByName('survey.yaml');
      const hasSurvey = surveyFiles.hasNext();
      
      // Inisialisasi PrePostSoal dari template jika belum ada
      const sheetSoal = ss.getSheetByName('PrePostSoal');
      if (sheetSoal) {
        const dataSoal = sheetSoal.getDataRange().getValues();
        const idxPidS = dataSoal[0].indexOf('pelatihan_id');
        let rowSoal = -1;
        for (let i = 1; i < dataSoal.length; i++) {
          if (String(dataSoal[i][idxPidS]).trim() === String(pelatihanId).trim()) {
            rowSoal = i + 1;
            break;
          }
        }
        
        if (rowSoal === -1) {
          const soalFiles = folder.getFilesByName('soal.yaml');
          if (soalFiles.hasNext()) {
            const soalYamlStr = soalFiles.next().getBlob().getDataAsString();
            try {
              const parsedSoal = parsePrePostYaml_(soalYamlStr);
              if (parsedSoal) {
                const newSoalId = 'SOAL-' + Utilities.getUuid().substring(0, 8).toUpperCase();
                const newRow = [
                  newSoalId,
                  pelatihanId,
                  JSON.stringify(parsedSoal),
                  'draft',
                  'draft',
                  '', '', '', ''
                ];
                sheetSoal.appendRow(newRow);
              }
            } catch(e) {
              console.error('Gagal parsing soal.yaml: ' + e.toString());
            }
          }
        }
      }
      
      return apiSuccess({
        has_survey: hasSurvey,
        folder_url: folder.getUrl()
      }, 'Survey awal berhasil disetup.');
    } catch(e) {
      return apiError('Gagal setup survey awal: ' + e.toString(), 'SYSTEM_ERROR');
    }
  });
}

/**
 * Setup Feedback & Sertifikat (Langkah 5 Wizard)
 */
function apiSetupTrainingFeedbackAndCert(pelatihanId) {
  return executeWithLock_(() => {
    try {
      const ss = getAppDb_();
      const sheet = ss.getSheetByName('Pelatihan');
      if (!sheet) return apiError('Sheet Pelatihan tidak ditemukan.', 'SYSTEM_ERROR');
      
      ensurePelatihanExtColumns_(sheet);
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const idxId = headers.indexOf('pelatihan_id');
      const idxKategori = headers.indexOf('kategori');
      const idxDocId = headers.indexOf('sertifikat_doc_id');
      
      const row = findRowIndex_(sheet, idxId, pelatihanId);
      if (row === -1) return apiError('Pelatihan tidak ditemukan.', 'NOT_FOUND');
      
      const kategori = String(data[row - 1][idxKategori] || 'Umum').trim();
      const templatesFolder = getOrCreateTemplatesRoot_();
      const kFolders = templatesFolder.getFoldersByName(kategori);
      if (!kFolders.hasNext()) {
        return apiError('Folder template kategori ' + kategori + ' tidak ditemukan.', 'NOT_FOUND');
      }
      
      const folder = kFolders.next();
      
      let certDocId = '';
      const certFiles = folder.getFilesByName('template_sertifikat');
      if (certFiles.hasNext()) {
        certDocId = certFiles.next().getId();
      } else {
        certDocId = createDefaultSertifikatTemplateDoc_(folder, 'template_sertifikat', 'Pelatihan ' + kategori);
      }
      
      sheet.getRange(row, idxDocId + 1).setValue(certDocId);
      
      return apiSuccess({
        sertifikat_doc_id: certDocId
      }, 'Feedback dan template sertifikat berhasil disetup.');
    } catch(e) {
      return apiError('Gagal setup feedback & sertifikat: ' + e.toString(), 'SYSTEM_ERROR');
    }
  });
}

/**
 * Helper: Membuat template dokumen sertifikat Google Docs
 */
function createDefaultSertifikatTemplateDoc_(folder, name, judulPelatihan) {
  const doc = DocumentApp.create(name);
  const body = doc.getBody();
  body.clear();
  
  body.setMarginTop(72);
  body.setMarginBottom(72);
  body.setMarginLeft(72);
  body.setMarginRight(72);
  
  const titlePar = body.appendParagraph('SERTIFIKAT KELULUSAN');
  titlePar.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  titlePar.setFontFamily('Georgia');
  titlePar.setFontSize(28);
  titlePar.setBold(true);
  titlePar.setForegroundColor('#1a73e8');
  
  body.appendParagraph('');
  body.appendParagraph('');
  
  const numPar = body.appendParagraph('Nomor: {{nomor_sertifikat}}');
  numPar.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  numPar.setFontFamily('Georgia');
  numPar.setFontSize(12);
  numPar.setItalic(true);
  numPar.setForegroundColor('#5f6368');
  
  body.appendParagraph('');
  body.appendParagraph('');
  
  const text1 = body.appendParagraph('Diberikan kepada:');
  text1.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  text1.setFontFamily('Arial');
  text1.setFontSize(14);
  
  body.appendParagraph('');
  
  const namaPar = body.appendParagraph('{{nama_peserta}}');
  namaPar.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  namaPar.setFontFamily('Georgia');
  namaPar.setFontSize(22);
  namaPar.setBold(true);
  namaPar.setUnderline(true);
  
  body.appendParagraph('');
  
  const descPar = body.appendParagraph('Atas partisipasi dan kelulusannya pada pelatihan:');
  descPar.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  descPar.setFontFamily('Arial');
  descPar.setFontSize(12);
  
  const judulPar = body.appendParagraph('{{judul_pelatihan}}');
  judulPar.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  judulPar.setFontFamily('Arial');
  judulPar.setFontSize(16);
  judulPar.setBold(true);
  judulPar.setForegroundColor('#202124');
  
  const tglPar = body.appendParagraph('yang diselenggarakan dari tanggal {{tanggal_mulai}} s.d. {{tanggal_selesai}}.');
  tglPar.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  tglPar.setFontFamily('Arial');
  tglPar.setFontSize(12);
  
  body.appendParagraph('');
  body.appendParagraph('');
  body.appendParagraph('');
  
  const cells = [
    ['', 'Jakarta, {{tanggal_terbit}}\n\n\n\n\n{{nama_pelatih}}\nPelatih']
  ];
  const table = body.appendTable(cells);
  table.setBorderWidth(0);
  
  const cell = table.getCell(0, 1);
  cell.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  cell.setWidth(300);
  
  doc.saveAndClose();
  
  const file = DriveApp.getFileById(doc.getId());
  folder.addFile(file);
  DriveApp.getRootFolder().removeFile(file);
  
  return doc.getId();
}

/**
 * Sinkronisasi data survey dan sertifikat dari Google Drive (API Manual Sync)
 */
function apiSyncSurveyFeedbackAndCertFromDrive(pelatihanId, sessionToken) {
  return apiError('Fitur sinkronisasi per pelatihan dinonaktifkan. Semua data menggunakan template kategori.', 'DEPRECATED');
}

// ============================================================
// PUBLIC API: SURVEY AWAL
// ============================================================

/**
 * Ambil konfigurasi survey awal (parsed) untuk suatu pelatihan
 */
function apiGetSurveyConfig(pelatihanId) {
  try {
    if (!pelatihanId) return apiError('pelatihanId harus diisi.', 'VALIDATION');
    const yamlStr = getSurveyYamlForPelatihan_(pelatihanId, 'survey');
    if (!yamlStr) return apiSuccess({ config: null, yaml: null });
    const parsed = parseSurveyYaml_(yamlStr);
    if (!parsed) return apiError('Konfigurasi survey tidak valid.', 'YAML_PARSE_ERROR');
    return apiSuccess({ config: parsed, yaml: yamlStr });
  } catch(e) {
    return apiError('Gagal mengambil konfigurasi survey: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Cek apakah peserta sudah mengisi survey awal
 */
function apiCheckSurveyStatus(pelatihanId, nipPeserta) {
  try {
    const ss = getAppDb_();
    const sheet = ss.getSheetByName('SurveyAwal');
    if (!sheet || sheet.getLastRow() < 2) return apiSuccess({ sudah_isi: false });
    const data = sheet.getDataRange().getValues();
    const idxPid = data[0].indexOf('pelatihan_id');
    const idxNip = data[0].indexOf('nip_peserta');
    const nipStr = String(nipPeserta).trim();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idxPid]).trim() === String(pelatihanId).trim() &&
          String(data[i][idxNip]).trim() === nipStr) {
        return apiSuccess({ sudah_isi: true });
      }
    }
    return apiSuccess({ sudah_isi: false });
  } catch(e) {
    return apiError('Gagal cek status survey: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Submit jawaban survey awal
 */
function apiSubmitSurveyAwal(pelatihanId, nipPeserta, jawaban) {
  return executeWithLock_(() => {
    try {
      if (!pelatihanId || !nipPeserta || !jawaban) {
        return apiError('Parameter tidak lengkap.', 'VALIDATION');
      }

      const ss = getAppDb_();
      const sheet = ss.getSheetByName('SurveyAwal');
      if (!sheet) return apiError('Sheet SurveyAwal tidak ditemukan.', 'SYSTEM_ERROR');

      // Cek duplikasi
      if (sheet.getLastRow() > 1) {
        const data = sheet.getDataRange().getValues();
        const idxPid = data[0].indexOf('pelatihan_id');
        const idxNip = data[0].indexOf('nip_peserta');
        const nipStr = String(nipPeserta).trim();
        for (let i = 1; i < data.length; i++) {
          if (String(data[i][idxPid]).trim() === String(pelatihanId).trim() &&
              String(data[i][idxNip]).trim() === nipStr) {
            return apiSuccess(null, 'Survey awal sudah pernah diisi sebelumnya.');
          }
        }
      }

      const responseId = 'SVY-' + Utilities.getUuid().substring(0, 8).toUpperCase();
      sheet.appendRow([
        responseId,
        pelatihanId,
        String(nipPeserta).trim(),
        JSON.stringify(jawaban),
        new Date().toISOString()
      ]);
      return apiSuccess({ response_id: responseId }, 'Survey awal berhasil disimpan.');
    } catch(e) {
      return apiError('Gagal menyimpan survey awal: ' + e.toString(), 'SYSTEM_ERROR');
    }
  });
}

/**
 * Simpan YAML survey awal kustom per pelatihan (hanya pelatih)
 */
function apiSaveSurveyYaml(pelatihanId, yamlString, sessionToken) {
  return executeWithLock_(() => {
    try {
      if (!checkPelatihanOwnership_(pelatihanId, sessionToken)) {
        return apiError('Anda tidak memiliki akses untuk mengatur survey pelatihan ini.', 'FORBIDDEN');
      }
      const parsed = parseSurveyYaml_(yamlString);
      if (!parsed || parsed.questions.length === 0) {
        return apiError('Format YAML survey tidak valid atau tidak memiliki pertanyaan.', 'YAML_PARSE_ERROR');
      }

      const ss = getAppDb_();
      const sheet = ss.getSheetByName('Pelatihan');
      if (!sheet) return apiError('Sheet Pelatihan tidak ditemukan.', 'SYSTEM_ERROR');
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const idxId = headers.indexOf('pelatihan_id');
      const idxKategori = headers.indexOf('kategori');
      const row = findRowIndex_(sheet, idxId, pelatihanId);
      if (row === -1) return apiError('Pelatihan tidak ditemukan.', 'NOT_FOUND');

      const kategori = String(data[row - 1][idxKategori] || 'Umum').trim();
      const templatesFolder = getOrCreateTemplatesRoot_();
      const kFolders = templatesFolder.getFoldersByName(kategori);
      if (!kFolders.hasNext()) {
        return apiError('Folder template kategori ' + kategori + ' tidak ditemukan.', 'NOT_FOUND');
      }

      const folder = kFolders.next();
      const files = folder.getFilesByName('survey.yaml');
      if (files.hasNext()) {
        files.next().setContent(yamlString);
      } else {
        folder.createFile('survey.yaml', yamlString, MimeType.PLAIN_TEXT);
      }

      return apiSuccess(null, 'Konfigurasi template survey kategori berhasil disimpan.');
    } catch(e) {
      return apiError('Gagal menyimpan YAML survey: ' + e.toString(), 'SYSTEM_ERROR');
    }
  });
}

// ============================================================
// PUBLIC API: FEEDBACK AKHIR
// ============================================================

/**
 * Ambil konfigurasi feedback akhir (parsed) untuk suatu pelatihan
 */
function apiGetFeedbackConfig(pelatihanId) {
  try {
    if (!pelatihanId) return apiError('pelatihanId harus diisi.', 'VALIDATION');
    const yamlStr = getSurveyYamlForPelatihan_(pelatihanId, 'feedback');
    if (!yamlStr) return apiSuccess({ config: null, yaml: null });
    const parsed = parseSurveyYaml_(yamlStr);
    if (!parsed) return apiError('Konfigurasi feedback tidak valid.', 'YAML_PARSE_ERROR');
    return apiSuccess({ config: parsed, yaml: yamlStr });
  } catch(e) {
    return apiError('Gagal mengambil konfigurasi feedback: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Cek apakah peserta sudah mengisi feedback akhir
 */
function apiCheckFeedbackStatus(pelatihanId, nipPeserta) {
  try {
    const feedbackYaml = getSurveyYamlForPelatihan_(pelatihanId, 'feedback');
    if (!feedbackYaml) {
      return apiSuccess({ sudah_isi: true });
    }
    const ss = getAppDb_();
    const sheet = ss.getSheetByName('FeedbackPelatihan');
    if (!sheet || sheet.getLastRow() < 2) return apiSuccess({ sudah_isi: false });
    const data = sheet.getDataRange().getValues();
    const idxPid = data[0].indexOf('pelatihan_id');
    const idxNip = data[0].indexOf('nip_peserta');
    const nipStr = String(nipPeserta).trim();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idxPid]).trim() === String(pelatihanId).trim() &&
          String(data[i][idxNip]).trim() === nipStr) {
        return apiSuccess({ sudah_isi: true });
      }
    }
    return apiSuccess({ sudah_isi: false });
  } catch(e) {
    return apiError('Gagal cek status feedback: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Submit jawaban feedback akhir
 */
function apiSubmitFeedback(pelatihanId, nipPeserta, jawaban) {
  return executeWithLock_(() => {
    try {
      if (!pelatihanId || !nipPeserta || !jawaban) {
        return apiError('Parameter tidak lengkap.', 'VALIDATION');
      }

      const ss = getAppDb_();
      const sheet = ss.getSheetByName('FeedbackPelatihan');
      if (!sheet) return apiError('Sheet FeedbackPelatihan tidak ditemukan.', 'SYSTEM_ERROR');

      // Cek duplikasi
      if (sheet.getLastRow() > 1) {
        const data = sheet.getDataRange().getValues();
        const idxPid = data[0].indexOf('pelatihan_id');
        const idxNip = data[0].indexOf('nip_peserta');
        const nipStr = String(nipPeserta).trim();
        for (let i = 1; i < data.length; i++) {
          if (String(data[i][idxPid]).trim() === String(pelatihanId).trim() &&
              String(data[i][idxNip]).trim() === nipStr) {
            return apiSuccess({ sudah_isi: true }, 'Feedback sudah pernah diisi sebelumnya.');
          }
        }
      }

      // Hitung rating_overall (rata-rata semua field rating dalam jawaban)
      let ratingSum = 0; let ratingCount = 0;
      Object.values(jawaban).forEach(val => {
        if (typeof val === 'number' && val >= 1 && val <= 5) {
          ratingSum += val; ratingCount++;
        }
      });
      const ratingOverall = ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : 0;

      const responseId = 'FBK-' + Utilities.getUuid().substring(0, 8).toUpperCase();
      sheet.appendRow([
        responseId,
        pelatihanId,
        String(nipPeserta).trim(),
        ratingOverall,
        JSON.stringify(jawaban),
        new Date().toISOString()
      ]);
      return apiSuccess({ response_id: responseId, sudah_isi: false }, 'Feedback berhasil disimpan.');
    } catch(e) {
      return apiError('Gagal menyimpan feedback: ' + e.toString(), 'SYSTEM_ERROR');
    }
  });
}

/**
 * Simpan YAML feedback kustom per pelatihan (hanya pelatih)
 */
function apiSaveFeedbackYaml(pelatihanId, yamlString, sessionToken) {
  return executeWithLock_(() => {
    try {
      if (!checkPelatihanOwnership_(pelatihanId, sessionToken)) {
        return apiError('Anda tidak memiliki akses untuk mengatur feedback pelatihan ini.', 'FORBIDDEN');
      }
      const parsed = parseSurveyYaml_(yamlString);
      if (!parsed || parsed.questions.length === 0) {
        return apiError('Format YAML feedback tidak valid atau tidak memiliki pertanyaan.', 'YAML_PARSE_ERROR');
      }

      const ss = getAppDb_();
      const sheet = ss.getSheetByName('Pelatihan');
      if (!sheet) return apiError('Sheet Pelatihan tidak ditemukan.', 'SYSTEM_ERROR');

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const idxId = headers.indexOf('pelatihan_id');
      const idxKategori = headers.indexOf('kategori');
      const row = findRowIndex_(sheet, idxId, pelatihanId);
      if (row === -1) return apiError('Pelatihan tidak ditemukan.', 'NOT_FOUND');

      const kategori = String(data[row - 1][idxKategori] || 'Umum').trim();
      const templatesFolder = getOrCreateTemplatesRoot_();
      const kFolders = templatesFolder.getFoldersByName(kategori);
      if (!kFolders.hasNext()) {
        return apiError('Folder template kategori ' + kategori + ' tidak ditemukan.', 'NOT_FOUND');
      }

      const folder = kFolders.next();
      const files = folder.getFilesByName('feedback.yaml');
      if (files.hasNext()) {
        files.next().setContent(yamlString);
      } else {
        folder.createFile('feedback.yaml', yamlString, MimeType.PLAIN_TEXT);
      }

      return apiSuccess(null, 'Konfigurasi template feedback kategori berhasil disimpan.');
    } catch(e) {
      return apiError('Gagal menyimpan YAML feedback: ' + e.toString(), 'SYSTEM_ERROR');
    }
  });
}

// ============================================================
// PUBLIC API: KONFIGURASI SERTIFIKAT (untuk Pelatih)
// ============================================================

/**
 * Set Google Docs Template ID untuk sertifikat pelatihan tertentu
 */
function apiSetSertifikatTemplate(pelatihanId, docId, sessionToken) {
  return executeWithLock_(() => {
    try {
      if (!checkPelatihanOwnership_(pelatihanId, sessionToken)) {
        return apiError('Anda tidak memiliki akses untuk mengatur sertifikat pelatihan ini.', 'FORBIDDEN');
      }
      if (!docId || docId.trim() === '') {
        return apiError('Google Docs ID template harus diisi.', 'VALIDATION');
      }

      // Validasi bahwa doc bisa diakses
      try {
        DocumentApp.openById(docId.trim());
      } catch(e) {
        return apiError('Google Docs dengan ID tersebut tidak dapat diakses. Pastikan dokumen sudah di-share.', 'INVALID_DOC');
      }

      const ss = getAppDb_();
      const sheet = ss.getSheetByName('Pelatihan');
      if (!sheet) return apiError('Sheet Pelatihan tidak ditemukan.', 'SYSTEM_ERROR');
      ensurePelatihanExtColumns_(sheet);

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const idxId = headers.indexOf('pelatihan_id');
      const idxDoc = headers.indexOf('sertifikat_doc_id');
      const row = findRowIndex_(sheet, idxId, pelatihanId);
      if (row === -1) return apiError('Pelatihan tidak ditemukan.', 'NOT_FOUND');

      sheet.getRange(row, idxDoc + 1).setValue(docId.trim());
      return apiSuccess({ doc_id: docId.trim() }, 'Template sertifikat berhasil disimpan.');
    } catch(e) {
      return apiError('Gagal menyimpan template sertifikat: ' + e.toString(), 'SYSTEM_ERROR');
    }
  });
}

/**
 * Ambil ringkasan sertifikat untuk pelatih: berapa peserta sudah terima, dll
 */
function apiGetSertifikatSummary(pelatihanId, sessionToken) {
  try {
    if (!checkPelatihanOwnership_(pelatihanId, sessionToken)) {
      return apiError('Akses ditolak.', 'FORBIDDEN');
    }
    
    // Self-healing is deprecated, templates are managed per category.
    
    const ss = getAppDb_();

    // Ambil doc template ID
    const sheetPlt = ss.getSheetByName('Pelatihan');
    let docId = '';
    if (sheetPlt) {
      ensurePelatihanExtColumns_(sheetPlt);
      const dataPlt = sheetPlt.getDataRange().getValues();
      const hPlt = dataPlt[0];
      const idxId = hPlt.indexOf('pelatihan_id');
      const idxDoc = hPlt.indexOf('sertifikat_doc_id');
      const row = findRowIndex_(sheetPlt, idxId, pelatihanId);
      if (row !== -1 && idxDoc !== -1) docId = String(dataPlt[row - 1][idxDoc] || '').trim();
    }

    // Hitung sertifikat yang sudah diterbitkan
    let sertifikatDiterbitkan = 0;
    const sheetLog = ss.getSheetByName('SertifikatLog');
    if (sheetLog && sheetLog.getLastRow() > 1) {
      const dataLog = sheetLog.getDataRange().getValues();
      const idxPid = dataLog[0].indexOf('pelatihan_id');
      for (let i = 1; i < dataLog.length; i++) {
        if (String(dataLog[i][idxPid]).trim() === String(pelatihanId).trim()) sertifikatDiterbitkan++;
      }
    }

    // Hitung feedback yang sudah masuk
    let feedbackMasuk = 0;
    const sheetFb = ss.getSheetByName('FeedbackPelatihan');
    if (sheetFb && sheetFb.getLastRow() > 1) {
      const dataFb = sheetFb.getDataRange().getValues();
      const idxPid = dataFb[0].indexOf('pelatihan_id');
      for (let i = 1; i < dataFb.length; i++) {
        if (String(dataFb[i][idxPid]).trim() === String(pelatihanId).trim()) feedbackMasuk++;
      }
    }

    // Dapatkan folder URL templates kategori
    let folderUrl = '';
    try {
      if (sheetPlt) {
        const dataPlt = sheetPlt.getDataRange().getValues();
        const hPlt = dataPlt[0];
        const idxId = hPlt.indexOf('pelatihan_id');
        const idxKategori = hPlt.indexOf('kategori');
        const row = findRowIndex_(sheetPlt, idxId, pelatihanId);
        if (row !== -1 && idxKategori !== -1) {
          const kategori = String(dataPlt[row - 1][idxKategori] || 'Umum').trim();
          const templatesFolder = getOrCreateTemplatesRoot_();
          const kFolders = templatesFolder.getFoldersByName(kategori);
          if (kFolders.hasNext()) {
            folderUrl = kFolders.next().getUrl();
          }
        }
      }
    } catch (e) {
      console.error('Gagal mendapatkan folder URL templates kategori: ' + e.toString());
    }

    return apiSuccess({
      sertifikat_doc_id: docId,
      sertifikat_diterbitkan: sertifikatDiterbitkan,
      feedback_masuk: feedbackMasuk,
      folder_url: folderUrl
    });
  } catch(e) {
    return apiError('Gagal mengambil ringkasan sertifikat: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

// ============================================================
// PUBLIC API: GENERATE SERTIFIKAT (Mail Merge Google Docs)
// ============================================================

/**
 * Hasilkan sertifikat untuk seorang peserta.
 * Prerequisite: feedback sudah diisi + pretest & posttest sudah selesai.
 * Idempotent: jika sudah pernah dibuat, kembalikan URL lama.
 *
 * @param {string} pelatihanId
 * @param {string} nipPeserta
 * @returns {object} { sertifikat_id, pdf_url, doc_url, nomor_sertifikat }
 */
function apiGenerateSertifikat(pelatihanId, nipPeserta) {
  return executeWithLock_(() => {
    try {
      if (!pelatihanId || !nipPeserta) return apiError('Parameter tidak lengkap.', 'VALIDATION');
      const nipStr = String(nipPeserta).trim();
      const ss = getAppDb_();

      // 1. Cek apakah sertifikat sudah pernah dibuat (idempotent)
      const sheetLog = ss.getSheetByName('SertifikatLog');
      if (sheetLog && sheetLog.getLastRow() > 1) {
        const dataLog = sheetLog.getDataRange().getValues();
        const hLog = dataLog[0];
        const idxLPid = hLog.indexOf('pelatihan_id');
        const idxLNip = hLog.indexOf('nip_peserta');
        const idxLPdf = hLog.indexOf('pdf_url');
        const idxLDoc = hLog.indexOf('google_doc_id');
        const idxLNo = hLog.indexOf('nomor_sertifikat');
        const idxLSid = hLog.indexOf('sertifikat_id');
        for (let i = 1; i < dataLog.length; i++) {
          if (String(dataLog[i][idxLPid]).trim() === String(pelatihanId).trim() &&
              String(dataLog[i][idxLNip]).trim() === nipStr) {
            return apiSuccess({
              sertifikat_id: dataLog[i][idxLSid],
              pdf_url: dataLog[i][idxLPdf],
              doc_url: 'https://docs.google.com/document/d/' + dataLog[i][idxLDoc] + '/edit',
              nomor_sertifikat: dataLog[i][idxLNo],
              already_exists: true
            }, 'Sertifikat sudah pernah diterbitkan sebelumnya.');
          }
        }
      }

      // 2. Validasi: feedback harus sudah diisi
      const feedbackStatus = apiCheckFeedbackStatus(pelatihanId, nipStr);
      if (!feedbackStatus.success || !feedbackStatus.data.sudah_isi) {
        return apiError('Anda harus mengisi feedback pelatihan terlebih dahulu.', 'FEEDBACK_REQUIRED');
      }

      // 3. Validasi: pre-test dan post-test harus sudah selesai
      const sheetResp = ss.getSheetByName('PrePostResponses');
      if (!sheetResp || sheetResp.getLastRow() < 2) {
        return apiError('Anda belum menyelesaikan Pre-Test dan Post-Test.', 'TEST_REQUIRED');
      }
      const dataResp = sheetResp.getDataRange().getValues();
      const hResp = dataResp[0];
      const idxRPid = hResp.indexOf('pelatihan_id');
      const idxRNip = hResp.indexOf('nip_peserta');
      const idxRTipe = hResp.indexOf('tipe');
      let pretestDone = false, posttestDone = false;
      for (let i = 1; i < dataResp.length; i++) {
        if (String(dataResp[i][idxRPid]).trim() === String(pelatihanId).trim() &&
            String(dataResp[i][idxRNip]).trim() === nipStr) {
          const tipe = String(dataResp[i][idxRTipe]).trim().toLowerCase();
          if (tipe === 'pretest') pretestDone = true;
          if (tipe === 'posttest') posttestDone = true;
        }
      }
      if (!pretestDone || !posttestDone) {
        const missing = !pretestDone ? 'Pre-Test' : 'Post-Test';
        return apiError('Anda belum menyelesaikan ' + missing + '. Sertifikat tidak dapat diterbitkan.', 'TEST_REQUIRED');
      }

      // 4. Ambil data pelatihan & profil peserta
      const sheetPlt = ss.getSheetByName('Pelatihan');
      if (!sheetPlt) return apiError('Sheet Pelatihan tidak ditemukan.', 'SYSTEM_ERROR');
      ensurePelatihanExtColumns_(sheetPlt);
      const dataPlt = sheetPlt.getDataRange().getValues();
      const hPlt = dataPlt[0];
      const idxPid = hPlt.indexOf('pelatihan_id');
      const idxJudul = hPlt.indexOf('judul');
      const idxPelatih = hPlt.indexOf('nip_pelatih');
      const idxTglMulai = hPlt.indexOf('tanggal_mulai');
      const idxTglSelesai = hPlt.indexOf('tanggal_selesai');
      const idxDocId = hPlt.indexOf('sertifikat_doc_id');

      let judulPelatihan = '', nipPelatih = '', tglMulai = '', tglSelesai = '', templateDocId = '';
      for (let i = 1; i < dataPlt.length; i++) {
        if (String(dataPlt[i][idxPid]).trim() === String(pelatihanId).trim()) {
          judulPelatihan = String(dataPlt[i][idxJudul] || '');
          nipPelatih = String(dataPlt[i][idxPelatih] || '');
          tglMulai = String(dataPlt[i][idxTglMulai] || '');
          tglSelesai = String(dataPlt[i][idxTglSelesai] || '');
          if (idxDocId !== -1) templateDocId = String(dataPlt[i][idxDocId] || '').trim();
          break;
        }
      }

      // 5. Ambil nama peserta & pelatih dari profil
      let namaPeserta = nipStr, namaPelatih = nipPelatih;
      const sheetProfil = ss.getSheetByName('Profil');
      if (sheetProfil && sheetProfil.getLastRow() > 1) {
        const dtProfil = sheetProfil.getDataRange().getDisplayValues();
        const hProfil = dtProfil[0];
        const pNipIdx = hProfil.indexOf('NIP');
        const pNamaIdx = hProfil.indexOf('Nama');
        for (let i = 1; i < dtProfil.length; i++) {
          if (String(dtProfil[i][pNipIdx]).trim() === nipStr) {
            namaPeserta = dtProfil[i][pNamaIdx] || nipStr;
          }
          if (String(dtProfil[i][pNipIdx]).trim() === nipPelatih) {
            namaPelatih = dtProfil[i][pNamaIdx] || nipPelatih;
          }
        }
      }

      // 6. Buat nomor sertifikat — format: SERT/PLT/NNN/bulan-romawi/tahun
      const now = new Date();
      const romanMonths = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
      const counterKey = 'SERT_COUNTER';
      let counter = parseInt(getSetting(counterKey) || '0') + 1;
      updateSetting(counterKey, counter);
      const nomorSertifikat = 'SERT/KBC/' + String(counter).padStart(3, '0') + '/' + romanMonths[now.getMonth()] + '/' + now.getFullYear();

      // 7. Format tanggal Indonesia
      const fmtTgl = (tglStr) => {
        if (!tglStr) return '';
        try {
          const d = new Date(tglStr);
          return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch(e) { return tglStr; }
      };

      const tanggalTerbit = fmtTgl(now.toISOString());
      const tglMulaiFormatted = fmtTgl(tglMulai);
      const tglSelesaiFormatted = fmtTgl(tglSelesai);

      // 8. Salin template Google Docs & mail merge
      let newDocId = '';
      let pdfUrl = '';

      if (!templateDocId) {
        // Tidak ada template → buat sertifikat teks sederhana sebagai fallback
        const fallbackFolder = getOrCreateFolder_('Sertifikat_Pelatihan');
        const newDoc = DocumentApp.create('Sertifikat - ' + namaPeserta + ' - ' + judulPelatihan);
        const body = newDoc.getBody();
        body.clear();
        body.appendParagraph('SERTIFIKAT PESERTA')
            .setHeading(DocumentApp.ParagraphHeading.HEADING1)
            .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
        body.appendParagraph('');
        body.appendParagraph('Diberikan kepada:').setAlignment(DocumentApp.HorizontalAlignment.CENTER);
        body.appendParagraph(namaPeserta)
            .setHeading(DocumentApp.ParagraphHeading.HEADING2)
            .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
        body.appendParagraph('NIP: ' + nipStr).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
        body.appendParagraph('');
        body.appendParagraph('Telah berhasil mengikuti pelatihan:').setAlignment(DocumentApp.HorizontalAlignment.CENTER);
        body.appendParagraph(judulPelatihan)
            .setHeading(DocumentApp.ParagraphHeading.HEADING2)
            .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
        body.appendParagraph(tglMulaiFormatted + ' s.d. ' + tglSelesaiFormatted).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
        body.appendParagraph('');
        body.appendParagraph('Pelatih: ' + namaPelatih).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
        body.appendParagraph('');
        body.appendParagraph('Nomor: ' + nomorSertifikat).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
        body.appendParagraph('Diterbitkan: ' + tanggalTerbit).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
        newDoc.saveAndClose();
        newDocId = newDoc.getId();

        // Pindahkan ke folder
        const file = DriveApp.getFileById(newDocId);
        fallbackFolder.addFile(file);
        DriveApp.getRootFolder().removeFile(file);
      } else {
        // Ada template → copy & replace placeholders
        const templateFile = DriveApp.getFileById(templateDocId);
        const sertFolder = getOrCreateFolder_('Sertifikat_Pelatihan');
        const newFile = templateFile.makeCopy('Sertifikat - ' + namaPeserta + ' - ' + judulPelatihan, sertFolder);
        newDocId = newFile.getId();

        const doc = DocumentApp.openById(newDocId);
        const body = doc.getBody();

        // Replace semua variabel {{...}}
        const vars = {
          '{{nama_peserta}}': namaPeserta,
          '{{nip_peserta}}': nipStr,
          '{{judul_pelatihan}}': judulPelatihan,
          '{{nama_pelatih}}': namaPelatih,
          '{{nip_pelatih}}': nipPelatih,
          '{{tanggal_mulai}}': tglMulaiFormatted,
          '{{tanggal_selesai}}': tglSelesaiFormatted,
          '{{tanggal_terbit}}': tanggalTerbit,
          '{{nomor_sertifikat}}': nomorSertifikat,
        };
        Object.entries(vars).forEach(([placeholder, value]) => {
          body.replaceText(placeholder, value);
        });
        doc.saveAndClose();
      }

      // 9. Export PDF
      const newFile = DriveApp.getFileById(newDocId);
      newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      // Export sebagai PDF dan simpan di folder yang sama
      const pdfBlob = newFile.getAs('application/pdf');
      pdfBlob.setName('Sertifikat - ' + namaPeserta + '.pdf');
      const sertFolder = getOrCreateFolder_('Sertifikat_Pelatihan');
      const pdfFile = sertFolder.createFile(pdfBlob);
      pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      pdfUrl = 'https://drive.google.com/uc?export=download&id=' + pdfFile.getId();
      const pdfViewUrl = 'https://drive.google.com/file/d/' + pdfFile.getId() + '/view';

      // 10. Log ke SertifikatLog
      const sertifikatId = 'SERT-' + Utilities.getUuid().substring(0, 8).toUpperCase();
      if (!sheetLog) {
        // Sheet belum ada (backward compat) — buat
        const newSheet = ss.insertSheet('SertifikatLog');
        newSheet.appendRow(['sertifikat_id', 'pelatihan_id', 'nip_peserta', 'nama_peserta',
          'nomor_sertifikat', 'google_doc_id', 'pdf_url', 'generated_at']);
        newSheet.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#d9ead3');
        newSheet.setFrozenRows(1);
        newSheet.appendRow([sertifikatId, pelatihanId, nipStr, namaPeserta,
          nomorSertifikat, newDocId, pdfViewUrl, now.toISOString()]);
      } else {
        sheetLog.appendRow([sertifikatId, pelatihanId, nipStr, namaPeserta,
          nomorSertifikat, newDocId, pdfViewUrl, now.toISOString()]);
      }

      return apiSuccess({
        sertifikat_id: sertifikatId,
        pdf_url: pdfViewUrl,
        doc_url: 'https://docs.google.com/document/d/' + newDocId + '/edit',
        nomor_sertifikat: nomorSertifikat,
        nama_peserta: namaPeserta,
        already_exists: false
      }, 'Sertifikat berhasil diterbitkan!');

    } catch(e) {
      return apiError('Gagal membuat sertifikat: ' + e.toString(), 'SYSTEM_ERROR');
    }
  });
}

/**
 * Helper: Ambil atau buat folder Drive dengan nama tertentu
 */
function getOrCreateFolder_(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  const folder = DriveApp.createFolder(folderName);
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return folder;
}

// ============================================================
// API: DATA UNTUK js-pelatihan.html (Pelatih)
// ============================================================

/**
 * Ambil YAML survey & feedback saat ini untuk suatu pelatihan (untuk editor pelatih)
 */
function apiGetSurveyFeedbackYaml(pelatihanId, sessionToken) {
  try {
    if (!checkPelatihanOwnership_(pelatihanId, sessionToken)) {
      return apiError('Akses ditolak.', 'FORBIDDEN');
    }
    const surveyYaml = getSurveyYamlForPelatihan_(pelatihanId, 'survey');
    const feedbackYaml = getSurveyYamlForPelatihan_(pelatihanId, 'feedback');
    return apiSuccess({ survey_yaml: surveyYaml, feedback_yaml: feedbackYaml });
  } catch(e) {
    return apiError('Gagal mengambil YAML: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Utility: Mendapatkan atau membuat folder Drive Pelatihan
 * Path: pelatihan/{kategori}/{judul} ({pelatihanId})/
 */
function getOrCreateTrainingFolder(pelatihanId) {
  const ss = getAppDb_();
  const sheet = ss.getSheetByName('Pelatihan');
  if (!sheet) throw new Error('Sheet Pelatihan tidak ditemukan.');
  
  ensurePelatihanExtColumns_(sheet);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idxId = headers.indexOf('pelatihan_id');
  const idxJudul = headers.indexOf('judul');
  const idxKategori = headers.indexOf('kategori');
  
  const row = findRowIndex_(sheet, idxId, pelatihanId);
  if (row === -1) throw new Error('Pelatihan tidak ditemukan.');
  
  const judul = String(data[row - 1][idxJudul] || '').trim();
  let kategori = String(data[row - 1][idxKategori] || 'Umum').trim();
  if (!kategori) kategori = 'Umum';
  
  const parentIterator = DriveApp.getFileById(APP_DB_ID).getParents();
  const appDbFolder = parentIterator.hasNext() ? parentIterator.next() : DriveApp.getRootFolder();
  let pelatihanFolder;
  const pFolders = appDbFolder.getFoldersByName('pelatihan');
  if (pFolders.hasNext()) {
    pelatihanFolder = pFolders.next();
  } else {
    pelatihanFolder = appDbFolder.createFolder('pelatihan');
    pelatihanFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }
  
  const categoryFolder = getOrCreateFolder(pelatihanFolder, kategori);
  categoryFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  const safeJudul = judul.replace(/[\\/:*?"<>|]/g, "_");
  const folderName = safeJudul + ' (' + pelatihanId + ')';
  const trainingFolder = getOrCreateFolder(categoryFolder, folderName);
  trainingFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  return { folder: trainingFolder, judul: judul, kategori: kategori };
}

function getOrCreateTemplatesRoot_() {
  const parentIterator = DriveApp.getFileById(APP_DB_ID).getParents();
  const appDbFolder = parentIterator.hasNext() ? parentIterator.next() : DriveApp.getRootFolder();
  let templatesFolder;
  const tFolders = appDbFolder.getFoldersByName('templates');
  if (tFolders.hasNext()) {
    templatesFolder = tFolders.next();
  } else {
    templatesFolder = appDbFolder.createFolder('templates');
    templatesFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }
  return templatesFolder;
}

function getTemplateFolderForKategori_(kategori) {
  const templatesFolder = getOrCreateTemplatesRoot_();
  const kFolders = templatesFolder.getFoldersByName(kategori);
  if (!kFolders.hasNext()) {
    throw new Error('Kategori ' + kategori + ' tidak ditemukan.');
  }
  return kFolders.next();
}

function apiGetKategoriFromTemplates() {
  try {
    const templatesFolder = getOrCreateTemplatesRoot_();
    const subfolders = templatesFolder.getFolders();
    const categories = [];
    while (subfolders.hasNext()) {
      categories.push(subfolders.next().getName());
    }
    categories.sort((a, b) => {
      if (a === 'Umum') return 1;
      if (b === 'Umum') return -1;
      return a.localeCompare(b);
    });
    return apiSuccess(categories);
  } catch (e) {
    return apiError('Gagal mengambil kategori dari folder templates: ' + e.toString());
  }
}

function apiGetTemplateForKategori(kategori) {
  try {
    if (!kategori) return apiError('Kategori harus ditentukan.', 'VALIDATION');
    const templatesFolder = getOrCreateTemplatesRoot_();
    const kFolders = templatesFolder.getFoldersByName(kategori);
    if (!kFolders.hasNext()) {
      return apiError('Kategori ' + kategori + ' tidak ditemukan di templates.', 'NOT_FOUND');
    }
    const folder = kFolders.next();
    
    const res = {
      template_yaml: null,
      survey_yaml: null,
      soal_yaml: null,
      feedback_yaml: null,
      sertifikat_doc_id: null,
      sertifikat_url: null,
      folder_url: folder.getUrl()
    };
    
    const templateFiles = folder.getFilesByName('template.yaml');
    if (templateFiles.hasNext()) {
      res.template_yaml = templateFiles.next().getBlob().getDataAsString();
    }
    
    const surveyFiles = folder.getFilesByName('survey.yaml');
    if (surveyFiles.hasNext()) {
      res.survey_yaml = surveyFiles.next().getBlob().getDataAsString();
    }
    
    const soalFiles = folder.getFilesByName('soal.yaml');
    if (soalFiles.hasNext()) {
      res.soal_yaml = soalFiles.next().getBlob().getDataAsString();
    }
    
    const feedbackFiles = folder.getFilesByName('feedback.yaml');
    if (feedbackFiles.hasNext()) {
      res.feedback_yaml = feedbackFiles.next().getBlob().getDataAsString();
    }
    
    const certFiles = folder.getFilesByName('template_sertifikat');
    if (certFiles.hasNext()) {
      const file = certFiles.next();
      res.sertifikat_doc_id = file.getId();
      res.sertifikat_url = 'https://docs.google.com/document/d/' + file.getId() + '/edit';
    }
    
    return apiSuccess(res);
  } catch (e) {
    return apiError('Gagal mengambil template kategori: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

function createKategoriTemplate_(kategoriName) {
  const safeKategoriName = kategoriName.replace(/[\\/:*?"<>|]/g, "_").trim();
  if (!safeKategoriName) return null;
  
  const templatesFolder = getOrCreateTemplatesRoot_();
  const existFolders = templatesFolder.getFoldersByName(safeKategoriName);
  if (existFolders.hasNext()) {
    return existFolders.next();
  }
  
  const folder = templatesFolder.createFolder(safeKategoriName);
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  const defaultTemplate = `deskripsi: "Pelatihan ini memberikan pemahaman mendalam tentang Kategori ${safeKategoriName}..."
lembar_kerja:
  - judul: "LK 1: Rencana Aksi"
    url: ""
materi:
  - judul: "Modul Dasar ${safeKategoriName}"
    url: ""
`;
  folder.createFile('template.yaml', defaultTemplate, MimeType.PLAIN_TEXT);
  folder.createFile('survey.yaml', DEFAULT_SURVEY_AWAL_YAML, MimeType.PLAIN_TEXT);
  folder.createFile('feedback.yaml', DEFAULT_FEEDBACK_YAML, MimeType.PLAIN_TEXT);
  
  const defaultSoal = `title: "Pre/Post Test Pemahaman ${safeKategoriName}"
description: "Soal evaluasi pemahaman baseline untuk pengawas"
shuffle_questions: true
shuffle_options: true
time_limit_minutes: 30
questions:
  - type: radio
    name: q1
    label: "Pertanyaan pilihan ganda contoh:"
    options:
      - "Pilihan A"
      - "Pilihan B"
      - "Pilihan C"
      - "Pilihan D"
    answer: "Pilihan A"
    category: "Konsep Dasar"
`;
  folder.createFile('soal.yaml', defaultSoal, MimeType.PLAIN_TEXT);
  createDefaultSertifikatTemplateDoc_(folder, 'template_sertifikat', 'Pelatihan ' + safeKategoriName);
  
  return folder;
}

function apiCreateKategoriTemplate(kategoriName) {
  return executeWithLock_(() => {
    try {
      if (!kategoriName) return apiError('Nama kategori harus diisi.', 'VALIDATION');
      const safeKategoriName = kategoriName.replace(/[\\/:*?"<>|]/g, "_").trim();
      const folder = createKategoriTemplate_(safeKategoriName);
      if (!folder) return apiError('Nama kategori tidak valid.', 'VALIDATION');
      return apiSuccess({ kategori: safeKategoriName }, 'Folder template kategori berhasil dibuat dengan 5 file default.');
    } catch(e) {
      return apiError('Gagal membuat kategori template: ' + e.toString(), 'SYSTEM_ERROR');
    }
  });
}
