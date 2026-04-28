import { Router, Request, Response, NextFunction } from "express";
import { requirePersonCredential } from "@ecf/core";
import { getCommunityIdentity } from "../communityIdentity.js";
import { PersonService } from "../person/PersonService.js";
import * as persons from "./PersonController.js";
import * as auth from "./AuthController.js";
import * as domains from "./DomainController.js";
import * as setup from "./SetupController.js";
import * as economics from "./EconomicsController.js";
import * as sms from "./SmsController.js";
import * as applications from "./ApplicationController.js";
import * as associations from "./AssociationController.js";
import * as orgs from "./OrgController.js";
import * as calendar from "./CalendarController.js";
import * as locations from "./LocationController.js";

import * as proposals from "./ProposalController.js";
import * as paymentTokens from "./PaymentTokenController.js";

const requireAuth = requirePersonCredential(getCommunityIdentity);

const requireSteward = [
    requireAuth,
    (req: Request, res: Response, next: NextFunction) => {
        const personId = (req as unknown as Record<string, unknown>).personId as string | undefined;
        if (!personId) return res.status(403).json({ error: "Steward access required" });
        const person = PersonService.getInstance().get(personId);
        if (!person || !PersonService.getInstance().isSteward(person)) {
            return res.status(403).json({ error: "Steward access required" });
        }
        next();
    },
];

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
// Persons (reads require auth; steward-only for sensitive writes)
router.get(   "/persons",                requireAuth,    persons.listPersons);
router.get(   "/persons/:id",            requireAuth,    persons.getPerson);
router.post(  "/persons",                requireAuth,    persons.addPerson);
router.patch( "/persons/:id",            requireSteward, persons.updatePerson);
router.delete("/persons/:id",            requireSteward, persons.dischargePerson);
router.post(  "/persons/:id/credential", requireSteward, persons.issueCredential);
router.post(  "/persons/:id/password",   requireSteward, auth.setPassword);
router.post(  "/persons/:id/steward",    requireSteward, persons.grantSteward);
router.delete("/persons/:id/steward",    requireSteward, persons.revokeSteward);

// Auth
router.post("/auth/login",  auth.login);
router.post("/auth/verify", auth.verifyCredential);

// SMS banking (inbound webhook — for testing or gammu-smsd RunOnReceive)
router.post("/sms/inbound", sms.smsInbound);

// Member applications (list/vouch/withdraw require auth; public submit does not)
router.post(  "/apply",                     applications.publicSubmitApplication);
router.get(   "/applications",              requireAuth, applications.listApplications);
router.post(  "/applications",              requireAuth, applications.submitApplication);
router.get(   "/applications/:id",          requireAuth, applications.getApplication);
router.post(  "/applications/:id/vouch",    requireAuth, applications.vouchForApplication);
router.delete("/applications/:id/vouch",    requireAuth, applications.removeVouch);
router.post(  "/applications/:id/withdraw", requireAuth, applications.withdrawApplication);

// Domains (reads are public; writes require auth)
router.get(  "/domains",     domains.listDomains);
router.get(  "/domains/:id", domains.getDomain);
router.patch("/domains/:id", requireAuth, domains.updateDomain);

// Domain budgets
router.get(   "/domains/:id/budget",                domains.getDomainBudget);
router.post(  "/domains/:id/budget/items",          requireAuth, domains.addBudgetItem);
router.patch( "/domains/:id/budget/items/:itemId",  requireAuth, domains.updateBudgetItem);
router.delete("/domains/:id/budget/items/:itemId",  requireAuth, domains.removeBudgetItem);

// Units
router.get(   "/units",     domains.listUnits);
router.get(   "/units/:id", domains.getUnit);
router.post(  "/units",     requireAuth, domains.createUnit);
router.delete("/units/:id", requireAuth, domains.deleteUnit);

// Unit templates
router.get("/templates", domains.listTemplates);

