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
import { CalendarService } from "../../calendar/CalendarService.js";
import { BylawLoader } from "../BylawLoader.js";
import { CommunityLogService } from "../../log/CommunityLogService.js";

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

// ── schedule-community-event ──────────────────────────────────────────────────
// Creates a calendar event (one-off or recurring) when the motion passes.
// Payload: {
//   title:            string
//   startAt:          string  (ISO 8601)
//   endAt?:           string  (ISO 8601)
//   allDay?:          boolean
//   description?:     string
//   location?:        string
//   recurrence?:      "daily"|"weekly"|"biweekly"|"monthly"|"yearly"
//   recurrenceEndsAt?: string (ISO 8601)
// }

const VALID_RECURRENCE = new Set(["daily", "weekly", "biweekly", "monthly", "yearly"]);

effectRegistry.register("schedule-community-event", {
    label:    "Schedule community event",
    bodyHint: "assembly",
    validate(raw) {
        if (typeof raw !== "object" || raw === null) return "Payload must be an object";
        const p = raw as Record<string, unknown>;

        if (typeof p.title !== "string" || !p.title.trim())
            return "payload.title must be a non-empty string";

        if (typeof p.startAt !== "string" || isNaN(new Date(p.startAt).getTime()))
            return "payload.startAt must be a valid ISO 8601 date string";

        if (p.endAt !== undefined && p.endAt !== null) {
            if (typeof p.endAt !== "string" || isNaN(new Date(p.endAt).getTime()))
                return "payload.endAt must be a valid ISO 8601 date string";
            if (new Date(p.endAt) <= new Date(p.startAt as string))
                return "payload.endAt must be after startAt";
        }

        if (p.recurrence !== undefined && p.recurrence !== null) {
            if (typeof p.recurrence !== "string" || !VALID_RECURRENCE.has(p.recurrence))
                return "payload.recurrence must be daily|weekly|biweekly|monthly|yearly";
        }

        if (p.recurrenceEndsAt !== undefined && p.recurrenceEndsAt !== null) {
            if (typeof p.recurrenceEndsAt !== "string" || isNaN(new Date(p.recurrenceEndsAt).getTime()))
                return "payload.recurrenceEndsAt must be a valid ISO 8601 date string";
        }

        return null;
    },
    handler({ motion, payload }) {
        const svc = CalendarService.getInstance();

        // Use the motion proposer as the organizer
        const organizerId = motion.proposerId;

        const event = svc.create({
            title:            (payload.title as string).trim(),
            startAt:          payload.startAt as string,
            createdBy:        organizerId,
            organizerId,
            organizerType:    "person",
            endAt:            (payload.endAt   as string | null | undefined)   ?? null,
            allDay:           (payload.allDay  as boolean | undefined)         ?? false,
            description:      (payload.description as string | null | undefined) ?? null,
            location:         (payload.location    as string | null | undefined) ?? null,
            recurrence:       (payload.recurrence  as "daily"|"weekly"|"biweekly"|"monthly"|"yearly"|null|undefined) ?? null,
            recurrenceEndsAt: (payload.recurrenceEndsAt as string | null | undefined) ?? null,
        });

        const recLabel = event.recurrence ? ` (repeats ${event.recurrence})` : "";
        motion.outcomeNote = `Community event scheduled: "${event.title}"${recLabel} starting ${event.startAt.slice(0, 10)} (id: ${event.id}).`;
    },
});

// ── create-bylaw ──────────────────────────────────────────────────────────────
// Payload: { title: string, preamble?: string }
// Scope:   assembly can create universal bylaws (scope=null).
//          Any other body creates bylaws scoped to itself.

effectRegistry.register("create-bylaw", {
    label:    "Create bylaw",
    validate(raw) {
        if (typeof raw !== "object" || raw === null) return "Payload must be an object";
        const p = raw as Record<string, unknown>;
        if (typeof p.title !== "string" || !p.title.trim())
            return "payload.title must be a non-empty string";
        if (p.preamble !== undefined && p.preamble !== null && typeof p.preamble !== "string")
            return "payload.preamble must be a string";
        return null;
    },
    handler({ motion, payload }) {
        const scope  = motion.body === "assembly" ? null : motion.body;
        const loader = new BylawLoader();
        const bylaw  = loader.create(
            (payload.title as string).trim(),
            (payload.preamble as string | undefined)?.trim() || undefined,
            scope,
        );

        const scopeLabel = scope ? ` (scoped to pool/body: ${scope})` : " (universal)";
        motion.outcomeNote = `Bylaw created: "${bylaw.title}"${scopeLabel} (id: ${bylaw.id}).`;

        try {
            CommunityLogService.getInstance().write(
                "bylaw-created",
                `New bylaw adopted: "${bylaw.title}"${scopeLabel}.`,
                { actorId: motion.proposerId, refId: bylaw.id },
            );
        } catch { /* non-fatal */ }
    },
});

// ── amend-bylaw ───────────────────────────────────────────────────────────────
// Payload: { bylawId: string, title?: string, preamble?: string }
// Scope:   assembly may amend any bylaw.
//          A pool/body may only amend bylaws scoped to itself.

effectRegistry.register("amend-bylaw", {
    label:    "Amend bylaw",
    validate(raw) {
        if (typeof raw !== "object" || raw === null) return "Payload must be an object";
        const p = raw as Record<string, unknown>;
        if (typeof p.bylawId !== "string" || !p.bylawId.trim())
            return "payload.bylawId must be a non-empty string";
        if (p.title !== undefined && p.title !== null) {
            if (typeof p.title !== "string" || !p.title.trim())
                return "payload.title must be a non-empty string when provided";
        }
        if (p.preamble !== undefined && p.preamble !== null && typeof p.preamble !== "string")
            return "payload.preamble must be a string";
        return null;
    },
    handler({ motion, payload }) {
        const loader = new BylawLoader();
        const bylawId = (payload.bylawId as string).trim();
        const bylaw   = loader.load(bylawId);
        if (!bylaw) throw new Error(`Bylaw ${bylawId} not found`);

        // Scope check: non-assembly bodies may only amend their own bylaws
        if (motion.body !== "assembly" && bylaw.scope !== motion.body) {
            throw new Error(
                `Body "${motion.body}" may not amend bylaw "${bylaw.title}" ` +
                `(scoped to "${bylaw.scope ?? "assembly"}")`,
            );
        }

        const oldTitle = bylaw.title;
        if (typeof payload.title === "string" && payload.title.trim()) {
            bylaw.title = payload.title.trim();
        }
        if (payload.preamble !== undefined) {
            bylaw.preamble = typeof payload.preamble === "string" && payload.preamble.trim()
                ? payload.preamble.trim()
                : undefined;
        }
        bylaw.version += 1;
        loader.save(bylaw);

        const titleNote = bylaw.title !== oldTitle ? ` (renamed from "${oldTitle}")` : "";
        motion.outcomeNote = `Bylaw "${bylaw.title}"${titleNote} amended to v${bylaw.version} (id: ${bylaw.id}).`;

        try {
            CommunityLogService.getInstance().write(
                "bylaw-amended",
                `Bylaw amended: "${bylaw.title}"${titleNote} now at v${bylaw.version}.`,
                { actorId: motion.proposerId, refId: bylaw.id },
            );
        } catch { /* non-fatal */ }
    },
});
