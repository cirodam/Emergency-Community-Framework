import { Router } from "express";
import { requireAuth } from "./middleware.js";
import * as domains from "./DomainController.js";

const router = Router();

// Domains
router.get(  "/domains",     domains.listDomains);
router.get(  "/domains/:id", domains.getDomain);
router.patch("/domains/:id", requireAuth, domains.updateDomain);

// Domain budgets
router.get(   "/domains/:id/budget",               domains.getDomainBudget);
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

// Role types
router.get(   "/role-types",     domains.listRoleTypes);
router.get(   "/role-types/:id", domains.getRoleType);
router.post(  "/role-types",     requireAuth, domains.createRoleType);
router.patch( "/role-types/:id", requireAuth, domains.updateRoleType);
router.delete("/role-types/:id", requireAuth, domains.deleteRoleType);

// Pools
router.get(   "/pools",                       domains.listPools);
router.get(   "/pools/:id",                   domains.getPool);
router.post(  "/pools",                       requireAuth, domains.createPool);
router.post(  "/pools/:id/members",           requireAuth, domains.addPoolMember);
router.delete("/pools/:id/members/:personId", requireAuth, domains.removePoolMember);
router.delete("/pools/:id",                   requireAuth, domains.deletePool);

export default router;
