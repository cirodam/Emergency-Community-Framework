import { Router, Request, Response } from "express";
import { requireAuth, requireSteward } from "./middleware.js";
import * as motions   from "./MotionController.js";
import { Constitution } from "../governance/Constitution.js";
import { BylawLoader } from "../governance/BylawLoader.js";
import { CommunityDb } from "../CommunityDb.js";
import { PersonService } from "../person/PersonService.js";
import { CommunityLogService } from "../log/CommunityLogService.js";

const router = Router();
const bylaws = new BylawLoader();

router.get(   "/motions/effects",            motions.listEffects);
router.get(   "/motions",                    motions.listMotions);
router.get(   "/motions/:id",                motions.getMotion);
router.post(  "/motions",                    requireAuth,    motions.createMotion);
router.post(  "/motions/:id/deliberate",     requireAuth,    motions.submitForDeliberation);
router.post(  "/motions/:id/open-voting",    requireAuth,    motions.openVoting);
router.post(  "/motions/:id/vote",           requireAuth,    motions.castVote);
router.post(  "/motions/:id/comment",        requireAuth,    motions.addComment);
router.post(  "/motions/:id/discuss",        requireSteward, motions.markDiscussed);
router.post(  "/motions/:id/outcome",        requireSteward, motions.recordOutcome);
router.delete("/motions/:id",                requireAuth,    motions.withdrawMotion);

// PATCH /api/constitution/parameters/:key
// Body: { value: number | boolean }
// Steward-only direct override — for experimental use.
router.patch("/constitution/parameters/:key", requireSteward, (req: Request, res: Response) => {
    const key = req.params.key as string;
    const { value } = (req.body ?? {}) as { value?: unknown };
    if (typeof value !== "number" && typeof value !== "boolean") {
        res.status(400).json({ error: "value must be a number or boolean" }); return;
    }
    try {
        const con = Constitution.getInstance();
        con.amend(key, value, "steward-override");
        con.save();
        res.json({ key, value: con.get(key) });
    } catch (err) {
        res.status(400).json({ error: (err as Error).message });
    }
});

// PATCH /api/constitution/sections/:sectionId
// Body: { body: string }
// Steward-only direct override of a section's prose text.
router.patch("/constitution/sections/:sectionId", requireSteward, (req: Request, res: Response) => {
    const sectionId = req.params.sectionId as string;
    const { body } = (req.body ?? {}) as { body?: unknown };
    if (typeof body !== "string" || !body.trim()) {
        res.status(400).json({ error: "body is required and must be a non-empty string" }); return;
    }
    try {
        const con = Constitution.getInstance();
        con.updateSection(sectionId, body.trim());
        con.save();
        res.json(con.toDocument());
    } catch (err) {
        res.status(400).json({ error: (err as Error).message });
    }
});

// ── Bylaws ────────────────────────────────────────────────────────────────────

router.get("/bylaws", (_req: Request, res: Response) => {
    res.json(bylaws.loadAll());
});

router.get("/bylaws/:id", (req: Request, res: Response) => {
    const bylaw = bylaws.load(req.params.id as string);
    if (!bylaw) { res.status(404).json({ error: "Bylaw not found" }); return; }
    res.json(bylaw);
});

router.post("/bylaws", requireSteward, (req: Request, res: Response) => {
    const { title, preamble } = (req.body ?? {}) as { title?: string; preamble?: string };
    if (!title?.trim()) { res.status(400).json({ error: "title is required" }); return; }
    try {
        res.status(201).json(bylaws.create(title, preamble));
    } catch (err) {
        res.status(400).json({ error: (err as Error).message });
    }
});

router.post("/bylaws/:id/articles", requireSteward, (req: Request, res: Response) => {
    const { number, title, preamble } = (req.body ?? {}) as { number?: string; title?: string; preamble?: string };
    if (!number?.trim() || !title?.trim()) { res.status(400).json({ error: "number and title are required" }); return; }
    try {
        res.status(201).json(bylaws.addArticle(req.params.id as string, number, title, preamble));
    } catch (err) {
        const msg = (err as Error).message;
        res.status(msg.includes("not found") ? 404 : 409).json({ error: msg });
    }
});

router.post("/bylaws/:id/articles/:number/sections", requireSteward, (req: Request, res: Response) => {
    const { sectionId, title, body } = (req.body ?? {}) as { sectionId?: string; title?: string; body?: string };
    if (!sectionId?.trim() || !body?.trim()) { res.status(400).json({ error: "sectionId and body are required" }); return; }
    try {
        res.status(201).json(bylaws.addSection(req.params.id as string, req.params.number as string, sectionId, title ?? "", body));
    } catch (err) {
        const msg = (err as Error).message;
        res.status(msg.includes("not found") ? 404 : 409).json({ error: msg });
    }
});

