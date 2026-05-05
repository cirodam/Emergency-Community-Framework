/**
 * Thin HTTP client for calling the community backend from the atheneum service.
 *
 * Used for:
 *   1. Looking up the Teachers leader pool ID at startup (cached).
 *   2. Creating governance motions on behalf of instructors when they submit
 *      a session for approval (their Bearer token is forwarded so they are
 *      recorded as the proposer).
 */
export class CommunityClient {
    private static instance: CommunityClient;
    private teachersPoolId: string | null = null;

    private constructor() {}

    static getInstance(): CommunityClient {
        if (!CommunityClient.instance) CommunityClient.instance = new CommunityClient();
        return CommunityClient.instance;
    }

    private url(): string {
        return (process.env.COMMUNITY_URL ?? "http://localhost:3002").replace(/\/$/, "");
    }

    /** Returns the Teachers leader pool ID, fetching from community on first call. */
    async getTeachersPoolId(): Promise<string | null> {
        if (this.teachersPoolId) return this.teachersPoolId;
        try {
            const res = await fetch(`${this.url()}/api/pools`);
            if (!res.ok) return null;
            const pools = await res.json() as { id: string; name: string }[];
            const teachers = pools.find(p => p.name === "Teachers");
            this.teachersPoolId = teachers?.id ?? null;
        } catch (err) {
            console.error("[atheneum] CommunityClient.getTeachersPoolId failed:", err);
        }
        return this.teachersPoolId;
    }

    /**
     * Create a governance motion on the community backend.
     *
     * The instructor's Bearer token is forwarded so the motion is attributed
     * to them as the proposer. Returns the new motion ID on success.
     */
    async createMotion(bearerToken: string, params: {
        title:       string;
        description: string;
        body:        string;
        parentId?:   string | null;
    }): Promise<string | null> {
        try {
            const res = await fetch(`${this.url()}/api/motions`, {
                method:  "POST",
                headers: {
                    "Content-Type":  "application/json",
                    "Authorization": `Bearer ${bearerToken}`,
                },
                body: JSON.stringify(params),
            });
            if (!res.ok) {
                const text = await res.text();
                console.error(`[atheneum] createMotion failed ${res.status}: ${text}`);
                return null;
            }
            const data = await res.json() as { id: string };
            return data.id;
        } catch (err) {
            console.error("[atheneum] CommunityClient.createMotion error:", err);
            return null;
        }
    }
}
