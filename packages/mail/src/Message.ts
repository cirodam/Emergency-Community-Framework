export interface Message {
    id:            string;
    threadId:      string;
    fromPersonId:  string;
    fromHandle:    string;     // handle at send time; "external:handle@community" for cross-community
    toPersonIds:   string[];   // all direct recipients (excludes sender)
    toHandles:     string[];   // parallel array of handles for display
    subject:       string;
    body:          string;
    sentAt:        string;     // ISO 8601
}
