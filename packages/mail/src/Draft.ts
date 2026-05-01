export interface Draft {
    id:          string;
    personId:    string;
    toPersonIds: string[];
    subject:     string;
    body:        string;
    updatedAt:   string;
}
