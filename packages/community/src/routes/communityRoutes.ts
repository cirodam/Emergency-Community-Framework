import { Router } from "express";
import * as persons from "./PersonController.js";
import * as auth from "./AuthController.js";
import * as domains from "./DomainController.js";
import * as setup from "./SetupController.js";
import * as economics from "./EconomicsController.js";
import * as sms from "./SmsController.js";

const router = Router();

// Setup (first-boot only)
router.get( "/setup/status", setup.getSetupStatus);
router.post("/setup",        setup.setup);

// Economics (public transparency)
router.get("/economics", economics.getEconomics);

// Federation membership (Currency Board)
router.get( "/federation",       economics.getFederationStatus);
router.post("/federation/apply", economics.applyToFederation);
router.get( "/federation/sync",  economics.syncFederationStatus);
// Persons
router.get(   "/persons",                persons.listPersons);
router.get(   "/persons/:id",            persons.getPerson);
router.post(  "/persons",                persons.addPerson);
router.patch( "/persons/:id",            persons.updatePerson);
router.delete("/persons/:id",            persons.dischargePerson);
router.post(  "/persons/:id/credential", persons.issueCredential);
router.post(  "/persons/:id/password",   auth.setPassword);

// Auth
router.post("/auth/login",  auth.login);
router.post("/auth/verify", auth.verifyCredential);

// SMS banking (inbound webhook — for testing or gammu-smsd RunOnReceive)
router.post("/sms/inbound", sms.smsInbound);

// Domains
router.get(  "/domains",     domains.listDomains);
router.get(  "/domains/:id", domains.getDomain);
router.patch("/domains/:id", domains.updateDomain);

// Units
router.get(   "/units",     domains.listUnits);
router.get(   "/units/:id", domains.getUnit);
router.post(  "/units",     domains.createUnit);
router.delete("/units/:id", domains.deleteUnit);

// Unit templates
router.get("/templates", domains.listTemplates);

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
