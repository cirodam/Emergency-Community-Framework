import { FileStore } from "@ecf/core";
import { Proposal, ProposalStatus, ProposalVote } from "./Proposal.js";

export class ProposalLoader {
    private store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(proposal: Proposal): void {
        this.store.write(proposal.id, {
            id:              proposal.id,
            type:            proposal.type,
            poolId:          proposal.poolId,
            proposerId:      proposal.proposerId,
            proposerHandle:  proposal.proposerHandle,
            title:           proposal.title,
            description:     proposal.description,
            payload:         proposal.payload,
            approvalsNeeded: proposal.approvalsNeeded,
            createdAt:       proposal.createdAt,
            expiresAt:       proposal.expiresAt,
            status:          proposal.status,
            votes:           proposal.votes,
            executedAt:      proposal.executedAt,
            outcomeNote:     proposal.outcomeNote,
        });
    }

    loadAll(): Proposal[] {
        const records = this.store.readAll<Record<string, unknown>>();
        return records.map(r => {
            const ttlDays = Math.ceil(
                (new Date(r.expiresAt as string).getTime() - new Date(r.createdAt as string).getTime())
                / (1000 * 60 * 60 * 24)
            );
            const p = new Proposal({
                id:              r.id              as string,
                type:            r.type            as Proposal["type"],
                poolId:          r.poolId          as string,
                proposerId:      r.proposerId      as string,
                proposerHandle:  r.proposerHandle  as string,
                title:           r.title           as string,
                description:     r.description     as string,
                payload:         r.payload         as Record<string, unknown>,
                approvalsNeeded: r.approvalsNeeded as number,
                ttlDays,
                createdAt:       r.createdAt       as string,
            });
            p.status      = r.status      as ProposalStatus;
            p.votes       = (r.votes      as ProposalVote[]) ?? [];
            p.executedAt  = r.executedAt  as string | null;
            p.outcomeNote = (r.outcomeNote as string) ?? "";
            return p;
        });
    }

    delete(id: string): boolean {
        return this.store.delete(id);
    }
}
