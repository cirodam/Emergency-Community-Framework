/**
 * Per-participant delivery state for a message.
 *
 * One receipt exists for every recipient (toPersonIds) of each message.
 * The sender has no receipt — use Message.fromPersonId to track outbox.
 */
export interface MessageReceipt {
    id:        string;   // receiptId (uuid)
    messageId: string;
    personId:  string;
    readAt:    string | null;  // ISO 8601, null = unread
    deleted:   boolean;
}
