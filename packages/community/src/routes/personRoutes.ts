import { Router } from "express";
import { requireAuth, requireSteward } from "./middleware.js";
import * as persons from "./PersonController.js";
import * as auth from "./AuthController.js";
import * as suspensions from "./AppSuspensionController.js";

const router = Router();

router.get(   "/persons",                              requireAuth,    persons.listPersons);
router.get(   "/persons/:handle",                      requireAuth,    persons.getPerson);
router.post(  "/persons",                              ...requireSteward, persons.addPerson);
router.patch( "/persons/:handle",                      ...requireSteward, persons.updatePerson);
router.delete("/persons/:handle",                      ...requireSteward, persons.dischargePerson);
router.post(  "/persons/:handle/credential",           ...requireSteward, persons.issueCredential);
router.post(  "/persons/:handle/password",             ...requireSteward, auth.setPassword);
router.post(  "/persons/:handle/pin",                  ...requireSteward, auth.setPin);
router.post(  "/persons/:handle/steward",              ...requireSteward, persons.grantSteward);
router.delete("/persons/:handle/steward",              ...requireSteward, persons.revokeSteward);

// ── App suspensions (steward-only write, steward-only full read) ──────────────
router.get(   "/persons/:handle/app-suspensions",          ...requireSteward, suspensions.listPersonSuspensions);
router.post(  "/persons/:handle/app-suspensions",          ...requireSteward, suspensions.suspendFromApp);
router.delete("/persons/:handle/app-suspensions/:app",     ...requireSteward, suspensions.unsuspendFromApp);
router.get(   "/app-suspensions/full",                 ...requireSteward, suspensions.listSuspensionsFull);

router.post("/auth/login",  auth.login);
router.post("/auth/verify", auth.verifyCredential);

export default router;
