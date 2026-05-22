/**
 * INITIALIZATION & SETUP
 * Handles database creation, menu triggers, and safe schema migration.
 */

// Global constant for default sheet schema
const CORE_SCHEMA = {
    'Users': ['username', 'password', 'full_name', 'role', 'scope', 'assigned_madrasahs', 'status'],
    'Madrasahs': ['madrasah_id', 'name', 'state', 'address', 'village', 'subdistrict', 'district', 'province'],
    'Forms': ['form_id', 'form_name', 'yaml_definition'],
    'Submissions': ['submission_id', 'madrasah_id', 'form_id', 'username', 'timestamp', 'data_json'],
    'PasswordResets': ['token', 'madrasah_id', 'created_at', 'expires_at', 'created_by', 'used'],
    'Survey_Tokens': ['token', 'type', 'form_id', 'role_target', 'target_scope', 'start_time', 'end_time', 'max_usages', 'current_usages', 'status', 'created_by'],
    'Activity_Logs': ['timestamp', 'level', 'action', 'username', 'details']
};

/**
 * TRIGGER: ON OPEN
 */
function onOpen() {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('Admin Survey App')
        .addItem('Generate Looker Data', 'mainRunner')
        .addItem('Setup / Update Database', 'initApplication')
        .addToUi();
}

/**
 * MAIN SETUP FUNCTION
 * Safe to run multiple times. Upserts data and adds missing columns.
 */
function initApplication() {
    const ss = getDb();
    if (!ss) return;

    const ui = SpreadsheetApp.getUi();
    let stats = { created: 0, updatedForms: 0, migrated: 0 };

    // Core Sheets (Fallback & Integrity Check)
    Object.keys(CORE_SCHEMA).forEach(sheetName => {
        let sheet = ss.getSheetByName(sheetName);

        if (!sheet) {
            sheet = ss.insertSheet(sheetName);
            stats.created++;
        }

        // Ensure Headers Exist
        if (sheet.getLastRow() === 0) {
            sheet.appendRow(CORE_SCHEMA[sheetName]);
        }

        // Dummy Data Injection (Fallback if empty)
        if (sheet.getLastRow() <= 1) {
            if (sheetName === 'Users') {
                const users = [
                    ['admin', 'admin', 'Super Admin', 'national', 'ALL'],
                    ['lumajang', '123', 'User Lumajang', 'district', 'Lumajang'],
                    ['jatim', '123', 'Supervisor Jatim', 'province', 'Jawa Timur'],
                    ['60715326', '123', 'User Madrasah', 'madrasah', 'Lumajang']
                ];
                users.forEach(r => sheet.appendRow(r));
            }
            if (sheetName === 'Madrasahs') {
                const madrasahs = [
                    ['60715326', 'MI Nurul Islam Kota Citrodiwangsan', 'Swasta', 'JL. ALUN-ALUN BARAT 02', 'CITRODIWANGSAN', 'LUMAJANG', 'Lumajang', 'Jawa Timur'],
                    ['60715327', 'MI Al-Ghozali Gambiran Rogotrunan', 'Swasta', 'JL. BONDOYUDO NO.8 GAMBIRAN', 'ROGOTRUNAN', 'LUMAJANG', 'Lumajang', 'Jawa Timur'],
                    ['70031701', 'MI Ash Shomadiyah', 'Swasta', 'JL KH AGUS SALIM NO.44 KINGKING', 'KINGKING', 'TUBAN', 'Tuban', 'Jawa Timur'],
                ];
                madrasahs.forEach(r => sheet.appendRow(r));
            }
        }
    });

    // Sync Forms
    const result = syncFormSheets(ss);
    stats.updatedForms = result.updated;
    stats.migrated = result.migrated;

    ui.alert('Setup Complete',
        `Database Ready.\n` +
        `- Sheets Created: ${stats.created}\n` +
        `- Forms Updated: ${stats.updatedForms}\n` +
        `- Sheets Migrated: ${stats.migrated}`,
        ui.ButtonSet.OK);
}

/**
 * SYNC FORMS & MIGRATE SCHEMAS
 */
