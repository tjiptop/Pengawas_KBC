/**
 * DATA SERVICE LAYER
 * Centralized data access with indexing and caching
 * 
 * Features:
 * - Index-based lookups (O(1) instead of O(n))
 * - Cached data retrieval
 * - Pre-calculated statistics
 * - Separation of data access from business logic
 */

/**
 * BUILD MADRASAH INDEX
 * Creates lookup maps for efficient filtering
 */
function buildMadrasahIndex(madrasahs) {
    const index = {
        byId: {},
        byDistrict: {},
        byProvince: {},
        all: madrasahs
    };

    madrasahs.forEach(m => {
        const id = String(m.madrasah_id || '');
        const district = String(m.district || '');
        const province = String(m.province || '');

        // By ID lookup
        index.byId[id] = m;

        // By District grouping
        if (district) {
            if (!index.byDistrict[district]) {
                index.byDistrict[district] = [];
            }
            index.byDistrict[district].push(m);
        }

        // By Province grouping
        if (province) {
            if (!index.byProvince[province]) {
                index.byProvince[province] = [];
            }
            index.byProvince[province].push(m);
        }
    });

    return index;
}

/**
 * BUILD SUBMISSION INDEX
 * Creates lookup maps and pre-calculates statistics
 */
function buildSubmissionIndex(submissions) {
    const index = {
        byId: {},
        byMadrasahId: {},
        byFormId: {},
        stats: {},
        all: submissions
    };

    submissions.forEach(s => {
        const sid = String(s.submission_id || '');
        const mid = String(s.madrasah_id || '');
        const fid = String(s.form_id || '');

        // By submission ID
        index.byId[sid] = s;

        // By Madrasah ID grouping
        if (mid) {
            if (!index.byMadrasahId[mid]) {
                index.byMadrasahId[mid] = [];
            }
            index.byMadrasahId[mid].push(s);
        }

        // By Form ID grouping
        if (fid) {
            if (!index.byFormId[fid]) {
                index.byFormId[fid] = [];
            }
            index.byFormId[fid].push(s);
        }

        // Pre-calculate stats per madrasah
        if (mid) {
            if (!index.stats[mid]) {
                index.stats[mid] = { count: 0, last: 0 };
            }
            index.stats[mid].count++;

            const ts = new Date(s.timestamp).getTime();
            if (ts > index.stats[mid].last) {
                index.stats[mid].last = ts;
            }
        }
    });

    return index;
}

/**
 * BUILD USER INDEX
 * Creates lookup map for users
 */
function buildUserIndex(users) {
    const index = {
        byUsername: {},
        byRole: {},
        all: users
    };

    users.forEach(u => {
        const username = String(u.username || '');
        const role = String(u.role || 'district');

        // By username
        if (username) {
            index.byUsername[username] = u;
        }

        // By role grouping
        if (!index.byRole[role]) {
            index.byRole[role] = [];
        }
        index.byRole[role].push(u);
    });

    return index;
}

/**
 * NORMALIZE MADRASAH DATA
 * Handles typos and variations in column names
 */
function normalizeMadrasahData(rawMadrasahs) {
    return rawMadrasahs.map(m => ({
        madrasah_id: m.madrasah_id || m.id || '',
        name: m.name || m.nama || '',
        state: m.state || m.status || '',
        address: m.address || m.alamat || '',
        village: m.village || m.vilage || m.desa || m.kelurahan || '',
        subdistrict: m.subdistrict || m.subditrict || m.kecamatan || '',
        district: m.district || m.distict || m.kabupaten || m.kota || '',
        province: m.province || m.provinsi || ''
    }));
}

/**
 * DATA SERVICE
 * Main service object with cached data access methods
 */
