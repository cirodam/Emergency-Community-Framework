import { BaseLoader } from "@ecf/core";
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

export class CalendarEventLoader extends BaseLoader<EventRecord, CalendarEvent> {
    protected serialize(event: CalendarEvent): EventRecord {
        return {
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
    }

    protected deserialize(r: EventRecord): CalendarEvent { return CalendarEvent.restore(r); }
}
