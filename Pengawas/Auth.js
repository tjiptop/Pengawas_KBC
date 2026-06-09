// ============================================================
// AUTHENTICATION & SECURITY MODULE
// ============================================================

/**
 * Rate limiting: max N attempts per window (pakai CacheService)
 * Return true jika DIBLOKIR
 * @param {string} identifier
 * @returns {boolean}
 */
function isRateLimited(identifier) {
  const cache = CacheService.getScriptCache();
  const key = 'ratelimit_' + identifier;
  const attempts = parseInt(cache.get(key) || '0');
  const maxAttempts = parseInt(PropertiesService.getScriptProperties().getProperty('MAX_LOGIN_ATTEMPTS') || '5');
  const lockoutSecs = parseInt(PropertiesService.getScriptProperties().getProperty('LOGIN_LOCKOUT_SECONDS') || '300');
  if (attempts >= maxAttempts) return true;
  cache.put(key, String(attempts + 1), lockoutSecs);
  return false;
}

/**
 * Reset rate limit setelah login berhasil
 * @param {string} identifier
 */
function resetRateLimit(identifier) {
  const cache = CacheService.getScriptCache();
  cache.remove('ratelimit_' + identifier);
}

/**
 * Hash password menggunakan SHA-256 via Utilities.computeDigest dengan Salt per-User (v2.2.0)
 * @param {string} password
 * @param {string} [salt] Jika diabaikan, salt acak baru akan dibuat
 * @returns {string} Salted hash dalam format 'salt$hash'
 */
function hashPassword(password, salt) {
  if (!password) return '';
  const useSalt = salt || Utilities.getUuid();
  const salted = useSalt + ':' + password;
  const rawHash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    salted,
    Utilities.Charset.UTF_8
  );
  const hash = rawHash.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
  return useSalt + '$' + hash;
}

/**
 * Memverifikasi kesesuaian input password dengan password tersimpan di DB
 * Mendukung migrasi bertahap (Plain -> Raw SHA256 -> Salted SHA256)
 * @param {string} inputPassword
 * @param {string} storedPassword
 * @returns {boolean} Apakah password cocok
 */
function verifyPassword(inputPassword, storedPassword) {
  if (!storedPassword) return false;

  // 1. Format Baru: Salted Hashing (salt$hash)
  if (storedPassword.indexOf('$') !== -1) {
    const parts = storedPassword.split('$');
    const salt = parts[0];
    const computed = hashPassword(inputPassword, salt);
    return computed === storedPassword;
  }

  // 2. Format Lama: Raw SHA-256 (64 karakter heksadesimal)
  const isOldHashed = storedPassword.length === 64 && /^[0-9a-f]+$/i.test(storedPassword);
  if (isOldHashed) {
    const rawHash = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      inputPassword,
      Utilities.Charset.UTF_8
    );
    const oldHash = rawHash.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
    return storedPassword === oldHash;
  }

  // 3. Format Klasik: Plain text
  return storedPassword === inputPassword;
}

/**
 * Authentikasi pengawas berdasarkan NIP dan Password
 * Mendukung auto-upgrade hash password lama ke salted hash saat login sukses
 * @param {string|number} nip
 * @param {string} password
 * @returns {object} Response standard
 */
