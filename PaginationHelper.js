/**
 * PAGINATION HELPER
 * Utilities for lazy loading and pagination
 * 
 * Features:
 * - Array pagination
 * - Lazy loading for large datasets
 * - Metadata (page info, totals)
 */

/**
 * Paginate array data
 * @param {Array} array - Array to paginate
 * @param {number} page - Page number (1-indexed)
 * @param {number} pageSize - Items per page
 * @returns {Object} Paginated result with metadata
 */
function paginate(array, page = 1, pageSize = 50) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const totalPages = Math.ceil(array.length / pageSize);

    return {
        data: array.slice(start, end),
        pagination: {
            page: page,
            pageSize: pageSize,
            total: array.length,
            totalPages: totalPages,
            hasNext: end < array.length,
            hasPrev: page > 1,
            startIndex: start,
            endIndex: Math.min(end, array.length)
        }
    };
}

/**
 * API: Fetch submissions lazily (paginated)
 * @param {string} madrasah_id - Madrasah ID
 * @param {number} page - Page number
 * @param {number} pageSize - Items per page
 * @returns {Object} Paginated submissions
 */
function apiFetchSubmissionsLazy(madrasah_id, page = 1, pageSize = 50) {
    try {
        // Get submissions for this madrasah
        const allSubs = DataService.getSubmissionsByMadrasah(madrasah_id);

        // Sort by timestamp (newest first)
        allSubs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Return paginated result
        return paginate(allSubs, page, pageSize);
    } catch (e) {
        return {
            success: false,
            message: e.toString()
        };
    }
}

/**
 * API: Fetch madrasah history lazily (metadata only, no full data)
 * @param {string} madrasah_id - Madrasah ID
 * @param {number} page - Page number
 * @param {number} pageSize - Items per page
 * @returns {Object} Paginated submission metadata
 */
function apiFetchMadrasahHistoryLazy(madrasah_id, page = 1, pageSize = 50) {
    try {
        // Get submissions (metadata only)
        const submissions = DataService.getSubmissionsByMadrasah(madrasah_id);

        // Sort by timestamp
        submissions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Extract metadata only (no full data_json)
        const metadata = submissions.map(s => ({
            submission_id: s.submission_id,
            madrasah_id: s.madrasah_id,
            form_id: s.form_id,
            username: s.username,
            timestamp: s.timestamp
        }));

        // Paginate
        return paginate(metadata, page, pageSize);
    } catch (e) {
        return {
            success: false,
            message: e.toString()
        };
    }
}

/**
 * API: Batch fetch submission details
 * @param {Array<string>} submission_ids - Array of submission IDs
 * @returns {Object} Batch result
 */
function apiFetchSubmissionsBatch(submission_ids) {
    try {
        const results = {};

        submission_ids.forEach(sid => {
            const submission = DataService.getSubmissionById(sid);
            if (submission) {
                results[sid] = submission;
            }
        });

        return {
            success: true,
            data: results
        };
    } catch (e) {
        return {
            success: false,
            message: e.toString()
        };
    }
}

/**
 * Get paginated madrasahs for dashboard
 * Useful for dashboards with hundreds of madrasahs
 */
function getMadrasahsPaginated(user, page = 1, pageSize = 100) {
    const madrasahs = DataService.getMadrasahsForUser(user);
    const madrasahsWithStats = DataService.getMadrasahsWithStats(madrasahs);

    return paginate(madrasahsWithStats, page, pageSize);
}
