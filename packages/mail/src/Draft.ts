export interface Draft {
    id:          string;
    personId:    string;
    toHandles:   string[];   // recipient handles (was toPersonIds)
    subject:     string;
    body:        string;
    updatedAt:   string;
}