router.patch("/bylaws/:id/sections/:sectionId", requireSteward, (req: Request, res: Response) => {
    const { body } = (req.body ?? {}) as { body?: string };
    if (!body?.trim()) { res.status(400).json({ error: "body is required" }); return; }
    try {
        res.json(bylaws.updateSection(req.params.id as string, req.params.sectionId as string, body));
    } catch (err) {
        const msg = (err as Error).message;
        res.status(msg.includes("not found") ? 404 : 400).json({ error: msg });
    }
});

router.delete("/bylaws/:id", requireSteward, (req: Request, res: Response) => {
    if (!bylaws.load(req.params.id as string)) { res.status(404).json({ error: "Bylaw not found" }); return; }
    bylaws.delete(req.params.id as string);
    res.status(204).end();
});

// ── Assembly term ─────────────────────────────────────────────────────────────

interface AssemblyTermRecord {
    termStartDate: string;   // ISO date (YYYY-MM-DD)
    memberIds:     string[];
}

const ASSEMBLY_KEY = "assembly_term";

function loadTerm(): AssemblyTermRecord | null {
    const db  = CommunityDb.getInstance().db;
    const row = db.prepare("SELECT data FROM singleton_records WHERE key = ?").get(ASSEMBLY_KEY) as { data: string } | undefined;
    return row ? JSON.parse(row.data) as AssemblyTermRecord : null;
}

function saveTerm(term: AssemblyTermRecord): void {
    CommunityDb.getInstance().db.prepare(
        "INSERT INTO singleton_records (key, data) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET data = excluded.data"
    ).run(ASSEMBLY_KEY, JSON.stringify(term));
}

function computeSeats(population: number): number {
    const fraction = Constitution.getInstance().assemblyFraction;
    return Math.max(9, Math.ceil(population * fraction));
}

function personToSlimDto(p: { id: string; firstName: string; lastName: string; handle: string }) {
    return { id: p.id, firstName: p.firstName, lastName: p.lastName, handle: p.handle };
}

// GET /api/governance/assembly
router.get("/assembly", (_req: Request, res: Response) => {
    const persons = PersonService.getInstance().getAll().filter(p => !p.disabled);
    const seats   = computeSeats(persons.length);
    const term    = loadTerm();
    const constitution = Constitution.getInstance();

    const seatedPersons = term
        ? term.memberIds
            .map(id => PersonService.getInstance().get(id))
            .filter(Boolean)
            .map(p => personToSlimDto(p!))
        : [];

    res.json({
        seats,
        fraction:      constitution.assemblyFraction,
        termMonths:    constitution.assemblyTermMonths,
        termStartDate: term?.termStartDate ?? null,
        population:    persons.length,
        seated:        seatedPersons,
    });
});

// POST /api/governance/assembly/draw  (steward only)
// Randomly draws a new assembly term from eligible (non-disabled, adult) members.
router.post("/assembly/draw", requireSteward, (req: Request, res: Response) => {
    const { termStartDate } = (req.body ?? {}) as { termStartDate?: string };
    const startDate = termStartDate ?? new Date().toISOString().slice(0, 10);
    if (isNaN(new Date(startDate).getTime())) {
        res.status(400).json({ error: "termStartDate must be a valid date" }); return;
    }

    const constitution = Constitution.getInstance();
    const workingMin   = constitution.workingAgeMin;
    const now          = new Date();
    const eligible     = PersonService.getInstance().getAll()
        .filter(p => !p.disabled && p.getAgeYears(now) >= workingMin);

    const seats = computeSeats(eligible.length);

    // Fisher-Yates shuffle, take first `seats` elements
    const pool = [...eligible];
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    const drawn = pool.slice(0, seats);

    const term: AssemblyTermRecord = {
        termStartDate: startDate,
        memberIds:     drawn.map(p => p.id),
    };
    saveTerm(term);

    try {
        CommunityLogService.getInstance().write(
            "assembly-drawn",
            `A new assembly of ${drawn.length} member${drawn.length === 1 ? "" : "s"} was drawn by sortition for the term beginning ${startDate}.`,
            { actorId: (req as any).person?.id ?? null },
        );
    } catch { /* non-fatal */ }

    res.json({
        seats,
        fraction:      constitution.assemblyFraction,
        termMonths:    constitution.assemblyTermMonths,
        termStartDate: term.termStartDate,
        population:    eligible.length,
        seated:        drawn.map(p => personToSlimDto(p)),
    });
});

// DELETE /api/governance/assembly  (steward only) — clear current term
router.delete("/assembly", requireSteward, (_req: Request, res: Response) => {
    CommunityDb.getInstance().db.prepare("DELETE FROM singleton_records WHERE key = ?").run(ASSEMBLY_KEY);
    res.status(204).end();
});

export default router;
