/**
 * API: GET LOGGER CONFIG
 * Admin only - get current logger configuration
 */
function apiGetLoggerConfig() {
    try {
        if (typeof Logger === 'undefined') {
            return { success: false, message: 'Logger module not available' };
        }

        return {
            success: true,
            config: Logger.getConfig()
        };
    } catch (e) {
        return { success: false, message: e.toString() };
    }
}

/**
 * API: UPDATE LOGGER CONFIG
 * Admin only - update logger configuration
 */
function apiUpdateLoggerConfig(newConfig) {
    try {
        if (typeof Logger === 'undefined') {
            return { success: false, message: 'Logger module not available' };
        }

        // Validate config
        if (newConfig.ENABLED !== undefined) {
            LoggerConfig.ENABLED = newConfig.ENABLED === true;
        }

        if (newConfig.LOG_LEVEL !== undefined) {
            const validLevels = ['INFO', 'WARNING', 'ERROR'];
            if (validLevels.includes(newConfig.LOG_LEVEL)) {
                LoggerConfig.LOG_LEVEL = newConfig.LOG_LEVEL;
            }
        }

        return {
            success: true,
            message: 'Logger configuration updated',
            config: Logger.getConfig()
        };
    } catch (e) {
        return { success: false, message: e.toString() };
    }
}

/**
 * API: GET RECENT LOGS
 * Admin only - retrieve recent activity logs
 */
function apiGetRecentLogs(limit) {
    try {
        if (typeof Logger === 'undefined') {
            return { success: false, message: 'Logger module not available' };
        }

        const logs = Logger.getRecentLogs(limit || 100);

        return {
            success: true,
            logs: logs,
            count: logs.length
        };
    } catch (e) {
        return { success: false, message: e.toString() };
    }
}

/**
 * API: CLEAR OLD LOGS
 * Admin only - delete logs older than specified days
 */
function apiClearOldLogs(daysToKeep) {
    try {
        if (typeof Logger === 'undefined') {
            return { success: false, message: 'Logger module not available' };
        }

        const deletedCount = Logger.clearOldLogs(daysToKeep || 30);

        // 📝 LOG THIS ACTION
        if (Logger.isEnabled()) {
            Logger.info('CLEAR_OLD_LOGS', {
                days_kept: daysToKeep || 30,
                deleted_count: deletedCount
            }, 'ADMIN');
        }

        return {
            success: true,
            message: `Deleted ${deletedCount} old log entries`,
            deletedCount: deletedCount
        };
    } catch (e) {
        return { success: false, message: e.toString() };
    }
}

/**
 * API: GET LOG STATS
 * Admin only - get logger statistics
 */
function apiGetLogStats() {
    try {
        const ss = getDb();
        if (!ss) return { success: false, message: 'Database not available' };

        const sheet = ss.getSheetByName(LoggerConfig.SHEET_NAME || 'Activity_Logs');
        if (!sheet) {
            return {
                success: true,
                stats: {
                    totalLogs: 0,
                    oldestLog: null,
                    newestLog: null,
                    byLevel: { INFO: 0, WARNING: 0, ERROR: 0 }
                }
            };
        }

        const totalRows = sheet.getLastRow() - 1; // Exclude header

        if (totalRows <= 0) {
            return {
                success: true,
                stats: {
                    totalLogs: 0,
                    oldestLog: null,
                    newestLog: null,
                    byLevel: { INFO: 0, WARNING: 0, ERROR: 0 }
                }
            };
        }

        // Get first and last log timestamps
        const firstTimestamp = sheet.getRange(2, 1).getValue();
        const lastTimestamp = sheet.getRange(sheet.getLastRow(), 1).getValue();

        // Count by level (simple approach - get all levels and count)
        const levels = sheet.getRange(2, 2, totalRows, 1).getValues().flat();
        const byLevel = {
            INFO: levels.filter(l => l === 'INFO').length,
            WARNING: levels.filter(l => l === 'WARNING').length,
            ERROR: levels.filter(l => l === 'ERROR').length
        };

        return {
            success: true,
            stats: {
                totalLogs: totalRows,
                oldestLog: firstTimestamp,
                newestLog: lastTimestamp,
                byLevel: byLevel
            }
        };
    } catch (e) {
        return { success: false, message: e.toString() };
    }
}
