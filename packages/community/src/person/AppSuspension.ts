export interface AppSuspension {
    id:          string;
    personId:    string;
    app:         string;       // "bank" | "market" | "mail" | ...
    reason:      string;
    suspendedAt: string;       // ISO 8601
    suspendedBy: string;       // steward personId
}
