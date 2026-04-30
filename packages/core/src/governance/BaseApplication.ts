export type ApplicationStatus =
    | "draft"
    | "submitted"
    | "under_review"
    | "approved"
    | "rejected";

const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
    draft:        ["submitted"],
    submitted:    ["under_review"],
    under_review: ["approved", "rejected"],
    approved:     [],
    rejected:     [],
};

/** Fields shared by every inter-node membership application. */
export interface BaseApplication {
    id:         string;
    status:     ApplicationStatus;
    submittedAt: string;       // ISO 8601
    reviewedAt:  string | null;
    reviewNote:  string | null;
    memberId:    string | null;
}

/**
 * Validate and apply an application status transition in place.
 * Throws if the transition is not permitted.
 * The caller is responsible for persisting the updated application.
 */
export function advanceApplication<T extends BaseApplication>(
    app:        T,
    status:     Extract<ApplicationStatus, "under_review" | "approved" | "rejected">,
    reviewNote: string | null = null,
    memberId:   string | null = null,
): T {
    if (!ALLOWED_TRANSITIONS[app.status].includes(status)) {
        throw new Error(
            `Cannot transition application from "${app.status}" to "${status}"`,
        );
    }
    app.status     = status;
    app.reviewedAt = new Date().toISOString();
    app.reviewNote = reviewNote;
    if (memberId) app.memberId = memberId;
    return app;
}