const DataService = {
    /**
     * Get all users with caching
     */
    getUsers() {
        return getData('Users', true, true);
    },

    /**
     * Get user by username
     */
    getUserByUsername(username) {
        const users = this.getUsers();
        const index = buildUserIndex(users);
        return index.byUsername[String(username)] || null;
    },

    /**
     * Get all madrasahs (normalized and cached)
     */
    getMadrasahs() {
        return CacheManager.getOrFetch(
            'madrasahs_normalized',
            () => {
                const raw = getData('Madrasahs', true, true);
                return normalizeMadrasahData(raw);
            },
            true
        );
    },

    /**
     * Get madrasah by ID
     */
    getMadrasahById(madrasahId) {
        const madrasahs = this.getMadrasahs();
        const index = buildMadrasahIndex(madrasahs);
        return index.byId[String(madrasahId)] || null;
    },

    /**
     * Get madrasahs by district
     */
    getMadrasahsByDistrict(district) {
        const madrasahs = this.getMadrasahs();
        const index = buildMadrasahIndex(madrasahs);
        return index.byDistrict[String(district)] || [];
    },

    /**
     * Get madrasahs by province
     */
    getMadrasahsByProvince(province) {
        const madrasahs = this.getMadrasahs();
        const index = buildMadrasahIndex(madrasahs);
        return index.byProvince[String(province)] || [];
    },

    /**
     * Get madrasahs for a user based on their role
     */
    getMadrasahsForUser(user) {
        if (!user) return [];

        const madrasahs = this.getMadrasahs();
        const role = user.role || 'district';
        const scope = user.scope || '';
        const username = user.username || '';

        // National: all madrasahs
        if (role === 'national') {
            return madrasahs;
        }

        // Province: filter by province
        if (role === 'province') {
            return this.getMadrasahsByProvince(scope);
        }

        // Madrasah: only their own
        if (role === 'madrasah') {
            const madrasah = this.getMadrasahById(username);
            return madrasah ? [madrasah] : [];
        }

        // Enum/Fasda: filter by assigned_madrasahs
        if (role === 'enum' || role === 'fasda') {
            const assignedIds = (user.assigned_madrasahs || '')
                .split(',')
                .map(id => id.trim())
                .filter(id => id.length > 0);

            const index = buildMadrasahIndex(madrasahs);
            return assignedIds
                .map(id => index.byId[id])
                .filter(m => m !== undefined);
        }

        // Default: District
        return this.getMadrasahsByDistrict(scope);
    },

    /**
     * Get all submissions with caching
     */
    getSubmissions() {
        return getData('Submissions', true, true);
    },

    /**
     * Get submission by ID
     */
    getSubmissionById(submissionId) {
        const submissions = this.getSubmissions();
        const index = buildSubmissionIndex(submissions);
        return index.byId[String(submissionId)] || null;
    },

    /**
     * Get submissions by madrasah ID
     */
    getSubmissionsByMadrasah(madrasahId) {
        const submissions = this.getSubmissions();
        const index = buildSubmissionIndex(submissions);
        return index.byMadrasahId[String(madrasahId)] || [];
    },

    /**
     * Get submissions for a user (based on accessible madrasahs)
     */
    getSubmissionsForUser(user) {
        if (!user) return [];

        const madrasahs = this.getMadrasahsForUser(user);
        const madrasahIds = madrasahs.map(m => String(m.madrasah_id));

        // For national/province: don't return submissions (only stats)
        const role = user.role || 'district';
        if (role === 'national' || role === 'province') {
            return [];
        }

        // For others: filter submissions
        const submissions = this.getSubmissions();
        const index = buildSubmissionIndex(submissions);

        const result = [];
        madrasahIds.forEach(mid => {
            const subs = index.byMadrasahId[mid] || [];
            result.push(...subs);
        });

        return result;
    },

    /**
     * Get madrasahs with statistics
     */
    getMadrasahsWithStats(madrasahs) {
        const submissions = this.getSubmissions();
        const submissionIndex = buildSubmissionIndex(submissions);

        return madrasahs.map(m => {
            const mid = String(m.madrasah_id);
            const stats = submissionIndex.stats[mid];

            return {
                ...m,
                submission_count: stats?.count || 0,
                last_submission: stats?.last
                    ? new Date(stats.last).toISOString()
                    : null
            };
        });
    },

    /**
     * Get all forms with caching
     */
    getForms() {
        return getData('Forms', true, true);
    },

    /**
     * Get forms as a map (form_id -> yaml_definition)
     */
    getFormsMap() {
        return CacheManager.getOrFetch(
            'forms_map',
            () => {
                const formsMap = {};
                const dbForms = this.getForms();

                dbForms.forEach(f => {
                    formsMap[f.form_id] = f.yaml_definition;
                });

                // Fallback to code definitions if DB empty
                if (Object.keys(formsMap).length === 0) {
                    const fileForms = getFormDefinitions();
                    Object.keys(fileForms).forEach(k => {
                        formsMap[k] = fileForms[k];
                    });
                } else {
                    // Merge with latest code definitions
                    const fileForms = getFormDefinitions();
                    Object.keys(fileForms).forEach(k => {
                        formsMap[k] = fileForms[k];
                    });
                }

                return formsMap;
            },
            true
        );
    },

    /**
     * Get all survey tokens with caching
     */
    getTokens() {
        return getData('Survey_Tokens', true, true);
    },

    /**
     * Get tokens for a user
     */
    getTokensForUser(username) {
        const tokens = this.getTokens();
        const scriptProps = PropertiesService.getScriptProperties();
        const deploymentUrl = scriptProps.getProperty('DEPLOYMENT_URL');
        const baseUrl = deploymentUrl || ScriptApp.getService().getUrl();

        return tokens
            .filter(t => String(t.created_by) === String(username) && t.status !== 'CLOSED')
            .map(t => ({
                token: t.token,
                type: t.type,
                form_id: t.form_id,
                role_target: t.role_target,
                target_scope: t.target_scope,
                created_at: t.start_time,
                expires_at: t.end_time,
                max_usages: t.max_usages,
                current_usages: t.current_usages,
                status: t.status,
                url: `${baseUrl}?survey_token=${t.token}`
            }));
    },

    /**
     * Invalidate madrasah cache (call after madrasah data changes)
     */
    invalidateMadrasahCache() {
        CacheManager.invalidate('madrasahs_normalized');
        CacheManager.invalidate('sheet_Madrasahs');
    },

    /**
     * Invalidate forms cache (call after form changes)
     */
    invalidateFormsCache() {
        CacheManager.invalidate('forms_map');
        CacheManager.invalidate('sheet_Forms');
    }
};