// Roles
router.get(   "/roles",     domains.listRoles);
router.get(   "/roles/:id", domains.getRole);
router.post(  "/roles",     requireAuth, domains.createRole);
router.patch( "/roles/:id", requireAuth, domains.updateRole);
router.delete("/roles/:id", requireAuth, domains.deleteRole);

// Role types (the bank)
router.get(   "/role-types",     domains.listRoleTypes);
router.get(   "/role-types/:id", domains.getRoleType);
router.post(  "/role-types",     requireAuth, domains.createRoleType);
router.patch( "/role-types/:id", requireAuth, domains.updateRoleType);
router.delete("/role-types/:id", requireAuth, domains.deleteRoleType);

// Pools
router.get(   "/pools",                        domains.listPools);
router.get(   "/pools/:id",                    domains.getPool);
router.post(  "/pools",                        requireAuth, domains.createPool);
router.post(  "/pools/:id/members",            requireAuth, domains.addPoolMember);
router.delete("/pools/:id/members/:personId",  requireAuth, domains.removePoolMember);
router.delete("/pools/:id",                    requireAuth, domains.deletePool);

// Associations
router.get(   "/associations",                            associations.listAssociations);
router.post(  "/associations",                            requireAuth, associations.createAssociation);
router.get(   "/associations/:id",                        associations.getAssociation);
router.patch( "/associations/:id",                        requireAuth, associations.updateAssociation);
router.post(  "/associations/:id/members",                requireAuth, associations.addMember);
router.delete("/associations/:id/members/:personId",      requireAuth, associations.removeMember);
router.post(  "/associations/:id/admins",                 requireAuth, associations.addAdmin);
router.delete("/associations/:id/admins/:personId",       requireAuth, associations.removeAdmin);

// Organizations
router.get(   "/orgs",                        orgs.listOrgs);
router.post(  "/orgs",                        requireAuth, orgs.createOrg);
router.get(   "/orgs/:id",                    orgs.getOrg);
router.post(  "/orgs/:id/members",            requireAuth, orgs.addMember);
router.delete("/orgs/:id/members/:personId",  requireAuth, orgs.removeMember);
router.delete("/orgs/:id",                    requireAuth, orgs.dissolveOrg);

// Calendar
router.get(   "/calendar",                       calendar.listEvents);
router.post(  "/calendar",                       requireAuth, calendar.createEvent);
router.get(   "/calendar/:id",                   calendar.getEvent);
router.patch( "/calendar/:id",                   requireAuth, calendar.updateEvent);
router.delete("/calendar/:id",                   requireAuth, calendar.cancelEvent);
router.post(  "/calendar/:id/rsvp",              requireAuth, calendar.rsvpToEvent);
router.delete("/calendar/:id/rsvp/:personId",    requireAuth, calendar.removeRsvp);

// Locations
router.get(   "/locations",     locations.listLocations);
router.get(   "/locations/:id", locations.getLocation);
router.post(  "/locations",     requireAuth, locations.createLocation);
router.patch( "/locations/:id", requireAuth, locations.updateLocation);
router.delete("/locations/:id", requireAuth, locations.deleteLocation);

// Governance proposals
router.get(   "/proposals",          proposals.listProposals);
router.get(   "/proposals/:id",      proposals.getProposal);
router.post(  "/proposals",          requireAuth, proposals.createProposal);
router.post(  "/proposals/:id/vote", requireAuth, proposals.voteOnProposal);
router.delete("/proposals/:id",      requireAuth, proposals.withdrawProposal);

// Payment tokens (privacy-preserving directed payments from external institutions)
// Token management is steward-only; inbound clearing payment is federation-signed
router.post(  "/payment-tokens",                          requireSteward, paymentTokens.issueToken);
router.post(  "/payment-tokens/:token/rotate",            requireSteward, paymentTokens.rotateToken);
router.delete("/payment-tokens/:token",                   requireSteward, paymentTokens.revokeToken);
router.get(   "/payment-tokens/person/:personId",         requireSteward, paymentTokens.listTokensForPerson);
router.post(  "/payment-tokens/receive",                  paymentTokens.receivePayment);  // federation-signed

export default router;
