// ============================================================
// SK GENERATION MODULE
// ============================================================

/**
 * Meningkatkan counter SK dan mengembalikan nomor barunya
 * @returns {number} Nomor SK baru
 */
function incrementSKCounter() {
  try {
    const ss = getAppDb_();
    const sheet = ss.getSheetByName('Settings');
    if (!sheet) return 1;
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === 'SK_COUNTER') {
        let currentVal = parseInt(data[i][1]) || 0;
        let newVal = currentVal + 1;
        sheet.getRange(i + 1, 2).setValue(newVal);
        return newVal;
      }
    }
    return 1;
  } catch (e) {
    console.error('Error incrementing SK counter:', e);
    return 1;
  }
}

/**
 * Membuat file SK (PDF) berdasarkan template Doc dan daftar madrasah sasaran
 * @param {string|number} nip
 * @returns {object} Response standard
 */
function generateSK(nip) {
  try {
    let profile = getProfile(nip);
    if (!profile) return apiError('Profil tidak ditemukan.', 'NOT_FOUND');

    let sasaran = getSasaran(nip);
    if (sasaran.length === 0) return apiError('Tidak ada madrasah sasaran untuk dibuatkan SK.', 'EMPTY');

    let tempDoc = DriveApp.getFileById(SK_TEMPLATE_DOC_ID).makeCopy('SK_' + profile['Nama'] + '_' + nip);
    let doc = DocumentApp.openById(tempDoc.getId());
    let body = doc.getBody();

    body.replaceText('<<NAMA>>', profile['Nama'] || '-');
    body.replaceText('<<NIP>>', profile['NIP'] || '-');
    body.replaceText('<<PANGKAT>>', profile['Golongan'] || '-');
    body.replaceText('<<KABUPATEN>>', profile['Kabupaten'] || '-');

    let skNum = incrementSKCounter();
    let dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd MMMM yyyy');
    body.replaceText('<<NOMOR_SK>>', 'B-' + String(skNum).padStart(4, '0') + '/Kk.13/Kp.01.2/' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM/yyyy'));
    body.replaceText('<<TANGGAL>>', dateStr);

    body.appendPageBreak();
    body.appendParagraph('LAMPIRAN SURAT KEPUTUSAN');
    body.appendParagraph('DAFTAR MADRASAH SASARAN BINAAN PENGAWAS');
    body.appendParagraph('Nama: ' + profile['Nama']);
    body.appendParagraph('NIP: ' + profile['NIP']);
    body.appendParagraph('');

    let tableData = [['No', 'NSM/NPSN', 'Nama Madrasah']];
    for (let i = 0; i < sasaran.length; i++) {
      tableData.push([String(i + 1), String(sasaran[i].nsm), String(sasaran[i].nama)]);
    }
    let table = body.appendTable(tableData);
    table.getRow(0).editAsText().setBold(true);

    // Set column widths to make No tighter, NSM snug, and Nama takes the rest
    table.setColumnWidth(0, 35);
    table.setColumnWidth(1, 120);

    doc.saveAndClose();

    let pdfBlob = tempDoc.getAs('application/pdf');
    let folder = getUserFolder(nip, 'sk');
    let pdfFile = folder.createFile(pdfBlob);
    tempDoc.setTrashed(true);
    pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return apiSuccess({ url: pdfFile.getUrl() }, 'SK berhasil dibuat.');
  } catch (e) {
    return apiError('Kesalahan sistem saat membuat SK: ' + e.toString(), 'SK_ERROR');
  }
}
