import { Router } from "express";
import { requireAuth, requireModerator, requireMailAccess } from "./middleware.js";
import {
    listThreads,
    getThread,
    getInbox,
    getOutbox,
    getUnreadCount,
    sendMessage,
    markRead,
    deleteMessage,
    receiveExternalMessage,
    reportMessage,
    adminListReports,
    adminDeleteMessage,
} from "./MailController.js";

const router = Router();

// All mail routes require authentication + not suspended
router.get(   "/threads",                ...requireMailAccess, listThreads);
router.get(   "/threads/:id",            ...requireMailAccess, getThread);
router.get(   "/inbox",                  ...requireMailAccess, getInbox);
router.get(   "/outbox",                 ...requireMailAccess, getOutbox);
router.get(   "/unread-count",           ...requireMailAccess, getUnreadCount);
router.post(  "/messages",               ...requireMailAccess, sendMessage);
router.patch( "/messages/:id/read",      ...requireMailAccess, markRead);
router.delete("/messages/:id",           ...requireMailAccess, deleteMessage);
router.post(  "/messages/:id/report",    ...requireMailAccess, reportMessage);

// ── Moderator routes ─────────────────────────────────────────────────────────
router.get(   "/admin/reports",          ...requireModerator, adminListReports);
router.delete("/admin/messages/:id",     ...requireModerator, adminDeleteMessage);

// Internal — cross-community delivery (called by local community server, not by persons)
router.post("/messages/incoming", receiveExternalMessage);

export default router;
