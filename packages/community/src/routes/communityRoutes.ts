import { Router } from "express";
import * as setup from "./SetupController.js";
import * as sms from "./SmsController.js";
import * as suspensions from "./AppSuspensionController.js";
import personRoutes from "./personRoutes.js";
import applicationRoutes from "./applicationRoutes.js";
import domainRoutes from "./domainRoutes.js";
import economicsRoutes from "./economicsRoutes.js";
import associationRoutes from "./associationRoutes.js";
import orgRoutes from "./orgRoutes.js";
import calendarRoutes from "./calendarRoutes.js";
import governanceRoutes from "./governanceRoutes.js";
import nominationRoutes from "./nominationRoutes.js";
import shiftRoutes from "./shiftRoutes.js";

const router = Router();

// Setup (first-boot only)
router.get( "/setup/status", setup.getSetupStatus);
router.post("/setup",        setup.setup);

// SMS banking (inbound webhook — for testing or gammu-smsd RunOnReceive)
router.post("/sms/inbound", sms.smsInbound);

// Public suspension list — satellite apps call this to populate their cache
router.get("/app-suspensions", suspensions.listSuspensions);

router.use("/", personRoutes);
router.use("/", applicationRoutes);
router.use("/", domainRoutes);
router.use("/", economicsRoutes);
router.use("/", associationRoutes);
router.use("/", orgRoutes);
router.use("/", calendarRoutes);
router.use("/", governanceRoutes);
router.use("/", nominationRoutes);
router.use("/", shiftRoutes);

export default router;
