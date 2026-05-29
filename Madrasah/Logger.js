/**
 * ACTIVITY LOGGER
 * Comprehensive logging system for tracking data operations
 * 
 * Features:
 * - Configurable enable/disable
 * - Multiple log levels (INFO, WARNING, ERROR)
 * - Stores logs in Activity_Logs sheet
 * - Tracks user actions with timestamps and details
 */

/**
 * LOGGER CONFIGURATION
 * Adjust these settings to control logging behavior
 */
const LoggerConfig = {
    ENABLED: true,              // Master switch: Set to false to disable ALL logging
    LOG_LEVEL: 'INFO',          // Minimum level to log: 'INFO', 'WARNING', 'ERROR'
    MAX_DETAIL_LENGTH: 5000,    // Maximum length for details field (prevent cell overflow)
    SHEET_NAME: 'Activity_Logs' // Name of the sheet to store logs
};

/**
 * Log level hierarchy
 */
const LOG_LEVELS = {
    INFO: 0,
    WARNING: 1,
    ERROR: 2
};

/**
 * LOGGER CLASS
 * Main logging interface
 */
const Logger = {
    /**
     * Check if logging is enabled
     * @returns {boolean}
     */
    isEnabled: function () {
        return LoggerConfig.ENABLED === true;
    },

    /**
     * Get current configuration
     * @returns {Object}
     */
    getConfig: function () {
        return { ...LoggerConfig };
    },

    /**
     * Main logging method
     * @param {string} level - Log level: 'INFO', 'WARNING', 'ERROR'
     * @param {string} action - Action type (e.g., 'SUBMIT_SURVEY', 'UPDATE_USER')
     * @param {Object|string} details - Details object or string
     * @param {string} username - User who performed the action
     */
    log: function (level, action, details, username) {
        try {
            // Check if logging is enabled
            if (!this.isEnabled()) {
                return;
            }

            // Check log level threshold
            const currentLevel = LOG_LEVELS[level] || 0;
            const configLevel = LOG_LEVELS[LoggerConfig.LOG_LEVEL] || 0;

            if (currentLevel < configLevel) {
                return; // Skip if below threshold
            }

            // Validate required parameters
            if (!action) {
                // Don't recursively call Logger.log - use console instead
                return;
            }

            // Prepare log entry
            const timestamp = new Date().toISOString();

            // Convert details to JSON string
            let detailsStr = '';
            if (details) {
                if (typeof details === 'object') {
                    detailsStr = JSON.stringify(details);
                } else {
                    detailsStr = String(details);
                }

                // Truncate if too long
                if (detailsStr.length > LoggerConfig.MAX_DETAIL_LENGTH) {
                    detailsStr = detailsStr.substring(0, LoggerConfig.MAX_DETAIL_LENGTH) + '... [TRUNCATED]';
                }
            }

            // Write to sheet
            this._writeLog(timestamp, level, action, username || 'UNKNOWN', detailsStr);

        } catch (e) {
            // Silent fail to prevent breaking main operations
            // Do nothing - avoid recursive calls
        }
    },

    /**
     * Convenience method for INFO level
     * @param {string} action - Action type
     * @param {Object|string} details - Details
     * @param {string} username - Username
     */
    info: function (action, details, username) {
        this.log('INFO', action, details, username);
    },

    /**
     * Convenience method for WARNING level
     * @param {string} action - Action type
     * @param {Object|string} details - Details
     * @param {string} username - Username
     */
    warning: function (action, details, username) {
        this.log('WARNING', action, details, username);
    },

    /**
     * Convenience method for ERROR level
     * @param {string} action - Action type
     * @param {Object|string} details - Details
     * @param {string} username - Username
     */
    error: function (action, details, username) {
        this.log('ERROR', action, details, username);
    },

    /**
     * Internal method to write log to sheet
     * @private
     */
    _writeLog: function (timestamp, level, action, username, details) {
        try {
            const ss = getDb();
            if (!ss) return;

            let sheet = ss.getSheetByName(LoggerConfig.SHEET_NAME);

            // Create sheet if it doesn't exist
            if (!sheet) {
                sheet = ss.insertSheet(LoggerConfig.SHEET_NAME);
                sheet.appendRow(['timestamp', 'level', 'action', 'username', 'details']);
            }

            // Append log entry
            sheet.appendRow([timestamp, level, action, username, details]);

        } catch (e) {
            // Silent fail - do nothing to avoid recursion
        }
    },

    /**
     * Get recent logs (helper method for debugging)
     * @param {number} limit - Maximum number of logs to retrieve (default 100)
     * @returns {Array} Array of log objects
     */
    getRecentLogs: function (limit) {
        try {
            limit = limit || 100;

            const ss = getDb();
            if (!ss) return [];

            const sheet = ss.getSheetByName(LoggerConfig.SHEET_NAME);
            if (!sheet || sheet.getLastRow() < 2) return [];

            const lastRow = sheet.getLastRow();
            const startRow = Math.max(2, lastRow - limit + 1);
            const numRows = lastRow - startRow + 1;

            const data = sheet.getRange(startRow, 1, numRows, 5).getValues();

            return data.map(row => ({
                timestamp: row[0],
                level: row[1],
                action: row[2],
                username: row[3],
                details: row[4]
            }));

        } catch (e) {
            // Silent fail
            return [];
        }
    },

    /**
     * Clear old logs (cleanup helper)
     * @param {number} daysToKeep - Keep logs from last N days (default 30)
     * @returns {number} Number of rows deleted
     */
    clearOldLogs: function (daysToKeep) {
        try {
            daysToKeep = daysToKeep || 30;

            const ss = getDb();
            if (!ss) return 0;

            const sheet = ss.getSheetByName(LoggerConfig.SHEET_NAME);
            if (!sheet || sheet.getLastRow() < 2) return 0;

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            const data = sheet.getDataRange().getValues();
            const headers = data[0];
            let rowsDeleted = 0;

            // Start from bottom to avoid index shifting
            for (let i = data.length - 1; i >= 1; i--) {
                const timestamp = new Date(data[i][0]);

                if (timestamp < cutoffDate) {
                    sheet.deleteRow(i + 1);
                    rowsDeleted++;
                }
            }

            return rowsDeleted;

        } catch (e) {
            // Silent fail
            return 0;
        }
    }
};

/**
 * HELPER: Log function for Apps Script Logger (fallback)
 */
if (typeof Logger.log === 'undefined') {
    Logger.log = function (message) {
        console.log(message);
    };
}
