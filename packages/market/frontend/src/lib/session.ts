import { writable, derived } from "svelte/store";

export interface SessionData {
    personId:  string;
    firstName: string;
    lastName:  string;
    handle:    string;
    token:     string;
    appPermissions: Record<string, string[]>;
}

const SESSION_KEY = "ecf_market_session";
const TOKEN_KEY   = "ecf_market_token";

function loadFromStorage(): SessionData | null {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        return raw ? (JSON.parse(raw) as SessionData) : null;
    } catch {
        return null;
    }
}

export function getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
}

function createSessionStore() {
    const { subscribe, set } = writable<SessionData | null>(loadFromStorage());

    return {
        subscribe,

        login(data: SessionData): void {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
            sessionStorage.setItem(TOKEN_KEY, data.token);
            set(data);
        },

        logout(): void {
            sessionStorage.removeItem(SESSION_KEY);
            sessionStorage.removeItem(TOKEN_KEY);
            set(null);
        },
    };
}

export const session = createSessionStore();

/** Derived: current market permission levels. */
const marketPerms = derived(session, s => s?.appPermissions?.["market"] ?? []);
export const isCoordinator  = derived(marketPerms, p => p.includes("coordinator") || p.includes("admin"));
export const isMarketAdmin  = derived(marketPerms, p => p.includes("admin"));
