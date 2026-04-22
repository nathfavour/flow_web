import { Client, TablesDB, Storage, Account, Realtime } from "appwrite";
import { APPWRITE_CONFIG } from "./config";

const client = new Client();

const initAppwrite = () => {
    if (typeof APPWRITE_CONFIG === 'undefined') return;
    
    // Use the api subdomain for the endpoint
    const endpoint = `https://api.kylrix.space/v1`;
    client.setEndpoint(endpoint);

    if (APPWRITE_CONFIG.PROJECT_ID) {
        client.setProject(APPWRITE_CONFIG.PROJECT_ID);
    }
};

initAppwrite();

export const tablesDB = new TablesDB(client);
export const storage = new Storage(client);
export const account = new Account(client);
export const realtime = new Realtime(client);
export { client };

const CURRENT_USER_CACHE_KEY = 'kylrix_flow_current_user_v2';
const CURRENT_USER_CACHE_TTL = 5 * 60 * 1000;
const CURRENT_USER_REQUEST_TIMEOUT = 8000;
const CURRENT_USER_EVENT = 'kylrix-flow-current-user-changed';

type CachedCurrentUser = {
    user: any | null;
    expiresAt: number;
};

let currentUserCache: CachedCurrentUser | null = null;
let currentUserInFlight: Promise<any | null> | null = null;
const originalAccountGet = account.get.bind(account);

const readPersistentCurrentUserCache = (): CachedCurrentUser | null => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(CURRENT_USER_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as CachedCurrentUser;
        if (!parsed || typeof parsed.expiresAt !== 'number' || parsed.expiresAt <= Date.now()) {
            window.localStorage.removeItem(CURRENT_USER_CACHE_KEY);
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
};

const writePersistentCurrentUserCache = (cache: CachedCurrentUser | null) => {
    if (typeof window === 'undefined') return;
    try {
        if (!cache) {
            window.localStorage.removeItem(CURRENT_USER_CACHE_KEY);
            return;
        }
        window.localStorage.setItem(CURRENT_USER_CACHE_KEY, JSON.stringify(cache));
    } catch {
        // Ignore persistence failures.
    }
};

const clearCurrentUserCache = () => {
    currentUserCache = null;
    writePersistentCurrentUserCache(null);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(CURRENT_USER_EVENT, { detail: null }));
    }
};

const getCachedCurrentUser = () => {
    if (currentUserCache && currentUserCache.expiresAt > Date.now()) return currentUserCache.user;
    const persistent = readPersistentCurrentUserCache();
    if (!persistent) return null;
    currentUserCache = persistent;
    return persistent.user;
};

const setCachedCurrentUser = (user: any | null) => {
    const cache: CachedCurrentUser = { user, expiresAt: Date.now() + CURRENT_USER_CACHE_TTL };
    currentUserCache = cache;
    writePersistentCurrentUserCache(cache);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(CURRENT_USER_EVENT, { detail: user }));
    }
    return user;
};

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => {
            setTimeout(() => reject(new Error('Current user request timed out')), timeoutMs);
        }),
    ]);
};

const patchAccountMethod = (methodName: string) => {
    const original = (account as any)[methodName];
    if (typeof original !== 'function') return;
    (account as any)[methodName] = async (...args: any[]) => {
        const result = await original.apply(account, args);
        clearCurrentUserCache();
        return result;
    };
};

patchAccountMethod('deleteSession');
patchAccountMethod('deleteSessions');
patchAccountMethod('updatePrefs');
patchAccountMethod('updateName');
patchAccountMethod('updateEmail');
patchAccountMethod('updatePhone');
patchAccountMethod('updatePassword');

(account as any).get = async () => {
    if (currentUserCache && currentUserCache.expiresAt > Date.now()) {
        return currentUserCache.user;
    }
    const persistent = readPersistentCurrentUserCache();
    if (persistent) {
        currentUserCache = persistent;
        return persistent.user;
    }
    if (currentUserInFlight) return currentUserInFlight;

    currentUserInFlight = withTimeout(originalAccountGet(), CURRENT_USER_REQUEST_TIMEOUT)
        .then((user) => setCachedCurrentUser(user))
        .catch(() => {
            clearCurrentUserCache();
            return null;
        })
        .finally(() => {
            currentUserInFlight = null;
        });

    return currentUserInFlight;
};

import { Query } from "appwrite";

export const APPWRITE_DATABASE_ID = APPWRITE_CONFIG.DATABASES.VAULT;
export const APPWRITE_COLLECTION_KEYCHAIN_ID = APPWRITE_CONFIG.TABLES.VAULT.KEYCHAIN;

export class AppwriteService {
    static async hasMasterpass(userId: string): Promise<boolean> {
        try {
            const FLOW_DB = APPWRITE_CONFIG.DATABASES.FLOW;
            const USERS_TABLE = 'users';

            const res = await tablesDB.listRows<any>({
                databaseId: FLOW_DB,
                tableId: USERS_TABLE,
                queries: [Query.equal("userId", userId)]
            });

            if (res.total > 0 && res.rows[0].hasMasterpass) {
                return true;
            }
            const entries = await this.listKeychainEntries(userId);
            return entries.some(e => e.type === 'password');
        } catch (_e: unknown) {
            console.error('hasMasterpass error', _e);
            return false;
        }
    }

