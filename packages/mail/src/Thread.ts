export interface Thread {
    id:             string;
    subject:        string;
    participantIds: string[];
    lastMessageAt:  string; // ISO 8601
}
