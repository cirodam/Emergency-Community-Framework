import { Router } from "express";
import { requireAuth, requireSteward } from "./middleware.js";
import * as persons from "./PersonController.js";
import * as auth from "./AuthController.js";
import * as suspensions from "./AppSuspensionController.js";

const router = Router();

router.get(   "/persons",                              requireAuth,    persons.listPersons);
router.get(   "/persons/:id",                          requireAuth,    persons.getPerson);
router.post(  "/persons",                              ...requireSteward, persons.addPerson);
router.patch( "/persons/:id",                          ...requireSteward, persons.updatePerson);
router.delete("/persons/:id",                          ...requireSteward, persons.dischargePerson);
router.post(  "/persons/:id/credential",               ...requireSteward, persons.issueCredential);
router.post(  "/persons/:id/password",                 ...requireSteward, auth.setPassword);
router.post(  "/persons/:id/pin",                      ...requireSteward, auth.setPin);
router.post(  "/persons/:id/steward",                  ...requireSteward, persons.grantSteward);
router.delete("/persons/:id/steward",                  ...requireSteward, persons.revokeSteward);

// ── App suspensions (steward-only write, steward-only full read) ──────────────
router.get(   "/persons/:id/app-suspensions",          ...requireSteward, suspensions.listPersonSuspensions);
router.post(  "/persons/:id/app-suspensions",          ...requireSteward, suspensions.suspendFromApp);
router.delete("/persons/:id/app-suspensions/:app",     ...requireSteward, suspensions.unsuspendFromApp);
router.get(   "/app-suspensions/full",                 ...requireSteward, suspensions.listSuspensionsFull);

router.post("/auth/login",  auth.login);
router.post("/auth/verify", auth.verifyCredential);

export default router;
