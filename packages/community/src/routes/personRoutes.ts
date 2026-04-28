import { Router } from "express";
import { requireAuth, requireSteward } from "./middleware.js";
import * as persons from "./PersonController.js";
import * as auth from "./AuthController.js";

const router = Router();

router.get(   "/persons",                requireAuth,    persons.listPersons);
router.get(   "/persons/:id",            requireAuth,    persons.getPerson);
router.post(  "/persons",                requireAuth,    persons.addPerson);
router.patch( "/persons/:id",            requireSteward, persons.updatePerson);
router.delete("/persons/:id",            requireSteward, persons.dischargePerson);
router.post(  "/persons/:id/credential", requireSteward, persons.issueCredential);
router.post(  "/persons/:id/password",   requireSteward, auth.setPassword);
router.post(  "/persons/:id/steward",    requireSteward, persons.grantSteward);
router.delete("/persons/:id/steward",    requireSteward, persons.revokeSteward);

router.post("/auth/login",  auth.login);
router.post("/auth/verify", auth.verifyCredential);

export default router;
