/**
 * Built-in motion effect handlers.
 * Import this module once at startup (in index.ts) to register all effects.
 */

import { effectRegistry } from "../EffectRegistry.js";
import { Constitution } from "../Constitution.js";
import { ConstitutionLoader } from "../ConstitutionLoader.js";
import { LeaderPool } from "../LeaderPool.js";
import { PersonService } from "../../person/PersonService.js";
import { DomainService } from "../../DomainService.js";
import { NominationService } from "../../nomination/NominationService.js";

// ── amend-constitution ────────────────────────────────────────────────────────
// Payload: { parameter: string, newValue: number | boolean }

effectRegistry.register("amend-constitution", {
    label:     "Amend constitution",
    bodyHint:  "referendum",
    validate(raw) {
        if (typeof raw !== "object" || raw === null) return "Payload must be an object";
        const p = raw as Record<string, unknown>;
        if (typeof p.parameter !== "string" || !p.parameter)
            return "payload.parameter must be a non-empty string";
        if (typeof p.newValue !== "number" && typeof p.newValue !== "boolean")
            return "payload.newValue must be a number or boolean";
        return null;
    },
    handler({ motion, payload }) {
        const parameter = payload.parameter as string;
        const newValue  = payload.newValue  as number | boolean;

        const constitution = Constitution.getInstance();
        const oldValue     = constitution.getAll()[parameter]?.value;
        constitution.amend(parameter, newValue, motion.id);
        new ConstitutionLoader().save();

        motion.outcomeNote =
            `Constitution amended: "${parameter}" changed from ${oldValue} to ${newValue} ` +
            `(v${constitution.toDocument().version}).`;
    },
});

// ── suspend-member ────────────────────────────────────────────────────────────
// Payload: { personId: string }

effectRegistry.register("suspend-member", {
    label:    "Suspend member",
    validate(raw) {
        if (typeof raw !== "object" || raw === null) return "Payload must be an object";
        const p = raw as Record<string, unknown>;
        if (typeof p.personId !== "string" || !p.personId) return "payload.personId must be a non-empty string";
        return null;
    },
    handler({ motion, payload }) {
        const personId = payload.personId as string;
        const svc = PersonService.getInstance();
        if (!svc.get(personId)) throw new Error(`Person "${personId}" not found`);
        svc.update(personId, { disabled: true });
        motion.outcomeNote = "Member suspended.";
    },
});

// ── reinstate-member ──────────────────────────────────────────────────────────
// Payload: { personId: string }

effectRegistry.register("reinstate-member", {
    label:    "Reinstate member",
    validate(raw) {
        if (typeof raw !== "object" || raw === null) return "Payload must be an object";
        const p = raw as Record<string, unknown>;
        if (typeof p.personId !== "string" || !p.personId) return "payload.personId must be a non-empty string";
        return null;
    },
    handler({ motion, payload }) {
        const personId = payload.personId as string;
        const svc = PersonService.getInstance();
        if (!svc.get(personId)) throw new Error(`Person "${personId}" not found`);
        svc.update(personId, { disabled: false });
        motion.outcomeNote = "Member reinstated.";
    },
});

// ── add-role ──────────────────────────────────────────────────────────────────
// Creates a new LeaderPool (a named governing group).
// Payload: { name: string, description?: string }

effectRegistry.register("add-role", {
    label:    "Add leadership pool",
    bodyHint: "assembly",
    validate(raw) {
        if (typeof raw !== "object" || raw === null) return "Payload must be an object";
        const p = raw as Record<string, unknown>;
        if (typeof p.name !== "string" || !p.name.trim()) return "payload.name must be a non-empty string";
        return null;
    },
    handler({ motion, payload }) {
        const name        = (payload.name as string).trim();
        const description = typeof payload.description === "string" ? payload.description.trim() : "";
        const pool = new LeaderPool(name, description);
        DomainService.getInstance().createPool(pool);
        motion.outcomeNote = `Leadership pool "${name}" created (id: ${pool.id}).`;
    },
});

// ── remove-role ───────────────────────────────────────────────────────────────
// Deletes an existing LeaderPool by ID.
// Payload: { poolId: string }

effectRegistry.register("remove-role", {
    label:    "Remove leadership pool",
    bodyHint: "assembly",
    validate(raw) {
        if (typeof raw !== "object" || raw === null) return "Payload must be an object";
        const p = raw as Record<string, unknown>;
        if (typeof p.poolId !== "string" || !p.poolId) return "payload.poolId must be a non-empty string";
        return null;
    },
    handler({ motion, payload }) {
        const poolId = payload.poolId as string;
        const pool   = DomainService.getInstance().getPool(poolId);
        if (!pool) throw new Error(`Leadership pool "${poolId}" not found`);
        DomainService.getInstance().deletePool(poolId);
        motion.outcomeNote = `Leadership pool "${pool.name}" removed.`;
    },
});

// ── accept-nomination ─────────────────────────────────────────────────────────
// Confirms a pending nomination and adds the nominee to their pool or role.
// Payload: { nominationId: string }

effectRegistry.register("accept-nomination", {
    label: "Accept nomination",
    validate(raw) {
        if (typeof raw !== "object" || raw === null) return "Payload must be an object";
        const p = raw as Record<string, unknown>;
        if (typeof p.nominationId !== "string" || !p.nominationId)
            return "payload.nominationId must be a non-empty string";
        return null;
    },
    handler({ motion, payload }) {
        const nominationId = payload.nominationId as string;
        const domainSvc    = DomainService.getInstance();

        const n = NominationService.getInstance().confirm(nominationId, motion.id);
        if (!n) throw new Error(`Nomination "${nominationId}" not found or already resolved`);

        if (n.type === "pool" && n.poolId) {
            const pool = domainSvc.getPool(n.poolId);
            if (pool) {
                pool.addPerson(n.nomineeId);
                domainSvc.savePool(pool);
            }
        } else if (n.roleId) {
            const role = domainSvc.getRole(n.roleId);
            if (role) {
                role.memberId = n.nomineeId;
                domainSvc.saveRole(role);
            }
        }

        motion.outcomeNote = `Nomination confirmed. Nominee added to ${n.type === "pool" ? "pool" : "role"}.`;
    },
});
