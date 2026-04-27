export interface Message {
    id:            string;
    threadId:      string;
    fromPersonId:  string;
    toPersonIds:   string[];   // all direct recipients (excludes sender)
    subject:       string;
    body:          string;
    sentAt:        string;     // ISO 8601
}
