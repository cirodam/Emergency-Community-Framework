/**
 * Session store — persisted to sessionStorage so it survives page refreshes
 * but clears when the tab closes (appropriate for a banking app).
 *
 * Usage:
 *   import { session, login, logout } from './session.js';
 *
 *   // read (reactive in Svelte via $session)
 *   if ($session) { ... }
 *
 *   // write
 *   login(ownerDto, primaryAccountId);
 *   logout();
 */

import { writable } from "svelte/store";
import type { OwnerDto } from "./api.js";

export interface SessionData {
    ownerId: string;
    displayName: string;
    phone: string | undefined;
    primaryAccountId: string;
    hasPin: boolean;
    hasPassword: boolean;
}

const SESSION_KEY = "ecf_bank_session";

function loadFromStorage(): SessionData | null {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        return raw ? (JSON.parse(raw) as SessionData) : null;
    } catch {
        return null;
    }
}

function createSessionStore() {
    const { subscribe, set } = writable<SessionData | null>(loadFromStorage());

    return {
        subscribe,

        login(owner: OwnerDto, primaryAccountId: string): void {
            const data: SessionData = {
                ownerId:          owner.ownerId,
                displayName:      owner.displayName,
                phone:            owner.phone,
                primaryAccountId,
                hasPin:           owner.hasPin,
                hasPassword:      owner.hasPassword,
            };
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
            set(data);
        },

        logout(): void {
            sessionStorage.removeItem(SESSION_KEY);
            set(null);
        },

        refresh(updates: Partial<SessionData>): void {
            const current = loadFromStorage();
            if (!current) return;
            const updated = { ...current, ...updates };
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
            set(updated);
        },
    };
}

export const session = createSessionStore();

/** Derived: which page to show — simple string-based router */
export type Page = "login" | "account" | "send" | "history" | "settings";

function createPageStore() {
    const { subscribe, set } = writable<Page>("account");
    return {
        subscribe,
        go: (page: Page) => set(page),
    };
}

export const currentPage = createPageStore();
