// ============================================================
// KANBAN BOARD BACKEND SERVICE
// ============================================================

/**
 * Mengambil data kartu dan komentar Kanban untuk madrasah tertentu
 * @param {string} nsm NSM Madrasah
 * @param {string} sessionToken Token sesi aktif (opsional)
 * @returns {object} API response standard
 */
function kanbanGetBoardData(nsm, sessionToken) {
  try {
    const nsmStr = String(nsm).trim();
    if (!nsmStr) return apiError('NSM harus diisi.', 'VALIDATION');

    const ss = getAppDb_();
    
    // 1. Ambil data Cards
    const cardsSheet = ss.getSheetByName('KanbanCards');
    let cards = [];
    if (cardsSheet && cardsSheet.getLastRow() > 1) {
      const data = cardsSheet.getDataRange().getValues();
      const headers = data[0].map(h => String(h).trim());
      
      const idxCardId = headers.indexOf('card_id');
      const idxNsm = headers.indexOf('nsm');
      const idxTitle = headers.indexOf('title');
      const idxDesc = headers.indexOf('description');
      const idxStatus = headers.indexOf('status');
      const idxAttach = headers.indexOf('attachments');
      const idxCreatedBy = headers.indexOf('created_by');
      const idxCreatedAt = headers.indexOf('created_at');
      const idxUpdatedAt = headers.indexOf('updated_at');

      // Check for delete_requested and add if missing
      let idxDeleteReq = headers.indexOf('delete_requested');
      if (idxDeleteReq === -1) {
        cardsSheet.getRange(1, headers.length + 1).setValue('delete_requested');
        headers.push('delete_requested');
        idxDeleteReq = headers.length - 1;
      }

      // Check for tag and add if missing
      let idxTag = headers.indexOf('tag');
      if (idxTag === -1) {
        cardsSheet.getRange(1, headers.length + 1).setValue('tag');
        headers.push('tag');
        idxTag = headers.length - 1;
      }

      // Check for work_details and add if missing
      let idxWorkDetails = headers.indexOf('work_details');
      if (idxWorkDetails === -1) {
        cardsSheet.getRange(1, headers.length + 1).setValue('work_details');
        headers.push('work_details');
        idxWorkDetails = headers.length - 1;
      }

      // Check for approved_by_supervisor and add if missing
      let idxApproved = headers.indexOf('approved_by_supervisor');
      if (idxApproved === -1) {
        cardsSheet.getRange(1, headers.length + 1).setValue('approved_by_supervisor');
        headers.push('approved_by_supervisor');
        idxApproved = headers.length - 1;
      }

      // Check for work_notes and add if missing
      let idxWorkNotes = headers.indexOf('work_notes');
      if (idxWorkNotes === -1) {
        cardsSheet.getRange(1, headers.length + 1).setValue('work_notes');
        headers.push('work_notes');
        idxWorkNotes = headers.length - 1;
      }

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idxNsm]).trim() === nsmStr) {
          let attachmentsList = [];
          try {
            const attachStr = data[i][idxAttach];
            if (attachStr) {
              attachmentsList = JSON.parse(attachStr);
            }
          } catch (e) {
            console.error('Gagal parse attachments card: ' + e.toString());
          }

          let workNotesList = [];
          try {
            const notesStr = (idxWorkNotes !== -1 && idxWorkNotes < data[i].length) ? data[i][idxWorkNotes] : '';
            if (notesStr) {
              workNotesList = JSON.parse(notesStr);
            }
          } catch (e) {
            console.error('Gagal parse work_notes card: ' + e.toString());
          }

          cards.push({
            card_id: String(data[i][idxCardId]),
            nsm: String(data[i][idxNsm]),
            title: String(data[i][idxTitle]),
            description: String(data[i][idxDesc]),
            status: String(data[i][idxStatus]),
            attachments: attachmentsList,
            work_notes: workNotesList,
            created_by: String(data[i][idxCreatedBy]),
            created_at: String(data[i][idxCreatedAt]),
            updated_at: String(data[i][idxUpdatedAt]),
            delete_requested: (idxDeleteReq !== -1 && idxDeleteReq < data[i].length) ? (String(data[i][idxDeleteReq]).trim().toUpperCase() === 'TRUE') : false,
            tag: (idxTag !== -1 && idxTag < data[i].length) ? String(data[i][idxTag]).trim() : '',
            work_details: (idxWorkDetails !== -1 && idxWorkDetails < data[i].length) ? String(data[i][idxWorkDetails]).trim() : '',
            approved_by_supervisor: (idxApproved !== -1 && idxApproved < data[i].length) ? (String(data[i][idxApproved]).trim().toUpperCase() === 'TRUE') : false
          });
        }
      }
    }

    // 2. Ambil data Comments
    const commentsSheet = ss.getSheetByName('KanbanComments');
    let comments = [];
    if (commentsSheet && commentsSheet.getLastRow() > 1) {
      const data = commentsSheet.getDataRange().getValues();
      const headers = data[0].map(h => String(h).trim());
      
      const idxCommentId = headers.indexOf('comment_id');
      const idxCardId = headers.indexOf('card_id');
      const idxAuthorName = headers.indexOf('author_name');
      const idxAuthorRole = headers.indexOf('author_role');
      const idxAuthorId = headers.indexOf('author_id');
      const idxText = headers.indexOf('comment_text');
      const idxCreatedAt = headers.indexOf('created_at');
      const idxCardStatus = headers.indexOf('card_status');

      const relevantCardIds = new Set(cards.map(c => c.card_id));

      for (let i = 1; i < data.length; i++) {
        const cardId = String(data[i][idxCardId]);
        if (relevantCardIds.has(cardId)) {
          comments.push({
            comment_id: String(data[i][idxCommentId]),
            card_id: cardId,
            author_name: String(data[i][idxAuthorName]),
            author_role: String(data[i][idxAuthorRole]),
            author_id: String(data[i][idxAuthorId]),
            comment_text: String(data[i][idxText]),
            created_at: String(data[i][idxCreatedAt]),
            card_status: (idxCardStatus !== -1 && idxCardStatus < data[i].length) ? String(data[i][idxCardStatus]).trim() : ''
          });
        }
      }
    }

    // 3. Ambil data Tags
    let tagsSheet = ss.getSheetByName('KanbanTags');
    if (!tagsSheet) {
      try {
        tagsSheet = ss.insertSheet('KanbanTags');
        tagsSheet.appendRow(['category', 'subcategory', 'icon']);
        tagsSheet.appendRow(['KBC', 'Nilai Spiritual', '🧩']);
        tagsSheet.appendRow(['KBC', 'Personal', '👤']);
        tagsSheet.appendRow(['Level', 'Belum Tumbuh', '🌱']);
        tagsSheet.appendRow(['Level', 'Tumbuh', '🌿']);
        tagsSheet.appendRow(['Level', 'Berkembang', '🌳']);
        tagsSheet.appendRow(['Level', 'Membudaya', '🏆']);
        tagsSheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#d9ead3');
      } catch (errCreateSheet) {
        console.error('Gagal membuat sheet KanbanTags: ' + errCreateSheet.toString());
      }
    } else {
      // Check if icon column header is missing, add it and fill default values
      const dataRange = tagsSheet.getDataRange();
      const data = dataRange.getValues();
      const headers = data[0].map(h => String(h).trim().toLowerCase());
      let idxIcon = headers.indexOf('icon');
      if (idxIcon === -1) {
        tagsSheet.getRange(1, headers.length + 1).setValue('icon');
        const numRows = tagsSheet.getLastRow();
        for (let i = 1; i < numRows; i++) {
          const sub = String(data[i][1]).trim().toLowerCase();
          let defaultIcon = '';
          if (sub === 'nilai spiritual') defaultIcon = '🧩';
          else if (sub === 'personal') defaultIcon = '👤';
          else if (sub === 'belum tumbuh') defaultIcon = '🌱';
          else if (sub === 'tumbuh') defaultIcon = '🌿';
          else if (sub === 'berkembang') defaultIcon = '🌳';
          else if (sub === 'membudaya') defaultIcon = '🏆';
          
          if (defaultIcon) {
            tagsSheet.getRange(i + 1, headers.length + 1).setValue(defaultIcon);
          }
        }
      }
    }

    let tags = [];
    if (tagsSheet && tagsSheet.getLastRow() > 1) {
      const data = tagsSheet.getDataRange().getValues();
      const headers = data[0].map(h => String(h).trim().toLowerCase());
      const idxCat = headers.indexOf('category');
      const idxSub = headers.indexOf('subcategory');
      const idxIcon = headers.indexOf('icon');

      for (let i = 1; i < data.length; i++) {
        const cat = idxCat !== -1 ? String(data[i][idxCat]).trim() : '';
        const sub = idxSub !== -1 ? String(data[i][idxSub]).trim() : '';
        const icon = idxIcon !== -1 && idxIcon < data[i].length ? String(data[i][idxIcon]).trim() : '';
        if (cat && sub) {
          tags.push(`${cat}|${sub}|${icon}`);
        }
      }
    } else {
      tags = [
        'KBC|Nilai Spiritual|🧩',
        'KBC|Personal|👤',
        'Level|Belum Tumbuh|🌱',
        'Level|Tumbuh|🌿',
        'Level|Berkembang|🌳',
        'Level|Membudaya|🏆'
      ];
    }

    return apiSuccess({ cards, comments, tags });
  } catch (e) {
    return apiError('Gagal mengambil data Kanban: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Menyimpan kartu Kanban (buat baru atau edit)
 * @param {string} nsm NSM Madrasah
 * @param {object} cardData Objek data kartu
 * @param {string} sessionToken Token sesi aktif
 * @returns {object} API response standard
 */
function kanbanSaveCard(nsm, cardData, sessionToken) {
  return executeWithLock_(() => {
    try {
      const nsmStr = String(nsm).trim();
      if (!nsmStr) return apiError('NSM harus diisi.', 'VALIDATION');

      // PROTEKSI: Cek sesi Pengawas. Jika dia Pengawas, dia tidak boleh mengedit/buat kartu Kanban Madrasah
      const isSupervisor = validateSession_(sessionToken);
      if (isSupervisor) {
        return apiError('Hanya Kepala Madrasah yang dapat membuat atau mengedit kartu tugas.', 'FORBIDDEN');
      }

      const ss = getAppDb_();
      const sheet = ss.getSheetByName('KanbanCards');
      if (!sheet) return apiError('Tabel KanbanCards belum diinisialisasi.', 'NOT_FOUND');

      const title = sanitizeHtml(String(cardData.title || '').trim());
      const description = sanitizeHtml(String(cardData.description || '').trim());
      const status = sanitizeHtml(String(cardData.status || 'Belum Mulai').trim());
      const attachments = JSON.stringify(cardData.attachments || []);
      const tag = sanitizeHtml(String(cardData.tag || '').trim());
      const work_details = sanitizeHtml(String(cardData.work_details || '').trim());
      const work_notes = JSON.stringify(cardData.work_notes || []);
      const now = new Date().toISOString();

      if (!title) return apiError('Judul kartu tidak boleh kosong.', 'VALIDATION');

      const data = sheet.getDataRange().getValues();
      const headers = data[0].map(h => String(h).trim());
      const idxCardId = headers.indexOf('card_id');

      // Check if tag column is missing, add it
      let idxTag = headers.indexOf('tag');
      if (idxTag === -1) {
        sheet.getRange(1, headers.length + 1).setValue('tag');
        headers.push('tag');
        idxTag = headers.length - 1;
      }

      // Check if work_details column is missing, add it
      let idxWorkDetails = headers.indexOf('work_details');
      if (idxWorkDetails === -1) {
        sheet.getRange(1, headers.length + 1).setValue('work_details');
        headers.push('work_details');
        idxWorkDetails = headers.length - 1;
      }

      // Check if work_notes column is missing, add it
      let idxWorkNotes = headers.indexOf('work_notes');
      if (idxWorkNotes === -1) {
        sheet.getRange(1, headers.length + 1).setValue('work_notes');
        headers.push('work_notes');
        idxWorkNotes = headers.length - 1;
      }

      let cardId = cardData.card_id ? String(cardData.card_id).trim() : '';

      if (cardId) {
        const row = findRowIndex_(sheet, idxCardId, cardId);
        if (row !== -1) {
          const idxApproved = headers.indexOf('approved_by_supervisor');
          const approved = (idxApproved !== -1 && idxApproved < data[row - 1].length) ? (String(data[row - 1][idxApproved]).trim().toUpperCase() === 'TRUE') : false;
          if (approved) {
            return apiError('Tugas ini sudah disahkan oleh Pengawas Binaan. Batalkan persetujuan terlebih dahulu untuk mengeditnya.', 'FORBIDDEN');
          }
        }
      }

      if (!cardId) {
        // BUAT KARTU BARU
        cardId = 'CARD-' + nsmStr + '-' + Date.now();
        const rowValues = headers.map(h => {
          if (h === 'card_id') return cardId;
          if (h === 'nsm') return nsmStr;
          if (h === 'title') return title;
          if (h === 'description') return description;
          if (h === 'status') return status;
          if (h === 'attachments') return attachments;
          if (h === 'tag') return tag;
          if (h === 'work_details') return work_details;
          if (h === 'work_notes') return work_notes;
          if (h === 'created_by') return 'Kamad';
          if (h === 'created_at') return now;
          if (h === 'updated_at') return now;
          return '';
        });
        sheet.appendRow(rowValues);

        // Tambahkan komentar sistem
        let statusText = '';
        if (status === 'Belum Mulai') statusText = 'Dibuat';
        else if (status === 'Sedang Berjalan') statusText = 'Sedang Berjalan';
        else if (status === 'Selesai') statusText = 'Selesai';
        else if (status === 'Dibatalkan') statusText = 'Ditunda';

        if (statusText) {
          addSystemComment_(ss, cardId, statusText + ' ' + formatDateTime_());
        }
      } else {
        // UPDATE KARTU LAMA
        const row = findRowIndex_(sheet, idxCardId, cardId);
        if (row === -1) return apiError('Kartu tidak ditemukan.', 'NOT_FOUND');

        const idxStatus = headers.indexOf('status');
        const oldStatus = idxStatus !== -1 ? String(data[row - 1][idxStatus]).trim() : '';

        headers.forEach((h, colIdx) => {
          let val = null;
          if (h === 'title') val = title;
          else if (h === 'description') val = description;
          else if (h === 'status') val = status;
          else if (h === 'attachments') val = attachments;
          else if (h === 'tag') val = tag;
          else if (h === 'work_details') val = work_details;
          else if (h === 'work_notes') val = work_notes;
          else if (h === 'updated_at') val = now;

          if (val !== null) {
            sheet.getRange(row, colIdx + 1).setValue(val);
          }
        });

        // Tambahkan komentar sistem jika status berubah saat diedit
        if (oldStatus !== status) {
          let statusText = '';
          if (status === 'Belum Mulai') statusText = 'Dibuat';
          else if (status === 'Sedang Berjalan') statusText = 'Sedang Berjalan';
          else if (status === 'Selesai') statusText = 'Selesai';
          else if (status === 'Dibatalkan') statusText = 'Ditunda';

          if (statusText) {
            addSystemComment_(ss, cardId, statusText + ' ' + formatDateTime_());
          }
        }
      }

      try {
        const cache = CacheService.getScriptCache();
        const cacheVer = cache.get('cache_version') || '1';
        cache.remove('kamad_dash_' + nsmStr + '_district_' + cacheVer);
        cache.remove('kamad_dash_' + nsmStr + '_madrasah_' + cacheVer);
      } catch(e) {}
      return apiSuccess({ card_id: cardId }, 'Kartu berhasil disimpan.');
    } catch (e) {
      return apiError('Gagal menyimpan kartu: ' + e.toString(), 'SYSTEM_ERROR');
    }
  });
}

/**
 * Mengubah status/tahapan kolom kartu Kanban secara cepat (drag-and-drop / dropdown)
 * @param {string} nsm NSM Madrasah
 * @param {string} cardId ID kartu
 * @param {string} newStatus Status baru ('Belum Mulai' | 'Sedang Berjalan' | 'Selesai' | 'Dibatalkan')
 * @param {string} sessionToken Token sesi aktif
 * @returns {object} API response standard
 */
function kanbanMoveCard(nsm, cardId, newStatus, sessionToken) {
  return executeWithLock_(() => {
    try {
      // PROTEKSI: Cek sesi Pengawas
      const isSupervisor = validateSession_(sessionToken);
      if (isSupervisor) {
        return apiError('Hanya Kepala Madrasah yang dapat memindahkan kartu tugas.', 'FORBIDDEN');
      }

      const ss = getAppDb_();
      const sheet = ss.getSheetByName('KanbanCards');
      if (!sheet) return apiError('Tabel KanbanCards belum diinisialisasi.', 'NOT_FOUND');

      const data = sheet.getDataRange().getValues();
      const headers = data[0].map(h => String(h).trim());
      const idxCardId = headers.indexOf('card_id');
      const idxStatus = headers.indexOf('status');
      const idxUpdatedAt = headers.indexOf('updated_at');

      const row = findRowIndex_(sheet, idxCardId, cardId);
      if (row === -1) return apiError('Kartu tidak ditemukan.', 'NOT_FOUND');

      const idxApproved = headers.indexOf('approved_by_supervisor');
      const approved = (idxApproved !== -1 && idxApproved < data[row - 1].length) ? (String(data[row - 1][idxApproved]).trim().toUpperCase() === 'TRUE') : false;
      if (approved) {
        return apiError('Tugas ini sudah disahkan oleh Pengawas Binaan. Batalkan persetujuan terlebih dahulu untuk memindahkannya.', 'FORBIDDEN');
      }

      const oldStatus = idxStatus !== -1 ? String(data[row - 1][idxStatus]).trim() : '';
      const newStatusSanitized = sanitizeHtml(newStatus).trim();

      sheet.getRange(row, idxStatus + 1).setValue(newStatusSanitized);
      sheet.getRange(row, idxUpdatedAt + 1).setValue(new Date().toISOString());

      if (oldStatus !== newStatusSanitized) {
        let statusText = '';
        if (newStatusSanitized === 'Belum Mulai') statusText = 'Dibuat';
        else if (newStatusSanitized === 'Sedang Berjalan') statusText = 'Sedang Berjalan';
        else if (newStatusSanitized === 'Selesai') statusText = 'Selesai';
        else if (newStatusSanitized === 'Dibatalkan') statusText = 'Ditunda';

        if (statusText) {
          addSystemComment_(ss, cardId, statusText + ' ' + formatDateTime_());
        }
      }

      try {
        const cache = CacheService.getScriptCache();
        const cacheVer = cache.get('cache_version') || '1';
        cache.remove('kamad_dash_' + String(nsm).trim() + '_district_' + cacheVer);
        cache.remove('kamad_dash_' + String(nsm).trim() + '_madrasah_' + cacheVer);
      } catch(e) {}
      return apiSuccess(null, 'Status kartu berhasil diperbarui.');
    } catch (e) {
      return apiError('Gagal memindahkan kartu: ' + e.toString(), 'SYSTEM_ERROR');
    }
  });
}

/**
 * Menghapus kartu Kanban beserta komentar terkait
 * @param {string} nsm NSM Madrasah
 * @param {string} cardId ID kartu
 * @param {string} sessionToken Token sesi aktif
 * @returns {object} API response standard
 */
function kanbanDeleteCard(nsm, cardId, sessionToken) {
  return executeWithLock_(() => {
    try {
      const isSupervisor = validateSession_(sessionToken);
      const ss = getAppDb_();
      
      const cardsSheet = ss.getSheetByName('KanbanCards');
      if (!cardsSheet) return apiError('Tabel KanbanCards belum diinisialisasi.', 'NOT_FOUND');

      const data = cardsSheet.getDataRange().getValues();
      const headers = data[0].map(h => String(h).trim());
      const idxCardId = headers.indexOf('card_id');
      const idxStatus = headers.indexOf('status');
      const idxDeleteReq = headers.indexOf('delete_requested');
      
      const row = findRowIndex_(cardsSheet, idxCardId, cardId);
      if (row === -1) return apiError('Kartu tidak ditemukan.', 'NOT_FOUND');

      const cardStatus = String(data[row - 1][idxStatus]);
      const deleteRequested = idxDeleteReq !== -1 ? (String(data[row - 1][idxDeleteReq]).trim().toUpperCase() === 'TRUE') : false;

      // 1. Cek otorisasi berdasarkan peran
      if (isSupervisor) {
        if (!deleteRequested) {
          return apiError('Hanya dapat menyetujui penghapusan jika Kepala Madrasah sudah mengajukannya.', 'FORBIDDEN');
        }
      } else {
        // Jika Kamad, mereka hanya boleh menghapus langsung jika statusnya 'Belum Mulai'
        if (cardStatus !== 'Belum Mulai') {
          return apiError('Hanya kartu dengan status Belum Mulai yang dapat dihapus langsung. Kartu lainnya harus diajukan untuk disetujui Pengawas.', 'FORBIDDEN');
        }
      }

      // 2. Hapus kartu
      // Hapus lampiran berkas dari Drive jika memungkinkan
      try {
        const idxAttach = headers.indexOf('attachments');
        const attachStr = data[row - 1][idxAttach];
        if (attachStr) {
          const list = JSON.parse(attachStr);
          list.forEach(att => {
            if (att.type !== 'link' && att.url) {
              let fileId = '';
              if (att.url.includes('lh3.googleusercontent.com/d/')) {
                fileId = att.url.split('/d/')[1];
              } else if (att.url.includes('id=')) {
                fileId = att.url.split('id=')[1].split('&')[0];
              }
              if (fileId) {
                DriveApp.getFileById(fileId).setTrashed(true);
              }
            }
          });
        }
      } catch(errDrive) {
        console.error('Gagal hapus berkas dari Drive: ' + errDrive.toString());
      }

      cardsSheet.deleteRow(row);

      // 3. Hapus komentar terkait kartu tersebut
      const commentsSheet = ss.getSheetByName('KanbanComments');
      if (commentsSheet && commentsSheet.getLastRow() > 1) {
        let commentData = commentsSheet.getDataRange().getValues();
        let headersComm = commentData[0].map(h => String(h).trim());
        let idxCardIdComm = headersComm.indexOf('card_id');

        for (let i = commentData.length - 1; i >= 1; i--) {
          if (String(commentData[i][idxCardIdComm]).trim() === String(cardId).trim()) {
            commentsSheet.deleteRow(i + 1);
          }
        }
      }

      try {
        const cache = CacheService.getScriptCache();
        const cacheVer = cache.get('cache_version') || '1';
        cache.remove('kamad_dash_' + String(nsm).trim() + '_district_' + cacheVer);
        cache.remove('kamad_dash_' + String(nsm).trim() + '_madrasah_' + cacheVer);
      } catch(e) {}
      return apiSuccess(null, 'Kartu dan seluruh komentar berhasil dihapus.');
    } catch (e) {
      return apiError('Gagal menghapus kartu: ' + e.toString(), 'SYSTEM_ERROR');
    }
  });
}

/**
 * Mengajukan permohonan penghapusan kartu oleh Kamad
 * @param {string} nsm NSM Madrasah
 * @param {string} cardId ID kartu
 * @param {string} sessionToken Token sesi
 * @returns {object} API response
 */
function kanbanRequestDeleteCard(nsm, cardId, sessionToken) {
  return executeWithLock_(() => {
    try {
      const isSupervisor = validateSession_(sessionToken);
      if (isSupervisor) {
        return apiError('Hanya Kepala Madrasah yang dapat mengajukan penghapusan.', 'FORBIDDEN');
      }

      const ss = getAppDb_();
      const cardsSheet = ss.getSheetByName('KanbanCards');
      if (!cardsSheet) return apiError('Tabel KanbanCards belum diinisialisasi.', 'NOT_FOUND');

      const data = cardsSheet.getDataRange().getValues();
      const headers = data[0].map(h => String(h).trim());
      const idxCardId = headers.indexOf('card_id');
      
      let idxDeleteReq = headers.indexOf('delete_requested');
      if (idxDeleteReq === -1) {
        cardsSheet.getRange(1, headers.length + 1).setValue('delete_requested');
        headers.push('delete_requested');
        idxDeleteReq = headers.length - 1;
      }

      const row = findRowIndex_(cardsSheet, idxCardId, cardId);
      if (row === -1) return apiError('Kartu tidak ditemukan.', 'NOT_FOUND');

      // Set delete_requested to TRUE
      cardsSheet.getRange(row, idxDeleteReq + 1).setValue(true);

      // Tambahkan komentar sistem
      addSystemComment_(ss, cardId, '⚠️ Kepala Madrasah mengajukan permohonan penghapusan kartu ini. Menunggu persetujuan Pengawas Binaan.');

      try {
        const cache = CacheService.getScriptCache();
        const cacheVer = cache.get('cache_version') || '1';
        cache.remove('kamad_dash_' + String(nsm).trim() + '_district_' + cacheVer);
        cache.remove('kamad_dash_' + String(nsm).trim() + '_madrasah_' + cacheVer);
      } catch(e) {}
      return apiSuccess(null, 'Permohonan penghapusan kartu berhasil diajukan.');
    } catch (e) {
      return apiError('Gagal mengajukan penghapusan kartu: ' + e.toString(), 'SYSTEM_ERROR');
    }
  });
}

/**
 * Menolak permohonan penghapusan kartu oleh Supervisor
 * @param {string} nsm NSM Madrasah
 * @param {string} cardId ID kartu
 * @param {string} sessionToken Token sesi
 * @returns {object} API response
 */
function kanbanRejectDeleteCard(nsm, cardId, sessionToken) {
  return executeWithLock_(() => {
    try {
      const isSupervisor = validateSession_(sessionToken);
      if (!isSupervisor) {
        return apiError('Hanya Pengawas yang dapat menolak penghapusan kartu.', 'FORBIDDEN');
      }

      const ss = getAppDb_();
      const cardsSheet = ss.getSheetByName('KanbanCards');
      if (!cardsSheet) return apiError('Tabel KanbanCards belum diinisialisasi.', 'NOT_FOUND');

      const data = cardsSheet.getDataRange().getValues();
      const headers = data[0].map(h => String(h).trim());
      const idxCardId = headers.indexOf('card_id');
      const idxDeleteReq = headers.indexOf('delete_requested');
      
      if (idxDeleteReq === -1) {
        return apiError('Kolom status hapus belum ada.', 'VALIDATION');
      }

      const row = findRowIndex_(cardsSheet, idxCardId, cardId);
      if (row === -1) return apiError('Kartu tidak ditemukan.', 'NOT_FOUND');

      // Set delete_requested to FALSE
      cardsSheet.getRange(row, idxDeleteReq + 1).setValue(false);

      // Tambahkan komentar penolakan
      addSystemComment_(ss, cardId, '❌ Pengajuan penghapusan kartu ditolak oleh Pengawas Binaan.');

      try {
        const cache = CacheService.getScriptCache();
        const cacheVer = cache.get('cache_version') || '1';
        cache.remove('kamad_dash_' + String(nsm).trim() + '_district_' + cacheVer);
        cache.remove('kamad_dash_' + String(nsm).trim() + '_madrasah_' + cacheVer);
      } catch(e) {}
      return apiSuccess(null, 'Permohonan penghapusan kartu berhasil ditolak.');
    } catch (e) {
      return apiError('Gagal menolak penghapusan kartu: ' + e.toString(), 'SYSTEM_ERROR');
    }
  });
}

/**
 * Membatalkan pengajuan hapus kartu oleh Kamad
 * @param {string} nsm NSM Madrasah
 * @param {string} cardId ID kartu
 * @param {string} sessionToken Token sesi
 * @returns {object} API response
 */
function kanbanCancelDeleteRequest(nsm, cardId, sessionToken) {
  return executeWithLock_(() => {
    try {
      const isSupervisor = validateSession_(sessionToken);
      if (isSupervisor) {
        return apiError('Hanya Kepala Madrasah yang dapat membatalkan pengajuan.', 'FORBIDDEN');
      }

      const ss = getAppDb_();
      const cardsSheet = ss.getSheetByName('KanbanCards');
      if (!cardsSheet) return apiError('Tabel KanbanCards belum diinisialisasi.', 'NOT_FOUND');

      const data = cardsSheet.getDataRange().getValues();
      const headers = data[0].map(h => String(h).trim());
      const idxCardId = headers.indexOf('card_id');
      const idxDeleteReq = headers.indexOf('delete_requested');
      
      if (idxDeleteReq === -1) return apiError('Kolom status hapus tidak ditemukan.', 'NOT_FOUND');

      const row = findRowIndex_(cardsSheet, idxCardId, cardId);
      if (row === -1) return apiError('Kartu tidak ditemukan.', 'NOT_FOUND');

      // Set delete_requested to FALSE
      cardsSheet.getRange(row, idxDeleteReq + 1).setValue(false);

      // Tambahkan komentar pembatalan
      addSystemComment_(ss, cardId, '🔄 Pengajuan penghapusan kartu dibatalkan oleh Kepala Madrasah.');

      try {
        const cache = CacheService.getScriptCache();
        const cacheVer = cache.get('cache_version') || '1';
        cache.remove('kamad_dash_' + String(nsm).trim() + '_district_' + cacheVer);
        cache.remove('kamad_dash_' + String(nsm).trim() + '_madrasah_' + cacheVer);
      } catch(e) {}
      return apiSuccess(null, 'Pengajuan hapus dibatalkan.');
    } catch (e) {
      return apiError('Gagal membatalkan pengajuan: ' + e.toString(), 'SYSTEM_ERROR');
    }
  });
}

/**
 * Menambahkan komentar baru ke kartu Kanban
 * @param {string} nsm NSM Madrasah
 * @param {string} cardId ID kartu
 * @param {string} commentText Isi teks komentar
 * @param {string} authorName Nama penulis
 * @param {string} authorRole Peran penulis ('Kamad' | 'Pengawas')
 * @param {string} sessionToken Token sesi aktif
 * @returns {object} API response standard
 */
function kanbanAddComment(nsm, cardId, commentText, authorName, authorRole, sessionToken) {
  return executeWithLock_(() => {
    try {
      const cardIdStr = String(cardId).trim();
      const text = sanitizeHtml(String(commentText || '').trim());
      if (!cardIdStr || !text) return apiError('Data komentar tidak lengkap.', 'VALIDATION');

      const ss = getAppDb_();
      const sheet = ss.getSheetByName('KanbanComments');
      if (!sheet) return apiError('Tabel KanbanComments belum diinisialisasi.', 'NOT_FOUND');

      let finalAuthorName = authorName ? sanitizeHtml(String(authorName).trim()) : 'User';
      let finalAuthorRole = authorRole === 'Pengawas' ? 'Pengawas' : 'Kamad';
      let finalAuthorId = nsm;

      // VALIDASI SESI: Jika sessionToken valid untuk Pengawas, timpa nama & peran dengan kredensial terverifikasi backend
      const supervisorNip = validateSession_(sessionToken);
      if (supervisorNip) {
        finalAuthorRole = 'Pengawas';
        finalAuthorId = supervisorNip;
        
        // Ambil nama pengawas dari Profil
        const profilSheet = ss.getSheetByName('Profil');
        if (profilSheet) {
          const profData = profilSheet.getDataRange().getValues();
          const profHeaders = profData[0].map(h => String(h).trim());
          const idxNip = profHeaders.indexOf('NIP');
          const idxNama = profHeaders.indexOf('Nama');
          const profRow = findRowIndex_(profilSheet, idxNip, supervisorNip);
          if (profRow !== -1) {
            finalAuthorName = String(profData[profRow - 1][idxNama]).trim();
          }
        }
      } else {
        // Jika bukan pengawas, pastikan perannya adalah Kamad
        finalAuthorRole = 'Kamad';
      }

      const commentId = 'COMM-' + Date.now();
      const now = new Date().toISOString();

      const headers = sheet.getDataRange().getValues()[0].map(h => String(h).trim());
      
      // Check if card_status column is missing, add it
      let idxCardStatus = headers.indexOf('card_status');
      if (idxCardStatus === -1) {
        sheet.getRange(1, headers.length + 1).setValue('card_status');
        headers.push('card_status');
        idxCardStatus = headers.length - 1;
      }

      // Ambil status kartu saat ini untuk catatan
      let cardStatus = 'Belum Mulai';
      const cardsSheet = ss.getSheetByName('KanbanCards');
      if (cardsSheet) {
        const cardsData = cardsSheet.getDataRange().getValues();
        const cardsHeaders = cardsData[0].map(h => String(h).trim());
        const idxCardId = cardsHeaders.indexOf('card_id');
        const idxStatus = cardsHeaders.indexOf('status');
        if (idxCardId !== -1 && idxStatus !== -1) {
          const cardRow = findRowIndex_(cardsSheet, idxCardId, cardIdStr);
          if (cardRow !== -1) {
            cardStatus = String(cardsData[cardRow - 1][idxStatus]).trim();
          }
        }
      }

      const rowValues = headers.map(h => {
        if (h === 'comment_id') return commentId;
        if (h === 'card_id') return cardIdStr;
        if (h === 'author_name') return finalAuthorName;
        if (h === 'author_role') return finalAuthorRole;
        if (h === 'author_id') return finalAuthorId;
        if (h === 'comment_text') return text;
        if (h === 'created_at') return now;
        if (h === 'card_status') return cardStatus;
        return '';
      });

      sheet.appendRow(rowValues);

      try {
        const cache = CacheService.getScriptCache();
        const cacheVer = cache.get('cache_version') || '1';
        cache.remove('kamad_dash_' + String(nsm).trim() + '_district_' + cacheVer);
        cache.remove('kamad_dash_' + String(nsm).trim() + '_madrasah_' + cacheVer);
      } catch(e) {}
      return apiSuccess({
        comment_id: commentId,
        author_name: finalAuthorName,
        author_role: finalAuthorRole,
        author_id: finalAuthorId,
        comment_text: text,
        created_at: now,
        card_status: cardStatus
      }, 'Komentar berhasil ditambahkan.');
    } catch (e) {
      return apiError('Gagal menambahkan komentar: ' + e.toString(), 'SYSTEM_ERROR');
    }
  });
}

/**
 * Mengunggah berkas lampiran Kanban ke Google Drive
 * @param {string} nsm NSM Madrasah
 * @param {string} base64Data Data berkas dalam bentuk Base64 (data:content/type;base64,...)
 * @param {string} filename Nama asli berkas
 * @param {string} sessionToken Token sesi aktif
 * @returns {object} API response standard
 */
function kanbanUploadAttachment(nsm, base64Data, filename, sessionToken) {
  if (!nsm || !base64Data) return apiError('Data unggahan tidak lengkap.', 'VALIDATION');
  try {
    // 1. Dapatkan folder upload/{nsm}/kanban/
    const ssFile = DriveApp.getFileById(APP_DB_ID);
    const parents = ssFile.getParents();
    let parentFolder = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
    
    const uploadFolder = getOrCreateFolder(parentFolder, 'upload');
    const nsmFolder = getOrCreateFolder(uploadFolder, String(nsm).trim());
    const kanbanFolder = getOrCreateFolder(nsmFolder, 'kanban');

    // Set agar folder bisa diakses siapa saja yang punya link (readonly)
    kanbanFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // 2. Decode Base64 data
    const contentType = base64Data.substring(5, base64Data.indexOf(';'));
    const bytes = Utilities.base64Decode(base64Data.split(',')[1]);
    
    // Bersihkan nama file agar aman
    const ext = filename.split('.').pop();
    const cleanBaseName = filename.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
    const safeFilename = cleanBaseName + '_' + Date.now() + '.' + ext;
    
    const blob = Utilities.newBlob(bytes, contentType, safeFilename);

    // 3. Simpan berkas ke Drive
    const file = kanbanFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const fileId = file.getId();
    let fileUrl = '';
    
    // Jika berkas adalah gambar, gunakan link thumbnail lh3 agar bisa di-embed langsung di tag img
    if (contentType.startsWith('image/')) {
      fileUrl = 'https://lh3.googleusercontent.com/d/' + fileId;
    } else {
      fileUrl = file.getUrl(); // Untuk PDF/berkas lain gunakan Google Drive Preview Link
    }

    return apiSuccess({ url: fileUrl, name: filename }, 'Berkas berhasil diunggah.');
  } catch (e) {
    return apiError('Gagal mengunggah berkas ke Drive: ' + e.toString(), 'UPLOAD_ERROR');
  }
}

/**
 * Menyetujui penyelesaian kartu tugas oleh Pengawas Binaan
 * @param {string} nsm NSM Madrasah
 * @param {string} cardId ID kartu
 * @param {string} sessionToken Token sesi aktif
 * @returns {object} API response standard
 */
function kanbanApproveCompletion(nsm, cardId, sessionToken) {
  return executeWithLock_(() => {
    try {
      const isSupervisor = validateSession_(sessionToken);
      if (!isSupervisor) {
        return apiError('Hanya Pengawas yang dapat menyetujui penyelesaian tugas.', 'FORBIDDEN');
      }

      const ss = getAppDb_();
      const cardsSheet = ss.getSheetByName('KanbanCards');
      if (!cardsSheet) return apiError('Tabel KanbanCards belum diinisialisasi.', 'NOT_FOUND');

      const data = cardsSheet.getDataRange().getValues();
      const headers = data[0].map(h => String(h).trim());
      const idxCardId = headers.indexOf('card_id');
      
      // Pastikan kolom approved_by_supervisor ada
      let idxApproved = headers.indexOf('approved_by_supervisor');
      if (idxApproved === -1) {
        cardsSheet.getRange(1, headers.length + 1).setValue('approved_by_supervisor');
        headers.push('approved_by_supervisor');
        idxApproved = headers.length - 1;
      }

      const row = findRowIndex_(cardsSheet, idxCardId, cardId);
      if (row === -1) return apiError('Kartu tidak ditemukan.', 'NOT_FOUND');

      // Set approved_by_supervisor to TRUE
      cardsSheet.getRange(row, idxApproved + 1).setValue(true);

      // Tambahkan komentar sistem
      addSystemComment_(ss, cardId, '✅ Disahkan oleh Pengawas ' + formatDateTime_());

      try {
        const cache = CacheService.getScriptCache();
        const cacheVer = cache.get('cache_version') || '1';
        cache.remove('kamad_dash_' + String(nsm).trim() + '_district_' + cacheVer);
        cache.remove('kamad_dash_' + String(nsm).trim() + '_madrasah_' + cacheVer);
      } catch(e) {}
      return apiSuccess(null, 'Penyelesaian tugas berhasil disetujui.');
    } catch (e) {
      return apiError('Gagal menyetujui penyelesaian tugas: ' + e.toString(), 'SYSTEM_ERROR');
    }
  });
}

/**
 * Membatalkan persetujuan penyelesaian kartu tugas oleh Pengawas Binaan
 * @param {string} nsm NSM Madrasah
 * @param {string} cardId ID kartu
 * @param {string} sessionToken Token sesi aktif
 * @returns {object} API response standard
 */
function kanbanCancelCompletionApproval(nsm, cardId, sessionToken) {
  return executeWithLock_(() => {
    try {
      const isSupervisor = validateSession_(sessionToken);
      if (!isSupervisor) {
        return apiError('Hanya Pengawas yang dapat membatalkan persetujuan penyelesaian.', 'FORBIDDEN');
      }

      const ss = getAppDb_();
      const cardsSheet = ss.getSheetByName('KanbanCards');
      if (!cardsSheet) return apiError('Tabel KanbanCards belum diinisialisasi.', 'NOT_FOUND');

      const data = cardsSheet.getDataRange().getValues();
      const headers = data[0].map(h => String(h).trim());
      const idxCardId = headers.indexOf('card_id');
      const idxApproved = headers.indexOf('approved_by_supervisor');
      
      if (idxApproved === -1) {
        return apiError('Kolom persetujuan tidak ditemukan.', 'VALIDATION');
      }

      const row = findRowIndex_(cardsSheet, idxCardId, cardId);
      if (row === -1) return apiError('Kartu tidak ditemukan.', 'NOT_FOUND');

      // Set approved_by_supervisor to FALSE
      cardsSheet.getRange(row, idxApproved + 1).setValue(false);

      // Tambahkan komentar sistem
      addSystemComment_(ss, cardId, '⚠️ Persetujuan penyelesaian tugas ini telah dibatalkan oleh Pengawas Binaan.');

      try {
        const cache = CacheService.getScriptCache();
        const cacheVer = cache.get('cache_version') || '1';
        cache.remove('kamad_dash_' + String(nsm).trim() + '_district_' + cacheVer);
        cache.remove('kamad_dash_' + String(nsm).trim() + '_madrasah_' + cacheVer);
      } catch(e) {}
      return apiSuccess(null, 'Persetujuan penyelesaian tugas berhasil dibatalkan.');
    } catch (e) {
      return apiError('Gagal membatalkan persetujuan: ' + e.toString(), 'SYSTEM_ERROR');
    }
  });
}

/**
 * Menambahkan komentar sistem ke lembar KanbanComments dengan format nama kosong agar rapi (hanya menampilkan badge "System")
 * @param {object} ss Objek Spreadsheet
 * @param {string} cardId ID kartu
 * @param {string} text Isi komentar sistem
 */
function addSystemComment_(ss, cardId, text) {
  try {
    const commentsSheet = ss.getSheetByName('KanbanComments');
    if (!commentsSheet) return;
    
    let commHeaders = commentsSheet.getDataRange().getValues()[0].map(h => String(h).trim());
    const commentId = 'COMM-' + Date.now();
    const nowStr = new Date().toISOString();

    // Check if card_status column is missing, add it
    let idxCardStatus = commHeaders.indexOf('card_status');
    if (idxCardStatus === -1) {
      commentsSheet.getRange(1, commHeaders.length + 1).setValue('card_status');
      commHeaders.push('card_status');
      idxCardStatus = commHeaders.length - 1;
    }

    // Ambil status kartu saat ini untuk komentar sistem
    let cardStatus = 'Belum Mulai';
    const cardsSheet = ss.getSheetByName('KanbanCards');
    if (cardsSheet) {
      const cardsData = cardsSheet.getDataRange().getValues();
      const cardsHeaders = cardsData[0].map(h => String(h).trim());
      const idxCardId = cardsHeaders.indexOf('card_id');
      const idxStatus = cardsHeaders.indexOf('status');
      if (idxCardId !== -1 && idxStatus !== -1) {
        const cardRow = findRowIndex_(cardsSheet, idxCardId, cardId);
        if (cardRow !== -1) {
          cardStatus = String(cardsData[cardRow - 1][idxStatus]).trim();
        }
      }
    }
    
    const rowValues = commHeaders.map(h => {
      if (h === 'comment_id') return commentId;
      if (h === 'card_id') return cardId;
      if (h === 'author_name') return ''; // Kosongkan nama agar hanya merender badge "System"
      if (h === 'author_role') return 'System';
      if (h === 'author_id') return 'system';
      if (h === 'comment_text') return text;
      if (h === 'created_at') return nowStr;
      if (h === 'card_status') return cardStatus;
      return '';
    });
    commentsSheet.appendRow(rowValues);
  } catch (e) {
    console.error('Gagal menambahkan komentar sistem: ' + e.toString());
  }
}

/**
 * Format tanggal saat ini ke format yyyy-MM-dd HH:mm:ss dengan zona waktu GMT+7
 * @returns {string} Tanggal terformat
 */
function formatDateTime_() {
  try {
    return Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
  } catch (e) {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
           pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }
}
