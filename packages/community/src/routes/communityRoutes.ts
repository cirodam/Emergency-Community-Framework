import { Router } from "express";
import * as persons from "./PersonController.js";
import * as auth from "./AuthController.js";
import * as domains from "./DomainController.js";

const router = Router();

// Persons
router.get(   "/persons",                persons.listPersons);
router.get(   "/persons/:id",            persons.getPerson);
router.post(  "/persons",                persons.addPerson);
router.patch( "/persons/:id",            persons.updatePerson);
router.delete("/persons/:id",            persons.dischargePerson);
router.post(  "/persons/:id/credential", persons.issueCredential);
router.post(  "/persons/:id/pin",        auth.setPin);

// Auth
router.post("/auth/verify", auth.verifyCredential);
router.post("/auth/pin",    auth.verifyPin);

// Domains
router.get(  "/domains",     domains.listDomains);
router.get(  "/domains/:id", domains.getDomain);
router.patch("/domains/:id", domains.updateDomain);

// Units
router.get("/units",     domains.listUnits);
router.get("/units/:id", domains.getUnit);

// Roles
router.get(   "/roles",     domains.listRoles);
router.get(   "/roles/:id", domains.getRole);
router.post(  "/roles",     domains.createRole);
router.patch( "/roles/:id", domains.updateRole);
router.delete("/roles/:id", domains.deleteRole);

// Pools
router.get(   "/pools",                        domains.listPools);
router.get(   "/pools/:id",                    domains.getPool);
router.post(  "/pools",                        domains.createPool);
router.post(  "/pools/:id/members",            domains.addPoolMember);
router.delete("/pools/:id/members/:personId",  domains.removePoolMember);
router.delete("/pools/:id",                    domains.deletePool);

export default router;
