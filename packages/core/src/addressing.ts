/**
 * Addressing utilities for the ECF handle-based addressing scheme.
 *
 * Format: [account@][entity@]community[@federation]
 * Segments are separated by "@" and read left-to-right from most-specific to least.
 *
 * Examples:
 *   "savings@alice@riverside"   → account=savings, entity=alice, community=riverside
 *   "alice@riverside"           → entity=alice, community=riverside (primary account)
 *   "treasury@riverside"        → entity=treasury (institutional), community=riverside
 *   "alice"                     → entity=alice (local context only)
 */

export interface ParsedAddress {
    /** Account handle (e.g. "savings", "household"). Absent = primary account. */
    account?: string;
    /** Person / association / org handle within the community. */
    entity?: string;
    /** Community handle. */
    community?: string;
    /** Federation handle. */
    federation?: string;
}

const HANDLE_RE = /^[a-z0-9_]+$/;

export function isValidHandle(s: string): boolean {
    return HANDLE_RE.test(s);
}

/**
 * Parse a handle-based address string into its constituent segments.
 * All segments are validated against the allowed charset `[a-z0-9_]`.
 * Throws if any segment is empty or contains invalid characters.
 */
export function parseAddress(addr: string): ParsedAddress {
    if (typeof addr !== "string" || !addr.trim()) {
        throw new Error("Address must be a non-empty string");
    }
    const parts = addr.trim().split("@");
    if (parts.length > 4) {
        throw new Error(`Address has too many segments (max 4): "${addr}"`);
    }
    for (const part of parts) {
        if (!part) throw new Error(`Address contains an empty segment: "${addr}"`);
        if (!HANDLE_RE.test(part)) {
            throw new Error(`Address segment "${part}" contains invalid characters (allowed: a-z 0-9 _)`);
        }
    }

    // Assign segments from left (most specific) to right (least specific)
    if (parts.length === 1) {
        return { entity: parts[0] };
    }
    if (parts.length === 2) {
        return { entity: parts[0], community: parts[1] };
    }
    if (parts.length === 3) {
        return { account: parts[0], entity: parts[1], community: parts[2] };
    }
    // 4 segments
    return { account: parts[0], entity: parts[1], community: parts[2], federation: parts[3] };
}
