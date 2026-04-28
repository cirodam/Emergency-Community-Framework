/**
 * Session store — persisted to sessionStorage so it survives page refreshes
 * but clears when the tab closes (appropriate for a banking app).
 */

import { writable } from "svelte/store";

export interface SessionData {
    personId: string;
    handle: string;
    displayName: string;
    /** base64url-encoded PersonCredential — sent as Bearer token on every API call. */
    token: string;
    primaryAccountId: string;
}

const SESSION_KEY = "ecf_bank_session";
const TOKEN_KEY   = "ecf_bank_token";

function loadFromStorage(): SessionData | null {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        return raw ? (JSON.parse(raw) as SessionData) : null;
    } catch {
        return null;
    }
}

/** Returns the current credential token, or null if not logged in. */
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

        refresh(updates: Partial<SessionData>): void {
            const current = loadFromStorage();
            if (!current) return;
            const updated = { ...current, ...updates };
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
            if (updates.token) sessionStorage.setItem(TOKEN_KEY, updates.token);
            set(updated);
        },
    };
}

export const session = createSessionStore();

/** Derived: which page to show — simple string-based router */
export type Page = "login" | "accounts" | "account" | "send" | "history" | "settings";

function createPageStore() {
    const { subscribe, set } = writable<Page>("accounts");
    return {
        subscribe,
        go: (page: Page) => set(page),
    };
}

export const currentPage = createPageStore();

/** The account currently being viewed in the detail page (not persisted). */
export const selectedAccountId = writable<string>("");
