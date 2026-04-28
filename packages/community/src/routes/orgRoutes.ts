import { Router } from "express";
import { requireAuth } from "./middleware.js";
import * as orgs from "./OrgController.js";

const router = Router();

router.get(   "/orgs",                       orgs.listOrgs);
router.post(  "/orgs",                       requireAuth, orgs.createOrg);
router.get(   "/orgs/:id",                   orgs.getOrg);
router.post(  "/orgs/:id/members",           requireAuth, orgs.addMember);
router.delete("/orgs/:id/members/:personId", requireAuth, orgs.removeMember);
router.delete("/orgs/:id",                   requireAuth, orgs.dissolveOrg);

export default router;
