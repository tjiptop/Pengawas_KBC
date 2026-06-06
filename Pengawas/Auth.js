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
            return { 
              success: true, 
              require_setup: false, 
              require_profile_setup: !hasProfile, 
              nip: nipStr, 
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
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    const name = sheets[i].getName().toLowerCase();
    // Cari sheet yang mengandung kata pengawas, dan bukan sheet sistem
    if (name.includes('pengawas') && !name.includes('profil') && !name.includes('sasaran') && !name.includes('users') && !name.includes('form') && !name.includes('settings')) {
      return sheets[i];
    }
  }
  return ss.getSheetByName('Pengawas') || ss.getSheetByName('pengawas');
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

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() == nipStr) {
        if (data[i][1] === '') {
          sheet.getRange(i + 1, 2).setValue(hashed);
          return apiSuccess(getProfile(nipStr), 'Password berhasil disetel.');
        } else {
          return apiError('Password sudah disetel sebelumnya.', 'ALREADY_SET');
        }
      }
    }

    let valid = false;
    let sheetP = getMasterSheet(ss);
    if (sheetP) {
      const dataP = sheetP.getDataRange().getValues();
      const headersP = dataP[0] || [];
      let nipIdx = headersP.findIndex(h => String(h).toUpperCase().includes('NIP'));
      if (nipIdx === -1) nipIdx = 0;
      for (let i = 1; i < dataP.length; i++) {
        if (String(dataP[i][nipIdx]).trim() == nipStr) {
          valid = true;
          break;
        }
      }
    }
    
    if (valid) {
      if (!sheet) {
        sheet = ss.insertSheet('Users');
        sheet.appendRow(['NIP', 'Password', 'Status']);
      }
      sheet.appendRow([nipStr, hashed, 'aktif']);
      return apiSuccess(getProfile(nipStr), 'Password berhasil didaftarkan.');
    }

    return apiError('NIP tidak valid untuk melakukan setup.', 'INVALID_NIP');
  } catch (e) {
    return apiError('Kesalahan sistem saat menyetel password: ' + e.toString(), 'SYSTEM_ERROR');
  }
}
