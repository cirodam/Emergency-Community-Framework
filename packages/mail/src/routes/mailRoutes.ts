import { Router } from "express";
import { requirePersonCredential } from "@ecf/core";
import { getCommunityIdentity } from "../communityIdentity.js";
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
} from "./MailController.js";

const router = Router();

const requireAuth = requirePersonCredential(getCommunityIdentity);

// All mail routes require authentication
router.get(   "/threads",                requireAuth, listThreads);
router.get(   "/threads/:id",            requireAuth, getThread);
router.get(   "/inbox",                  requireAuth, getInbox);
router.get(   "/outbox",                 requireAuth, getOutbox);
router.get(   "/unread-count",           requireAuth, getUnreadCount);
router.post(  "/messages",               requireAuth, sendMessage);
router.patch( "/messages/:id/read",      requireAuth, markRead);
router.delete("/messages/:id",           requireAuth, deleteMessage);

// Internal — cross-community delivery (called by local community server, not by persons)
router.post("/messages/incoming", receiveExternalMessage);

export default router;
