import { writable } from "svelte/store";

export interface FederationSessionData {
    token:             string;
    personId:          string;
    handle:            string;
    communityHandle:   string;
    communityName:     string;
    communityMemberId: string;
    expiresAt:         string;
}

const SESSION_KEY = "ecf_federation_session";
const TOKEN_KEY   = "ecf_federation_token";

function loadFromStorage(): FederationSessionData | null {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw) as FederationSessionData;
        // Discard expired sessions
        if (new Date(data.expiresAt) < new Date()) {
            sessionStorage.removeItem(SESSION_KEY);
            sessionStorage.removeItem(TOKEN_KEY);
            return null;
        }
        return data;
    } catch {
        return null;
    }
}

export function getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
}

function createSessionStore() {
    const { subscribe, set } = writable<FederationSessionData | null>(loadFromStorage());

    return {
        subscribe,

        login(data: FederationSessionData): void {
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
