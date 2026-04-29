import { Router } from "express";
import { requireAuth, requireSteward } from "./middleware.js";
import * as nominations from "./NominationController.js";

const router = Router();

router.get(  "/nominations",              nominations.listNominations);
router.get(  "/nominations/vacancies",    nominations.listVacancies);
router.get(  "/nominations/expiring",     requireSteward, nominations.listExpiring);
router.post( "/nominations",              requireAuth, nominations.createNomination);
router.patch("/nominations/:id/confirm",  requireSteward, nominations.confirmNomination);
router.patch("/nominations/:id/decline",  requireSteward, nominations.declineNomination);

export default router;
