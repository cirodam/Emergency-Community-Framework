import { Router } from "express";
import * as setup from "./SetupController.js";
import * as sms from "./SmsController.js";
import personRoutes from "./personRoutes.js";
import applicationRoutes from "./applicationRoutes.js";
import domainRoutes from "./domainRoutes.js";
import economicsRoutes from "./economicsRoutes.js";
import associationRoutes from "./associationRoutes.js";
import orgRoutes from "./orgRoutes.js";
import calendarRoutes from "./calendarRoutes.js";
import governanceRoutes from "./governanceRoutes.js";
import nominationRoutes from "./nominationRoutes.js";

const router = Router();

// Setup (first-boot only)
router.get( "/setup/status", setup.getSetupStatus);
router.post("/setup",        setup.setup);

// SMS banking (inbound webhook — for testing or gammu-smsd RunOnReceive)
router.post("/sms/inbound", sms.smsInbound);

router.use("/", personRoutes);
router.use("/", applicationRoutes);
router.use("/", domainRoutes);
router.use("/", economicsRoutes);
router.use("/", associationRoutes);
router.use("/", orgRoutes);
router.use("/", calendarRoutes);
router.use("/", governanceRoutes);
router.use("/", nominationRoutes);

export default router;
