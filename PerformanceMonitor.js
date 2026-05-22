/**
 * PERFORMANCE MONITOR
 * Tracks execution time and identifies bottlenecks
 * 
 * Features:
 * - Start/End timing for code blocks
 * - Automatic performance reporting
 * - Cache statistics logging
 */

/**
 * Performance Monitor Class
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = {};
        this.enabled = true; // Toggle for production
    }

    /**
     * Start timing a code block
     */
    start(label) {
        if (!this.enabled) return;

        this.metrics[label] = {
            start: Date.now(),
            end: null,
            duration: null
        };
    }

    /**
     * End timing a code block
     */
    end(label) {
        if (!this.enabled) return;

        if (!this.metrics[label]) {
            Logger.log(`Warning: No start time found for '${label}'`);
            return;
        }

        this.metrics[label].end = Date.now();
        this.metrics[label].duration = this.metrics[label].end - this.metrics[label].start;
    }

    /**
     * Get performance report
     */
    getReport() {
        const report = {};

        for (const label in this.metrics) {
            const metric = this.metrics[label];
            if (metric.duration !== null) {
                report[label] = `${metric.duration}ms`;
            }
        }

        return report;
    }

    /**
     * Log performance report
     */
    log() {
        if (!this.enabled) return;

        Logger.log('=== Performance Report ===');
        const report = this.getReport();

        for (const label in report) {
            Logger.log(`${label}: ${report[label]}`);
        }

        // Log cache statistics
        if (typeof CacheManager !== 'undefined') {
            const cacheStats = CacheManager.getStats();
            Logger.log('\n=== Cache Statistics ===');
            Logger.log(`Request Cache Hit Rate: ${cacheStats.request.hitRate}`);
            Logger.log(`Hits: ${cacheStats.request.hits}, Misses: ${cacheStats.request.misses}`);
        }
    }

    /**
     * Reset all metrics
     */
    reset() {
        this.metrics = {};
    }

    /**
     * Enable performance monitoring
     */
    enable() {
        this.enabled = true;
    }

    /**
     * Disable performance monitoring
     */
    disable() {
        this.enabled = false;
    }
}

/**
 * Global performance monitor instance
 */
const perfMonitor = new PerformanceMonitor();

/**
 * WRAPPER: Performance-tracked version of apiFetchData
 * This wraps the existing apiFetchData with performance monitoring
 */
function apiFetchDataWithMonitoring(username) {
    perfMonitor.start('apiFetchData_total');

    perfMonitor.start('getUserByUsername');
    const user = DataService.getUserByUsername(username);
    perfMonitor.end('getUserByUsername');

    perfMonitor.start('getMadrasahsForUser');
    let myMadrasahs = DataService.getMadrasahsForUser(user || { username, role: 'district', scope: '' });
    perfMonitor.end('getMadrasahsForUser');

    perfMonitor.start('getMadrasahsWithStats');
    myMadrasahs = DataService.getMadrasahsWithStats(myMadrasahs);
    perfMonitor.end('getMadrasahsWithStats');

    perfMonitor.start('getSubmissionsForUser');
    const submissions = DataService.getSubmissionsForUser(user || { username, role: 'district', scope: '' });
    perfMonitor.end('getSubmissionsForUser');

    perfMonitor.start('getFormsMap');
    const formsMap = DataService.getFormsMap();
    perfMonitor.end('getFormsMap');

    perfMonitor.start('getTokensForUser');
    const myTokens = DataService.getTokensForUser(username);
    perfMonitor.end('getTokensForUser');

    perfMonitor.end('apiFetchData_total');
    perfMonitor.log();

    return {
        madrasah_ids: myMadrasahs.map(m => m.madrasah_id),
        madrasahs: myMadrasahs,
        forms: formsMap,
        submissions: submissions,
        my_tokens: myTokens
    };
}

/**
 * ADMIN FUNCTION: Run performance benchmark
 * Call this from Apps Script editor to test performance improvements
 */
function runPerformanceBenchmark() {
    Logger.log('=== PERFORMANCE BENCHMARK START ===\n');

    // Test with different user types
    const testUsers = [
        'admin',      // National
        'jatim',      // Province
        'lumajang',   // District
        '60715326'    // Madrasah
    ];

    testUsers.forEach(username => {
        Logger.log(`\n--- Testing user: ${username} ---`);
        perfMonitor.reset();

        try {
            apiFetchDataWithMonitoring(username);
        } catch (e) {
            Logger.log(`Error for user ${username}: ${e.toString()}`);
        }
    });

    Logger.log('\n=== PERFORMANCE BENCHMARK END ===');
}
