import { writable } from "svelte/store";
import type { PersonDto } from "./api.js";

export interface SessionData {
    personId: string;
    firstName: string;
    lastName: string;
    handle: string;
    phone: string | null;
    hasPassword: boolean;
}

const SESSION_KEY = "ecf_community_session";

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

        login(person: PersonDto): void {
            const data: SessionData = {
                personId:    person.id,
                firstName:   person.firstName,
                lastName:    person.lastName,
                handle:      person.handle,
                phone:       person.phone,
                hasPassword: person.hasPassword,
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

export type Page = "profile" | "directory" | "constitution" | "settings";

function createPageStore() {
    const { subscribe, set } = writable<Page>("profile");
    return { subscribe, go: (page: Page) => set(page) };
}

export const currentPage = createPageStore();