function syncFormSheets(ss) {
    const formsSheet = ss.getSheetByName('Forms');
    if (!formsSheet) return { updated: 0, migrated: 0 };

    // Fallback: If Forms sheet exists but empty, add Headers
    if (formsSheet.getLastRow() === 0) {
        formsSheet.appendRow(CORE_SCHEMA['Forms']);
    }

    const definitions = getFormDefinitions(); // From Forms.js
    const formIds = Object.keys(definitions);

    // Get existing DB forms to upsert
    const data = formsSheet.getDataRange().getValues();
    const existingIds = {};
    // Map ID -> Row Index (start from 1 for header)
    for (let i = 1; i < data.length; i++) {
        existingIds[data[i][0]] = i + 1;
    }

    let updatedCount = 0;
    let migratedCount = 0;

    formIds.forEach(fid => {
        const yaml = definitions[fid];
        const titleMatch = yaml.match(/title:\s*(.+)/);
        const title = titleMatch ? titleMatch[1].trim() : fid;

        // A. UPSERT FORM DEFINITION
        if (existingIds[fid]) {
            // Update
            const row = existingIds[fid];
            formsSheet.getRange(row, 2).setValue(title);
            formsSheet.getRange(row, 3).setValue(yaml);
        } else {
            // Insert
            formsSheet.appendRow([fid, title, yaml]);
            updatedCount++;
        }

        // B. SYNC TARGET SHEET SCHEMA
        const sheetMatch = yaml.match(/target_sheet:\s*(['"]?)([^'"\n\r]+)\1/);
        const targetSheetName = sheetMatch ? sheetMatch[2].trim() : null;

        if (targetSheetName) {
            // ✨ NEW: Detect table fields and their nested columns
            const tableFields = extractTableFields(yaml);
            const nestedColumns = new Set();

            // Collect all nested column names from table fields
            tableFields.forEach(tableField => {
                tableField.columns.forEach(col => nestedColumns.add(col));
            });

            // Extract field names from YAML
            const fieldRegex = /name:\s*(['"]?)([^'"\n\r]+)\1/g;
            let match;
            const desiredFields = ['submission_id', 'madrasah_id', 'timestamp', 'username'];

            while ((match = fieldRegex.exec(yaml)) !== null) {
                const name = match[2].trim();
                // Avoid reserved system fields duplicates AND nested table columns
                if (!['submission_id', 'madrasah_id', 'timestamp', 'username'].includes(name)
                    && !nestedColumns.has(name)) {
                    desiredFields.push(name);
                }
            }

            // Check/Create Main Sheet
            let tSheet = ss.getSheetByName(targetSheetName);
            if (!tSheet) {
                tSheet = ss.insertSheet(targetSheetName);
                tSheet.appendRow(desiredFields);
                migratedCount++;
            } else {
                // Check missing columns
                if (tSheet.getLastRow() > 0) {
                    const currentHeaders = tSheet.getRange(1, 1, 1, tSheet.getLastColumn()).getValues()[0];
                    const missing = desiredFields.filter(f => !currentHeaders.includes(f));

                    if (missing.length > 0) {
                        tSheet.getRange(1, currentHeaders.length + 1, 1, missing.length).setValues([missing]);
                        migratedCount++;
                    }
                }
            }

            // ✨ NEW: Create separate sheets for each table JSON field
            // DEBUG: Log tableFields to see what was extracted
            Logger.log(`Creating table sheets for ${targetSheetName}. Found ${tableFields.length} table fields:`);
            tableFields.forEach(tf => {
                Logger.log(`  - ${tf.name} (type: ${tf.type}, firstColLabel: ${tf.firstColLabel}, columns: ${tf.columns.join(', ')})`);
            });

            tableFields.forEach(tableField => {
                const tableSheetName = `${targetSheetName}|${tableField.name}`;
                let tableSheet = ss.getSheetByName(tableSheetName);

                // Define table sheet headers
                const tableHeaders = ['submission_id', 'madrasah_id', 'timestamp'];

                // Add first column label for table_col_fix type (use actual label name or fallback to 'row_label')
                if (tableField.type === 'table_col_fix') {
                    const firstColName = tableField.firstColLabel || 'row_label';
                    tableHeaders.push(firstColName);
                }

                // Add all column names from the table definition
                tableHeaders.push(...tableField.columns);

                if (!tableSheet) {
                    // Create new table sheet
                    tableSheet = ss.insertSheet(tableSheetName);
                    tableSheet.appendRow(tableHeaders);
                    migratedCount++;
                } else {
                    // Update existing table sheet if needed
                    if (tableSheet.getLastRow() > 0) {
                        const currentHeaders = tableSheet.getRange(1, 1, 1, tableSheet.getLastColumn()).getValues()[0];
                        const missing = tableHeaders.filter(f => !currentHeaders.includes(f));

                        if (missing.length > 0) {
                            tableSheet.getRange(1, currentHeaders.length + 1, 1, missing.length).setValues([missing]);
                            migratedCount++;
                        }
                    } else {
                        // Sheet exists but is empty
                        tableSheet.appendRow(tableHeaders);
                    }
                }
            });
        }
    });

    return { updated: updatedCount, migrated: migratedCount };
}

/**
 * HELPER: Extract table field definitions from YAML
 * Returns array of {name, type, columns[]}
 */
function extractTableFields(yaml) {
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
