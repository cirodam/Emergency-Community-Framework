import { Router } from "express";
import { requireAuth } from "./middleware.js";
import * as calendar from "./CalendarController.js";
import * as locations from "./LocationController.js";

const router = Router();

// Calendar events
router.get(   "/calendar",                    calendar.listEvents);
router.post(  "/calendar",                    requireAuth, calendar.createEvent);
router.get(   "/calendar/:id",                calendar.getEvent);
router.patch( "/calendar/:id",                requireAuth, calendar.updateEvent);
router.delete("/calendar/:id",                requireAuth, calendar.cancelEvent);
router.post(  "/calendar/:id/rsvp",           requireAuth, calendar.rsvpToEvent);
router.delete("/calendar/:id/rsvp/:personId", requireAuth, calendar.removeRsvp);

// Locations
router.get(   "/locations",     locations.listLocations);
router.get(   "/locations/:id", locations.getLocation);
router.post(  "/locations",     requireAuth, locations.createLocation);
router.patch( "/locations/:id", requireAuth, locations.updateLocation);
router.delete("/locations/:id", requireAuth, locations.deleteLocation);

export default router;
