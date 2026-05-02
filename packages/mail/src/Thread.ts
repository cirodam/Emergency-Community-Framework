export interface Thread {
    id:               string;
    subject:          string;
    participantIds:   string[];
    participantHandles: string[]; // parallel array of handles for display
    lastMessageAt:    string; // ISO 8601
}
