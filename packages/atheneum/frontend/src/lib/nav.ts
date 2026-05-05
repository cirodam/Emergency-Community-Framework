import { writable } from "svelte/store";

export type Page =
    | "atheneum"
    | "session"
    | "course"
    | "create-session"
    | "requests"
    | "my-sessions";

export const currentPage      = writable<Page>("atheneum");
export const selectedSessionId = writable<string | null>(null);
export const selectedCourseId  = writable<string | null>(null);
