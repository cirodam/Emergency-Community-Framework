import { Router } from "express";
import { requireAuth, requireSteward } from "./middleware.js";
import * as persons from "./PersonController.js";
import * as auth from "./AuthController.js";

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
router.post(  "/persons/:handle/apps/:app",            ...requireSteward, persons.grantApp);
router.delete("/persons/:handle/apps/:app",            ...requireSteward, persons.revokeApp);


router.post("/auth/login",           auth.login);
router.post("/auth/verify",          auth.verifyCredential);
router.post("/auth/change-password", requireAuth, auth.changeOwnPassword);

export default router;
