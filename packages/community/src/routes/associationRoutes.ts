import { Router } from "express";
import { requireAuth } from "./middleware.js";
import * as associations from "./AssociationController.js";

const router = Router();

router.get(   "/associations",                       associations.listAssociations);
router.post(  "/associations",                       requireAuth, associations.createAssociation);
router.get(   "/associations/:id",                   associations.getAssociation);
router.patch( "/associations/:id",                   requireAuth, associations.updateAssociation);
router.post(  "/associations/:id/members",           requireAuth, associations.addMember);
router.delete("/associations/:id/members/:personId", requireAuth, associations.removeMember);
router.post(  "/associations/:id/admins",            requireAuth, associations.addAdmin);
router.delete("/associations/:id/admins/:personId",  requireAuth, associations.removeAdmin);

export default router;
