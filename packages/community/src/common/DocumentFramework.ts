// ── Document Framework ────────────────────────────────────────────────────────
//
// Reusable types for governing documents (constitution, bylaws, charters, etc.)
// Articles contain sections whose body prose may embed {paramKey} slots that
// render as live parameter values in the UI.

export interface DocumentSection {
    /** Hierarchical id, e.g. "I.1", "IV.2" */
    id:             string;
    title?:         string;
    /** Prose text. May contain {paramKey} slots for live parameter embedding. */
    body:           string;
    /** Keys extracted from {paramKey} slots in body. Stored for quick lookup. */
    paramKeys:      string[];
    /** Authority level required to amend this section's prose. */
    amendAuthority: string;
}

export interface DocumentArticle {
    /** Roman numeral string, e.g. "I", "II", "VII" */
    number:    string;
    title:     string;
    preamble?: string;
    sections:  DocumentSection[];
}

export interface GoverningDocument {
    id:        string;
    /** "constitution" | "bylaw" | "charter" */
    type:      string;
    title:     string;
    preamble?: string;
    articles:  DocumentArticle[];
    adoptedAt: string;
    version:   number;
    /**
     * null = assembly-scope (universal).
     * A pool/domain id = this bylaw belongs to that body and may only be
     * created or amended by a motion from that body (or the assembly).
     */
    scope:     string | null;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

/**
 * Extract all {paramKey} tokens from prose, returning a deduped array of keys.
 */
export function extractParamKeys(body: string): string[] {
    const seen = new Set<string>();
    const re = /\{([^}]+)\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(body)) !== null) {
        seen.add(m[1]);
    }
    return [...seen];
}
