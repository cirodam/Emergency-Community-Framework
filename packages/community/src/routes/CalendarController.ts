import { Request, Response } from "express";
import { CalendarService } from "../calendar/CalendarService.js";
import { CalendarEvent } from "../calendar/CalendarEvent.js";

const svc = () => CalendarService.getInstance();

function toDto(event: CalendarEvent) {
    return {
        id:            event.id,
        title:         event.title,
        description:   event.description,
        location:      event.location,
        startAt:       event.startAt,
        endAt:         event.endAt,
        allDay:        event.allDay,
        cancelledAt:   event.cancelledAt,
        organizerId:   event.organizerId,
        organizerType: event.organizerType,
        createdBy:     event.createdBy,
        createdAt:     event.createdAt,
        rsvps:         event.rsvps,
    };
}

// GET /api/calendar
// Query params: from, to (ISO strings), upcoming=<n>
export function listEvents(req: Request, res: Response): void {
    const { from, to, upcoming } = req.query as Record<string, string | undefined>;
    if (upcoming) {
        const limit = parseInt(upcoming, 10);
        res.json(svc().upcoming(isNaN(limit) ? undefined : limit).map(toDto));
        return;
    }
    if (from && to) {
        res.json(svc().inRange(from, to).map(toDto));
        return;
    }
    res.json(svc().getAll().map(toDto));
}

// GET /api/calendar/:id
export function getEvent(req: Request, res: Response): void {
    const event = svc().get(req.params.id as string);
    if (!event) { res.status(404).json({ error: "Event not found" }); return; }
    res.json(toDto(event));
}

// POST /api/calendar
// Body: { title, startAt, organizerId, organizerType, endAt?, allDay?, description?, location? }
export function createEvent(req: Request, res: Response): void {
    const { title, startAt, organizerId, organizerType, endAt, allDay, description, location } = req.body ?? {};
    if (typeof title !== "string" || !title.trim()) {
        res.status(400).json({ error: "title is required" }); return;
    }
    if (typeof startAt !== "string" || !startAt) {
        res.status(400).json({ error: "startAt is required" }); return;
    }
    if (typeof organizerId !== "string" || !organizerId) {
        res.status(400).json({ error: "organizerId is required" }); return;
    }
    if (organizerType !== "person" && organizerType !== "org") {
        res.status(400).json({ error: "organizerType must be 'person' or 'org'" }); return;
    }

    // createdBy comes from the authenticated person credential
    const createdBy: string = (req as typeof req & { personId?: string }).personId ?? organizerId;

    try {
        const event = svc().create({ title, startAt, createdBy, organizerId, organizerType, endAt, allDay, description, location });
        res.status(201).json(toDto(event));
    } catch (err) {
        res.status(400).json({ error: (err as Error).message });
    }
}

// PATCH /api/calendar/:id
export function updateEvent(req: Request, res: Response): void {
    try {
        const event = svc().update(req.params.id as string, req.body ?? {});
        res.json(toDto(event));
    } catch (err) {
        res.status(404).json({ error: (err as Error).message });
    }
}

// DELETE /api/calendar/:id  (cancel)
export function cancelEvent(req: Request, res: Response): void {
    try {
        const event = svc().cancel(req.params.id as string);
        res.json(toDto(event));
    } catch (err) {
        res.status(404).json({ error: (err as Error).message });
    }
}

// POST /api/calendar/:id/rsvp
// Body: { personId, status: "yes"|"no"|"maybe" }
export function rsvpToEvent(req: Request, res: Response): void {
    const { personId, status } = req.body ?? {};
    if (typeof personId !== "string" || !personId) {
        res.status(400).json({ error: "personId is required" }); return;
    }
    if (status !== "yes" && status !== "no" && status !== "maybe") {
        res.status(400).json({ error: "status must be 'yes', 'no', or 'maybe'" }); return;
    }
    try {
        const event = svc().rsvp(req.params.id as string, personId, status);
        res.json(toDto(event));
    } catch (err) {
        res.status(404).json({ error: (err as Error).message });
    }
}

// DELETE /api/calendar/:id/rsvp/:personId
export function removeRsvp(req: Request, res: Response): void {
    try {
        const event = svc().removeRsvp(req.params.id as string, req.params.personId as string);
        res.json(toDto(event));
    } catch (err) {
        res.status(404).json({ error: (err as Error).message });
    }
}
