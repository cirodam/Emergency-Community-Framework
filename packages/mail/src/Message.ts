export interface Message {
    id:           string;
    threadId:     string;
    fromPersonId: string;
    toPersonId:   string;
    subject:      string;
    body:         string;
    sentAt:       string; // ISO 8601
    readAt:       string | null;
    deletedBySender:    boolean;
    deletedByRecipient: boolean;
}
