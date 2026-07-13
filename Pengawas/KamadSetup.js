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
    const iEmail = headers.indexOf('email');
    const iNama = headers.indexOf('nama');
    const iNoHp = headers.indexOf('no_hp');

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
          const email = iEmail !== -1 ? String(data[i][iEmail] || '') : '';
          const namaKamad = iNama !== -1 ? String(data[i][iNama] || '') : '';
          const noHp = iNoHp !== -1 ? String(data[i][iNoHp] || '') : '';

          const madrasahInfo = getMadrasahByNsm(nsmStr);
          return apiSuccess({
            nsm: nsmStr,
            madrasah_name: madrasahInfo?.nama || nsmStr,
            madrasahInfo,
            email: email,
            nama: namaKamad,
            no_hp: noHp
          }, 'Login berhasil.');
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
function kamadSetPassword(nsm, newPassword, token, profileData) {
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
    const uiE = uH.indexOf('email'); const uiNm = uH.indexOf('nama');
    const uiNh = uH.indexOf('no_hp');
    const now = new Date().toISOString();
    const hashed = hashPassword(newPassword);
    
    let found = false;
    for (let i = 1; i < uData.length; i++) {
      if (String(uData[i][uiN]).trim() === nsmStr) {
        uSheet.getRange(i + 1, uiP + 1).setValue(hashed);
        uSheet.getRange(i + 1, uiS + 1).setValue('aktif');
        if (uiU !== -1) uSheet.getRange(i + 1, uiU + 1).setValue(now);
        if (profileData) {
          if (uiE !== -1 && profileData.email) uSheet.getRange(i + 1, uiE + 1).setValue(profileData.email);
          if (uiNm !== -1 && profileData.nama) uSheet.getRange(i + 1, uiNm + 1).setValue(profileData.nama);
          if (uiNh !== -1 && profileData.no_hp) uSheet.getRange(i + 1, uiNh + 1).setValue(profileData.no_hp);
        }
        found = true; break;
      }
    }
    if (!found) {
      const rowValues = uH.map(h => {
        if (h === 'nsm') return nsmStr;
        if (h === 'password') return hashed;
        if (h === 'status') return 'aktif';
        if (h === 'created_at') return now;
        if (h === 'updated_at') return now;
        if (profileData) {
          if (h === 'email') return profileData.email || '';
          if (h === 'nama') return profileData.nama || '';
          if (h === 'no_hp') return profileData.no_hp || '';
        }
        return '';
      });
      uSheet.appendRow(rowValues);
    }

    // Tandai token terpakai
    tokenSheet.getRange(tokenRow + 1, tiU + 1).setValue('true');

    // Hapus cache daftar sasaran milik Pengawas yang menargetkan NSM ini
    try {
      const sasaranSheet = ss.getSheetByName('Sasaran');
      if (sasaranSheet) {
        const sasaranData = sasaranSheet.getDataRange().getValues();
        if (sasaranData.length > 1) {
          const sHeaders = sasaranData[0].map(h => String(h).toUpperCase().trim());
          const nipIdx = 0;
          const nsmIdx = sHeaders.indexOf('NSM');
          if (nsmIdx !== -1) {
            const cache = CacheService.getScriptCache();
            const cacheVer = cache.get('cache_version') || '1';
            for (let i = 1; i < sasaranData.length; i++) {
              if (String(sasaranData[i][nsmIdx]).trim() === nsmStr) {
                const pNip = String(sasaranData[i][nipIdx]).trim();
                if (pNip) {
                  cache.remove('sasaran_v' + cacheVer + '_' + pNip);
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('Gagal menghapus cache sasaran Pengawas:', e);
    }

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
    const tokenSheet = getKamadSheet(ss, 'KamadTokens');

    // Hapus token lama dengan NSM yang sama agar hanya berlaku yang terakhir saja
    if (tokenSheet.getLastRow() > 1) {
      const data = tokenSheet.getDataRange().getValues();
      const headers = data[0];
      const tH = headers.map(h => String(h).toLowerCase().trim());
      const nsmIdx = tH.indexOf('nsm');
      
      if (nsmIdx !== -1) {
        const newRows = [headers];
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (String(row[nsmIdx]).trim() !== nsmStr) {
            newRows.push(row);
          }
        }
        tokenSheet.clearContents();
        tokenSheet.getRange(1, 1, newRows.length, headers.length).setValues(newRows);
      }
    }

    tokenSheet.appendRow([token, nsmStr, now.toISOString(), expiresAt.toISOString(), 'false']);

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

/**
 * Request password reset token and send reset link email to Kamad
 * @param {string|number} nsm
 * @param {string} email
 * @returns {object} Response standard
 */
function kamadRequestPasswordReset(nsm, email) {
  try {
    if (!nsm || !email) return apiError('NSM dan Email wajib diisi.', 'VALIDATION');
    const nsmStr = String(nsm).trim();
    const emailStr = String(email).trim().toLowerCase();

    const ss = getAppDb_();
    const uSheet = getKamadSheet(ss, 'KamadUsers');
    const uData = uSheet.getDataRange().getValues();
    const uH = uData[0].map(h => String(h).toLowerCase().trim());
    const uiN = uH.indexOf('nsm');
    const uiE = uH.indexOf('email');

    if (uiN === -1 || uiE === -1) {
      return apiError('Konfigurasi database Kamad tidak valid.', 'SYSTEM_ERROR');
    }

    let foundRow = -1;
    for (let i = 1; i < uData.length; i++) {
      if (String(uData[i][uiN]).trim() === nsmStr) {
        foundRow = i;
        break;
      }
    }

    if (foundRow === -1) {
      return apiError('NSM tidak terdaftar. Hubungi pengawas Anda.', 'NOT_FOUND');
    }

    const registeredEmail = String(uData[foundRow][uiE] || '').trim().toLowerCase();
    if (!registeredEmail || registeredEmail !== emailStr) {
      return apiError('Email tidak cocok dengan yang terdaftar untuk NSM ini.', 'VALIDATION');
    }

    // Generate token
    const token = 'RST-' + Utilities.getUuid();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours expiration

    const tokenSheet = getKamadSheet(ss, 'KamadTokens');

    // Hapus token lama untuk NSM yang sama
    if (tokenSheet.getLastRow() > 1) {
      const tData = tokenSheet.getDataRange().getValues();
      const tH = tData[0].map(h => String(h).toLowerCase().trim());
      const nsmIdx = tH.indexOf('nsm');
      if (nsmIdx !== -1) {
        const newRows = [tData[0]];
        for (let i = 1; i < tData.length; i++) {
          if (String(tData[i][nsmIdx]).trim() !== nsmStr) {
            newRows.push(tData[i]);
          }
        }
        tokenSheet.clearContents();
        tokenSheet.getRange(1, 1, newRows.length, tData[0].length).setValues(newRows);
      }
    }

    // Tulis token baru
    tokenSheet.appendRow([token, nsmStr, now.toISOString(), expiresAt.toISOString(), 'false']);

    // Kirim email
    const base = PropertiesService.getScriptProperties().getProperty('PENGAWAS_DEPLOYMENT_URL') || ScriptApp.getService().getUrl();
    const resetUrl = `${base}?kamad_setup_token=${token}`;
    const madrasah = getMadrasahByNsm(nsmStr);
    const madrasahName = madrasah?.nama || nsmStr;

    const subject = 'Reset Password Kamad - ' + madrasahName;
    const body = `Assalamualaikum Wr. Wb.

Yth. Kepala Madrasah ${madrasahName},

Anda menerima email ini karena ada permintaan untuk merestart/mengatur ulang password Portal Kamad Anda.
Silakan klik tautan di bawah ini untuk membuat password baru:

🔗 ${resetUrl}

Tautan di atas berlaku selama 2 jam sejak email ini dikirimkan.
Jika Anda tidak meminta pengaturan ulang ini, silakan abaikan email ini.

Jazakumullahu khairan.
Tim Aplikasi Pengawas KBC`;

    MailApp.sendEmail(emailStr, subject, body);

    return apiSuccess(null, 'Tautan reset password berhasil dikirim ke email Anda.');
  } catch (e) {
    return apiError('Gagal memproses reset password: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Simpan/update profil Kamad ke sheet KamadUsers
 * @param {string|number} nsm
 * @param {string} email
 * @param {string} nama
 * @param {string} no_hp
 * @returns {object} Response standard
 */
function kamadSaveProfile(nsm, email, nama, no_hp) {
  try {
    if (!nsm || !email || !nama || !no_hp) return apiError('Data profil tidak lengkap.', 'VALIDATION');
    const nsmStr = String(nsm).trim();

    const ss = getAppDb_();
    const uSheet = getKamadSheet(ss, 'KamadUsers');
    const uData = uSheet.getDataRange().getValues();
    const uH = uData[0].map(h => String(h).toLowerCase().trim());
    const uiN = uH.indexOf('nsm');
    const uiE = uH.indexOf('email');
    const uiNm = uH.indexOf('nama');
    const uiNh = uH.indexOf('no_hp');
    const uiU = uH.indexOf('updated_at');

    if (uiN === -1 || uiE === -1 || uiNm === -1 || uiNh === -1) {
      return apiError('Konfigurasi database Kamad tidak valid.', 'SYSTEM_ERROR');
    }

    let foundRow = -1;
    for (let i = 1; i < uData.length; i++) {
      if (String(uData[i][uiN]).trim() === nsmStr) {
        foundRow = i;
        break;
      }
    }

    if (foundRow === -1) return apiError('NSM tidak ditemukan.', 'NOT_FOUND');

    uSheet.getRange(foundRow + 1, uiE + 1).setValue(String(email).trim());
    uSheet.getRange(foundRow + 1, uiNm + 1).setValue(String(nama).trim());
    uSheet.getRange(foundRow + 1, uiNh + 1).setValue(String(no_hp).trim());
    if (uiU !== -1) uSheet.getRange(foundRow + 1, uiU + 1).setValue(new Date().toISOString());

    return apiSuccess({
      email: String(email).trim(),
      nama: String(nama).trim(),
      no_hp: String(no_hp).trim()
    }, 'Profil berhasil diperbarui.');
  } catch (e) {
    return apiError('Gagal memperbarui profil: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Ubah password Kamad dari menu profil
 * @param {string|number} nsm
 * @param {string} oldPassword
 * @param {string} newPassword
 * @returns {object} Response standard
 */
function kamadChangePassword(nsm, oldPassword, newPassword) {
  try {
    if (!nsm || !oldPassword || !newPassword) return apiError('Semua field password wajib diisi.', 'VALIDATION');
    if (String(newPassword).length < 6) return apiError('Password baru minimal 6 karakter.', 'VALIDATION');
    const nsmStr = String(nsm).trim();

    const ss = getAppDb_();
    const uSheet = getKamadSheet(ss, 'KamadUsers');
    const uData = uSheet.getDataRange().getValues();
    const uH = uData[0].map(h => String(h).toLowerCase().trim());
    const uiN = uH.indexOf('nsm');
    const uiP = uH.indexOf('password');
    const uiU = uH.indexOf('updated_at');

    if (uiN === -1 || uiP === -1) {
      return apiError('Konfigurasi database Kamad tidak valid.', 'SYSTEM_ERROR');
    }

    let foundRow = -1;
    for (let i = 1; i < uData.length; i++) {
      if (String(uData[i][uiN]).trim() === nsmStr) {
        foundRow = i;
        break;
      }
    }

    if (foundRow === -1) return apiError('NSM tidak ditemukan.', 'NOT_FOUND');

    const storedHash = String(uData[foundRow][uiP] || '');
    const match = verifyPassword(oldPassword, storedHash);
    if (!match) return apiError('Password saat ini salah.', 'VALIDATION');

    const newHashed = hashPassword(newPassword);
    uSheet.getRange(foundRow + 1, uiP + 1).setValue(newHashed);
    if (uiU !== -1) uSheet.getRange(foundRow + 1, uiU + 1).setValue(new Date().toISOString());

    return apiSuccess(null, 'Password berhasil diperbarui.');
  } catch (e) {
    return apiError('Gagal mengubah password: ' + e.toString(), 'SYSTEM_ERROR');
  }
}
