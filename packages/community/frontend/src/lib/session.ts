import { writable } from "svelte/store";
import type { PersonDto } from "./api.js";

export interface SessionData {
    personId: string;
    firstName: string;
    lastName: string;
    handle: string;
    phone: string | null;
    hasPassword: boolean;
    /** base64url-encoded PersonCredential — attached as Bearer token on every API call. */
    token: string;
}

const SESSION_KEY = "ecf_community_session";
const TOKEN_KEY   = "ecf_community_token";

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

        login(person: PersonDto & { token: string }): void {
            const data: SessionData = {
                personId:    person.id,
                firstName:   person.firstName,
                lastName:    person.lastName,
                handle:      person.handle,
                phone:       person.phone,
                hasPassword: person.hasPassword,
                token:       person.token,
            };
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
            sessionStorage.setItem(TOKEN_KEY, person.token);
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
            set(updated);
        },
    };
}

export const session = createSessionStore();

export type Page = "profile" | "directory" | "constitution" | "economy" | "settings" | "domains" | "domain" | "governance";

function createPageStore() {
    const { subscribe, set } = writable<Page>("profile");
    return { subscribe, go: (page: Page) => set(page) };
}

export const currentPage = createPageStore();

/** ID of the domain currently being viewed in the domain detail page. */
export const selectedDomainId = writable<string | null>(null);
