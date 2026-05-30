// ============================================================
// KAMAD PORTAL SETUP & AUTHENTICATION MODULE
// ============================================================

/**
 * Login Kamad menggunakan NSM dan password
 * Mendukung auto-upgrade hash password lama ke salted hash saat login sukses
 * @param {string|number} nsm
 * @param {string} password
 * @returns {object} Response standard
 */
function kamadLogin(nsm, password) {
  try {
    if (!nsm || !password) return apiError('NSM dan password harus diisi.', 'VALIDATION');
    const rateLimitKey = 'kamad_login_' + String(nsm).trim();
    if (isRateLimited(rateLimitKey)) return apiError('Terlalu banyak percobaan. Coba lagi dalam 5 menit.', 'RATE_LIMITED');

    const nsmStr = String(nsm).trim();
    const ss = getAppDb_();
    const sheet = getKamadSheet(ss, 'KamadUsers');
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).toLowerCase().trim());
    const iNsm  = headers.indexOf('nsm');
    const iPwd  = headers.indexOf('password');
    const iStat = headers.indexOf('status');

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][iNsm]).trim() === nsmStr) {
        if (String(data[i][iStat] || '').toLowerCase() === 'nonaktif')
          return apiError('Akun dinonaktifkan. Hubungi pengawas.', 'ACCOUNT_DISABLED');
        const stored = String(data[i][iPwd] || '');
        if (!stored) return apiError('Password belum disetel. Gunakan link dari pengawas.', 'NO_PASSWORD');
        
        const match = verifyPassword(password, stored);
        if (match) {
          resetRateLimit(rateLimitKey);
          // Auto-upgrade migrasi bertahap jika password lama belum menggunakan format salted hash
          if (stored.indexOf('$') === -1) {
            const newSaltedHash = hashPassword(password);
            sheet.getRange(i + 1, iPwd + 1).setValue(newSaltedHash);
            logEvent_('INFO', 'kamadLogin', 'Auto-upgrade password ke format high-security salted hash sukses untuk Kamad NSM: ' + nsmStr);
          }
          const madrasahInfo = getMadrasahByNsm(nsmStr);
          return apiSuccess({ nsm: nsmStr, madrasah_name: madrasahInfo?.nama || nsmStr, madrasahInfo }, 'Login berhasil.');
        }
        return apiError('Password salah.', 'WRONG_PASSWORD');
      }
    }
    return apiError('NSM tidak ditemukan. Hubungi pengawas Anda.', 'NSM_NOT_FOUND');
  } catch (e) {
    return apiError('Kesalahan sistem saat login Kamad: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Setup password pertama Kamad menggunakan token dari link WA (selalu menggunakan format Salted)
 * @param {string|number} nsm
 * @param {string} newPassword
 * @param {string} token
 * @returns {object} Response standard
 */
function kamadSetPassword(nsm, newPassword, token) {
  try {
    if (!nsm || !newPassword || !token) return apiError('Data tidak lengkap.', 'VALIDATION');
    if (String(newPassword).length < 6) return apiError('Password minimal 6 karakter.', 'VALIDATION');
    const nsmStr = String(nsm).trim();
    const ss = getAppDb_();

    // Validasi token
    const tokenSheet = getKamadSheet(ss, 'KamadTokens');
    const tData = tokenSheet.getDataRange().getValues();
    const tH = tData[0].map(h => String(h).toLowerCase().trim());
    const tiT = tH.indexOf('token'); const tiN = tH.indexOf('nsm');
    const tiE = tH.indexOf('expires_at'); const tiU = tH.indexOf('used');

    let tokenRow = -1;
    for (let i = 1; i < tData.length; i++) {
      if (String(tData[i][tiT]) === String(token) && String(tData[i][tiN]).trim() === nsmStr) {
        if (String(tData[i][tiU]).toLowerCase() === 'true') return apiError('Token sudah digunakan.', 'TOKEN_USED');
        if (new Date() > new Date(tData[i][tiE]))           return apiError('Token sudah kadaluarsa. Minta link baru dari pengawas.', 'TOKEN_EXPIRED');
        tokenRow = i; break;
      }
    }
    if (tokenRow === -1) return apiError('Token tidak valid.', 'INVALID_TOKEN');

    // Simpan/update password (selalu menggunakan salted hash)
    const uSheet = getKamadSheet(ss, 'KamadUsers');
    const uData  = uSheet.getDataRange().getValues();
    const uH = uData[0].map(h => String(h).toLowerCase().trim());
    const uiN = uH.indexOf('nsm'); const uiP = uH.indexOf('password');
    const uiS = uH.indexOf('status'); const uiU = uH.indexOf('updated_at');
    const now = new Date().toISOString();
    const hashed = hashPassword(newPassword);
    let found = false;
    for (let i = 1; i < uData.length; i++) {
      if (String(uData[i][uiN]).trim() === nsmStr) {
        uSheet.getRange(i + 1, uiP + 1).setValue(hashed);
        uSheet.getRange(i + 1, uiS + 1).setValue('aktif');
        if (uiU !== -1) uSheet.getRange(i + 1, uiU + 1).setValue(now);
        found = true; break;
      }
    }
    if (!found) uSheet.appendRow([nsmStr, hashed, 'aktif', now, now]);

    // Tandai token terpakai
    tokenSheet.getRange(tokenRow + 1, tiU + 1).setValue('true');

    const madrasahInfo = getMadrasahByNsm(nsmStr);
    return apiSuccess({ nsm: nsmStr, madrasah_name: madrasahInfo?.nama || nsmStr, madrasahInfo }, 'Password berhasil disetel.');
  } catch (e) {
    return apiError('Kesalahan sistem saat setup password Kamad: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Validasi token setup password (dipanggil saat kamad pertama kali klik link WA)
 * @param {string} token
 * @returns {object} Validitas status
 */
function kamadValidateSetupToken(token) {
  try {
    const ss = getAppDb_();
    const sheet = getKamadSheet(ss, 'KamadTokens');
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { valid: false, reason: 'Belum ada data link Kamad di sistem.' };

    const H = data[0].map(h => String(h).toLowerCase().trim());
    let iT = H.indexOf('token'); if (iT === -1) iT = 0;
    let iN = H.indexOf('nsm'); if (iN === -1) iN = 1;
    let iE = H.indexOf('expires_at'); if (iE === -1) iE = 3;
    let iU = H.indexOf('used'); if (iU === -1) iU = 4;
    
    const searchToken = String(token).trim();

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][iT]).trim() === searchToken) {
        if (String(data[i][iU]).toLowerCase().trim() === 'true')
          return { valid: false, reason: 'Link sudah digunakan. Minta link baru dari pengawas.' };
        if (new Date() > new Date(data[i][iE]))
          return { valid: false, reason: 'Link sudah kadaluarsa. Minta link baru dari pengawas.' };
        const nsmStr = String(data[i][iN]).trim();
        const m = getMadrasahByNsm(nsmStr);
        return { valid: true, nsm: nsmStr, madrasah_name: m?.nama || nsmStr };
      }
    }
    return { valid: false, reason: 'Link tidak dikenali. Pastikan link lengkap dan tidak terpotong. (Kode: ' + searchToken.substring(0,8) + '...)' };
  } catch (e) {
    return { valid: false, reason: 'Terjadi kesalahan sistem saat validasi token: ' + e.toString() };
  }
}

/**
 * Generate link setup password kamad.
 * Token berlaku 7 hari. Pengawas mendapat URL wa.me untuk diforward ke Kamad.
 * @param {string|number} nsm
 * @param {string|number} requesterNip
 * @returns {object} Response standard dengan wa_url dan setup_url
 */
function generateKamadSetupLink(nsm, requesterNip) {
  try {
    if (!nsm || !requesterNip) return apiError('NSM dan NIP pengawas wajib diisi.', 'VALIDATION');
    const nsmStr = String(nsm).trim();
    const madrasah = getMadrasahByNsm(nsmStr);
    if (!madrasah) return apiError('NSM ' + nsmStr + ' tidak ditemukan di data master.', 'NOT_FOUND');

    const token = Utilities.getUuid();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const ss = getAppDb_();
    getKamadSheet(ss, 'KamadTokens').appendRow([token, nsmStr, now.toISOString(), expiresAt.toISOString(), 'false']);

    const props = PropertiesService.getScriptProperties();
    const base = props.getProperty('PENGAWAS_DEPLOYMENT_URL') || ScriptApp.getService().getUrl();
    const setupUrl = `${base}?kamad_setup_token=${token}`;
    const expStr = Utilities.formatDate(expiresAt, 'GMT+7', 'dd/MM/yyyy');
    const msg = encodeURIComponent(
      `Assalamualaikum wr. wb.\n\n` +
      `Kepada Yth. Bapak/Ibu Kepala Madrasah *${madrasah.nama}* (NSM: ${nsmStr})\n\n` +
      `Berikut link untuk mengakses *Portal Kamad* dan membuat password:\n\n` +
      `🔗 ${setupUrl}\n\n` +
      `_Link berlaku hingga ${expStr}._\n\n` +
      `Setelah klik link, silakan buat password. Login selanjutnya menggunakan NSM sebagai username.\n\nJazakumullahu khairan 🙏`
    );

    return apiSuccess({
      token, nsm: nsmStr, madrasah: madrasah.nama,
      setup_url: setupUrl, expires_at: expiresAt.toISOString(),
      text: msg,
      wa_url: `https://api.whatsapp.com/send?text=${msg}`
    }, 'Link berhasil dibuat.');
  } catch (e) {
    return apiError('Kesalahan sistem saat membuat link setup Kamad: ' + e.toString());
  }
}
