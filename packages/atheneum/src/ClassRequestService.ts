import { ClassRequest, createClassRequest } from "./ClassRequest.js";
import { ClassRequestLoader } from "./ClassRequestLoader.js";

export class ClassRequestService {
    private static instance: ClassRequestService;
    private requests: Map<string, ClassRequest> = new Map();
    private loader!: ClassRequestLoader;

    private constructor() {}

    static getInstance(): ClassRequestService {
        if (!ClassRequestService.instance) ClassRequestService.instance = new ClassRequestService();
        return ClassRequestService.instance;
    }

    init(loader: ClassRequestLoader): void {
        this.loader = loader;
        for (const r of loader.loadAll()) {
            this.requests.set(r.id, r);
        }
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    get(id: string): ClassRequest | undefined {
        return this.requests.get(id);
    }

    /** Returns all open requests sorted by upvote count descending. */
    getAll(): ClassRequest[] {
        return Array.from(this.requests.values())
            .sort((a, b) => b.upvoteIds.length - a.upvoteIds.length);
    }

    // ── Mutations ─────────────────────────────────────────────────────────────

    create(requesterId: string, requesterHandle: string, title: string, description: string): ClassRequest {
        const r = createClassRequest(requesterId, requesterHandle, title, description);
        this.requests.set(r.id, r);
        this.loader.save(r);
        return r;
    }

    upvote(id: string, memberId: string): ClassRequest {
        const r = this.requests.get(id);
        if (!r) throw new Error(`ClassRequest ${id} not found`);
        if (!r.upvoteIds.includes(memberId)) {
            r.upvoteIds.push(memberId);
            this.loader.save(r);
        }
        return r;
    }

    removeUpvote(id: string, memberId: string): ClassRequest {
        const r = this.requests.get(id);
        if (!r) throw new Error(`ClassRequest ${id} not found`);
        r.upvoteIds = r.upvoteIds.filter(mid => mid !== memberId);
        this.loader.save(r);
        return r;
    }

    claim(id: string, instructorHandle: string, sessionId: string): ClassRequest {
        const r = this.requests.get(id);
        if (!r) throw new Error(`ClassRequest ${id} not found`);
        if (r.status !== "open") throw new Error("Request is no longer open");

        r.status    = "claimed";
        r.claimedBy = instructorHandle;
        r.sessionId = sessionId;
        this.loader.save(r);
        return r;
    }

    fulfill(id: string): ClassRequest {
        const r = this.requests.get(id);
        if (!r) throw new Error(`ClassRequest ${id} not found`);
        r.status = "fulfilled";
        this.loader.save(r);
        return r;
    }
}
