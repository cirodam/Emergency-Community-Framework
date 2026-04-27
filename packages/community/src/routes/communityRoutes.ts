import { Router } from "express";
import { requirePersonCredential } from "@ecf/core";
import { getCommunityIdentity } from "../communityIdentity.js";
import * as persons from "./PersonController.js";
import * as auth from "./AuthController.js";
import * as domains from "./DomainController.js";
import * as setup from "./SetupController.js";
import * as economics from "./EconomicsController.js";
import * as sms from "./SmsController.js";
import * as applications from "./ApplicationController.js";
import * as associations from "./AssociationController.js";

const requireAuth = requirePersonCredential(getCommunityIdentity);

const router = Router();

// Setup (first-boot only)
router.get( "/setup/status", setup.getSetupStatus);
router.post("/setup",        setup.setup);

// Economics (public transparency)
router.get("/economics", economics.getEconomics);
router.get("/budget",    economics.getCommunityBudget);

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

// Member applications
router.get(   "/applications",              applications.listApplications);
router.post(  "/applications",              requireAuth, applications.submitApplication);
router.get(   "/applications/:id",          applications.getApplication);
router.post(  "/applications/:id/vouch",    requireAuth, applications.vouchForApplication);
router.delete("/applications/:id/vouch",    requireAuth, applications.removeVouch);
router.post(  "/applications/:id/withdraw", requireAuth, applications.withdrawApplication);

// Domains
router.get(  "/domains",     domains.listDomains);
router.get(  "/domains/:id", domains.getDomain);
router.patch("/domains/:id", domains.updateDomain);

// Domain budgets
router.get(   "/domains/:id/budget",                domains.getDomainBudget);
router.post(  "/domains/:id/budget/items",          domains.addBudgetItem);
router.patch( "/domains/:id/budget/items/:itemId",  domains.updateBudgetItem);
router.delete("/domains/:id/budget/items/:itemId",  domains.removeBudgetItem);

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

// Role types (the bank)
router.get(   "/role-types",     domains.listRoleTypes);
router.get(   "/role-types/:id", domains.getRoleType);
router.post(  "/role-types",     domains.createRoleType);
router.patch( "/role-types/:id", domains.updateRoleType);
router.delete("/role-types/:id", domains.deleteRoleType);

// Pools
router.get(   "/pools",                        domains.listPools);
router.get(   "/pools/:id",                    domains.getPool);
router.post(  "/pools",                        domains.createPool);
router.post(  "/pools/:id/members",            domains.addPoolMember);
router.delete("/pools/:id/members/:personId",  domains.removePoolMember);
router.delete("/pools/:id",                    domains.deletePool);

// Associations
router.get(   "/associations",                            associations.listAssociations);
router.post(  "/associations",                            requireAuth, associations.createAssociation);
router.get(   "/associations/:id",                        associations.getAssociation);
router.patch( "/associations/:id",                        requireAuth, associations.updateAssociation);
router.post(  "/associations/:id/members",                requireAuth, associations.addMember);
router.delete("/associations/:id/members/:personId",      requireAuth, associations.removeMember);
router.post(  "/associations/:id/admins",                 requireAuth, associations.addAdmin);
router.delete("/associations/:id/admins/:personId",       requireAuth, associations.removeAdmin);

export default router;
