import { Router } from "express";
import { requireAuth, requireCoordinator } from "./middleware.js";
import {
    listSessions, getSession, createSession, updateSession,
    submitSession, enrollSession, dropOutSession, completeSession,
    cancelSession, approveSession,
} from "./SessionController.js";
import {
    listCourses, getCourse, createCourse, updateCourse,
    enrollCourse, cancelCourse, approveCourse,
} from "./CourseController.js";
import {
    listRequests, getRequest, createRequest,
    upvoteRequest, removeUpvoteRequest, claimRequest,
} from "./ClassRequestController.js";

const router = Router();

// ── Sessions ──────────────────────────────────────────────────────────────────
router.get(   "/sessions",                  listSessions);
router.get(   "/sessions/:id",              getSession);
router.post(  "/sessions",                  requireAuth, createSession);
router.patch( "/sessions/:id",              requireAuth, updateSession);
router.post(  "/sessions/:id/submit",       requireAuth, submitSession);
router.post(  "/sessions/:id/enroll",       requireAuth, enrollSession);
router.delete("/sessions/:id/enroll",       requireAuth, dropOutSession);
router.post(  "/sessions/:id/complete",     requireAuth, completeSession);
router.delete("/sessions/:id",              requireAuth, cancelSession);

// ── Courses ───────────────────────────────────────────────────────────────────
router.get(   "/courses",                   listCourses);
router.get(   "/courses/:id",               getCourse);
router.post(  "/courses",                   requireAuth, createCourse);
router.patch( "/courses/:id",               requireAuth, updateCourse);
router.post(  "/courses/:id/enroll",        requireAuth, enrollCourse);
router.delete("/courses/:id",               requireAuth, cancelCourse);

// ── Class Requests ────────────────────────────────────────────────────────────
router.get(   "/class-requests",            listRequests);
router.get(   "/class-requests/:id",        getRequest);
router.post(  "/class-requests",            requireAuth, createRequest);
router.post(  "/class-requests/:id/upvote", requireAuth, upvoteRequest);
router.delete("/class-requests/:id/upvote", requireAuth, removeUpvoteRequest);
router.post(  "/class-requests/:id/claim",  requireAuth, claimRequest);

// ── Internal webhooks (called by community backend) ───────────────────────────
router.post(  "/internal/sessions/:id/approve", ...requireCoordinator, approveSession);
router.post(  "/internal/courses/:id/approve",  ...requireCoordinator, approveCourse);

export default router;