    static async listKeychainEntries(userId: string): Promise<any[]> {
        try {
            const res = await tablesDB.listRows<any>({
                databaseId: APPWRITE_DATABASE_ID,
                tableId: APPWRITE_COLLECTION_KEYCHAIN_ID,
                queries: [Query.equal("userId", userId)]
            });
            return res.rows;
        } catch (_e: unknown) {
            console.error('listKeychainEntries error', _e);
            return [];
        }
    }

    static async createKeychainEntry(data: any): Promise<any> {
        const { ID } = await import("appwrite");
        return await tablesDB.createRow(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_KEYCHAIN_ID,
            ID.unique(),
            data
        );
    }

    static async deleteKeychainEntry(id: string): Promise<void> {
        await tablesDB.deleteRow(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_KEYCHAIN_ID,
            id
        );
    }

    static async setMasterpassFlag(userId: string, email: string): Promise<void> {
        try {
            const FLOW_DB = APPWRITE_CONFIG.DATABASES.FLOW;
            const USERS_TABLE = 'users'; // Standard user table in Flow

            const res = await tablesDB.listRows<any>({
                databaseId: FLOW_DB,
                tableId: USERS_TABLE,
                queries: [Query.equal("userId", userId)]
            });

            if (res.total > 0) {
                await tablesDB.updateRow(FLOW_DB, USERS_TABLE, res.rows[0].$id, {
                    hasMasterpass: true
                });
            } else {
                const { ID } = await import("appwrite");
                await tablesDB.createRow(FLOW_DB, USERS_TABLE, ID.unique(), {
                    userId,
                    email,
                    hasMasterpass: true
                });
            }
        } catch (_e: unknown) {
            console.error('setMasterpassFlag error', _e);
        }
    }
}

export function getFilePreview(bucketId: string, fileId: string, width: number = 64, height: number = 64) {
    return storage.getFilePreview(bucketId, fileId, width, height);
}

export function getProfilePicturePreview(fileId: string, width: number = 64, height: number = 64) {
    return getFilePreview("profile_pictures", fileId, width, height);
}

export async function getCurrentUser(force = false): Promise<any | null> {
    if (!force) {
        if (currentUserCache && currentUserCache.expiresAt > Date.now()) {
            return currentUserCache.user;
        }
        const persistent = readPersistentCurrentUserCache();
        if (persistent) {
            currentUserCache = persistent;
            return persistent.user;
        }
    }

    if (!force && currentUserInFlight) {
        return currentUserInFlight;
    }

    currentUserInFlight = withTimeout(originalAccountGet(), CURRENT_USER_REQUEST_TIMEOUT)
        .then((user) => setCachedCurrentUser(user))
        .catch(() => {
            clearCurrentUserCache();
            return null;
        })
        .finally(() => {
            currentUserInFlight = null;
        });

    return currentUserInFlight;
}

export function getCurrentUserSnapshot(): any | null {
    if (currentUserCache && currentUserCache.expiresAt > Date.now()) {
        return currentUserCache.user;
    }
    const persistent = readPersistentCurrentUserCache();
    if (!persistent) return null;
    currentUserCache = persistent;
    return persistent.user;
}

export function onCurrentUserChanged(listener: (user: any | null) => void) {
    if (typeof window === 'undefined') return () => {};
    const handle = (event: Event) => {
        listener((event as CustomEvent<any | null>).detail ?? null);
    };
    window.addEventListener(CURRENT_USER_EVENT, handle);
    return () => window.removeEventListener(CURRENT_USER_EVENT, handle);
}

export function invalidateCurrentUserCache() {
    clearCurrentUserCache();
}

// --- USER SESSION ---

// Unified resolver: attempts global session then cookie-based fallback
export async function resolveCurrentUser(req?: { headers: { get(k: string): string | null } } | null): Promise<any | null> {
    const direct = await getCurrentUser();
    if (direct && direct.$id) return direct;
    if (req) {
        const fallback = await getCurrentUserFromRequest(req as any);
        if (fallback && (fallback as any).$id) return fallback;
    }
    return null;
}

// Per-request user fetch using incoming Cookie header
export async function getCurrentUserFromRequest(req: { headers: { get(k: string): string | null } } | null | undefined): Promise<any | null> {
    try {
        if (!req) return null;
        const cookieHeader = req.headers.get('cookie') || req.headers.get('Cookie');
        if (!cookieHeader) return null;

        const res = await fetch(`${APPWRITE_CONFIG.ENDPOINT}/account`, {
            method: 'GET',
            headers: {
                'X-Appwrite-Project': APPWRITE_CONFIG.PROJECT_ID,
                'Cookie': cookieHeader,
                'Accept': 'application/json'
            },
            cache: 'no-store'
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (!data || typeof data !== 'object' || !data.$id) return null;
        return data;
    } catch (_e: unknown) {
        console.error('getCurrentUserFromRequest error', _e);
        return null;
    }
}
