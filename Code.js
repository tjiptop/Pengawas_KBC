/**
 * MADRASAH SURVEY APP - CORE API
 * Contains only the logic needed for proper App operation.
 * Setup logic is moved to Init.js. Configuration to Forms.js.
 */

/**
 * CACHE CONFIGURATION
 * Control caching behavior for debugging and production
 */
const CacheConfig = {
    ENABLED: false, // Master switch: Set to false to disable ALL caching (useful for debugging)
    EXCLUDED_KEYS: [ // Keys to NEVER cache (always fetch fresh)
        // 'sheet_Users',        // Uncomment to always load fresh users
        // 'sheet_Survey_Tokens' // Uncomment to always load fresh tokens
    ],
    INVALIDATION_RULES: { // Map actions to cache keys to invalidate
        'ADD_USER': ['sheet_Users'],
        'UPDATE_USER': ['sheet_Users'],
        'DELETE_USER': ['sheet_Users'],
        'CHANGE_PASSWORD': ['sheet_Users'],
        'RESET_PASSWORD': ['sheet_Users'],
        'GENERATE_TOKEN': ['sheet_Survey_Tokens'],
        'CANCEL_TOKEN': ['sheet_Survey_Tokens']
    }
};

const SPREADSHEET_ID = ''; // Leave empty to use active script binding (server-side)
const ROOT_FOLDER_NAME = 'Survey_Files'; // Name of the folder to store files provided by User

/**
 * FILE ACCEPT PATTERNS
 * Standardized file type categories for YAML accept attribute
 * Usage in YAML: accept: "all" or accept: "audio,documents"
 */
const FILE_ACCEPT = {
    // Images
    images: '.jpg,.jpeg,.png,.gif,.webp,.bmp',

    // Audio
    audio: '.mp3,.wav,.ogg,.m4a,.amr,.flac,.webm',

    // Videos
    videos: '.mp4,.webm,.avi,.mov,.mkv,.mpeg,.mpg',

    // Documents
    documents: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv',

    // PDF only
    pdf: '.pdf',

    // Microsoft Office
    word: '.doc,.docx',
    excel: '.xls,.xlsx',
    powerpoint: '.ppt,.pptx',
    office: '.doc,.docx,.xls,.xlsx,.ppt,.pptx',

    // All allowed types
    all: '.jpg,.jpeg,.png,.gif,.webp,.bmp,.mp3,.wav,.ogg,.m4a,.amr,.flac,.webm,.mp4,.webm,.avi,.mov,.mkv,.mpeg,.mpg,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv'
};

/**
 * Helper: Get accept string from category or pass through if already extension list
 * @param {string} acceptValue - Category name (e.g., "all", "audio") or extension list (e.g., ".pdf,.doc")
 * @returns {string} Extension list for accept attribute
 */
function getFileAcceptString(acceptValue) {
    if (!acceptValue) return '';

    // If it starts with dot, assume it's already extension list
    if (acceptValue.trim().startsWith('.')) return acceptValue;

    // Split by comma for multiple categories (e.g., "audio,documents")
    const categories = acceptValue.split(',').map(c => c.trim().toLowerCase());
    const extensions = new Set();

    categories.forEach(category => {
        const pattern = FILE_ACCEPT[category];
        if (pattern) {
            pattern.split(',').forEach(ext => extensions.add(ext));
        } else {
            // If not a category, assume it's a custom extension
            if (category.startsWith('.')) extensions.add(category);
        }
    });

    return Array.from(extensions).join(',');
}

/**
 * SERVER-SIDE SECURITY UTILITIES
 * Sanitization to prevent XSS and formula injection
 */

/**
 * Sanitize HTML - removes dangerous characters
 */
function sanitizeHtml(str) {
    if (!str) return '';

    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Prevent formula injection in Google Sheets
 * Formula characters: =, +, -, @, tab, carriage return
 */
function sanitizeFormulaInjection(str) {
    if (!str) return '';

    const value = String(str);
    const trimmed = value.trimLeft(); // Only check start

    // Characters that start formulas in spreadsheets
    const formulaChars = ['=', '+', '-', '@', '\t', '\r', '\n'];

    if (formulaChars.some(char => trimmed.startsWith(char))) {
        // Prepend single quote to neutralize
        return "'" + value;
    }

    return value;
}

/**
 * Recursively sanitize object
 * Sanitizes all string values while preserving structure
 */
function sanitizeObjectRecursive(obj) {
    if (obj === null || obj === undefined) return obj;

    // Primitives
    if (typeof obj !== 'object') {
        if (typeof obj === 'string') {
            // Apply both HTML and formula sanitization
            let sanitized = sanitizeHtml(obj);
            sanitized = sanitizeFormulaInjection(sanitized);
            return sanitized;
        }
        return obj;
    }

    // Arrays
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObjectRecursive(item));
    }

    // Objects
    const sanitized = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            // Skip sanitization for Base64 data (starts with 'data:')
            if (typeof value === 'string' && value.startsWith('data:')) {
                sanitized[key] = value; // Keep Base64 as-is
            } else {
                sanitized[key] = sanitizeObjectRecursive(value);
            }
        }
    }

    return sanitized;
}

/**
 * Validate and sanitize submission payload
 */
function validateAndSanitizeSubmission(payload) {
    const errors = [];

    // Required fields
    if (!payload.madrasah_id) errors.push('madrasah_id is required');
    if (!payload.form_id) errors.push('form_id is required');
    if (!payload.username) errors.push('username is required');

    // Sanitize IDs and username
    if (payload.madrasah_id) {
        payload.madrasah_id = sanitizeFormulaInjection(sanitizeHtml(String(payload.madrasah_id)));
    }

    if (payload.username) {
        payload.username = sanitizeFormulaInjection(sanitizeHtml(String(payload.username)));
    }

    if (payload.form_id) {
        payload.form_id = sanitizeFormulaInjection(sanitizeHtml(String(payload.form_id)));
    }

    // Sanitize data object
    if (payload.data && typeof payload.data === 'object') {
        payload.data = sanitizeObjectRecursive(payload.data);
    }

    return {
        valid: errors.length === 0,
        errors: errors,
        payload: payload
    };
}

/**
 * STANDARDIZED API RESPONSE HELPERS
 * Ensures consistent response format across all API endpoints
 */

/**
 * Create standardized success response
 * @param {*} data - The response data
 * @param {string} message - Optional success message
 * @returns {Object} Standardized success response
 */
function apiSuccess(data = null, message = null) {
    const response = {
        success: true
    };

    if (data !== null) {
        response.data = data;
    }

    if (message) {
        response.message = message;
    }

    return response;
}

/**
 * Create standardized error response
 * @param {string} message - Error message for user
 * @param {string} code - Optional error code for programmatic handling
 * @param {*} details - Optional additional error details
 * @returns {Object} Standardized error response
 */
function apiError(message, code = null, details = null) {
    const response = {
        success: false,
        error: {
            message: message
        }
    };

    if (code) {
        response.error.code = code;
    }

    if (details) {
        response.error.details = details;
    }

    return response;
}


/**
 * SERVE HTML
 */
