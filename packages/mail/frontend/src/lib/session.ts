import { writable, derived } from "svelte/store";

export interface SessionData {
    personId:  string;
    firstName: string;
    lastName:  string;
    handle:    string;
    token:     string;
    appPermissions: Record<string, string[]>;
}

export type Page = "inbox" | "outbox" | "thread" | "compose" | "moderation";

const SESSION_KEY = "ecf_mail_session";
const TOKEN_KEY   = "ecf_mail_token";

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

/** Derived: current mail permission levels. */
const mailPerms = derived(session, s => s?.appPermissions?.["mail"] ?? []);
export const isModerator = derived(mailPerms, p => p.includes("moderator"));

// ── Page routing ──────────────────────────────────────────────────────────────

function createPageStore() {
    const { subscribe, set } = writable<Page>("inbox");
    let _current: Page = "inbox";

    return {
        subscribe,
        go(p: Page): void {
            _current = p;
            set(p);
        },
        current(): Page { return _current; },
    };
}

export const currentPage = createPageStore();
export const selectedThreadId = writable<string | null>(null);
