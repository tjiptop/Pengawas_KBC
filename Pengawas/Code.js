// ============================================================
// PENGAWAS KBC - Google Apps Script Backend (v2.5.2)
// ============================================================

// Global database and template configurations
// Mengambil dari Script Properties (Environment Variables), jika kosong maka gunakan ID production
const APP_DB_ID              = PropertiesService.getScriptProperties().getProperty('APP_DB_ID')              || '1sIIdTzW_vBQJZoizefj_6tWBrHib1OOo2TbUPPZsDYw';
const MASTER_MADRASAH_DB_ID  = PropertiesService.getScriptProperties().getProperty('MASTER_MADRASAH_DB_ID')  || '119pUNbQxQLaLtqcuHebrbwbzXkXUU3h7n5I1OxyMu4w';
const SK_TEMPLATE_DOC_ID     = PropertiesService.getScriptProperties().getProperty('SK_TEMPLATE_DOC_ID')     || '1iROegKV9VGGpLWDedovrwaXuDvbX4jEzM4TwsSfeZIc';

// Environment & Operational Config (dapat diubah di Script Properties tanpa deploy ulang)
const APP_ENV            = PropertiesService.getScriptProperties().getProperty('APP_ENV')            || 'production'; // 'staging' | 'production'
const CACHE_TTL_SECONDS  = parseInt(PropertiesService.getScriptProperties().getProperty('CACHE_TTL_SECONDS')  || '600');   // Default 10 menit
const ADMIN_EMAIL        = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL')        || '';          // Email untuk notifikasi error kritis
const IS_STAGING         = APP_ENV === 'staging';

// Application Version
const APP_VERSION = 'v.2.5.2';

// ============================================================
// ENTRY POINT (Web App serving)
// ============================================================

/**
 * Handle HTTP GET request to serve the main application
 * @param {object} e Event parameter from Google Apps Script web app
 * @returns {HtmlOutput} Evaluated HTML template output
 */
function doGet(e) {
  let template = HtmlService.createTemplateFromFile('index');
  // Pass query parameters to template safely (bypasses iframe parameter loss)
  template.kamad_setup_token = (e && e.parameter && e.parameter.kamad_setup_token) ? e.parameter.kamad_setup_token : '';
  template.app_version = APP_VERSION;
  return template.evaluate()
      .setTitle('Aplikasi Pengawas KBC')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Inline include helper for sub-templates/HTML files
 * @param {string} filename Name of the file to include
 * @returns {string} File content
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ============================================================
// STANDARD API RESPONSE HELPERS
// ============================================================

/**
 * Format and return a standard successful API response object
 * @param {any} data The payload to return
 * @param {string} message Optional success message
 * @returns {object} API response
 */
function apiSuccess(data, message) {
  let sanitizedData = data || null;
  if (sanitizedData) {
    try {
      sanitizedData = JSON.parse(JSON.stringify(sanitizedData));
    } catch(e) {}
  }
  return { success: true, data: sanitizedData, message: message || '' };
}

/**
 * Format and return a standard failed API response object
 * @param {string} message Error message
 * @param {string} code Unique error code
 * @returns {object} API response
 */
function apiError(message, code) {
  return { success: false, error: message || 'Terjadi kesalahan.', code: code || 'UNKNOWN' };
}

// ============================================================
// SECURITY & SANITIZATION UTILITIES
// ============================================================

/**
 * Sanitasi HTML entities untuk mencegah XSS
 * @param {string} str
 * @returns {string} Sanitized string
 */
function sanitizeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Mencegah formula injection di Google Sheets
 * (string yang diawali =, +, -, @, tab, CR)
 * @param {any} value
 * @returns {any} Sanitized value
 */
function sanitizeFormulaInjection(value) {
  if (typeof value !== 'string') return value;
  const dangerous = ['=', '+', '-', '@', '\t', '\r'];
  if (dangerous.some(c => value.startsWith(c))) {
    return "'" + value;
  }
  return value;
}

/**
 * Sanitasi rekursif objek/array dari formula injection
 * @param {any} obj
 * @returns {any} Sanitized object
 */
function sanitizeObject(obj) {
  if (typeof obj === 'string') return sanitizeFormulaInjection(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const key in obj) {
      result[key] = sanitizeObject(obj[key]);
    }
    return result;
  }
  return obj;
}