function doGet(e) {
    // Check if this is a survey token request
    if (e && e.parameter && e.parameter.survey_token) {
        var template = HtmlService.createTemplateFromFile('index');
        template.surveyToken = e.parameter.survey_token;
        return template
            .evaluate()
            .setTitle('Survey - Madrasah Survey App')
            .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
            .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    }

    // Check if this is a password reset request
    if (e && e.parameter && e.parameter.reset_token) {
        var template = HtmlService.createTemplateFromFile('password-reset');
        template.resetToken = e.parameter.reset_token;
        template.baseUrl = ScriptApp.getService().getUrl(); // Inject Base URL for redirection
        return template
            .evaluate()
            .setTitle('Reset Password - Madrasah Survey App')
            .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
            .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    }

    // Normal app load
    return HtmlService.createTemplateFromFile('index')
        .evaluate()
        .setTitle('Madrasah Survey App')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * DB UTILS
 */
function getDb() {
    return SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * DB UTILS - Get data from sheet FRESH (no cache)
 * 🔒 Enhanced with comprehensive try-catch and validation
 * This is the internal function that actually reads from Sheets
 */
function getDataFresh(sheetName) {
    try {
        // Validate sheet name
        if (!sheetName || typeof sheetName !== 'string') {
            console.log(`getDataFresh: Invalid sheet name: ${sheetName}`);
            return [];
        }

        const ss = getDb();
        if (!ss) {
            console.log(`getDataFresh: Failed to get database for sheet: ${sheetName}`);
            return [];
        }

        const sheet = ss.getSheetByName(sheetName);
        if (!sheet) {
            console.log(`getDataFresh: Sheet not found: ${sheetName}`);
            return [];
        }

        // Check if sheet has data
        const lastRow = sheet.getLastRow();
        if (lastRow < 2) {
            // Only headers or empty sheet
            console.log(`getDataFresh: Sheet '${sheetName}' is empty (rows: ${lastRow})`);
            return [];
        }

        // Get data range safely
        const data = sheet.getDataRange().getValues();
        if (!data || data.length < 2) {
            console.log(`getDataFresh: No data rows in sheet: ${sheetName}`);
            return [];
        }

        const headers = data.shift();
        if (!headers || headers.length === 0) {
            console.log(`getDataFresh: No headers in sheet: ${sheetName}`);
            return [];
        }

        // Map rows to objects
        return data.map(row => {
            const obj = {};
            headers.forEach((h, i) => {
                const key = String(h).trim().toLowerCase();
                if (key) {
                    obj[key] = row[i];
                }
            });
            return obj;
        });

    } catch (e) {
        // Log detailed error for debugging
        console.log(`ERROR in getDataFresh('${sheetName}'): ${e.toString()}`);
        console.log(`Stack trace: ${e.stack || 'No stack trace available'}`);

        // Return empty array to prevent caller crashes
        return [];
    }
}

/**
 * DB UTILS - Get data from sheet WITH CACHING
 * @param {string} sheetName - Name of sheet to read
 * @param {boolean} useCache - Whether to use cache (default: true)
 * @param {boolean} usePersistent - Whether to use persistent cache (default: true)
 * @returns {Array} Array of objects representing sheet rows
 */
function getData(sheetName, useCache = true, usePersistent = true) {
    // If caching disabled, fetch fresh
    if (!useCache) {
        return getDataFresh(sheetName);
    }

    // Use CacheManager to get or fetch data
    return CacheManager.getOrFetch(
        `sheet_${sheetName}`,
        () => getDataFresh(sheetName),
        usePersistent
    );
}

/**
 * API: LOGIN
 * 🔒 Enhanced with rate limiting and brute force protection
 */
function apiLogin(username, password) {
    // 🔒 SANITIZE INPUTS
    username = sanitizeFormulaInjection(sanitizeHtml(String(username || '')));
    password = sanitizeFormulaInjection(String(password || '')); // Don't HTML-sanitize password

    const props = PropertiesService.getScriptProperties();
    const attemptKey = `login_attempt_${username}`;
    const lockKey = `login_locked_${username}`;
    const lockTimeKey = `lock_time_${username}`;

    // 1. Check if account is locked
    const lockUntil = props.getProperty(lockKey);
    if (lockUntil) {
        const lockTime = parseInt(lockUntil);
        const now = Date.now();

        if (now < lockTime) {
            const remainingMinutes = Math.ceil((lockTime - now) / 60000);
            return {
                success: false,
                message: `Account locked due to too many failed attempts. Try again in ${remainingMinutes} minute(s).`,
                locked: true,
                remainingMinutes: remainingMinutes
            };
        } else {
            // Lock expired, clean up
            props.deleteProperty(lockKey);
            props.deleteProperty(attemptKey);
            props.deleteProperty(lockTimeKey);
        }
    }

    // 2. Attempt authentication
    const users = getData('Users');
    const user = users.find(u => String(u.username) === String(username) && String(u.password) === String(password));

    if (user) {
        // ✨ CHECK LOCK STATUS (Manual Lock)
        if (String(user.status || '').toLowerCase() === 'locked') {
            return {
                success: false,
                message: 'Akun Anda telah dinonaktifkan. Silakan hubungi administrator Anda.'
            };
        }

        // ✅ SUCCESS: Clear all attempt tracking
        props.deleteProperty(attemptKey);
        props.deleteProperty(lockKey);
        props.deleteProperty(lockTimeKey);

        const { password, ...safeUser } = user;
        if (!safeUser.role) safeUser.role = 'district';

        // ✨ Include assigned_madrasahs for Enum and Fasda roles
        if (!safeUser.assigned_madrasahs) safeUser.assigned_madrasahs = '';

        return { success: true, user: safeUser };
    }

    // ❌ FAILED: Increment attempt counter
    const attempts = parseInt(props.getProperty(attemptKey) || '0');
    const newAttempts = attempts + 1;
    props.setProperty(attemptKey, String(newAttempts));

    // 3. Check if should lock account
    const MAX_ATTEMPTS = 5;
    const LOCKOUT_MINUTES = 15;

    if (newAttempts >= MAX_ATTEMPTS) {
        const lockUntilTime = Date.now() + (LOCKOUT_MINUTES * 60 * 1000);
        props.setProperty(lockKey, String(lockUntilTime));
        props.setProperty(lockTimeKey, new Date(lockUntilTime).toISOString());

        return {
            success: false,
            message: `Too many failed login attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`,
            locked: true,
            remainingMinutes: LOCKOUT_MINUTES
        };
    }

    // 4. Return failure with remaining attempts
    const attemptsRemaining = MAX_ATTEMPTS - newAttempts;
    return {
        success: false,
        message: `Invalid credentials. ${attemptsRemaining} attempt(s) remaining before account lock.`,
        attemptsRemaining: attemptsRemaining
    };
}

/**
 * API: FETCH DASHBOARD DATA
 * ✨ OPTIMIZED: Uses DataService with index-based lookups and caching
 * Admin/Sup: Stats Only. User: Full Data (Own).
 */
function apiFetchData(username) {
    // Get user (with fallback)
    let user = DataService.getUserByUsername(username);
    if (!user) {
        user = { username, role: 'district', scope: '', assigned_madrasahs: '' };
    }

    // Get madrasahs for this user (filtered by role/scope)
    let myMadrasahs = DataService.getMadrasahsForUser(user);

    // Add statistics (count, last submission)
    myMadrasahs = DataService.getMadrasahsWithStats(myMadrasahs);

    // Get submissions (only for non-admin roles)
    const submissions = DataService.getSubmissionsForUser(user);

    // Get forms map (cached)
    const formsMap = DataService.getFormsMap();

    // Get tokens for this user
    const myTokens = DataService.getTokensForUser(username);

    return {
        madrasah_ids: myMadrasahs.map(m => m.madrasah_id),
        madrasahs: myMadrasahs,
        forms: formsMap,
        submissions: submissions,
        my_tokens: myTokens
    };
}

/**
 * API: LAZY LOAD HISTORY
 */
function apiFetchMadrasahHistory(madrasah_id) {
    // Return metadata only
    return getData('Submissions')
        .filter(s => String(s.madrasah_id) === String(madrasah_id))
        .map(s => ({
            submission_id: s.submission_id,
            madrasah_id: s.madrasah_id,
            form_id: s.form_id,
            username: s.username,
            timestamp: s.timestamp
        }));
}

/**
 * API: LAZY LOAD DETAIL
 */
function apiFetchSubmissionDetail(submission_id) {
    return getData('Submissions').find(s => s.submission_id === submission_id) || null;
}

/**
 * HELPER: Upload single file to Drive
 * Shared by submit and update operations
 */
function uploadSingleFile(base64Data, fieldName, index, metadata, customFilename) {
    if (!base64Data || !base64Data.startsWith('data:')) return base64Data;

    const mime = base64Data.substring(5, base64Data.indexOf(';'));
    const ext = mime.split('/')[1];

    // Use custom filename if provided, otherwise generate default
    let fname;
    if (customFilename) {
        fname = customFilename;
        // Ensure extension exists
        if (!fname.toLowerCase().endsWith('.' + ext) && !fname.includes('.')) {
            fname += '.' + ext;
        }
    } else {
        fname = index !== undefined
            ? `${fieldName}_${index}_${Date.now()}.${ext}`
            : `${fieldName}_${Date.now()}.${ext}`;
    }

    const result = apiUploadFile(base64Data, fname, mime, metadata);
    // CRITICAL: Do NOT return base64Data on failure, as it will break Sheet cell limits (50k chars)
    return result.success ? result.url : `Error: Upload Failed - ${result.message || 'Unknown error'}`;
}

/**
 * HELPER: Process all files in data object (Server-Side)
 * Converts Base64 to Drive URLs for both single and multi-image fields
 * @param {Object} data - Form data containing file fields
 * @param {Object} metadata - Upload metadata (madrasah_id, form_id, submission_id)
 * @returns {Object} { processedData, failedUploads }
 */
function processFilesServerSide(data, metadata) {
    const newData = {};
    const failedUploads = []; // Track all failed uploads

    for (const key in data) {
        const val = data[key];
        // Single file (image, audio, document)
        if (typeof val === 'string' && val.startsWith('data:')) {
            // ✅ UPLOAD ALL FILES to Drive (images, audio, documents)
            // Audio files now uploaded to Drive instead of stored as Base64
            const url = uploadSingleFile(val, key, undefined, metadata);

            // Check if upload failed (error string starts with "Error:")
            if (url && url.startsWith('Error:')) {
                failedUploads.push({
                    field: key,
                    filename: `${key}_${Date.now()}`,
                    reason: url.replace('Error: ', '')
                });
                // Don't store failed upload reference
                newData[key] = null;
            } else {
                newData[key] = url;
            }
        }
        // Multi-image: upload all and store as array of URLs
        else if (Array.isArray(val) && val.length > 0) {
            // Check if it's Base64 image array
            let hasBase64 = false;
            for (let i = 0; i < val.length; i++) {
                const item = val[i];
                if ((typeof item === 'string' && item.startsWith('data:')) ||
                    (typeof item === 'object' && item.data && typeof item.data === 'string' && item.data.startsWith('data:'))) {
                    hasBase64 = true;
                    break;
                }
            }

            if (hasBase64) {
                // Upload each image and store as array of URLs
                const processedList = [];
                for (let i = 0; i < val.length; i++) {
                    const item = val[i];
                    if (typeof item === 'string' && item.startsWith('data:')) {
                        // String -> URL String (Old behavior)
                        const url = uploadSingleFile(item, key, i, metadata);

                        if (url && url.startsWith('Error:')) {
                            failedUploads.push({
                                field: key,
                                filename: `${key}_${i}`,
                                reason: url.replace('Error: ', ''),
                                index: i // For multi-file, track index
                            });
                            // Skip adding failed file to list
                        } else {
                            processedList.push(url);
                        }
                    } else if (typeof item === 'object' && item.data && typeof item.data === 'string' && item.data.startsWith('data:')) {
                        // Object {name, data} -> Object {name, url} (New behavior)
                        const url = uploadSingleFile(item.data, key, i, metadata, item.name);

                        if (url && url.startsWith('Error:')) {
                            failedUploads.push({
                                field: key,
                                filename: item.name || `${key}_${i}`,
                                reason: url.replace('Error: ', ''),
                                index: i // For multi-file, track index
                            });
                            // Skip adding failed file to list
                        } else {
                            // Return object with URL and original Name
                            processedList.push({
                                name: item.name,
                                url: url,
                                size: item.size,
                                type: item.type
                            });
                        }
                    } else {
                        // Already URL or valid object
                        processedList.push(item);
                    }
                }
                newData[key] = processedList;
            } else {
                // Regular array (not images), keep as is
                newData[key] = val;
            }
        }
        // Single Object with Data (New behavior for single file/image)
        else if (typeof val === 'object' && val !== null && val.data && typeof val.data === 'string' && val.data.startsWith('data:')) {
            const url = uploadSingleFile(val.data, key, undefined, metadata, val.name);

            if (url && url.startsWith('Error:')) {
                failedUploads.push({
                    field: key,
                    filename: val.name || key,
                    reason: url.replace('Error: ', '')
                });
                newData[key] = null;
            } else {
                newData[key] = {
                    name: val.name,
                    url: url,
                    size: val.size,
                    type: val.type
                };
            }
        }
        else {
            // Other types (string, number, object, etc.)
            newData[key] = val;
        }
    }

    return { processedData: newData, failedUploads };
}

/**
 * API: SUBMIT SURVEY
 */
function apiSubmitSurvey(payload) {
    try {
        // 🔒 VALIDATE AND SANITIZE PAYLOAD FIRST
        const validation = validateAndSanitizeSubmission(payload);

        if (!validation.valid) {
            return {
                success: false,
                message: 'Validation failed: ' + validation.errors.join(', ')
            };
        }

        // Use sanitized payload for all subsequent operations
        const sanitizedPayload = validation.payload;

        const ss = getDb();
        const { madrasah_id, form_id, username, timestamp, data } = sanitizedPayload;

        // --- IDEMPOTENCY & UPDATE CHECK ---
        let msgId = payload.submission_id;
        const mainSub = ss.getSheetByName('Submissions');
        let isUpdate = false;

        if (msgId && mainSub && mainSub.getLastRow() > 1) {
            // Check if ID exists
            const ids = mainSub.getRange(2, 1, mainSub.getLastRow() - 1, 1).getValues().flat();
            if (ids.includes(msgId)) {
                isUpdate = true;
            }
        }

        if (!msgId) msgId = Utilities.getUuid();

        // ✨ CRITICAL FIX: Process files BEFORE any database operation
        // Pass metadata for organized folder structure
        const metadata = {
            madrasah_id: madrasah_id,
            form_id: form_id,
            submission_id: msgId
        };
        const fileProcessResult = processFilesServerSide(data, metadata);
        const processedData = fileProcessResult.processedData;
        const failedUploads = fileProcessResult.failedUploads;

        if (isUpdate) {
            return apiUpdateSubmission({ ...payload, data: processedData, submission_id: msgId, failed_uploads: failedUploads });
        }
        // -------------------------

        // Determine Target Sheet
        // 1. Try DB first
        let target = 'Submissions';
        const dbForms = getData('Forms');
        const formObj = dbForms.find(f => String(f.form_id) === String(form_id));

        let yaml = '';
        if (formObj) yaml = formObj.yaml_definition;
        else yaml = getFormDefinitions()[form_id] || '';

        const match = yaml.match(/target_sheet:\s*(['\"]?)([^'"\n\r]+)\1/);
        if (match) target = match[2].trim();

        // Write
        let sheet = ss.getSheetByName(target);
        if (!sheet) sheet = ss.insertSheet(target);

        // Auto-Column Add (Safe)
        let headers = sheet.getLastRow() > 0 ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
        if (headers.length === 0) {
            // New Sheet: Use Keys Order
            // JS Object keys preserve creation order (mostly), and FormEngine fills data in question order.
            headers = ['submission_id', 'madrasah_id', 'timestamp', 'username', ...Object.keys(processedData)];
            sheet.appendRow(headers);
        }

        const keys = Object.keys(processedData);
        const missing = keys.filter(k => !headers.includes(k));
        if (missing.length > 0) {
            // Add new columns to the RIGHT
            sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
            headers = [...headers, ...missing];
        }

        const row = headers.map(h => {
            if (h === 'submission_id') return msgId;
            if (h === 'madrasah_id') return madrasah_id;
            if (h === 'timestamp') return timestamp;
            if (h === 'username') return username;
            let val = processedData[h];
            if (val === undefined) return '';
            if (typeof val === 'object' && val !== null) return JSON.stringify(val);
            return val;
        });
        sheet.appendRow(row);

        // ✨ NEW: Extract and write table JSON data to separate sheets
        const tableFields = extractTableFieldsFromYAML(yaml);
        const affectedTableSheets = writeTableDataToSheets(ss, target, tableFields, processedData, msgId, madrasah_id, timestamp);

        // Main Summary Log (Backup/Index)
        if (mainSub) {
            const json = JSON.stringify(processedData);
            mainSub.appendRow([msgId, madrasah_id, form_id, username, timestamp, json]);
        }

        // Token Handling: Increment usage if submitted via token
        if (payload.survey_token) {
            apiIncrementTokenUsage(payload.survey_token);
        }

        // ✨ CACHE INVALIDATION: Clear cache for modified sheets
        CacheManager.invalidate(`sheet_${target}`);
        CacheManager.invalidate('sheet_Submissions');
        // Invalidate table sheets
        affectedTableSheets.forEach(sheetName => {
            CacheManager.invalidate(`sheet_${sheetName}`);
        });

        // 📝 LOG OPERATION
        if (typeof Logger !== 'undefined' && Logger.isEnabled()) {
            Logger.info('SUBMIT_SURVEY', {
                submission_id: msgId,
                form_id: form_id,
                madrasah_id: madrasah_id,
                target_sheet: target,
                via_token: !!payload.survey_token,
                failed_uploads_count: failedUploads.length
            }, username);
        }

        return {
            success: true,
            submission_id: msgId,
            failed_uploads: failedUploads // Include failed upload info for frontend
        };
    } catch (e) {
        // 📝 LOG ERROR
        if (typeof Logger !== 'undefined' && Logger.isEnabled()) {
            Logger.error('SUBMIT_SURVEY_FAILED', {
                error: e.toString(),
                form_id: payload.form_id,
                madrasah_id: payload.madrasah_id
            }, payload.username || 'UNKNOWN');
        }
        return { success: false, message: e.toString() };
    }
}

/**
 * API: DYNAMIC LOOKUP
 * Fetches data from a specific sheet based on filter criteria
 * @param {string} sheetName - Target sheet name
 * @param {string} filterCol - Column name to filter by
 * @param {string} filterVal - Value to match
 * @param {string} targetCol - Column to retrieve value from
 */
function apiLookup(sheetName, filterCol, filterVal, targetCol) {
    try {
        if (!sheetName || !filterCol || !targetCol) {
            return apiError('Missing lookup parameters');
        }

        // Use standardized getData which handles caching
        const data = getData(sheetName, true, true) || [];

        // Find match
        // Loose equality for flexibility (string vs number)
        const row = data.find(r => String(r[filterCol]) == String(filterVal));

        if (row) {
            return apiSuccess(row[targetCol]);
        } else {
            return apiSuccess(null, 'No match found');
        }

    } catch (e) {
        return apiError('Lookup failed: ' + e.toString());
    }
}

/**
 * HELPER: Extract table field definitions from YAML
 * Returns array of {name, type, columns[]}
 */
function extractTableFieldsFromYAML(yaml) {
    const tableFields = [];
    const lines = yaml.split('\n');

    let currentField = null;
    let inColumns = false;
    let indent = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Detect table field start
        if (trimmed.match(/^-\s*type:\s*(table_col_fix|table)/)) {
            const typeMatch = trimmed.match(/^-\s*type:\s*(table_col_fix|table)/);
            if (currentField) {
                tableFields.push(currentField);
            }
            currentField = {
                name: '',
                type: typeMatch[1],
                columns: [],
                firstColLabel: null
            };
            inColumns = false;
        }

        // Get field name
        if (currentField && !currentField.name && trimmed.match(/^name:\s*(['"]?)([^'"\n\r]+)\1/)) {
            const nameMatch = trimmed.match(/^name:\s*(['"]?)([^'"\n\r]+)\1/);
            currentField.name = nameMatch[2].trim();
        }

        // Get first_col_label for table_col_fix
        if (currentField && currentField.type === 'table_col_fix' && !currentField.firstColLabel && trimmed.match(/^first_col_label:\s*(.+)/)) {
            const labelMatch = trimmed.match(/^first_col_label:\s*(.+)/);
            currentField.firstColLabel = labelMatch[1].trim();
        }

        // Detect columns section start
        if (currentField && trimmed === 'columns:') {
            inColumns = true;
            // Calculate base indent for columns section
            indent = line.search(/\S/);
        }

        // Extract column names
        if (currentField && inColumns) {
            // Look for "- name: columnName" pattern under columns
            const colMatch = trimmed.match(/^-\s*name:\s*(['"]?)([^'"\n\r]+)\1/);
            if (colMatch) {
                const columnIndent = line.search(/\S/);
                // Make sure it's indented under columns (child of columns:)
                if (columnIndent > indent) {
                    currentField.columns.push(colMatch[2].trim());
                }
            }

            // End of columns section when we hit another top-level field
            if (trimmed.startsWith('- type:') || trimmed.startsWith('- name:')) {
                const lineIndent = line.search(/\S/);
                if (lineIndent <= indent) {
                    inColumns = false;
                }
            }
        }
    }

    // Add last field if exists
    if (currentField && currentField.name) {
        tableFields.push(currentField);
    }

    return tableFields;
}

/**
 * HELPER: Write table JSON data to separate sheets
 * @param {Object} ss - Spreadsheet object
 * @param {string} targetSheetName - Main sheet name
 * @param {Array} tableFields - Array of table field definitions
 * @param {Object} processedData - Submission data
 * @param {string} msgId - Submission ID
 * @param {string} madrasah_id - Madrasah ID
 * @param {string} timestamp - Timestamp
 * @returns {Array} Array of affected table sheet names for cache invalidation
 */
function writeTableDataToSheets(ss, targetSheetName, tableFields, processedData, msgId, madrasah_id, timestamp) {
    const affectedSheets = [];

    tableFields.forEach(tableField => {
        const fieldName = tableField.name;
        const fieldValue = processedData[fieldName];

        // Skip if no data for this table field
        if (!fieldValue || !Array.isArray(fieldValue)) {
            return;
        }

        // Parse JSON if it's a string
        let tableData;
        if (typeof fieldValue === 'string') {
            try {
                tableData = JSON.parse(fieldValue);
            } catch (e) {
                console.log(`Failed to parse table data for ${fieldName}: ${e.toString()}`);
                return;
            }
        } else {
            tableData = fieldValue;
        }

        if (!Array.isArray(tableData) || tableData.length === 0) {
            return;
        }

        const tableSheetName = `${targetSheetName}|${fieldName}`;
        let tableSheet = ss.getSheetByName(tableSheetName);

        if (!tableSheet) {
            // Sheet should have been created by Init.js, but create if missing
            tableSheet = ss.insertSheet(tableSheetName);

            // Define headers
            const tableHeaders = ['submission_id', 'madrasah_id', 'timestamp'];
            if (tableField.type === 'table_col_fix') {
                const firstColName = tableField.firstColLabel || 'row_label';
                tableHeaders.push(firstColName);
            }
            tableHeaders.push(...tableField.columns);

            tableSheet.appendRow(tableHeaders);
        }

        // Get headers
        const headers = tableSheet.getLastRow() > 0
            ? tableSheet.getRange(1, 1, 1, tableSheet.getLastColumn()).getValues()[0]
            : [];

        // Write each row of table data
        tableData.forEach(rowData => {
            const row = headers.map(h => {
                if (h === 'submission_id') return msgId;
                if (h === 'madrasah_id') return madrasah_id;
                if (h === 'timestamp') return timestamp;

                // For table_col_fix, check if this header is the first column label
                if (tableField.type === 'table_col_fix') {
                    const firstColName = tableField.firstColLabel || 'row_label';
                    // If current header matches the first column name, get value from row_label key
                    if (h === firstColName) {
                        return rowData.row_label || '';
                    }
                }

                // Get column value from JSON using header as key
                const val = rowData[h];
                if (val === undefined || val === null) return '';
                if (typeof val === 'object') return JSON.stringify(val);
                return val;
            });

            tableSheet.appendRow(row);
        });

        affectedSheets.push(tableSheetName);
    });

    return affectedSheets;
}

/**
 * API: UPLOAD FILE
 * Saves Base64 data to Drive with organized folder structure.
 * Structure: Survey_Files/{madrasah_id}/{form_id}/{submission_id}/
 * 🔒 Enhanced with security validation (MIME, size, filename)
 */
function apiUploadFile(base64Data, filename, mimeType, metadata) {
    try {
        // ========================================
        // 🔒 MIME TYPE CORRECTION
        // ========================================
        // Some browsers (especially for .amr files) send 'application/octet-stream' 
        // instead of the proper audio MIME type. We trust the extension in these cases.

        if (!mimeType || mimeType === 'application/octet-stream' || mimeType === '') {
            const ext = filename.split('.').pop().toLowerCase();

            // Map common audio extensions to proper MIME types
            const extToMime = {
                'amr': 'audio/amr',
                '3gp': 'audio/3gpp',
                'mp3': 'audio/mpeg',
                'wav': 'audio/wav',
                'ogg': 'audio/ogg',
                'webm': 'audio/webm',
                'm4a': 'audio/m4a',
                'flac': 'audio/flac',
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'gif': 'image/gif',
                'webp': 'image/webp',
                'bmp': 'image/bmp',
                'pdf': 'application/pdf',
                'doc': 'application/msword',
                'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'xls': 'application/vnd.ms-excel',
                'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'txt': 'text/plain',
                'csv': 'text/csv'
            };

            if (extToMime[ext]) {
                mimeType = extToMime[ext];
                console.log(`Corrected MIME type from application/octet-stream to ${mimeType} based on extension .${ext}`);
            }
        }

        // ========================================
        // 🔒 SECURITY VALIDATION
        // ========================================

        // 1. MIME Type Whitelist (Prevent executable uploads)
        const allowedMimes = [
            // Images
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
            // Audio
            'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/m4a',
            'audio/amr', 'audio/3gpp', 'audio/flac', // Added support for AMR, 3GP, and FLAC
            // Videos
            'video/mp4', 'video/webm', 'video/avi', 'video/quicktime', 'video/x-matroska',
            'video/x-msvideo', 'video/mpeg',
            // Documents
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
            'application/msword', // .doc
            'application/vnd.ms-excel', // .xls
            'application/vnd.ms-powerpoint', // .ppt
            'text/plain', // .txt
            'text/csv' // .csv
        ];

        if (!allowedMimes.includes(mimeType)) {
            return {
                success: false,
                message: `File type not allowed: ${mimeType}. Only images, audio, videos, and documents are permitted.`
            };
        }

        // 2. File Size Validation (Max 10MB to prevent DoS)
        const split = base64Data.split('base64,');
        const base64Content = split.length > 1 ? split[1] : split[0];

        // Calculate actual file size from Base64
        // Base64 encoding increases size by ~33%, so decode to get real size
        let sizeBytes;
        try {
            const decoded = Utilities.base64Decode(base64Content);
            sizeBytes = decoded.length;
        } catch (e) {
            return {
                success: false,
                message: 'Invalid Base64 data format'
            };
        }

        const maxSizeBytes = 10 * 1024 * 1024; // 10 MB
        const maxSizeMB = 10;

        if (sizeBytes > maxSizeBytes) {
            const fileSizeMB = (sizeBytes / 1024 / 1024).toFixed(2);
            return {
                success: false,
                message: `File too large: ${fileSizeMB} MB. Maximum allowed: ${maxSizeMB} MB`
            };
        }

        // 3. Filename Sanitization (Prevent path traversal & special chars)
        let safeName = filename
            .replace(/\.\./g, '')              // Remove .. (path traversal)
            .replace(/[\/\\]/g, '_')           // Remove slashes
            .replace(/[^a-zA-Z0-9._-]/g, '_')  // Only allow safe chars
            .replace(/_{2,}/g, '_')            // Collapse multiple underscores
            .replace(/^\.+/, '')               // Remove leading dots
            .replace(/\.+$/, '')               // Remove trailing dots
            .substring(0, 100);                // Limit length to 100 chars

        // Ensure filename has extension
        if (!safeName.includes('.')) {
            // Extract extension from MIME type
            const ext = mimeType.split('/')[1].split('+')[0];
            safeName = `${safeName}.${ext}`;
        }

        // 4. Extension Verification (Match MIME type)
        const fileExt = safeName.split('.').pop().toLowerCase();
        const mimeToExt = {
            // Images
            'image/jpeg': ['jpg', 'jpeg'],
            'image/jpg': ['jpg', 'jpeg'],
            'image/png': ['png'],
            'image/gif': ['gif'],
            'image/webp': ['webp'],
            'image/bmp': ['bmp'],
            // Audio
            'audio/mpeg': ['mp3', 'mpeg'],
            'audio/mp3': ['mp3'],
            'audio/wav': ['wav'],
            'audio/ogg': ['ogg'],
            'audio/webm': ['webm'],
            'audio/m4a': ['m4a'],
            'audio/amr': ['amr'],
            'audio/3gpp': ['3gp', 'amr'],
            'audio/flac': ['flac'],
            // Videos
            'video/mp4': ['mp4'],
            'video/webm': ['webm'],
            'video/avi': ['avi'],
            'video/x-msvideo': ['avi'],
            'video/quicktime': ['mov'],
            'video/x-matroska': ['mkv'],
            'video/mpeg': ['mpeg', 'mpg'],
            // Documents - PDF
            'application/pdf': ['pdf'],
            // Documents - Microsoft Word
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
            'application/msword': ['doc'],
            // Documents - Microsoft Excel
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
            'application/vnd.ms-excel': ['xls'],
            // Documents - Microsoft PowerPoint
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
            'application/vnd.ms-powerpoint': ['ppt'],
            // Documents - Text
            'text/plain': ['txt'],
            'text/csv': ['csv']
        };

        const validExtensions = mimeToExt[mimeType] || [];
        if (validExtensions.length > 0 && !validExtensions.includes(fileExt)) {
            return {
                success: false,
                message: `File extension '${fileExt}' does not match MIME type '${mimeType}'. Expected: ${validExtensions.join(' or ')}`
            };
        }

        // ========================================
        // DRIVE UPLOAD LOGIC
        // ========================================

        // Extract metadata (optional for backward compatibility)
        const madrasahId = metadata?.madrasah_id || 'unknown';
        const formId = metadata?.form_id || 'unknown';
        const submissionId = metadata?.submission_id || 'unknown';

        // 🔍 LOOKUP PROVINCE & DISTRICT
        let provinceName = 'Uncategorized';
        let districtName = 'Uncategorized';

        if (madrasahId && madrasahId !== 'unknown') {
            try {
                const madrasahs = getData('Madrasahs');
                const madrasah = madrasahs.find(m => String(m.madrasah_id || m.id) === String(madrasahId));

                if (madrasah) {
                    // Handle variations in column names
                    const p = madrasah.province || madrasah.provinsi || madrasah.propinsi;
                    const d = madrasah.district || madrasah.kabupaten || madrasah.kota || madrasah.distict;

                    if (p) provinceName = String(p).trim();
                    if (d) districtName = String(d).trim();
                }
            } catch (err) {
                console.log(`Warning: Failed to lookup location for madrasah ${madrasahId}: ${err.toString()}`);
            }
        }

        // Sanitize folder names
        const cleanName = (name) => String(name).replace(/[\/\\]/g, '_').trim();
        provinceName = cleanName(provinceName);
        districtName = cleanName(districtName);

        // Helper to get or create folder
        const getOrCreateFolder = (parent, name) => {
            const folders = parent.getFoldersByName(name);
            if (folders.hasNext()) {
                return folders.next();
            }
            return parent.createFolder(name);
        };

        // ✨ UPDATED: Find/Create folder relative to the Active Spreadsheet
        const ss = getDb();
        const ssId = ss.getId();
        const parentFolder = DriveApp.getFileById(ssId).getParents().next();

        // Level 0: Root (Survey_Files)
        const rootFolder = getOrCreateFolder(parentFolder, ROOT_FOLDER_NAME);

        // Level 1: Province
        const provinceFolder = getOrCreateFolder(rootFolder, provinceName);

        // Level 2: District
        const districtFolder = getOrCreateFolder(provinceFolder, districtName);

        // Level 3: Madrasah
        const madrasahFolder = getOrCreateFolder(districtFolder, madrasahId);

        // Level 4: Form
        const formFolder = getOrCreateFolder(madrasahFolder, formId);

        // Level 5: Submission
        const submissionFolder = getOrCreateFolder(formFolder, submissionId);

        // Upload file to submission folder (using sanitized filename)
        const data = Utilities.base64Decode(base64Content);
        const blob = Utilities.newBlob(data, mimeType, safeName);

        const file = submissionFolder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

        const fileId = file.getId();

        // ✅ Use different URL formats based on file type
        let directUrl;
        if (mimeType.startsWith('image/')) {
            // For images: Use thumbnail API (works better for embedding)
            directUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`;
        } else if (mimeType.startsWith('audio/')) {
            // For audio: Use uc format (may have limitations)
            directUrl = `https://drive.google.com/uc?export=open&id=${fileId}`;
        } else {
            // For other files: Standard download
            directUrl = `https://drive.google.com/uc?id=${fileId}`;
        }

        // 📝 LOG OPERATION
        if (typeof Logger !== 'undefined' && Logger.isEnabled()) {
            Logger.info('FILE_UPLOAD', {
                filename: safeName,
                size_mb: (sizeBytes / 1024 / 1024).toFixed(2),
                mime_type: mimeType,
                madrasah_id: metadata.madrasah_id,
                form_id: metadata.form_id,
                submission_id: metadata.submission_id
            }, 'FILE_UPLOAD_SYSTEM');
        }

        return {
            success: true,
            url: directUrl,
            folderId: submissionFolder.getId(),
            originalFilename: filename,
            sanitizedFilename: safeName,
            fileSize: sizeBytes,
            fileSizeMB: (sizeBytes / 1024 / 1024).toFixed(2)
        };
    } catch (e) {
        // 📝 LOG ERROR
        if (typeof Logger !== 'undefined' && Logger.isEnabled()) {
            Logger.error('FILE_UPLOAD_FAILED', {
                error: e.toString(),
                filename: filename,
                mime_type: mimeType
            }, 'FILE_UPLOAD_SYSTEM');
        }
        console.log(`Upload error: ${e.toString()}`);
        return { success: false, message: e.toString() };
    }
}

/**
 * API: UPDATE SUBMISSION (Manager Only)
 */
function apiUpdateSubmission(payload) {
    try {
        const ss = getDb();
        const { submission_id, madrasah_id, form_id, username, timestamp, data } = payload;

        // 1. Update Main Log (Submissions)
        const mainSub = ss.getSheetByName('Submissions');
        if (mainSub) {
            // Find Row
            const ids = mainSub.getRange(2, 1, mainSub.getLastRow() - 1, 1).getValues().flat();
            const idx = ids.indexOf(submission_id);
            if (idx !== -1) {
                const rowNum = idx + 2;
                // Update JSON column (index 6, which is column F -> 6? No. 
                // Col 1: ID, 2: Mid, 3: Fid, 4: User, 5: Time, 6: JSON
                // range(row, a, b, c)
                // appendRow order: [msgId, madrasah_id, form_id, username, timestamp, json]
                mainSub.getRange(rowNum, 6).setValue(JSON.stringify(data));
            }
        }

        // 2. Update Target Sheet
        let target = 'Submissions'; // Default if not found
        const dbForms = getData('Forms');
        const formObj = dbForms.find(f => String(f.form_id) === String(form_id));
        let yaml = '';
        if (formObj) yaml = formObj.yaml_definition;
        else yaml = getFormDefinitions()[form_id] || '';

        const match = yaml.match(/target_sheet:\s*(['"]?)([^'"\n\r]+)\1/);
        if (match) target = match[2].trim();

        const sheet = ss.getSheetByName(target);
        if (sheet) {
            // Get Headers
            let headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

            // Check for new columns
            const keys = Object.keys(data);
            const missing = keys.filter(k => !headers.includes(k));
            if (missing.length > 0) {
                sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
                headers = [...headers, ...missing];
            }

            // Find Row
            // We assume submission_id is available in the sheet. 
            // If the target sheet follows our standard, 'submission_id' is likely the first or second column. 
            // But strict 'apiSubmitSurvey' logic: headers = ['submission_id', ...]
            const idColIndex = headers.indexOf('submission_id');
            if (idColIndex !== -1) {
                const colNum = idColIndex + 1;
                const ids = sheet.getRange(2, colNum, sheet.getLastRow() - 1, 1).getValues().flat();
                const idx = ids.indexOf(submission_id);

                if (idx !== -1) {
                    const rowNum = idx + 2;
                    const row = headers.map(h => {
                        if (h === 'submission_id') return submission_id;
                        if (h === 'madrasah_id') return madrasah_id;
                        if (h === 'timestamp') return timestamp; // Keep original time? or update? Payload has time.
                        if (h === 'username') return username;
                        let val = data[h];
                        if (val === undefined) return '';
                        if (typeof val === 'object' && val !== null) return JSON.stringify(val);
                        return val;
                    });
                    sheet.getRange(rowNum, 1, 1, headers.length).setValues([row]);
                }
            }
        }

        // 2.5. Update Table Sheets (for table and table_col_fix fields)
        // Extract table fields from YAML, delete old data, and write new data
        const tableFields = extractTableFieldsFromYAML(yaml);

        if (tableFields.length > 0) {
            // First, delete old table data for this submission
            tableFields.forEach(tableField => {
                const tableSheetName = `${target}|${tableField.name}`;
                const tableSheet = ss.getSheetByName(tableSheetName);
                if (tableSheet && tableSheet.getLastRow() > 1) {
                    try {
                        const headers = tableSheet.getRange(1, 1, 1, tableSheet.getLastColumn()).getValues()[0];
                        const idColIndex = headers.indexOf('submission_id');
                        if (idColIndex !== -1) {
                            const ids = tableSheet.getRange(2, idColIndex + 1, tableSheet.getLastRow() - 1, 1).getValues().flat();
                            // Delete all rows with matching submission_id (iterate backwards to avoid index shifting)
                            for (let i = ids.length - 1; i >= 0; i--) {
                                if (ids[i] === submission_id) {
                                    tableSheet.deleteRow(i + 2);
                                }
                            }
                        }
                    } catch (tableError) {
                        console.log(`Error deleting old data from table sheet ${tableSheetName}: ${tableError.toString()}`);
                    }
                }
            });

            // Then, write new table data
            try {
                const affectedTableSheets = writeTableDataToSheets(ss, target, tableFields, data, submission_id, madrasah_id, timestamp);

                // Invalidate cache for affected table sheets
                affectedTableSheets.forEach(sheetName => {
                    CacheManager.invalidate(`sheet_${sheetName}`);
                });
            } catch (tableWriteError) {
                console.log(`Error writing new table data: ${tableWriteError.toString()}`);
            }
        }

        // ✨ CACHE INVALIDATION: Clear cache for modified sheets
        CacheManager.invalidate(`sheet_${target}`);
        CacheManager.invalidate('sheet_Submissions');

        // 📝 LOG OPERATION
        if (typeof Logger !== 'undefined' && Logger.isEnabled()) {
            Logger.info('UPDATE_SUBMISSION', {
                submission_id: submission_id,
                form_id: form_id,
                madrasah_id: madrasah_id,
                target_sheet: target,
                failed_uploads_count: (payload.failed_uploads || []).length
            }, username);
        }

        return {
            success: true,
            failed_uploads: payload.failed_uploads || [] // Pass through failed uploads if provided
        };
    } catch (e) {
        // 📝 LOG ERROR
        if (typeof Logger !== 'undefined' && Logger.isEnabled()) {
            Logger.error('UPDATE_SUBMISSION_FAILED', {
                error: e.toString(),
                submission_id: payload.submission_id,
                form_id: payload.form_id
            }, payload.username || 'UNKNOWN');
        }
        return { success: false, message: e.toString() };
    }
}

/**
 * API: DELETE SUBMISSION (Manager Only)
 */
function apiDeleteSubmission(submission_id) {
    try {
        const ss = getDb();

        let form_id = null;
        let madrasah_id = null; // Store madrasah_id BEFORE deletion

        // 1. Delete from Main Log
        const mainSub = ss.getSheetByName('Submissions');
        if (mainSub) {
            const ids = mainSub.getRange(2, 1, mainSub.getLastRow() - 1, 1).getValues().flat();
            const idx = ids.indexOf(submission_id);
            if (idx !== -1) {
                const rowNum = idx + 2;
                // Get form_id and madrasah_id BEFORE deleting
                form_id = mainSub.getRange(rowNum, 3).getValue(); // Column 3: form_id
                madrasah_id = mainSub.getRange(rowNum, 2).getValue(); // Column 2: madrasah_id
                mainSub.deleteRow(rowNum);
            }
        }

        if (!form_id) return { success: false, message: 'Submission not found' };

        // 2. Delete from Target Sheet
        let target = 'Submissions';
        const dbForms = getData('Forms');
        const formObj = dbForms.find(f => String(f.form_id) === String(form_id));
        let yaml = '';
        if (formObj) yaml = formObj.yaml_definition;
        else yaml = getFormDefinitions()[form_id] || '';

        const match = yaml.match(/target_sheet:\s*(['"]?)([^'"\n\r]+)\1/);
        if (match) target = match[2].trim();

        // If target is same as Submissions, we already deleted it (or tried to).
        // Check if target is DIFFERENT from 'Submissions'
        if (target !== 'Submissions') {
            const sheet = ss.getSheetByName(target);
            if (sheet) {
                // Find column 'submission_id'
                const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
                const idColIndex = headers.indexOf('submission_id');
                if (idColIndex !== -1) {
                    const ids = sheet.getRange(2, idColIndex + 1, sheet.getLastRow() - 1, 1).getValues().flat();
                    const idx = ids.indexOf(submission_id);
                    if (idx !== -1) {
                        sheet.deleteRow(idx + 2);
                    }
                }
            }
        }

        // 2.5. Delete from Table Sheets (for table and table_col_fix fields)
        // Extract table fields from YAML and delete related data
        const tableFields = extractTableFieldsFromYAML(yaml);
        tableFields.forEach(tableField => {
            const tableSheetName = `${target}|${tableField.name}`;
            const tableSheet = ss.getSheetByName(tableSheetName);
            if (tableSheet && tableSheet.getLastRow() > 1) {
                try {
                    const headers = tableSheet.getRange(1, 1, 1, tableSheet.getLastColumn()).getValues()[0];
                    const idColIndex = headers.indexOf('submission_id');
                    if (idColIndex !== -1) {
                        const ids = tableSheet.getRange(2, idColIndex + 1, tableSheet.getLastRow() - 1, 1).getValues().flat();
                        // Delete all rows with matching submission_id (iterate backwards to avoid index shifting)
                        for (let i = ids.length - 1; i >= 0; i--) {
                            if (ids[i] === submission_id) {
                                tableSheet.deleteRow(i + 2);
                            }
                        }
                    }
                    // Invalidate cache for this table sheet
                    CacheManager.invalidate(`sheet_${tableSheetName}`);
                } catch (tableError) {
                    console.log(`Error deleting from table sheet ${tableSheetName}: ${tableError.toString()}`);
                }
            }
        });


        // 3. Delete Files from Drive
        // Find and delete submission folder: Survey_Files/{province}/{district}/{madrasah_id}/{form_id}/{submission_id}/
        try {
            // Only attempt Drive deletion if we have madrasah_id
            if (madrasah_id) {
                // Lookup province and district from Madrasahs sheet
                const madrasahs = getData('Madrasahs');
                const madrasah = madrasahs.find(m => String(m.madrasah_id || m.id) === String(madrasah_id));

                if (madrasah) {
                    // Get province and district (handle column name variations)
                    const provinceName = madrasah.province || madrasah.provinsi || madrasah.propinsi || 'Uncategorized';
                    const districtName = madrasah.district || madrasah.kabupaten || madrasah.kota || madrasah.distict || 'Uncategorized';

                    // Sanitize folder names
                    const cleanProvince = String(provinceName).replace(/[\/\\]/g, '_').trim();
                    const cleanDistrict = String(districtName).replace(/[\/\\]/g, '_').trim();

                    // Navigate to submission folder using the exact path
                    const ssId = ss.getId();
                    const parentFolder = DriveApp.getFileById(ssId).getParents().next();
                    const rootFolders = parentFolder.getFoldersByName(ROOT_FOLDER_NAME);

                    if (rootFolders.hasNext()) {
                        const rootFolder = rootFolders.next();

                        // Navigate: Survey_Files -> Province -> District -> Madrasah -> Form -> Submission
                        const provinceFolders = rootFolder.getFoldersByName(cleanProvince);
                        if (provinceFolders.hasNext()) {
                            const provinceFolder = provinceFolders.next();

                            const districtFolders = provinceFolder.getFoldersByName(cleanDistrict);
                            if (districtFolders.hasNext()) {
                                const districtFolder = districtFolders.next();

                                const madrasahFolders = districtFolder.getFoldersByName(madrasah_id);
                                if (madrasahFolders.hasNext()) {
                                    const madrasahFolder = madrasahFolders.next();

                                    const formFolders = madrasahFolder.getFoldersByName(form_id);
                                    if (formFolders.hasNext()) {
                                        const formFolder = formFolders.next();

                                        const submissionFolders = formFolder.getFoldersByName(submission_id);
                                        if (submissionFolders.hasNext()) {
                                            const submissionFolder = submissionFolders.next();
                                            // Delete folder and all its contents (files + subfolders)
                                            submissionFolder.setTrashed(true);
                                            console.log(`Successfully deleted Drive folder for submission ${submission_id}`);
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else {
                    console.log(`Madrasah ${madrasah_id} not found in Madrasahs sheet, skipping Drive cleanup`);
                }
            }
        } catch (e) {
            // Log error but don't fail deletion if Drive cleanup fails
            console.log("Failed to delete Drive folder: " + e.toString());
        }

        // ✨ CACHE INVALIDATION: Clear cache for deleted data
        CacheManager.invalidate(`sheet_${target}`);
        CacheManager.invalidate('sheet_Submissions');

        // 📝 LOG OPERATION
        if (typeof Logger !== 'undefined' && Logger.isEnabled()) {
            Logger.info('DELETE_SUBMISSION', {
                submission_id: submission_id,
                form_id: form_id,
                madrasah_id: madrasah_id,
                target_sheet: target
            }, 'MANAGER');
        }

        return { success: true };
    } catch (e) {
        // 📝 LOG ERROR
        if (typeof Logger !== 'undefined' && Logger.isEnabled()) {
            Logger.error('DELETE_SUBMISSION_FAILED', {
                error: e.toString(),
                submission_id: submission_id
            }, 'MANAGER');
        }
        return { success: false, message: e.toString() };
    }
}

/**
 * API: CHANGE PASSWORD
 */
function apiChangePassword(username, oldPass, newPass) {
    try {
        const ss = getDb();
        const sheet = ss.getSheetByName('Users');
        if (!sheet) return { success: false, message: "Users sheet not found" };

        const data = sheet.getDataRange().getValues();
        // Assume Row 1 is Headers. Find indices.
        const headers = data[0].map(h => String(h).toLowerCase());
        const uIdx = headers.indexOf('username');
        const pIdx = headers.indexOf('password');

        if (uIdx === -1 || pIdx === -1) return { success: false, message: "Invalid Users sheet structure" };

        // Find User
        // data starts at row 0 (headers), so row index in Sheet is i + 1
        for (let i = 1; i < data.length; i++) {
            if (String(data[i][uIdx]) === String(username)) {
                // Check Old Pass
                if (String(data[i][pIdx]) !== String(oldPass)) {
                    return { success: false, message: "Incorrect old password" };
                }
                // Update
                sheet.getRange(i + 1, pIdx + 1).setValue(newPass);
                // ✨ Invalidate Cache via Rule
                CacheManager.checkInvalidation('CHANGE_PASSWORD');
                return { success: true };
            }
        }
        return { success: false, message: "User not found" };
    } catch (e) {
        return { success: false, message: e.message };
    }
}

/**
 * API: GENERATE PASSWORD RESET TOKEN
 * For User role to generate reset token for madrasah accounts
 */
function apiGeneratePasswordResetToken(madrasah_id, expiry_hours, requester_username) {
    try {
        const ss = getDb();

        // Validate requester has access to this madrasah
        const users = getData('Users');
        const requester = users.find(u => u.username === requester_username);

        if (!requester) {
            return { success: false, message: 'Requester not found' };
        }

        // Check if requester has access to this madrasah
        const madrasahs = getData('Madrasahs');
        const madrasah = madrasahs.find(m => String(m.madrasah_id) === String(madrasah_id));

        if (!madrasah) {
            return { success: false, message: 'Madrasah not found' };
        }

        // Access control: User role can only reset madrasah in their district scope
        if (requester.role === 'district' && madrasah.district !== requester.scope) {
            return { success: false, message: 'You do not have access to this madrasah' };
        }

        // Admin and supervisor have full access
        if (requester.role === 'province' && madrasah.province !== requester.scope) {
            return { success: false, message: 'You do not have access to this madrasah' };
        }

        // Generate secure token: UUID + timestamp + random string
        const uuid = Utilities.getUuid();
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 18); // 16 chars
        const token = `${uuid}-${timestamp}-${random}`;

        // Calculate expiry
        const created_at = new Date().toISOString();
        const expires_at = new Date(Date.now() + (expiry_hours * 60 * 60 * 1000)).toISOString();

        // Save to PasswordResets sheet
        const resetSheet = ss.getSheetByName('PasswordResets');
        if (!resetSheet) {
            return { success: false, message: 'PasswordResets sheet not found. Please run Setup.' };
        }

        resetSheet.appendRow([token, madrasah_id, created_at, expires_at, requester_username, false]);

        // Generate URL
        const scriptUrl = ScriptApp.getService().getUrl();
        const resetUrl = `${scriptUrl}?reset_token=${token}`;

        return {
            success: true,
            token: token,
            url: resetUrl,
            madrasah_id: madrasah_id,
            expires_at: expires_at
        };

    } catch (e) {
        return { success: false, message: e.toString() };
    }
}

/**
 * API: VALIDATE RESET TOKEN
 */
function apiValidateResetToken(token) {
    try {
        const resets = getData('PasswordResets');
        const resetEntry = resets.find(r => r.token === token);

        if (!resetEntry) {
            return { valid: false, reason: 'Token not found' };
        }

        // Check if already used
        if (resetEntry.used === true || resetEntry.used === 'TRUE' || resetEntry.used === 'true') {
            return { valid: false, reason: 'This reset link has already been used' };
        }

        // Check expiry
        const now = new Date();
        const expiryDate = new Date(resetEntry.expires_at);

        if (now > expiryDate) {
            return { valid: false, reason: 'Token expired' };
        }

        // Get madrasah username
        const madrasah_id = resetEntry.madrasah_id;

        return {
            valid: true,
            madrasah_id: madrasah_id,
            username: madrasah_id, // Username is same as madrasah_id
            expires_at: resetEntry.expires_at
        };

    } catch (e) {
        return { valid: false, reason: e.toString() };
    }
}

/**
 * API: EXECUTE PASSWORD RESET
 * Updates password and marks token as used
 */
function apiExecutePasswordReset(token, new_password) {
    try {
        // Validate token first
        const validation = apiValidateResetToken(token);
        if (!validation.valid) {
            return { success: false, message: validation.reason };
        }

        const madrasah_id = validation.madrasah_id;
        const ss = getDb();

        // Update password in Users sheet
        const usersSheet = ss.getSheetByName('Users');
        if (!usersSheet) {
            return { success: false, message: 'Users sheet not found' };
        }

        const data = usersSheet.getDataRange().getValues();
        const headers = data[0].map(h => String(h).toLowerCase());
        const uIdx = headers.indexOf('username');
        const pIdx = headers.indexOf('password');

        if (uIdx === -1 || pIdx === -1) {
            return { success: false, message: 'Invalid Users sheet structure' };
        }

        let userFound = false;
        for (let i = 1; i < data.length; i++) {
            if (String(data[i][uIdx]) === String(madrasah_id)) {
                usersSheet.getRange(i + 1, pIdx + 1).setValue(new_password);
                userFound = true;
                break;
            }
        }

        if (!userFound) {
            return { success: false, message: 'User not found' };
        }

        // Mark token as used in PasswordResets sheet
        const resetSheet = ss.getSheetByName('PasswordResets');
        if (resetSheet) {
            const resetData = resetSheet.getDataRange().getValues();
            const resetHeaders = resetData[0].map(h => String(h).toLowerCase());
            const tokenIdx = resetHeaders.indexOf('token');
            const usedIdx = resetHeaders.indexOf('used');

            if (tokenIdx !== -1 && usedIdx !== -1) {
                for (let i = 1; i < resetData.length; i++) {
                    if (resetData[i][tokenIdx] === token) {
                        resetSheet.getRange(i + 1, usedIdx + 1).setValue(true);
                        break;
                    }
                }
            }
        }

        // Invalidate cache
        // ✨ Invalidate Cache via Rule
        CacheManager.checkInvalidation('RESET_PASSWORD');

        return { success: true, message: 'Password reset successfully' };
    } catch (e) {
        return { success: false, message: e.toString() };
    }
}

/**
 * API: EXPORT DATA TO EXCEL (Province Role Only)
 * Generates Excel file with all form data and madrasahs filtered by province scope
 * Saves file to province folder for sharing with districts
 */
function apiExportExcel(username) {
    try {
        // 1. Authenticate and validate user
        const users = getData('Users');
        const user = users.find(u => String(u.username) === String(username));

        if (!user) {
            return apiError('User not found');
        }

        // Security: Province or National role only
        if (user.role !== 'province' && user.role !== 'national') {
            return apiError('Excel export is only available for Province and National users');
        }

        // 2. Get madrasahs based on role
        const allMadrasahs = getData('Madrasahs');
        let provinceMadrasahs;
        let madrasahIds;
        let exportFolderName;
        let scopeName;

        if (user.role === 'national') {
            // National: Export ALL madrasahs
            provinceMadrasahs = allMadrasahs;
            exportFolderName = 'National';
            scopeName = 'National';
            console.log(`Excel export requested by ${username} (Role: National) - Exporting ALL ${provinceMadrasahs.length} madrasahs`);
        } else {
            // Province: Filter by province scope
            const provinceName = user.scope || '';
            if (!provinceName) {
                return apiError('Province scope not defined for this user');
            }
            provinceMadrasahs = allMadrasahs.filter(m =>
                String(m.province || '').toLowerCase() === String(provinceName).toLowerCase()
            );
            exportFolderName = provinceName;
            scopeName = provinceName;
            console.log(`Excel export requested by ${username} (Province: ${provinceName}) - Found ${provinceMadrasahs.length} madrasahs`);
        }

        madrasahIds = new Set(provinceMadrasahs.map(m => String(m.madrasah_id)));

        // 3. Collect all sheet names from form definitions
        const sheetNames = [];
        const definitions = getFormDefinitions();
        const formIds = Object.keys(definitions);

        formIds.forEach(fid => {
            const yaml = definitions[fid];

            // Get target_sheet
            const sheetMatch = yaml.match(/target_sheet:\s*(['"]?)([^'"\n\r]+)\1/);
            if (sheetMatch) {
                const targetSheet = sheetMatch[2].trim();
                if (!sheetNames.includes(targetSheet)) {
                    sheetNames.push(targetSheet);
                }

                // Get table fields for this form
                const tableFields = extractTableFieldsFromYAML(yaml);
                tableFields.forEach(tf => {
                    const tableSheetName = `${targetSheet}|${tf.name}`;
                    if (!sheetNames.includes(tableSheetName)) {
                        sheetNames.push(tableSheetName);
                    }
                });
            }
        });

        console.log(`Found ${sheetNames.length} data sheets to export`);

        // 4. Create new temporary spreadsheet for export
        const timestamp = Utilities.formatDate(new Date(), 'GMT+7', 'yyyyMMdd_HHmmss');
        const exportFileName = `Export_${scopeName}_${timestamp}`;
        const newSpreadsheet = SpreadsheetApp.create(exportFileName);
        const newSs = SpreadsheetApp.openById(newSpreadsheet.getId());

        // Remove default sheet
        const defaultSheet = newSs.getSheets()[0];

        // 5. Export Madrasahs sheet first
        const madrasahSheet = newSs.insertSheet('Madrasahs');
        if (provinceMadrasahs.length > 0) {
            const madrasahHeaders = Object.keys(provinceMadrasahs[0]);
            const madrasahData = [madrasahHeaders];
            provinceMadrasahs.forEach(m => {
                madrasahData.push(madrasahHeaders.map(h => m[h] || ''));
            });
            madrasahSheet.getRange(1, 1, madrasahData.length, madrasahHeaders.length).setValues(madrasahData);

            // Format header
            madrasahSheet.getRange(1, 1, 1, madrasahHeaders.length).setFontWeight('bold').setBackground('#4CAF50').setFontColor('white');
        }

        console.log(`Exported Madrasahs sheet: ${provinceMadrasahs.length} rows`);

        // 6. Export each form data sheet
        let exportedCount = 0;
        const ss = getDb();

        sheetNames.forEach(sheetName => {
            try {
                const sourceSheet = ss.getSheetByName(sheetName);
                if (!sourceSheet || sourceSheet.getLastRow() === 0) {
                    console.log(`Skipping ${sheetName}: sheet not found or empty`);
                    return;
                }

                // Get all data
                const data = getData(sheetName, false); // No cache for fresh data

                // Filter by madrasah_id
                const filteredData = data.filter(row => {
                    const mid = String(row.madrasah_id || '');
                    return madrasahIds.has(mid);
                });

                if (filteredData.length === 0) {
                    console.log(`Skipping ${sheetName}: no data for ${scopeName}`);
                    return;
                }

                // Create new sheet in export file
                const exportSheet = newSs.insertSheet(sheetName);

                // Write data
                const headers = Object.keys(filteredData[0]);
                const sheetData = [headers];
                filteredData.forEach(row => {
                    sheetData.push(headers.map(h => {
                        const val = row[h];
                        // Convert objects/arrays to JSON string for Excel
                        if (typeof val === 'object' && val !== null) {
                            return JSON.stringify(val);
                        }
                        return val || '';
                    }));
                });

                exportSheet.getRange(1, 1, sheetData.length, headers.length).setValues(sheetData);

                // Format header
                exportSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#2196F3').setFontColor('white');

                exportedCount++;
                console.log(`Exported ${sheetName}: ${filteredData.length} rows`);

            } catch (e) {
                console.log(`Error exporting ${sheetName}: ${e.toString()}`);
            }
        });

        // Remove default sheet if still exists
        if (defaultSheet && newSs.getSheets().length > 1) {
            newSs.deleteSheet(defaultSheet);
        }

        console.log(`Export complete: ${exportedCount} sheets exported`);

        // 7. Move file to Survey_Files folder structure
        const file = DriveApp.getFileById(newSs.getId());
        const ssId = getDb().getId();
        const parentFolder = DriveApp.getFileById(ssId).getParents().next();

        // Get or create folder helper
        const getOrCreateFolder = (parent, name) => {
            const folders = parent.getFoldersByName(name);
            if (folders.hasNext()) {
                return folders.next();
            }
            return parent.createFolder(name);
        };

        // Get Survey_Files root folder (same as attachment files)
        const ROOT_FOLDER_NAME = 'Survey_Files';
        const surveyFilesRoot = getOrCreateFolder(parentFolder, ROOT_FOLDER_NAME);

        let targetFolder;
        if (user.role === 'national') {
            // National: Survey_Files/_Exports/
            targetFolder = getOrCreateFolder(surveyFilesRoot, '_Exports');
        } else {
            // Province: Survey_Files/{ProvinceName}/_Exports/
            const provinceFolder = getOrCreateFolder(surveyFilesRoot, exportFolderName);
            targetFolder = getOrCreateFolder(provinceFolder, '_Exports');
        }

        // Move file to target folder
        file.moveTo(targetFolder);

        // Make file shareable
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

        const exportUrl = file.getUrl();
        const downloadUrl = `https://docs.google.com/spreadsheets/d/${newSs.getId()}/export?format=xlsx`;

        const folderPath = user.role === 'national'
            ? `Survey_Files/_Exports/${exportFileName}`
            : `Survey_Files/${exportFolderName}/_Exports/${exportFileName}`;
        console.log(`File saved to: ${folderPath}`);

        return apiSuccess({
            filename: `${exportFileName}.xlsx`,
            spreadsheetId: newSs.getId(),
            url: exportUrl,
            downloadUrl: downloadUrl,
            folder: user.role === 'national'
                ? `Survey_Files/_Exports`
                : `Survey_Files/${exportFolderName}/_Exports`,
            sheetsExported: exportedCount + 1, // +1 for Madrasahs
            madrasahsCount: provinceMadrasahs.length
        }, 'Excel export generated successfully');

    } catch (e) {
        console.log(`Excel export error: ${e.toString()}`);
        return apiError('Export failed: ' + e.toString());
    }
}

/**
 * API: VALIDATE SURVEY TOKEN
 * Checks if token is valid, not expired, and within usage limits
 */
function apiValidateSurveyToken(token) {
    try {
        const ss = getDb();
        const tokenSheet = ss.getSheetByName('Survey_Tokens');
        if (!tokenSheet) return { success: false, message: 'Token system not initialized' };

        const tokens = getData('Survey_Tokens');
        const tokenData = tokens.find(t => t.token === token);

        if (!tokenData) {
            return { success: false, message: 'Invalid token' };
        }

        // Check status
        if (tokenData.status !== 'ACTIVE') {
            return { success: false, message: 'Token is no longer active' };
        }

        // Check expiry
        const now = new Date();
        const startTime = new Date(tokenData.start_time);
        const endTime = new Date(tokenData.end_time);

        if (now < startTime) {
            return { success: false, message: 'Token not yet active' };
        }

        if (now > endTime) {
            return { success: false, message: 'Token has expired' };
        }

        // Check usage limit
        const maxUsages = parseInt(tokenData.max_usages) || 0;
        const currentUsages = parseInt(tokenData.current_usages) || 0;

        if (maxUsages > 0 && currentUsages >= maxUsages) {
            return { success: false, message: 'Token usage limit reached' };
        }

        // Get form definition
        const dbForms = getData('Forms');
        const formObj = dbForms.find(f => f.form_id === tokenData.form_id);

        let formDef = null;
        if (formObj) {
            formDef = formObj.yaml_definition;
        } else {
            const fileForms = getFormDefinitions();
            formDef = fileForms[tokenData.form_id];
        }

        if (!formDef) {
            // Try Public Forms
            try {
                const publicForms = getPublicFormDefinitions();
                formDef = publicForms[tokenData.form_id];
            } catch (e) { }
        }

        if (!formDef) {
            return { success: false, message: 'Form not found' };
        }

        // Get madrasahs data for lookup fields
        const madrasahs = getData('Madrasahs').map(m => ({
            madrasah_id: m.madrasah_id || m.id || '',
            name: m.name || m.nama || '',
            state: m.state || m.status || '',
            address: m.address || m.alamat || '',
            village: m.village || m.vilage || m.desa || m.kelurahan || '',
            subdistrict: m.subdistrict || m.subditrict || m.kecamatan || '',
            district: m.district || m.distict || m.kabupaten || m.kota || '',
            province: m.province || m.provinsi || ''
        }));

        // Return valid token with context
        return {
            success: true,
            token: tokenData.token,
            type: tokenData.type,
            form_id: tokenData.form_id,
            form_definition: formDef,
            role_target: tokenData.role_target,
            target_scope: tokenData.target_scope,
            madrasahs: madrasahs,  // Add madrasahs for lookup fields
            // For INDIVIDUAL tokens, pre-fill madrasah_id
            locked_madrasah_id: tokenData.type === 'INDIVIDUAL' ? tokenData.target_scope : null
        };
    } catch (e) {
        return { success: false, message: e.toString() };
    }
}

/**
 * API: GENERATE SURVEY TOKEN
 * Creates a new survey token for group or individual access
 */
function apiGenerateSurveyToken(formId, type, roleTarget, targetScope, expiryHours, requesterUsername) {
    try {
        const ss = getDb();

        // Validate requester
        const users = getData('Users');
        const requester = users.find(u => u.username === requesterUsername);

        if (!requester) {
            return { success: false, message: 'Requester not found' };
        }

        // ✨ Allow 'district', 'madrasah', 'enum', 'fasda' roles to generate tokens
        if (!['district', 'madrasah', 'enum', 'fasda'].includes(requester.role)) {
            return { success: false, message: 'Insufficient permissions' };
        }

        // ✨ Validate target scope is in assigned madrasahs for Enum/Fasda
        if (requester.role === 'enum' || requester.role === 'fasda') {
            const assignedIds = (requester.assigned_madrasahs || '')
                .split(',')
                .map(id => id.trim())
                .filter(id => id.length > 0);

            if (!assignedIds.includes(targetScope)) {
                return { success: false, message: 'Target madrasah not in your assignment' };
            }
        }

        // Validate form exists
        const dbForms = getData('Forms');
        const formObj = dbForms.find(f => f.form_id === formId);

        let found = !!formObj;
        if (!found && getFormDefinitions()[formId]) found = true;
        if (!found) {
            try {
                if (getPublicFormDefinitions()[formId]) found = true;
            } catch (e) { }
        }

        if (!found) {
            return { success: false, message: 'Form not found' };
        }

        // Generate unique token
        const token = Utilities.getUuid();
        const now = new Date();
        const expiryTime = new Date(now.getTime() + (expiryHours * 60 * 60 * 1000));

        // Determine max usages
        const maxUsages = 0; // 0 = unlimited (Enabled for Delegasi/Group Sharing)

        // Add to sheet
        const tokenSheet = ss.getSheetByName('Survey_Tokens');
        if (!tokenSheet) {
            return { success: false, message: 'Survey_Tokens sheet not found' };
        }

        tokenSheet.appendRow([
            token,
            type,
            formId,
            roleTarget,
            targetScope,
            now.toISOString(),
            expiryTime.toISOString(),
            maxUsages,
            0, // current_usages
            'ACTIVE',
            requesterUsername
        ]);

        // Build URL - Use production deployment URL if set, otherwise dev URL
        const scriptProps = PropertiesService.getScriptProperties();
        const deploymentUrl = scriptProps.getProperty('DEPLOYMENT_URL'); // Set this manually after deployment
        const baseUrl = deploymentUrl || ScriptApp.getService().getUrl();
        const surveyUrl = `${baseUrl}?survey_token=${token}`;

        return {
            success: true,
            token: token,
            url: surveyUrl,
            expires_at: expiryTime.toISOString()
        };
    } catch (e) {
        return { success: false, message: e.toString() };
    } finally {
        // ✨ Invalidate Cache via Rule
        CacheManager.checkInvalidation('GENERATE_TOKEN');
    }
}

/**
 * API: FETCH GENERATED TOKENS
 * Get tokens created by me for this form
 */
function apiFetchGeneratedTokens(username, formId) {
    try {
        // Validate requester
        const users = getData('Users');
        const requester = users.find(u => u.username === username);
        if (!requester) return []; // Silent fail for list

        const tokens = getData('Survey_Tokens');

        // Filter: Created by me AND for this form
        // Also sort by creation date desc
        return tokens
            .filter(t => t.created_by === username && t.form_id === formId)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .map(t => ({
                token: t.token,
                type: t.type,
                form_id: t.form_id,
                role_target: t.role_target,
                target_scope: t.target_scope,
                created_at: t.created_at,
                expires_at: t.expires_at,
                max_usages: t.max_usages,
                current_usages: t.current_usages,
                status: t.status
            }));

    } catch (e) {
        return [];
    }
}

/**
 * API: CANCEL TOKEN
 * Mark token as CLOSED
 */
function apiCancelToken(token, username) {
    try {
        const ss = getDb();
        const sheet = ss.getSheetByName('Survey_Tokens');
        if (!sheet) return { success: false, message: 'Sheet not found' };

        const data = sheet.getDataRange().getValues();
        const headers = data[0].map(h => String(h).toLowerCase());
        const tokenIdx = headers.indexOf('token');
        const statusIdx = headers.indexOf('status');
        const ownerIdx = headers.indexOf('created_by');

        if (tokenIdx === -1) return { success: false, message: 'Invalid sheet' };

        for (let i = 1; i < data.length; i++) {
            if (data[i][tokenIdx] === token) {
                // Check ownership
                // If username provided, enforce it. If not (internal), skip.
                if (username && String(data[i][ownerIdx]) !== String(username)) {
                    return { success: false, message: 'Not authorized' };
                }

                sheet.getRange(i + 1, statusIdx + 1).setValue('CLOSED');
                return { success: true };
            }
        }
        return { success: false, message: 'Token not found' };
    } catch (e) {
        return { success: false, message: e.toString() };
    } finally {
        // ✨ Invalidate Cache via Rule
        CacheManager.checkInvalidation('CANCEL_TOKEN');
    }
}

/**
 * API: INCREMENT TOKEN USAGE
 * Called after successful submission via token
 */
function apiIncrementTokenUsage(token) {
    try {
        const ss = getDb();
        const tokenSheet = ss.getSheetByName('Survey_Tokens');
        if (!tokenSheet) return { success: false };

        const data = tokenSheet.getDataRange().getValues();
        const headers = data[0].map(h => String(h).toLowerCase());
        const tokenIdx = headers.indexOf('token');
        const usageIdx = headers.indexOf('current_usages');
        const maxIdx = headers.indexOf('max_usages');
        const statusIdx = headers.indexOf('status');

        if (tokenIdx === -1 || usageIdx === -1) return { success: false };

        for (let i = 1; i < data.length; i++) {
            if (data[i][tokenIdx] === token) {
                const currentUsages = parseInt(data[i][usageIdx]) || 0;
                const maxUsages = parseInt(data[i][maxIdx]) || 0;
                const newUsages = currentUsages + 1;

                tokenSheet.getRange(i + 1, usageIdx + 1).setValue(newUsages);

                // If max reached, mark as CLOSED
                if (maxUsages > 0 && newUsages >= maxUsages && statusIdx !== -1) {
                    tokenSheet.getRange(i + 1, statusIdx + 1).setValue('CLOSED');
                }

                return { success: true };
            }
        }

        return { success: false };
    } catch (e) {
        return { success: false, message: e.toString() };
    }
}

/**
 * HELPER: Set Production Deployment URL
 * Run this once after deploying as Web App to use /exec URL for survey tokens
 * 
 * Usage:
 * 1. Deploy → New deployment → Web app → Copy URL
 * 2. Run: setProductionDeploymentUrl('https://script.google.com/macros/s/YOUR_ID/exec')
 */
function setProductionDeploymentUrl(url) {
    try {
        if (!url || !url.includes('/exec')) {
            console.log('ERROR: Please provide a valid production URL ending with /exec');
            return { success: false, message: 'Invalid URL - must end with /exec' };
        }

        PropertiesService.getScriptProperties().setProperty('DEPLOYMENT_URL', url);
        console.log('✅ Production deployment URL saved: ' + url);
        console.log('Survey tokens will now use: ' + url + '?survey_token=...');

        return { success: true, url: url };
    } catch (e) {
        console.log('ERROR: ' + e.toString());
        return { success: false, message: e.toString() };
    }
}

/**
 * HELPER: Get Current Deployment URL
 */
function getCurrentDeploymentUrl() {
    const scriptProps = PropertiesService.getScriptProperties();
    const prodUrl = scriptProps.getProperty('DEPLOYMENT_URL');
    const devUrl = ScriptApp.getService().getUrl();

    console.log('Production URL (if set): ' + (prodUrl || 'NOT SET'));
    console.log('Development URL: ' + devUrl);
    console.log('Active URL for tokens: ' + (prodUrl || devUrl));

    return {
        production: prodUrl,
        development: devUrl,
        active: prodUrl || devUrl
    };
}

/**
 * ===================================
 * PROVINCE USER MANAGEMENT APIs
 * For managing Enum and Fasda users
 * ===================================
 */

/**
 * API: FETCH ENUM/FASDA USERS
 * Get list of enum/fasda users in Province scope
 */
function apiFetchEnumFasdaUsers(requesterUsername) {
    try {
        const users = getData('Users');
        const requester = users.find(u => u.username === requesterUsername);

        if (!requester || requester.role !== 'province') {
            return { success: false, message: 'Only Province can fetch users' };
        }

        // Get madrasahs in Province scope
        const madrasahs = getData('Madrasahs');
        const provinceMadrasahIds = madrasahs
            .filter(m => m.province === requester.scope)
            .map(m => m.madrasah_id);

        // Filter enum/fasda users that have at least one madrasah in this province
        const enumFasdaUsers = users.filter(u => {
            if (!['enum', 'fasda'].includes(u.role)) return false;

            const assignedIds = (u.assigned_madrasahs || '')
                .split(',')
                .map(id => id.trim())
                .filter(id => id);

            // Check if any assigned madrasah is in this province
            return assignedIds.some(id => provinceMadrasahIds.includes(id));
        }).map(u => {
            // ✅ Ensure assigned_madrasahs is always a string
            let assignedStr = '';
            if (Array.isArray(u.assigned_madrasahs)) {
                assignedStr = u.assigned_madrasahs.join(',');
            } else if (u.assigned_madrasahs) {
                assignedStr = String(u.assigned_madrasahs);
                // Remove leading single quote if present (from text formatting)
                if (assignedStr.startsWith("'")) {
                    assignedStr = assignedStr.substring(1);
                }
            }

            return {
                username: u.username,
                full_name: u.full_name,
                role: u.role,
                assigned_madrasahs: assignedStr,
                status: u.status || 'Active'
                // Don't include password in response
            };
        });

        return {
            success: true,
            users: enumFasdaUsers,
            madrasahs: madrasahs.filter(m => m.province === requester.scope)
        };
    } catch (e) {
        return { success: false, message: e.toString() };
    }
}

/**
 * API: ADD USER (Enum/Fasda)
 * Province can create new enum/fasda users
 */
function apiAddUser(userData, requesterUsername) {
    try {
        const ss = getDb();
        const users = getData('Users');
        const requester = users.find(u => u.username === requesterUsername);

        if (!requester || requester.role !== 'province') {
            return { success: false, message: 'Only Province can create users' };
        }

        // Validate new user data
        if (!userData.username || !userData.password || !userData.full_name || !userData.role) {
            return { success: false, message: 'Missing required fields' };
        }

        // Only allow creating enum/fasda
        if (!['enum', 'fasda'].includes(userData.role)) {
            return { success: false, message: 'Can only create Enum or Fasda users' };
        }

        // Check username uniqueness
        if (users.find(u => u.username === userData.username)) {
            return { success: false, message: 'Username already exists' };
        }

        // Validate assigned_madrasahs are in Province scope
        const assignedIds = (userData.assigned_madrasahs || '').split(',').map(id => id.trim()).filter(id => id);
        if (assignedIds.length === 0) {
            return { success: false, message: 'At least one madrasah must be assigned' };
        }

        const madrasahs = getData('Madrasahs');
        const provinceMadrasahs = madrasahs.filter(m => m.province === requester.scope);

        for (const id of assignedIds) {
            if (!provinceMadrasahs.find(m => m.madrasah_id === id)) {
                return { success: false, message: `Madrasah ${id} not in your province` };
            }
        }

        // Add to sheet
        const userSheet = ss.getSheetByName('Users');
        if (!userSheet) {
            return { success: false, message: 'Users sheet not found' };
        }

        // ✅ Force text format by prepending single quote (prevents Sheets number formatting)
        const assignedMadrasahsText = "'" + (userData.assigned_madrasahs || '');

        userSheet.appendRow([
            userData.username,
            userData.password,
            userData.full_name,
            userData.role,
            '-', // scope
            assignedMadrasahsText,
            'Active' // status
        ]);

        // ✨ Invalidate Cache via Rule
        CacheManager.checkInvalidation('ADD_USER');

        // 📝 LOG OPERATION
        if (typeof Logger !== 'undefined' && Logger.isEnabled()) {
            Logger.info('ADD_USER', {
                username: userData.username,
                full_name: userData.full_name,
                role: userData.role,
                assigned_madrasahs: userData.assigned_madrasahs
            }, requesterUsername);
        }

        return { success: true, message: 'User created successfully' };
    } catch (e) {
        // 📝 LOG ERROR
        if (typeof Logger !== 'undefined' && Logger.isEnabled()) {
            Logger.error('ADD_USER_FAILED', {
                error: e.toString(),
                username: userData.username
            }, requesterUsername);
        }
        return { success: false, message: e.toString() };
    }
}

/**
 * API: UPDATE USER (Enum/Fasda)
 * Province can update enum/fasda users
 */
function apiUpdateUser(username, updates, requesterUsername) {
    try {
        const ss = getDb();
        const users = getData('Users');
        const requester = users.find(u => u.username === requesterUsername);

        if (!requester || requester.role !== 'province') {
            return { success: false, message: 'Only Province can update users' };
        }

        const targetUser = users.find(u => u.username === username);
        if (!targetUser) {
            return { success: false, message: 'User not found' };
        }

        // Can only update enum/fasda
        if (!['enum', 'fasda'].includes(targetUser.role)) {
            return { success: false, message: 'Can only update Enum or Fasda users' };
        }

        // Validate assigned_madrasahs
        if (updates.assigned_madrasahs !== undefined) {
            const assignedIds = updates.assigned_madrasahs.split(',').map(id => id.trim()).filter(id => id);
            if (assignedIds.length === 0) {
                return { success: false, message: 'At least one madrasah must be assigned' };
            }

            const madrasahs = getData('Madrasahs');
            const provinceMadrasahs = madrasahs.filter(m => m.province === requester.scope);

            for (const id of assignedIds) {
                if (!provinceMadrasahs.find(m => m.madrasah_id === id)) {
                    return { success: false, message: `Madrasah ${id} not in your province` };
                }
            }
        }

        // Update in sheet
        const userSheet = ss.getSheetByName('Users');
        if (!userSheet) {
            return { success: false, message: 'Users sheet not found' };
        }

        const data = userSheet.getDataRange().getValues();

        for (let i = 1; i < data.length; i++) {
            if (data[i][0] === username) {
                // Update fields (columns: username, password, full_name, role, scope, assigned_madrasahs)
                if (updates.password) data[i][1] = updates.password;
                if (updates.full_name) data[i][2] = updates.full_name;
                if (updates.assigned_madrasahs !== undefined) {
                    // ✅ Force text format
                    data[i][5] = "'" + updates.assigned_madrasahs;
                }

                userSheet.getRange(i + 1, 1, 1, data[i].length).setValues([data[i]]);
                // ✨ Invalidate Cache via Rule
                CacheManager.checkInvalidation('UPDATE_USER');

                // 📝 LOG OPERATION
                if (typeof Logger !== 'undefined' && Logger.isEnabled()) {
                    Logger.info('UPDATE_USER', {
                        username: username,
                        updated_fields: Object.keys(updates).join(', ')
                    }, requesterUsername);
                }

                return { success: true, message: 'User updated successfully' };
            }
        }

        return { success: false, message: 'User not found in sheet' };
    } catch (e) {
        // 📝 LOG ERROR
        if (typeof Logger !== 'undefined' && Logger.isEnabled()) {
            Logger.error('UPDATE_USER_FAILED', {
                error: e.toString(),
                username: username
            }, requesterUsername);
        }
        return { success: false, message: e.toString() };
    }
}

/**
 * API: DELETE USER (Enum/Fasda)
 * Province can delete enum/fasda users
 */
function apiDeleteUser(username, requesterUsername) {
    try {
        const ss = getDb();
        const users = getData('Users');
        const requester = users.find(u => u.username === requesterUsername);

        if (!requester || requester.role !== 'province') {
            return { success: false, message: 'Only Province can delete users' };
        }

        const targetUser = users.find(u => u.username === username);
        if (!targetUser) {
            return { success: false, message: 'User not found' };
        }

        // Can only delete enum/fasda
        if (!['enum', 'fasda'].includes(targetUser.role)) {
            return { success: false, message: 'Can only delete Enum or Fasda users' };
        }

        // Delete from sheet
        const userSheet = ss.getSheetByName('Users');
        if (!userSheet) {
            return { success: false, message: 'Users sheet not found' };
        }

        const data = userSheet.getDataRange().getValues();

        for (let i = 1; i < data.length; i++) {
            if (data[i][0] === username) {
                userSheet.deleteRow(i + 1);
                // ✨ Invalidate Cache via Rule
                CacheManager.checkInvalidation('DELETE_USER');

                // 📝 LOG OPERATION
                if (typeof Logger !== 'undefined' && Logger.isEnabled()) {
                    Logger.info('DELETE_USER', {
                        username: username,
                        role: targetUser.role
                    }, requesterUsername);
                }

                return { success: true, message: 'User deleted successfully' };
            }
        }

        return { success: false, message: 'User not found in sheet' };
    } catch (e) {
        // 📝 LOG ERROR
        if (typeof Logger !== 'undefined' && Logger.isEnabled()) {
            Logger.error('DELETE_USER_FAILED', {
                error: e.toString(),
                username: username
            }, requesterUsername);
        }
        return { success: false, message: e.toString() };
    }
}

/**
 * API: TOGGLE USER LOCK STATUS
 * Province can lock/unlock enum/fasda users
 */
function apiToggleUserLock(targetUsername, status, requesterUsername) {
    try {
        const ss = getDb();
        const users = getData('Users');
        const requester = users.find(u => u.username === requesterUsername);

        if (!requester || requester.role !== 'province') {
            return { success: false, message: 'Only Province can manage users' };
        }

        const targetUser = users.find(u => u.username === targetUsername);
        if (!targetUser) {
            return { success: false, message: 'User not found' };
        }

        if (!['enum', 'fasda'].includes(targetUser.role)) {
            return { success: false, message: 'Can only manage Enum or Fasda users' };
        }

        // Update in sheet
        const userSheet = ss.getSheetByName('Users');
        if (!userSheet) {
            return { success: false, message: 'Users sheet not found' };
        }

        const data = userSheet.getDataRange().getValues();
        let statusColIndex = -1;

        // Find 'status' column dynamically
        const headers = data[0].map(h => String(h).toLowerCase().trim());
        statusColIndex = headers.indexOf('status');

        // If status column doesn't exist, we can't update it. 
        if (statusColIndex === -1) {
            return { success: false, message: 'Status column not found in Users sheet' };
        }

        for (let i = 1; i < data.length; i++) {
            if (String(data[i][0]) === String(targetUsername)) { // Username is Col 1 (index 0)
                // Update Status
                userSheet.getRange(i + 1, statusColIndex + 1).setValue(status);

                // ✨ Invalidate Cache via Rule
                CacheManager.checkInvalidation('UPDATE_USER');

                // 📝 LOG OPERATION
                if (typeof Logger !== 'undefined' && Logger.isEnabled()) {
                    Logger.info('TOGGLE_USER_LOCK', {
                        username: targetUsername,
                        new_status: status,
                        role: targetUser.role
                    }, requesterUsername);
                }

                return { success: true, message: `User ${status === 'locked' ? 'locked' : 'unlocked'} successfully` };
            }
        }

        return { success: false, message: 'User not found in sheet' };
    } catch (e) {
        // 📝 LOG ERROR
        if (typeof Logger !== 'undefined' && Logger.isEnabled()) {
            Logger.error('TOGGLE_USER_LOCK_FAILED', {
                error: e.toString(),
                username: targetUsername
            }, requesterUsername);
        }
        return { success: false, message: e.toString() };
    }
}

