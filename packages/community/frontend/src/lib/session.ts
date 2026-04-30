import { writable } from "svelte/store";
import type { PersonDto } from "./api.js";

export interface SessionData {
    personId: string;
    firstName: string;
    lastName: string;
    handle: string;
    phone: string | null;
    hasPassword: boolean;
    isSteward: boolean;
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
                isSteward:   person.isSteward,
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

export type Page = "profile" | "directory" | "constitution" | "settings" | "domains" | "domain" | "unit" | "leadership" | "assembly" | "pool" | "motion" | "applications" | "how-it-works" | "budget" | "associations" | "association" | "add-person" | "locations" | "proposals" | "proposal" | "nodes" | "central-bank" | "social-insurance" | "vacancies" | "nominations" | "connections" | "growth" | "schedule";

function createPageStore() {
    const { subscribe, set } = writable<Page>("profile");
    return { subscribe, go: (page: Page) => set(page) };
}

export const currentPage = createPageStore();

/** ID of the domain currently being viewed in the domain detail page. */
export const selectedDomainId = writable<string | null>(null);

/** ID of the unit currently being viewed in the unit detail page. */
export const selectedUnitId = writable<string | null>(null);

/** ID of the association currently being viewed in the association detail page. */
export const selectedAssociationId = writable<string | null>(null);

/** ID of the proposal currently being viewed in the proposal detail page. */
export const selectedProposalId = writable<string | null>(null);

/** ID of the pool currently being viewed in the pool detail page. */
export const selectedPoolId = writable<string | null>(null);

/** ID of the motion currently being viewed in the motion detail page. */
export const selectedMotionId = writable<string | null>(null);