function login(nip, password) {
  try {
    if (!nip) return apiError('NIP harus diisi.', 'VALIDATION');

    const rateLimitKey = 'login_' + String(nip).trim();
    if (isRateLimited(rateLimitKey)) {
      return apiError('Terlalu banyak percobaan login. Coba lagi dalam 5 menit.', 'RATE_LIMITED');
    }

    const ss = getAppDb_();
    const nipStr = String(nip).trim();

    const sheet = ss.getSheetByName('Users');
    if (sheet) {
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim() == nipStr) {
          const storedPassword = String(data[i][1]);
          const status = String(data[i][2] || '').toLowerCase();

          if (status === 'nonaktif') return apiError('Akun ini dinonaktifkan. Hubungi admin.', 'ACCOUNT_DISABLED');

          if (storedPassword === '') return { success: true, require_setup: true, nip: nipStr };

          const passwordMatch = verifyPassword(password, storedPassword);

          if (passwordMatch) {
            // Auto-upgrade migrasi bertahap jika password lama belum menggunakan format salted hash
            if (storedPassword.indexOf('$') === -1) {
              const newSaltedHash = hashPassword(password);
              sheet.getRange(i + 1, 2).setValue(newSaltedHash);
              logEvent_('INFO', 'login', 'Auto-upgrade password ke format high-security salted hash sukses untuk NIP: ' + nipStr);
            }
            resetRateLimit(rateLimitKey);
            const hasProfile = isProfileSavedInSheet(nipStr);
            
            // Generate session token
            const sessionToken = Utilities.getUuid();
            try {
              const cache = CacheService.getScriptCache();
              cache.put('session_' + sessionToken, nipStr, 14400); // 4 hours
            } catch(e) {
              logEvent_('ERROR', 'login', 'Failed to save session to cache: ' + e.toString());
            }

            return { 
              success: true, 
              require_setup: false, 
              require_profile_setup: !hasProfile, 
              nip: nipStr, 
              sessionToken: sessionToken,
              user: getProfile(nipStr) 
            };
          } else {
            return apiError('Password salah.', 'WRONG_PASSWORD');
          }
        }
      }
    }

    let sheetPengawas = getMasterSheet(ss);
    if (sheetPengawas) {
      const dataP = sheetPengawas.getDataRange().getValues();
      const headersP = dataP[0] || [];
      let nipIdx = headersP.findIndex(h => String(h).toUpperCase().includes('NIP'));
      if (nipIdx === -1) nipIdx = 0;

      for (let i = 1; i < dataP.length; i++) {
        if (String(dataP[i][nipIdx]).trim() == nipStr) {
          return { success: true, require_setup: true, nip: nipStr };
        }
      }
    }

    return apiError('NIP tidak ditemukan di database manapun.', 'NIP_NOT_FOUND');
  } catch (e) {
    return apiError('Kesalahan sistem saat login: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Helper untuk mendeteksi master sheet pengawas secara dinamis
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getMasterSheet(ss) {
  const masterDb = getMasterDb_();
  const sheets = masterDb.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    const name = sheets[i].getName().toLowerCase();
    // Cari sheet yang mengandung kata pengawas, dan bukan sheet sistem
    if (name.includes('pengawas') && !name.includes('profil') && !name.includes('sasaran') && !name.includes('users') && !name.includes('form') && !name.includes('settings')) {
      return sheets[i];
    }
  }
  return masterDb.getSheetByName('Pengawas') || masterDb.getSheetByName('pengawas');
}

/**
 * Menyetel password baru untuk akun yang baru pertama kali setup (selalu menggunakan format Salted)
 * @param {string|number} nip
 * @param {string} newPassword
 * @returns {object} Response standard
 */
function setPassword(nip, newPassword) {
  try {
    if (!nip || !newPassword) return apiError('NIP dan password baru harus diisi.', 'VALIDATION');
    if (String(newPassword).length < 6) return apiError('Password minimal 6 karakter.', 'VALIDATION');

    const ss = getAppDb_();
    const nipStr = String(nip).trim();
    let sheet = ss.getSheetByName('Users');
    if (!sheet) return apiError('Sheet Users tidak ada.', 'SYS_ERROR');
    
    const data = sheet.getDataRange().getValues();
    const hashed = hashPassword(newPassword);

    const row = findRowIndex_(sheet, 0, nipStr);
    if (row !== -1) {
      if (data[row - 1][1] === '') {
        sheet.getRange(row, 2).setValue(hashed);
        const sessionToken = Utilities.getUuid();
        try {
          CacheService.getScriptCache().put('session_' + sessionToken, nipStr, 14400);
        } catch(e) {}
        let resp = apiSuccess(getProfile(nipStr), 'Password berhasil disetel.');
        resp.sessionToken = sessionToken;
        return resp;
      } else {
        return apiError('Password sudah disetel sebelumnya.', 'ALREADY_SET');
      }
    }

    let valid = false;
    let sheetP = getMasterSheet(ss);
    if (sheetP) {
      const dataP = sheetP.getDataRange().getValues();
      const headersP = dataP[0] || [];
      let nipIdx = headersP.findIndex(h => String(h).toUpperCase().includes('NIP'));
      if (nipIdx === -1) nipIdx = 0;
      const pRow = findRowIndex_(sheetP, nipIdx, nipStr);
      if (pRow !== -1) {
        valid = true;
      }
    }
    
    if (valid) {
      if (!sheet) {
        sheet = ss.insertSheet('Users');
        sheet.appendRow(['NIP', 'Password', 'Status', 'Pelatih']);
      }
      sheet.appendRow([nipStr, hashed, 'aktif', '']);
      const sessionToken = Utilities.getUuid();
      try {
        CacheService.getScriptCache().put('session_' + sessionToken, nipStr, 14400);
      } catch(e) {}
      let resp = apiSuccess(getProfile(nipStr), 'Password berhasil didaftarkan.');
      resp.sessionToken = sessionToken;
      return resp;
    }

    return apiError('NIP tidak valid untuk melakukan setup.', 'INVALID_NIP');
  } catch (e) {
    return apiError('Kesalahan sistem saat menyetel password: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Helper untuk memeriksa apakah user dengan NIP tertentu adalah Pelatih
 * @param {string|number} nip
 * @returns {boolean}
 */
function isPelatih(nip) {
  try {
    const ss = getAppDb_();
    const sheet = ss.getSheetByName('Users');
    if (!sheet) return false;
    const data = sheet.getDataRange().getValues();
    const nipStr = String(nip).trim();
    const row = findRowIndex_(sheet, 0, nipStr);
    if (row !== -1) {
      return String(data[row - 1][3] || '').trim() === 'Nasional';
    }
  } catch (e) {
    console.error('isPelatih error: ' + e.toString());
  }
  return false;
}

/**
 * Mengubah password user yang sudah login
 * @param {string|number} nip
 * @param {string} oldPassword
 * @param {string} newPassword
 * @returns {object} Response standard
 */
function changePassword(nip, oldPassword, newPassword) {
  try {
    if (!nip || !oldPassword || !newPassword) return apiError('NIP, password lama, dan password baru harus diisi.', 'VALIDATION');
    if (String(newPassword).length < 6) return apiError('Password baru minimal 6 karakter.', 'VALIDATION');
    
    const ss = getAppDb_();
    const nipStr = String(nip).trim();
    const sheet = ss.getSheetByName('Users');
    if (!sheet) return apiError('Sheet Users tidak ditemukan.', 'SYS_ERROR');
    
    const data = sheet.getDataRange().getValues();
    const row = findRowIndex_(sheet, 0, nipStr);
    if (row !== -1) {
      const storedPassword = String(data[row - 1][1]);
      const passwordMatch = verifyPassword(oldPassword, storedPassword);
      
      if (passwordMatch) {
        const hashed = hashPassword(newPassword);
        sheet.getRange(row, 2).setValue(hashed);
        logEvent_('INFO', 'change_password', 'Password berhasil diubah untuk NIP: ' + nipStr);
        return apiSuccess(null, 'Password berhasil diubah.');
      } else {
        return apiError('Password lama salah.', 'WRONG_PASSWORD');
      }
    }
    return apiError('Akun tidak ditemukan.', 'NOT_FOUND');
  } catch (e) {
    return apiError('Kesalahan sistem saat mengubah password: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Meminta kode OTP reset password via email
 * @param {string} nip
 * @returns {object} Response standard
 */
function apiResetPasswordRequest(nip) {
  try {
    if (!nip) return apiError('NIP harus diisi.', 'VALIDATION');
    const nipStr = String(nip).trim();
    
    // Cari email dari profil
    const profile = getProfile(nipStr);
    if (!profile || !profile.Email) {
      return apiError('Email untuk NIP ini tidak terdaftar di Profil. Hubungi Admin.', 'EMAIL_NOT_FOUND');
    }
    
    const email = String(profile.Email).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return apiError('Format email terdaftar tidak valid.', 'INVALID_EMAIL');
    }
    
    // Generate 6 digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    
    // Simpan di CacheService selama 15 menit (900 detik)
    const cache = CacheService.getScriptCache();
    cache.put('reset_otp_' + nipStr, code, 900);
    
    // Kirim email
    const subject = 'Kode Reset Password Aplikasi Pengawas KBC';
    const body = 'Halo ' + (profile.Nama || 'Pengawas') + ',\n\n' +
                 'Anda telah mengajukan permintaan reset password.\n' +
                 'Berikut adalah kode OTP untuk melakukan reset password Anda:\n\n' +
                 '👉 ' + code + ' 👈\n\n' +
                 'Kode ini hanya berlaku selama 15 menit. Jika Anda tidak mengajukan permintaan ini, silakan abaikan email ini.\n\n' +
                 'Salam,\nTim Pengawas KBC';
                 
    MailApp.sendEmail(email, subject, body);
    
    // Samarkan email untuk privasi (misal: a***b@gmail.com)
    const parts = email.split('@');
    const namePart = parts[0];
    const domainPart = parts[1];
    let obfuscated = '';
    if (namePart.length <= 2) {
      obfuscated = namePart.substring(0, 1) + '***';
    } else {
      obfuscated = namePart.substring(0, 2) + '***' + namePart.substring(namePart.length - 1);
    }
    const safeEmail = obfuscated + '@' + domainPart;
    
    return apiSuccess(null, 'Kode OTP reset password telah dikirim ke email Anda: ' + safeEmail);
  } catch (e) {
    return apiError('Gagal memproses permintaan reset password: ' + e.toString(), 'SYSTEM_ERROR');
  }
}

/**
 * Konfirmasi reset password menggunakan kode OTP email
 * @param {string} nip
 * @param {string} code
 * @param {string} newPassword
 * @returns {object} Response standard
 */
function apiResetPasswordConfirm(nip, code, newPassword) {
  try {
    if (!nip || !code || !newPassword) return apiError('Parameter tidak lengkap.', 'VALIDATION');
    if (String(newPassword).length < 6) return apiError('Password baru minimal 6 karakter.', 'VALIDATION');
    
    const nipStr = String(nip).trim();
    const codeStr = String(code).trim();
    
    // Cek cache
    const cache = CacheService.getScriptCache();
    const savedCode = cache.get('reset_otp_' + nipStr);
    if (!savedCode) {
      return apiError('Kode OTP kedaluwarsa atau tidak valid. Silakan ajukan ulang.', 'OTP_EXPIRED');
    }
    
    if (savedCode !== codeStr) {
      return apiError('Kode OTP salah.', 'OTP_INVALID');
    }
    
    // Hapus OTP dari cache
    cache.remove('reset_otp_' + nipStr);
    
    // Hash password baru
    const ss = getAppDb_();
    const sheet = ss.getSheetByName('Users');
    if (!sheet) return apiError('Sheet tidak ditemukan.', 'SYS_ERROR');
    
    const data = sheet.getDataRange().getValues();
    const hashed = hashPassword(newPassword);
    
    const row = findRowIndex_(sheet, 0, nipStr);
    if (row === -1) {
      return apiError('Akun Pengawas tidak ditemukan di tabel Users.', 'NOT_FOUND');
    }
    sheet.getRange(row, 2).setValue(hashed);
    
    logEvent_('INFO', 'reset_password', 'Password berhasil di-reset via email OTP untuk NIP: ' + nipStr);
    return apiSuccess(null, 'Password Anda berhasil di-reset. Silakan login kembali.');
  } catch(e) {
    return apiError('Gagal mereset password: ' + e.toString(), 'SYSTEM_ERROR');
  }
}
