import { makeLogEntry, type CommunityLogEntry, type CommunityLogType } from "./CommunityLog.js";
import { CommunityLogLoader } from "./CommunityLogLoader.js";

export class CommunityLogService {
    private static instance: CommunityLogService;
    private loader!: CommunityLogLoader;

    private constructor() {}

    static getInstance(): CommunityLogService {
        if (!CommunityLogService.instance) CommunityLogService.instance = new CommunityLogService();
        return CommunityLogService.instance;
    }

    init(loader: CommunityLogLoader): void {
        this.loader = loader;
    }

    write(
        type:    CommunityLogType,
        summary: string,
        opts:    { actorId?: string | null; refId?: string | null; occurredAt?: string } = {},
    ): void {
        const entry = makeLogEntry(type, summary, opts);
        this.loader.append(entry);
    }

    recent(limit = 50, before?: string): CommunityLogEntry[] {
        return this.loader.load(limit, before);
    }
}
