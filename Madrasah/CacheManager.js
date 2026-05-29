/**
 * CACHE MANAGER
 * Multi-level caching system for performance optimization
 * 
 * Features:
 * - Request-level cache (in-memory, valid during execution)
 * - Persistent cache (PropertiesService, valid 5 minutes)
 * - Smart invalidation
 * - Cache statistics
 */

/**
 * REQUEST CACHE
 * In-memory cache valid only during current execution context
 */
class RequestCache {
    constructor() {
        this.cache = {};
        this.hits = 0;
        this.misses = 0;
    }

    get(key) {
        if (this.cache.hasOwnProperty(key) && this.cache[key] !== null) {
            this.hits++;
            return this.cache[key];
        }
        this.misses++;
        return null;
    }

    set(key, value) {
        this.cache[key] = value;
    }

    delete(key) {
        delete this.cache[key];
    }

    clear() {
        this.cache = {};
        this.hits = 0;
        this.misses = 0;
    }

    getStats() {
        const total = this.hits + this.misses;
        return {
            hits: this.hits,
            misses: this.misses,
            total: total,
            hitRate: total > 0 ? ((this.hits / total) * 100).toFixed(1) + '%' : '0%'
        };
    }
}

/**
 * PERSISTENT CACHE
 * PropertiesService-based cache valid across executions
 */
class PersistentCache {
    constructor(ttlMinutes = 5) {
        this.props = PropertiesService.getScriptProperties();
        this.ttl = ttlMinutes * 60 * 1000; // Convert to milliseconds
        this.maxSize = 400000; // 400KB (keep under 500KB quota)
    }

    _getCacheKey(key) {
        return `cache_${key}`;
    }

    get(key) {
        try {
            const cacheKey = this._getCacheKey(key);
            const cached = this.props.getProperty(cacheKey);

            if (!cached) {
                return null;
            }

            const entry = JSON.parse(cached);
            const now = Date.now();

            // Check if expired
            if (now - entry.timestamp > this.ttl) {
                this.delete(key);
                return null;
            }

            return entry.data;
        } catch (e) {
            Logger.log(`PersistentCache.get error for key '${key}': ${e.toString()}`);
            return null;
        }
    }

    set(key, value) {
        try {
            const entry = {
                data: value,
                timestamp: Date.now()
            };

            const serialized = JSON.stringify(entry);

            // Check size limit
            if (serialized.length > this.maxSize) {
                Logger.log(`Warning: Cache entry '${key}' too large (${serialized.length} bytes), skipping persistent cache`);
                return false;
            }

            const cacheKey = this._getCacheKey(key);
            this.props.setProperty(cacheKey, serialized);
            return true;
        } catch (e) {
            Logger.log(`PersistentCache.set error for key '${key}': ${e.toString()}`);
            return false;
        }
    }

    delete(key) {
        try {
            const cacheKey = this._getCacheKey(key);
            this.props.deleteProperty(cacheKey);
        } catch (e) {
            Logger.log(`PersistentCache.delete error for key '${key}': ${e.toString()}`);
        }
    }

    clear() {
        try {
            const allProps = this.props.getProperties();
            const cacheKeys = Object.keys(allProps).filter(k => k.startsWith('cache_'));

            cacheKeys.forEach(key => {
                this.props.deleteProperty(key);
            });

            Logger.log(`Cleared ${cacheKeys.length} cache entries`);
        } catch (e) {
            Logger.log(`PersistentCache.clear error: ${e.toString()}`);
        }
    }
}

/**
 * MAIN CACHE MANAGER
 * Coordinates request and persistent caching
 */
const CacheManager = {
    requestCache: new RequestCache(),
    persistentCache: new PersistentCache(5), // 5 minute TTL

    /**
     * Get data from cache or fetch fresh
     * @param {string} key - Cache key
     * @param {function} fetchFn - Function to fetch fresh data if cache miss
     * @param {boolean} usePersistent - Whether to use persistent cache
     * @returns {*} Cached or fresh data
     */
    getOrFetch(key, fetchFn, usePersistent = false) {
        // ✨ CONFIG CHECK: Master switch
        if (typeof CacheConfig !== 'undefined' && !CacheConfig.ENABLED) {
            Logger.log(`[Cache] DISABLED GLOBAL: Fetching fresh for ${key}`);
            return fetchFn();
        }

        // ✨ CONFIG CHECK: Excluded keys
        if (typeof CacheConfig !== 'undefined' && CacheConfig.EXCLUDED_KEYS && CacheConfig.EXCLUDED_KEYS.includes(key)) {
            Logger.log(`[Cache] EXCLUDED: Fetching fresh for ${key}`);
            return fetchFn();
        }

        // Try request cache first (fastest)
        let data = this.requestCache.get(key);
        if (data !== null) {
            return data;
        }

        // Try persistent cache (if enabled)
        if (usePersistent) {
            data = this.persistentCache.get(key);
            if (data !== null) {
                // Store in request cache for subsequent calls
                this.requestCache.set(key, data);
                return data;
            }
        }

        // Cache miss - fetch fresh data
        data = fetchFn();

        // Store in request cache
        this.requestCache.set(key, data);

        // Store in persistent cache (if enabled and not too large)
        if (usePersistent) {
            this.persistentCache.set(key, data);
        }

        return data;
    },

    /**
     * Invalidate cache entry
     * @param {string} key - Cache key to invalidate
     */
    invalidate(key) {
        this.requestCache.delete(key);
        this.persistentCache.delete(key);
    },

    /**
     * Check configuration and invalidate keys based on action
     * @param {string} actionName - Name of the action (e.g., 'ADD_USER')
     */
    checkInvalidation(actionName) {
        if (typeof CacheConfig === 'undefined' || !CacheConfig.INVALIDATION_RULES) return;

        const keys = CacheConfig.INVALIDATION_RULES[actionName];
        if (keys && Array.isArray(keys)) {
            keys.forEach(key => {
                Logger.log(`[Cache] Rule '${actionName}' triggered invalidation of '${key}'`);
                this.invalidate(key);
            });
        }
    },

    /**
     * Invalidate all cache entries
     */
    invalidateAll() {
        this.requestCache.clear();
        this.persistentCache.clear();
    },

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getStats() {
        return {
            request: this.requestCache.getStats()
        };
    },

    /**
     * Log cache statistics
     */
    logStats() {
        const stats = this.getStats();
        Logger.log('=== Cache Statistics ===');
        Logger.log(`Request Cache - Hits: ${stats.request.hits}, Misses: ${stats.request.misses}, Hit Rate: ${stats.request.hitRate}`);
    }
};

/**
 * ADMIN FUNCTION: Clear all caches
 * Can be called from Apps Script editor for manual cache clearing
 */
function clearAllCaches() {
    CacheManager.invalidateAll();
    Logger.log('✅ All caches cleared');
}
