import { FileStore } from "@ecf/core";
import { CalendarEvent, Rsvp } from "./CalendarEvent.js";

interface EventRecord {
    id:            string;
    createdAt:     string;
    createdBy:     string;
    title:         string;
    description:   string | null;
    location:      string | null;
    startAt:       string;
    endAt:         string | null;
    allDay:        boolean;
    cancelledAt:   string | null;
    organizerId:   string;
    organizerType: "person" | "org";
    rsvps:         Rsvp[];
}

export class CalendarEventLoader {
    private readonly store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(event: CalendarEvent): void {
        const record: EventRecord = {
            id:            event.id,
            createdAt:     event.createdAt,
            createdBy:     event.createdBy,
            title:         event.title,
            description:   event.description,
            location:      event.location,
            startAt:       event.startAt,
            endAt:         event.endAt,
            allDay:        event.allDay,
            cancelledAt:   event.cancelledAt,
            organizerId:   event.organizerId,
            organizerType: event.organizerType,
            rsvps:         event.rsvps,
        };
        this.store.write(event.id, record);
    }

    loadAll(): CalendarEvent[] {
        return this.store.readAll<EventRecord>().map(r => CalendarEvent.restore(r));
    }

    delete(id: string): boolean {
        return this.store.delete(id);
    }
}
